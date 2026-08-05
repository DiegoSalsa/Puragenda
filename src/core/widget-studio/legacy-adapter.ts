import {
  isSafeWidgetAssetUrl,
  isSafeWidgetExternalUrl,
  type WidgetDesignDocument,
  type WidgetSection,
} from "./schema";

type LegacyBusinessAppearance = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  textMutedColor: string;
  widgetFontSize: number;
  widgetCornerRadius: number;
  widgetShadowStyle: string;
  widgetHeaderAlign: string;
};

type LegacyPromoBlock = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: "HEADER" | "BETWEEN_SERVICES" | "FOOTER";
  position: number;
  isVisible: boolean;
  textAlign: string;
};

function promoToSection(block: LegacyPromoBlock): WidgetSection {
  const safeId = block.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const legacyImageUrl = isSafeWidgetAssetUrl(block.imageUrl) ? block.imageUrl.trim() : undefined;
  const ctaUrl = block.linkUrl && isSafeWidgetExternalUrl(block.linkUrl)
    ? block.linkUrl.trim()
    : "";
  return {
    id: `section_legacy_${safeId}`,
    type: "section",
    name: block.title,
    hidden: !block.isVisible,
    locked: false,
    layout: "stack",
    columns: "1",
    align: "stretch",
    gap: 12,
    padding: 0,
    minHeight: 0,
    backgroundColor: "transparent",
    backgroundFit: "cover",
    backgroundFocalPoint: { x: 50, y: 50 },
    overlayColor: "#000000",
    overlayOpacity: 0,
    radius: 0,
    visibility: { mobile: true, tablet: true, desktop: true },
    children: [
      {
        id: `banner_legacy_${safeId}`,
        type: "banner",
        name: block.title,
        hidden: !block.isVisible,
        locked: false,
        visibility: { mobile: true, tablet: true, desktop: true },
        promotionId: block.id,
        ...(legacyImageUrl ? { legacyImageUrl } : {}),
        title: block.title,
        subtitle: block.subtitle || "",
        badge: "",
        ctaLabel: ctaUrl ? "Ver más" : "",
        ctaUrl,
        variant: "overlay",
        align: block.textAlign === "center" || block.textAlign === "right" ? block.textAlign : "left",
        presentation: {
          fit: "cover",
          aspectRatio: "16:9",
          focalPoint: { x: 50, y: 50 },
          width: 100,
          radius: 16,
          opacity: 1,
        },
      },
    ],
  };
}

export function createLegacyWidgetDocument(
  business: LegacyBusinessAppearance,
  promoBlocks: LegacyPromoBlock[],
): WidgetDesignDocument {
  const visibleBlocks = promoBlocks
    .filter((block) => block.isVisible)
    .sort((a, b) => a.position - b.position);
  const byPlacement = (placement: LegacyPromoBlock["placement"]) =>
    visibleBlocks.filter((block) => block.placement === placement).map(promoToSection);

  return {
    schemaVersion: 1,
    meta: {
      name: `${business.name} · Diseño principal`,
      createdFrom: "legacy",
    },
    tokens: {
      colors: {
        primary: business.primaryColor,
        secondary: business.secondaryColor,
        background: business.backgroundColor,
        text: business.textColor,
        textMuted: business.textMutedColor,
      },
      typography: {
        family: "system",
        baseSize: business.widgetFontSize,
        scale: "default",
      },
      shape: {
        radius: business.widgetCornerRadius,
        shadow: ["none", "soft", "strong"].includes(business.widgetShadowStyle)
          ? business.widgetShadowStyle as "none" | "soft" | "strong"
          : "soft",
      },
      spacing: { density: "comfortable" },
    },
    shell: {
      maxWidth: 672,
      headerAlign: ["left", "center", "right"].includes(business.widgetHeaderAlign)
        ? business.widgetHeaderAlign as "left" | "center" | "right"
        : "left",
      showPoweredBy: true,
    },
    system: {
      header: {
        showEyebrow: true,
        eyebrow: "Reserva online",
        showLogo: true,
        layout: "standard",
      },
      progress: { variant: "tabs", showLabels: true },
      service: {
        title: "Selecciona un servicio",
        description: "Elige el servicio que quieras reservar.",
        layout: "list",
        columns: 2,
        showImages: true,
        showDescription: true,
        showDuration: true,
        showPrice: true,
        density: "comfortable",
        cardStyle: "outlined",
      },
      staff: {
        title: "Elige un profesional",
        description: "Selecciona con quién quieres atenderte.",
        layout: "grid",
        showImages: true,
      },
      datetime: {
        title: "Elige fecha y hora",
        description: "Revisa la disponibilidad y selecciona un horario.",
        density: "comfortable",
      },
      details: {
        title: "Completa tus datos",
        description: "Usaremos estos datos para confirmar tu reserva.",
        labelStyle: "above",
      },
    },
    globalSlots: {
      beforeHeader: [],
      afterHeader: byPlacement("HEADER"),
      beforeFooter: byPlacement("FOOTER"),
      afterFooter: [],
    },
    stepSlots: {
      service: {
        beforeIntro: [],
        afterIntro: [],
        beforeMain: byPlacement("BETWEEN_SERVICES"),
        afterMain: [],
        beforeActions: [],
        afterActions: [],
      },
    },
  };
}
