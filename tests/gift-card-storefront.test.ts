import { describe, expect, it } from "vitest";
import { formatGiftCardCurrency, giftCardGridClass } from "@/app/widget/[slug]/gift-cards/gift-card-storefront";
import { getWidgetContrastColor, getWidgetShellShadow } from "@/components/widget/widget-shell";

describe("public Gift Card storefront", () => {
  it("uses the business currency locale and a narrow symbol", () => {
    expect(formatGiftCardCurrency(55_000, "CLP", "es")).toBe("$55.000");
    expect(formatGiftCardCurrency(50, "USD", "en-US")).toBe("$50");
  });

  it("gives a single card more space and switches multiple cards to two columns", () => {
    expect(giftCardGridClass(1)).toContain("max-w-xl");
    expect(giftCardGridClass(2)).toContain("sm:grid-cols-2");
    expect(giftCardGridClass(5)).toContain("sm:grid-cols-2");
  });

  it("shares readable brand contrast and shell shadow rules", () => {
    expect(getWidgetContrastColor("#F062AD")).toBe("#000000");
    expect(getWidgetContrastColor("#111111")).toBe("#FFFFFF");
    expect(getWidgetShellShadow("none")).toBe("none");
    expect(getWidgetShellShadow("strong")).toContain("70px");
  });
});
