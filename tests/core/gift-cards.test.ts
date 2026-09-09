import { describe, expect, it } from "vitest";
import { asMoney, isGiftCardDepleted, quoteBalanceGiftCard, quoteServiceGiftCard } from "@/core/gift-cards";
import { giftCardPurchaseDetailsSchema, giftCardTemplateSchema, manualGiftCardSaleSchema } from "@/server/validations/gift-card";

describe("gift card money semantics", () => {
  it("covers a balance partially without exceeding the booking", () => expect(quoteBalanceGiftCard(50_000, 30_000)).toBe(30_000));
  it("uses the whole available balance when it is insufficient", () => expect(quoteBalanceGiftCard(25_000, 40_000)).toBe(25_000));
  it("applies balance coverage to the amount due after discounts", () => {
    const originalPrice = 40_000;
    const discountAmount = 5_000;
    expect(quoteBalanceGiftCard(50_000, originalPrice - discountAmount)).toBe(35_000);
  });
  it("never creates negative a negative payment", () => expect(quoteBalanceGiftCard(-1, 40_000)).toBe(0));
  it("accepts only safe, non-negative integer money", () => {
    expect(asMoney(45_000)).toBe(45_000);
    expect(asMoney(10.5)).toBeNull();
    expect(asMoney(-1)).toBeNull();
  });

  it("service cards cover canonical base prices", () => {
    expect(quoteServiceGiftCard({ services: [{ id: "lifting", basePrice: 25_000 }], entitlements: [{ serviceId: "lifting", quantityRemaining: 1 }], totalDue: 30_000 })).toEqual({ amountCovered: 25_000, coveredServices: [{ serviceId: "lifting", amountCovered: 25_000 }] });
  });

  it("service cards do not cover extras included only in the total", () => {
    const quote = quoteServiceGiftCard({ services: [{ id: "lifting", basePrice: 25_000 }], entitlements: [{ serviceId: "lifting", quantityRemaining: 1 }], totalDue: 30_000 });
    expect(quote.amountCovered).toBe(25_000);
    expect(30_000 - quote.amountCovered).toBe(5_000);
  });

  it("does not consume a different service", () => expect(quoteServiceGiftCard({ services: [{ id: "b", basePrice: 20_000 }], entitlements: [{ serviceId: "a", quantityRemaining: 2 }], totalDue: 20_000 }).amountCovered).toBe(0));
  it("ignores exhausted and detached entitlements", () => expect(quoteServiceGiftCard({ services: [{ id: "a", basePrice: 20_000 }], entitlements: [{ serviceId: "a", quantityRemaining: 0 }, { serviceId: null, quantityRemaining: 2 }], totalDue: 20_000 }).amountCovered).toBe(0));
  it("caps service coverage at the final amount due", () => expect(quoteServiceGiftCard({ services: [{ id: "a", basePrice: 20_000 }], entitlements: [{ serviceId: "a", quantityRemaining: 1 }], totalDue: 15_000 }).amountCovered).toBe(15_000));
  it("detects depleted balance cards", () => expect(isGiftCardDepleted({ type: "BALANCE", remainingBalance: 0 })).toBe(true));
  it("detects depleted service cards only when every benefit is gone", () => {
    expect(isGiftCardDepleted({ type: "SERVICE", remainingBalance: null, entitlements: [{ quantityRemaining: 0 }, { quantityRemaining: 0 }] })).toBe(true);
    expect(isGiftCardDepleted({ type: "SERVICE", remainingBalance: null, entitlements: [{ quantityRemaining: 1 }] })).toBe(false);
  });
});

describe("gift card input contracts", () => {
  const base = { name: "Gift Card", description: "", salePrice: 45_000, isActive: true, isPublic: true, designPreset: "classic", backgroundColor: "#FFF5BA", accentColor: "#FF8FAB", textColor: "#111111", imageUrl: "", shortMessage: "", services: [] };
  it("accepts sale price different from face value", () => expect(giftCardTemplateSchema.safeParse({ ...base, type: "BALANCE", faceValue: 50_000 }).success).toBe(true));
  it("requires face value for balance cards", () => expect(giftCardTemplateSchema.safeParse({ ...base, type: "BALANCE", faceValue: null }).success).toBe(false));
  it("requires at least one entitlement for service cards", () => expect(giftCardTemplateSchema.safeParse({ ...base, type: "SERVICE", faceValue: null }).success).toBe(false));
  it("accepts service packs with progressive quantities", () => expect(giftCardTemplateSchema.safeParse({ ...base, type: "SERVICE", faceValue: null, services: [{ serviceId: "manicure", quantity: 3 }] }).success).toBe(true));
  it("requires gift recipient data", () => expect(giftCardPurchaseDetailsSchema.safeParse({ templateId: "t1", buyerName: "Diego", buyerEmail: "d@example.com", deliveryMode: "GIFT" }).success).toBe(false));
  it("caps gift messages at 500 characters", () => expect(giftCardPurchaseDetailsSchema.safeParse({ templateId: "t1", buyerName: "Diego", buyerEmail: "d@example.com", deliveryMode: "GIFT", recipientName: "Maria", recipientEmail: "m@example.com", senderName: "Diego", giftMessage: "x".repeat(501) }).success).toBe(false));
  it("manual sales require a declared payment method", () => expect(manualGiftCardSaleSchema.safeParse({ templateId: "t1", buyerName: "Diego", buyerEmail: "d@example.com", deliveryMode: "SELF" }).success).toBe(false));
});
