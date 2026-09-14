import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/email/send", () => ({
  sendTrialExpiringEmail: vi.fn().mockResolvedValue(true),
  sendTrialExpiredEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/services/subscription-dunning.service", () => ({
  runBillingReconciliation: vi.fn().mockResolvedValue({}),
}));

import { GET } from "@/app/api/cron/trial-expiry/route";
import { prisma } from "@/server/db/prisma";
import { sendTrialExpiredEmail, sendTrialExpiringEmail } from "@/server/email/send";

const findSubscriptions = vi.mocked(prisma.subscription.findMany);
const updateSubscriptions = vi.mocked(prisma.subscription.updateMany);
const now = new Date("2026-09-14T12:00:00.000Z");

function cronRequest() {
  return new Request("http://localhost/api/cron/trial-expiry", {
    headers: { authorization: "Bearer test-cron-secret" },
  });
}

function trial(id: string) {
  return {
    id,
    plan: "INDIVIDUAL",
    business: { name: "Agenda", owner: { email: "owner@example.com", name: "Owner" } },
  };
}

describe("trial expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    findSubscriptions.mockResolvedValue([] as never);
    updateSubscriptions.mockResolvedValue({ count: 1 } as never);
    vi.mocked(sendTrialExpiringEmail).mockResolvedValue(true);
    vi.mocked(sendTrialExpiredEmail).mockResolvedValue(true);
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => vi.useRealTimers());

  it("warns and expires trials regardless of the business country", async () => {
    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(findSubscriptions).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.not.objectContaining({ business: expect.anything() }),
    }));
    expect(findSubscriptions).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.not.objectContaining({ business: expect.anything() }),
    }));
  });

  it("uses an absolute 72-96 hour warning window", async () => {
    await GET(cronRequest());
    expect(findSubscriptions).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        trialEndsAt: {
          gte: new Date("2026-09-17T12:00:00.000Z"),
          lt: new Date("2026-09-18T12:00:00.000Z"),
        },
      }),
    }));
  });

  it("claims the warning flag atomically so overlapping runs do not duplicate email", async () => {
    findSubscriptions
      .mockResolvedValueOnce([trial("sub-warning")] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    updateSubscriptions.mockResolvedValueOnce({ count: 0 } as never);

    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(sendTrialExpiringEmail).not.toHaveBeenCalled();
  });

  it("releases a warning claim when delivery fails so a later run may retry", async () => {
    findSubscriptions
      .mockResolvedValueOnce([trial("sub-warning")] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(sendTrialExpiringEmail).mockResolvedValueOnce(false);

    const response = await GET(cronRequest());

    expect(response.status).toBe(500);
    expect(updateSubscriptions).toHaveBeenNthCalledWith(2, {
      where: { id: "sub-warning", status: "TRIALING", trialWarningEmailSent: true },
      data: { trialWarningEmailSent: false },
    });
  });

  it("expires at the exact timestamp with a conditional transition", async () => {
    findSubscriptions
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([trial("sub-expired")] as never)
      .mockResolvedValueOnce([] as never);

    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(findSubscriptions).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { status: "TRIALING", isTrial: true, trialEndsAt: { lte: now } },
    }));
    expect(updateSubscriptions).toHaveBeenCalledWith({
      where: { id: "sub-expired", status: "TRIALING", isTrial: true, trialEndsAt: { lte: now } },
      data: { status: "INACTIVE", isTrial: false },
    });
    expect(sendTrialExpiredEmail).toHaveBeenCalledTimes(1);
  });

  it("does not select or update a trial whose expiry is still in the future", async () => {
    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(findSubscriptions).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ trialEndsAt: { lte: now } }),
    }));
    expect(updateSubscriptions).not.toHaveBeenCalled();
    expect(sendTrialExpiredEmail).not.toHaveBeenCalled();
  });

  it("does not overwrite a webhook reactivation that wins the race", async () => {
    findSubscriptions
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([trial("sub-race")] as never)
      .mockResolvedValueOnce([] as never);
    updateSubscriptions.mockResolvedValueOnce({ count: 0 } as never);

    const response = await GET(cronRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.expired).toBe(0);
    expect(sendTrialExpiredEmail).not.toHaveBeenCalled();
  });

  it("is idempotent across repeated runs", async () => {
    findSubscriptions
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([trial("sub-repeat")] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([trial("sub-repeat")] as never)
      .mockResolvedValueOnce([] as never);
    updateSubscriptions
      .mockResolvedValueOnce({ count: 1 } as never)
      .mockResolvedValueOnce({ count: 0 } as never);

    const first = await GET(cronRequest());
    const second = await GET(cronRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(sendTrialExpiredEmail).toHaveBeenCalledTimes(1);
  });

  it("fails closed when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(new Request("http://localhost/api/cron/trial-expiry"));

    expect(response.status).toBe(503);
    expect(findSubscriptions).not.toHaveBeenCalled();
  });
});
