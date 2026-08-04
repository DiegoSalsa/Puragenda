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

describe("international trial expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSubscriptions.mockResolvedValue([] as never);
    delete process.env.CRON_SECRET;
  });

  it("only warns and expires Chilean trials while international billing is unavailable", async () => {
    const response = await GET(new Request("http://localhost/api/cron/trial-expiry"));

    expect(response.status).toBe(200);
    expect(findSubscriptions).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ business: { countryCode: "CL" } }),
    }));
    expect(findSubscriptions).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ business: { countryCode: "CL" } }),
    }));
  });
});
