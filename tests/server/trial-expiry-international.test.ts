import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/email/send", () => ({
  sendTrialExpiringEmail: vi.fn(),
  sendTrialExpiredEmail: vi.fn(),
}));

vi.mock("@/server/services/subscription-dunning.service", () => ({
  runBillingReconciliation: vi.fn().mockResolvedValue({}),
}));

import { GET } from "@/app/api/cron/trial-expiry/route";
import { prisma } from "@/server/db/prisma";

const findSubscriptions = vi.mocked(prisma.subscription.findMany);

describe("trial expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSubscriptions.mockResolvedValue([] as never);
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("warns and expires trials regardless of the business country", async () => {
    const response = await GET(new Request("http://localhost/api/cron/trial-expiry", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));

    expect(response.status).toBe(200);
    expect(findSubscriptions).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.not.objectContaining({ business: expect.anything() }),
    }));
    expect(findSubscriptions).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.not.objectContaining({ business: expect.anything() }),
    }));
  });

  it("fails closed when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(new Request("http://localhost/api/cron/trial-expiry"));

    expect(response.status).toBe(503);
    expect(findSubscriptions).not.toHaveBeenCalled();
  });
});
