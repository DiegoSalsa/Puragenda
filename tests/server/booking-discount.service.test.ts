import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({
  prisma: { bookingDiscountCode: { findFirst } },
}));

import {
  calculateBookingDiscount,
  normalizeBookingDiscountCode,
  resolveBookingDiscount,
} from "@/server/services/booking-discount.service";

describe("booking discount codes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes codes and scopes lookup to the business", async () => {
    findFirst.mockResolvedValue({
      id: "code-1",
      code: "VERANO10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minSubtotal: 0,
      startsAt: null,
      expiresAt: null,
    });

    const result = await resolveBookingDiscount({ code: " verano 10 ", businessId: "business-1", subtotal: 20_000 });

    expect(normalizeBookingDiscountCode(" verano 10 ")).toBe("VERANO10");
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { businessId: "business-1", code: "VERANO10", isActive: true },
    }));
    expect(result.quote).toMatchObject({ discountAmount: 2_000, discountedTotal: 18_000 });
  });

  it("rejects codes outside the configured date window", () => {
    expect(calculateBookingDiscount({
      subtotal: 10_000,
      discountType: "PERCENTAGE",
      discountValue: 20,
      startsAt: "2026-08-20T00:00:00.000Z",
      now: new Date("2026-08-19T23:59:00.000Z"),
    })).toEqual({ error: "Este código todavía no está activo" });

    expect(calculateBookingDiscount({
      subtotal: 10_000,
      discountType: "PERCENTAGE",
      discountValue: 20,
      expiresAt: "2026-08-19T00:00:00.000Z",
      now: new Date("2026-08-19T00:01:00.000Z"),
    })).toEqual({ error: "Este código ya expiró" });
  });

  it("recalculates fixed discounts authoritatively and caps at subtotal", () => {
    expect(calculateBookingDiscount({
      subtotal: 5_000,
      discountType: "FIXED",
      discountValue: 8_000,
    })).toMatchObject({
      quote: { originalTotal: 5_000, discountAmount: 5_000, discountedTotal: 0 },
    });
  });

  it("rejects a code below its minimum subtotal", () => {
    expect(calculateBookingDiscount({
      subtotal: 9_999,
      discountType: "PERCENTAGE",
      discountValue: 10,
      minSubtotal: 10_000,
    })).toEqual({ error: "Este código requiere un mínimo de 10000" });
  });
});
