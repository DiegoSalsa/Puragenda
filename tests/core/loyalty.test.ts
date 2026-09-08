import { describe, expect, it } from "vitest";
import { calculateLoyaltyRedemptionRate, calculateLoyaltyReward, loyaltyPreviewStamps, loyaltyProgressCopy, validateLoyaltyNoStacking } from "@/core/loyalty";

describe("loyalty reward calculations", () => {
  it("calculates percentage rewards from the canonical subtotal", () => {
    expect(calculateLoyaltyReward({ rewardType: "PERCENTAGE", discountValue: 20, subtotal: 10_000, serviceBasePrices: new Map() }))
      .toEqual({ originalTotal: 10_000, discountAmount: 2_000, discountedTotal: 8_000, automaticallyPriced: true });
  });

  it("calculates fixed rewards and never creates a negative total", () => {
    expect(calculateLoyaltyReward({ rewardType: "FIXED", discountValue: 8_000, subtotal: 5_000, serviceBasePrices: new Map() }))
      .toMatchObject({ discountAmount: 5_000, discountedTotal: 0 });
  });

  it("makes only the configured service base price free and leaves extras payable", () => {
    expect(calculateLoyaltyReward({ rewardType: "FREE_SERVICE", freeServiceId: "haircut", subtotal: 15_000, serviceBasePrices: new Map([["haircut", 10_000]]) }))
      .toMatchObject({ discountAmount: 10_000, discountedTotal: 5_000 });
  });

  it("rejects free-service rewards when the configured service is absent", () => {
    expect(calculateLoyaltyReward({ rewardType: "FREE_SERVICE", freeServiceId: "haircut", subtotal: 15_000, serviceBasePrices: new Map([["color", 15_000]]) }))
      .toEqual({ error: "Este premio solo se puede usar al reservar el servicio gratuito configurado" });
  });

  it("keeps custom rewards informational and does not change price", () => {
    expect(calculateLoyaltyReward({ rewardType: "CUSTOM", subtotal: 10_000, serviceBasePrices: new Map() }))
      .toEqual({ originalTotal: 10_000, discountAmount: 0, discountedTotal: 10_000, automaticallyPriced: false });
  });

  it("uses human progress language", () => {
    expect(loyaltyProgressCopy(0, 10)).toBe("Tu primera visita ya cuenta");
    expect(loyaltyProgressCopy(5, 10)).toContain("mitad");
    expect(loyaltyProgressCopy(9, 10)).toBe("Te falta solo 1 visita");
  });

  it("rejects reward stacking with promotions and booking discounts", () => {
    expect(validateLoyaltyNoStacking({ rewardCode: "R", promotionId: "P" })).toHaveProperty("error");
    expect(validateLoyaltyNoStacking({ rewardCode: "R", discountCode: "D" })).toHaveProperty("error");
    expect(validateLoyaltyNoStacking({ rewardCode: "R" })).toEqual({ valid: true });
  });

  it("keeps preview states visual-only and adapts them to the configured goal", () => {
    expect(loyaltyPreviewStamps(5, "start")).toBe(0);
    expect(loyaltyPreviewStamps(5, "progress")).toBe(2);
    expect(loyaltyPreviewStamps(12, "progress")).toBe(4);
    expect(loyaltyPreviewStamps(12, "oneLeft")).toBe(11);
    expect(loyaltyPreviewStamps(12, "reward")).toBe(12);
  });

  it("calculates redemption rate with a zero-safe denominator", () => {
    expect(calculateLoyaltyRedemptionRate(0, 0)).toBe(0);
    expect(calculateLoyaltyRedemptionRate(10, 4)).toBe(40);
    expect(calculateLoyaltyRedemptionRate(10, 99)).toBe(100);
  });
});
