import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  failedEmail: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
  },
}));
vi.mock("@/server/email/send", () => ({
  sendSubscriptionPaymentFailedEmail: mocks.failedEmail,
  sendSubscriptionPaymentRecoveredEmail: vi.fn(),
}));
vi.mock("@/server/services/affiliate.service", () => ({ incrementPaidReferrals: vi.fn() }));
vi.mock("@/server/services/platform-discount.service", () => ({ markPlatformDiscountApplied: vi.fn() }));
vi.mock("@/server/services/subscription-billing.service", () => ({ advanceBillingBenefitAfterAuthorized: vi.fn() }));
vi.mock("mercadopago", () => ({
  Invoice: class {},
  PreApproval: class {},
  MercadoPagoConfig: class {},
}));

import { runBillingReconciliation } from "@/server/services/subscription-dunning.service";

const now = new Date("2026-09-14T12:00:00.000Z");
const notice = {
  id: "sub-1",
  gracePeriodEndsAt: new Date("2026-09-15T12:00:00.000Z"),
  nextPaymentAttemptAt: null,
  business: { name: "Agenda", owner: { email: "owner@example.com", name: "Owner" } },
};

describe("dunning email idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.failedEmail.mockResolvedValue(true);
  });

  it("does not send a failure notice when another run already claimed it", async () => {
    mocks.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([notice])
      .mockResolvedValueOnce([]);
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await runBillingReconciliation(now);

    expect(result.notices).toBe(0);
    expect(mocks.failedEmail).not.toHaveBeenCalled();
  });

  it("releases the atomic claim after a delivery failure", async () => {
    mocks.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([notice])
      .mockResolvedValueOnce([]);
    mocks.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    mocks.failedEmail.mockResolvedValueOnce(false);

    const result = await runBillingReconciliation(now);

    expect(result.notices).toBe(0);
    expect(mocks.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "sub-1", status: "PAST_DUE", dunningEmailSentAt: now },
      data: { dunningEmailSentAt: null },
    });
  });
});
