import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    platformDiscountCode: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/server/db/prisma";
import { quotePlatformDiscount } from "@/server/services/platform-discount.service";

const findDiscount = vi.mocked(prisma.platformDiscountCode.findUnique);
const findSubscription = vi.mocked(prisma.subscription.findUnique);

function discount(overrides: Record<string, unknown> = {}) {
  return {
    id: "discount-18",
    code: "PRIMERMES18",
    name: "18% primer mes",
    discountType: "PERCENTAGE",
    discountValue: 18,
    maxRedemptions: null,
    redeemedCount: 0,
    startsAt: null,
    expiresAt: new Date("2026-10-01T02:59:59.999Z"),
    trialEndsAtFrom: new Date("2026-09-01T04:00:00.000Z"),
    trialEndsAtTo: new Date("2026-10-01T02:59:59.999Z"),
    isActive: true,
    appliesToPlans: ["INDIVIDUAL", "EQUIPO"],
    redemptions: [],
    ...overrides,
  };
}

function firstPaymentSubscription(overrides: Record<string, unknown> = {}) {
  return {
    status: "TRIALING",
    trialEndsAt: new Date("2026-09-15T12:00:00.000Z"),
    hasCountedAsPaidReferral: false,
    lastPaymentId: null,
    ...overrides,
  };
}

describe("platform discount eligibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    findDiscount.mockResolvedValue(discount() as never);
    findSubscription.mockResolvedValue(firstPaymentSubscription() as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("applies 18% to the first month for a trial ending inside the campaign window", async () => {
    const result = await quotePlatformDiscount({
      code: " primer mes 18 ",
      plan: "INDIVIDUAL",
      businessId: "business-new",
      amount: 12_990,
    });

    expect(findDiscount).toHaveBeenCalledWith(expect.objectContaining({
      where: { code: "PRIMERMES18" },
    }));
    expect(result).toEqual({
      discount: expect.objectContaining({
        code: "PRIMERMES18",
        originalAmount: 12_990,
        discountedAmount: 10_652,
        savings: 2_338,
      }),
    });
  });

  it("also allows an expired trial that is still awaiting its first payment", async () => {
    findSubscription.mockResolvedValue(firstPaymentSubscription({ status: "INACTIVE" }) as never);

    const result = await quotePlatformDiscount({
      code: "PRIMERMES18",
      plan: "EQUIPO",
      businessId: "business-expired-trial",
      amount: 29_990,
    });

    expect(result.discount?.discountedAmount).toBe(24_592);
  });

  it("rejects users whose trial ends outside the configured month", async () => {
    findSubscription.mockResolvedValue(firstPaymentSubscription({
      trialEndsAt: new Date("2026-10-01T04:00:00.000Z"),
    }) as never);

    const result = await quotePlatformDiscount({
      code: "PRIMERMES18",
      plan: "INDIVIDUAL",
      businessId: "business-next-month",
      amount: 12_990,
    });

    expect(result).toEqual({ error: "Este codigo no aplica a la fecha de termino de tu prueba" });
  });

  it("rejects a customer that already completed a paid month", async () => {
    findSubscription.mockResolvedValue(firstPaymentSubscription({
      status: "ACTIVE",
      hasCountedAsPaidReferral: true,
      lastPaymentId: "payment-1",
    }) as never);

    const result = await quotePlatformDiscount({
      code: "PRIMERMES18",
      plan: "EQUIPO",
      businessId: "business-paid",
      amount: 29_990,
    });

    expect(result).toEqual({ error: "Este codigo es exclusivo para el primer pago de usuarios nuevos" });
  });

  it("allows retrying an abandoned checkout with the same pending redemption", async () => {
    findDiscount.mockResolvedValue(discount({
      redemptions: [{ businessId: "business-retry", status: "PENDING" }],
    }) as never);

    const result = await quotePlatformDiscount({
      code: "PRIMERMES18",
      plan: "INDIVIDUAL",
      businessId: "business-retry",
      amount: 12_990,
    });

    expect(result.discount).toBeDefined();
  });

  it("does not allow redeeming a code twice after the first payment", async () => {
    findDiscount.mockResolvedValue(discount({
      redemptions: [{ businessId: "business-used", status: "APPLIED" }],
    }) as never);

    const result = await quotePlatformDiscount({
      code: "PRIMERMES18",
      plan: "INDIVIDUAL",
      businessId: "business-used",
      amount: 12_990,
    });

    expect(result).toEqual({ error: "Este negocio ya uso este codigo" });
    expect(findSubscription).not.toHaveBeenCalled();
  });
});
