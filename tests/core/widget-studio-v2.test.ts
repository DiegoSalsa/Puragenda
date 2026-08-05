import { describe, expect, it } from "vitest";
import { createLegacyWidgetDocument } from "@/core/widget-studio/legacy-adapter";
import {
  extractWidgetAssetReferences,
  extractWidgetPromotionIds,
  getWidgetBannerPromotionId,
  isSafeWidgetAssetUrl,
  parseWidgetDesignDocument,
  repairUnavailableWidgetAssets,
  type WidgetDesignDocument,
} from "@/core/widget-studio/schema";

const legacyBusiness = {
  name: "Negocio de prueba",
  primaryColor: "#7C3AED",
  secondaryColor: "#5B21B6",
  backgroundColor: "#FFFFFF",
  textColor: "#111111",
  textMutedColor: "#666666",
  widgetFontSize: 14,
  widgetCornerRadius: 16,
  widgetShadowStyle: "soft",
  widgetHeaderAlign: "left",
};

function legacyPromo(overrides: Partial<{
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: "HEADER" | "BETWEEN_SERVICES" | "FOOTER";
  position: number;
  isVisible: boolean;
  textAlign: string;
}> = {}) {
  return {
    id: "promo_legacy_1",
    title: "20% de descuento",
    subtitle: "Promoción de prueba",
    imageUrl: "/uploads/promociones/invierno.webp",
    linkUrl: null,
    placement: "HEADER" as const,
    position: 0,
    isVisible: true,
    textAlign: "center",
    ...overrides,
  };
}

function firstBanner(document: WidgetDesignDocument) {
  const block = document.globalSlots.afterHeader[0]?.children[0];
  if (!block || block.type !== "banner") throw new Error("Banner de prueba ausente");
  return block;
}

describe("Widget Studio V2 legacy compatibility", () => {
  it("keeps a safe root-relative legacy image and produces a valid draft", () => {
    const document = createLegacyWidgetDocument(legacyBusiness, [legacyPromo()]);
    const parsed = parseWidgetDesignDocument(document);
    const banner = firstBanner(parsed);

    expect(banner.legacyImageUrl).toBe("/uploads/promociones/invierno.webp");
    expect(banner.promotionId).toBe("promo_legacy_1");
    expect(extractWidgetPromotionIds(parsed)).toEqual(new Set(["promo_legacy_1"]));
  });

  it("drops unsafe legacy media and links instead of blocking the whole draft", () => {
    const document = createLegacyWidgetDocument(legacyBusiness, [
      legacyPromo({
        imageUrl: "javascript:alert(1)",
        linkUrl: "http://malicious.example/promo",
      }),
    ]);
    const parsed = parseWidgetDesignDocument(document);
    const banner = firstBanner(parsed);

    expect(banner.legacyImageUrl).toBeUndefined();
    expect(banner.ctaUrl).toBe("");
    expect(banner.ctaLabel).toBe("");
  });

  it("recognizes promotion IDs in drafts created before the explicit promotionId field", () => {
    const document = createLegacyWidgetDocument(legacyBusiness, [legacyPromo()]);
    const banner = firstBanner(document);
    delete banner.promotionId;

    expect(getWidgetBannerPromotionId(banner)).toBe("promo_legacy_1");
    expect(extractWidgetPromotionIds(document)).toEqual(new Set(["promo_legacy_1"]));
  });

  it("accepts only safe same-origin relative or HTTPS asset URLs", () => {
    expect(isSafeWidgetAssetUrl("/uploads/banner.webp")).toBe(true);
    expect(isSafeWidgetAssetUrl("https://cdn.example.com/banner.webp")).toBe(true);
    expect(isSafeWidgetAssetUrl("http://localhost:3000/banner.webp")).toBe(true);
    expect(isSafeWidgetAssetUrl("//evil.example/banner.webp")).toBe(false);
    expect(isSafeWidgetAssetUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeWidgetAssetUrl("https://user:secret@example.com/banner.webp")).toBe(false);
    expect(isSafeWidgetAssetUrl("/uploads\\banner.webp")).toBe(false);
  });
});

describe("Widget Studio V2 document validation", () => {
  it("rejects duplicate IDs across sections and blocks", () => {
    const document = createLegacyWidgetDocument(legacyBusiness, [
      legacyPromo({ id: "same_id", placement: "HEADER" }),
      legacyPromo({ id: "same_id", placement: "FOOTER", position: 1 }),
    ]);

    expect(() => parseWidgetDesignDocument(document)).toThrow(/repetido/i);
  });

  it("rejects unsafe URLs injected into an existing banner document", () => {
    const document = createLegacyWidgetDocument(legacyBusiness, [legacyPromo()]);
    firstBanner(document).legacyImageUrl = "//evil.example/banner.webp";

    expect(() => parseWidgetDesignDocument(document)).toThrow(/inválida|insegura/i);
  });

  it("repairs unavailable assets without losing the image block layout", () => {
    const document = createLegacyWidgetDocument(legacyBusiness, []);
    document.shell.logoAssetId = "asset_logo_missing";
    document.globalSlots.afterHeader.push({
      id: "section_recovery",
      type: "section",
      name: "Composición recuperable",
      hidden: false,
      locked: false,
      layout: "stack",
      columns: "1",
      align: "stretch",
      gap: 18,
      padding: 24,
      minHeight: 280,
      backgroundColor: "transparent",
      backgroundAssetId: "asset_background_missing",
      backgroundFit: "cover",
      backgroundFocalPoint: { x: 42, y: 61 },
      overlayColor: "#000000",
      overlayOpacity: 0.2,
      radius: 20,
      visibility: { mobile: true, tablet: true, desktop: true },
      children: [{
        id: "image_recovery",
        type: "image",
        name: "Foto promocional",
        hidden: false,
        locked: false,
        visibility: { mobile: true, tablet: true, desktop: true },
        assetId: "asset_image_missing",
        alt: "Foto promocional",
        decorative: false,
        caption: "Texto conservado",
        linkUrl: "",
        mode: "overlay",
        presentation: {
          fit: "contain",
          aspectRatio: "4:3",
          focalPoint: { x: 33, y: 72 },
          width: 64,
          radius: 22,
          opacity: 0.8,
        },
        overlay: { x: 17, y: 23, width: 48, zIndex: 4, mobileFallback: "scaled" },
      }],
    });
    const originalImage = document.globalSlots.afterHeader[0].children[0];

    const repaired = repairUnavailableWidgetAssets(document, new Set());
    const recoveredImage = repaired.document.globalSlots.afterHeader[0].children[0];

    expect(repaired.repairedReferences).toBe(3);
    expect(repaired.repairedImageBlockIds).toEqual(["image_recovery"]);
    expect(repaired.document.shell.logoAssetId).toBeUndefined();
    expect(repaired.document.globalSlots.afterHeader[0].backgroundAssetId).toBeUndefined();
    expect(recoveredImage.type).toBe("image");
    if (originalImage.type !== "image" || recoveredImage.type !== "image") throw new Error("Imagen de prueba ausente");
    expect(recoveredImage.assetId).toBeUndefined();
    expect(recoveredImage.presentation).toEqual(originalImage.presentation);
    expect(recoveredImage.overlay).toEqual(originalImage.overlay);
    expect(recoveredImage.caption).toBe("Texto conservado");
    expect(extractWidgetAssetReferences(repaired.document)).toEqual([]);
    expect(() => parseWidgetDesignDocument(repaired.document)).not.toThrow();

    recoveredImage.assetId = "asset_replacement";
    expect(parseWidgetDesignDocument(repaired.document).globalSlots.afterHeader[0].children[0]).toEqual(
      expect.objectContaining({
        assetId: "asset_replacement",
        presentation: originalImage.presentation,
        overlay: originalImage.overlay,
      }),
    );
  });
});
