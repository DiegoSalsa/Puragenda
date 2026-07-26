import { describe, expect, it } from "vitest";
import { calculateWidgetPromotion } from "@/core/widget-promotion";

describe("calculateWidgetPromotion", () => {
  it("applies a percentage discount to the canonical subtotal", () => {
    expect(calculateWidgetPromotion({
      subtotal: 25_000,
      discountType: "PERCENTAGE",
      discountValue: 20,
    }).quote).toEqual({
      originalTotal: 25_000,
      discountAmount: 5_000,
      discountedTotal: 20_000,
    });
  });

  it("caps fixed discounts at the subtotal", () => {
    expect(calculateWidgetPromotion({
      subtotal: 4_000,
      discountType: "FIXED",
      discountValue: 10_000,
    }).quote).toEqual({
      originalTotal: 4_000,
      discountAmount: 4_000,
      discountedTotal: 0,
    });
  });

  it("rejects promotions outside their configured date range", () => {
    const result = calculateWidgetPromotion({
      subtotal: 20_000,
      discountType: "PERCENTAGE",
      discountValue: 10,
      discountStartsAt: "2026-08-01T00:00:00.000Z",
      now: new Date("2026-07-26T12:00:00.000Z"),
    });

    expect(result.quote).toBeUndefined();
    expect(result.error).toContain("todavía no comienza");
  });

  it("enforces the minimum subtotal", () => {
    const result = calculateWidgetPromotion({
      subtotal: 9_999,
      discountType: "FIXED",
      discountValue: 2_000,
      discountMinSubtotal: 10_000,
    });

    expect(result.quote).toBeUndefined();
    expect(result.error).toContain("mínimo");
  });
});
