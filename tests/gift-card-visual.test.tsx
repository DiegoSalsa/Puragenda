import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GiftCardVisual } from "@/components/gift-cards/gift-card-visual";

describe("GiftCardVisual", () => {
  it("renders an amount card with business branding", () => {
    const html = renderToStaticMarkup(<GiftCardVisual
      businessName="Estética Bella"
      logoUrl="https://example.com/logo.png"
      giftCardName="Un regalo para ti"
      type="BALANCE"
      faceValue={55000}
      shortMessage="Regala un momento especial"
      background="#FFF5BA"
      accent="#FF8FAB"
      text="#111111"
      currencyCode="CLP"
    />);

    expect(html).toContain("Estética Bella");
    expect(html).toContain("Un regalo para ti");
    expect(html).toContain("55.000");
    expect(html).toContain("Gift Card");
    expect(html).toContain("https://example.com/logo.png");
  });

  it("renders service benefits and a fallback mark without a logo", () => {
    const html = renderToStaticMarkup(<GiftCardVisual
      compact
      businessName="Sin logo Spa"
      logoUrl={null}
      giftCardName="Mirada perfecta"
      type="SERVICE"
      services={[{ name: "Lifting de pestañas" }, { name: "Perfilado de cejas", quantity: 2 }]}
      background="#DDD0FF"
      accent="#7C3AED"
      text="#111111"
      currencyCode="CLP"
    />);

    expect(html).toContain("Sin logo Spa");
    expect(html).toContain("Lifting de pestañas");
    expect(html).toContain("Perfilado de cejas × 2");
    expect(html).not.toContain("<img");
  });
});
