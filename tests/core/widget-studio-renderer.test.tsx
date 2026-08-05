import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  WidgetDesignRuntimeProvider,
  WidgetDesignSlot,
} from "@/components/widget-studio/widget-design-renderer";
import { createLegacyWidgetDocument } from "@/core/widget-studio/legacy-adapter";
import type {
  WidgetContentBlock,
  WidgetSection,
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

const imageBlock: Extract<WidgetContentBlock, { type: "image" }> = {
  id: "image_test",
  type: "image",
  name: "Imagen",
  hidden: false,
  locked: false,
  visibility: { mobile: true, tablet: true, desktop: true },
  assetId: "asset_test",
  alt: "Imagen de prueba",
  decorative: false,
  caption: "",
  linkUrl: "",
  mode: "flow",
  presentation: {
    fit: "cover",
    aspectRatio: "16:9",
    focalPoint: { x: 50, y: 50 },
    width: 100,
    radius: 16,
    opacity: 1,
  },
  overlay: {
    x: 10,
    y: 10,
    width: 36,
    zIndex: 2,
    mobileFallback: "flow",
  },
};

function sectionWith(block: WidgetContentBlock): WidgetSection {
  return {
    id: "section_test",
    type: "section",
    name: "Sección",
    hidden: false,
    locked: false,
    layout: "stack",
    columns: "1",
    align: "stretch",
    gap: 16,
    padding: 16,
    minHeight: 0,
    backgroundColor: "transparent",
    backgroundFit: "cover",
    backgroundFocalPoint: { x: 50, y: 50 },
    overlayColor: "#000000",
    overlayOpacity: 0,
    radius: 0,
    visibility: { mobile: true, tablet: true, desktop: true },
    children: [block],
  };
}

function renderSection(
  section: WidgetSection,
  onNext?: () => void,
  canvasTransformsEnabled = false,
  canvasGridEnabled = false,
  canvasGridStep = 5,
  selectedIds = [imageBlock.id],
  canvasDevice?: "mobile" | "tablet" | "desktop",
  assetOverrides?: Record<string, { id: string; url: string; width: number; height: number; altDefault: string }>,
) {
  const document = createLegacyWidgetDocument(legacyBusiness, []);
  document.globalSlots.afterHeader = [section];
  return renderToStaticMarkup(
    <WidgetDesignRuntimeProvider
      promotions={{}}
      onNext={onNext}
      selectedId={selectedIds.at(-1) ?? null}
      selectedIds={selectedIds}
      canvasTransformsEnabled={canvasTransformsEnabled}
      canvasGridEnabled={canvasGridEnabled}
      canvasGridStep={canvasGridStep}
      canvasDevice={canvasDevice}
    >
      <WidgetDesignSlot
        document={document}
        assets={assetOverrides ?? {
          asset_test: {
            id: "asset_test",
            url: "/uploads/widget/test.webp",
            width: 1200,
            height: 800,
            altDefault: "Imagen",
          },
        }}
        slot="afterHeader"
        previewMode={canvasTransformsEnabled}
        editable={canvasTransformsEnabled}
      />
    </WidgetDesignRuntimeProvider>,
  );
}

describe("Widget Studio renderer", () => {
  it("uses a selected image as a background without rendering it twice in the flow", () => {
    const section = {
      ...sectionWith(imageBlock),
      backgroundAssetId: imageBlock.assetId,
    };
    const html = renderSection(section);

    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).not.toContain("<figure");
  });

  it("collapses a missing overlay image publicly but keeps a compact editor recovery target", () => {
    const overlay = {
      ...imageBlock,
      mode: "overlay" as const,
    };

    const publicMarkup = renderSection(sectionWith(overlay), undefined, false, false, 5, [overlay.id], undefined, {});
    const editorMarkup = renderSection(sectionWith(overlay), undefined, true, false, 5, [overlay.id], undefined, {});

    expect(publicMarkup).not.toContain("widget-design-section-with-overlay");
    expect(publicMarkup).not.toContain("Imagen no disponible");
    expect(publicMarkup).not.toContain("data-widget-slot");
    expect(editorMarkup).toContain("widget-design-section-with-overlay");
    expect(editorMarkup).toContain("Imagen no disponible");
  });

  it("respects every mobile fallback for overlay images", () => {
    for (const [fallback, expectedClass] of [
      ["flow", 'data-widget-mobile-fallback="flow"'],
      ["hidden", "max-sm:hidden"],
      ["scaled", "absolute"],
    ] as const) {
      const overlay = {
        ...imageBlock,
        mode: "overlay" as const,
        overlay: { ...imageBlock.overlay, mobileFallback: fallback },
      };
      expect(renderSection(sectionWith(overlay))).toContain(expectedClass);
    }
  });

  it("only enables a custom Continue button when the booking runtime can advance", () => {
    const block: Extract<WidgetContentBlock, { type: "button" }> = {
      id: "button_next",
      type: "button",
      name: "Continuar",
      hidden: false,
      locked: false,
      visibility: { mobile: true, tablet: true, desktop: true },
      label: "Continuar",
      action: "next",
      url: "",
      newTab: false,
      variant: "primary",
      align: "stretch",
    };

    expect(renderSection(sectionWith(block))).toContain("disabled");
    expect(renderSection(sectionWith(block), vi.fn())).not.toContain("disabled");
  });

  it("shows direct overlay controls only when the advanced canvas enables them", () => {
    const overlay = {
      ...imageBlock,
      mode: "overlay" as const,
    };

    const publicMarkup = renderSection(sectionWith(overlay));
    const advancedMarkup = renderSection(sectionWith(overlay), undefined, true);

    expect(publicMarkup).not.toContain("data-widget-resize-handle");
    expect(publicMarkup).not.toContain("data-widget-snap-axis");
    expect(publicMarkup).toContain("widget-design-section-with-overlay");
    expect(advancedMarkup.match(/data-widget-resize-handle/g)).toHaveLength(8);
    expect(advancedMarkup.match(/data-widget-snap-axis/g)).toHaveLength(2);
    expect(advancedMarkup).toContain(
      "Redimensionar desde la esquina superior izquierda",
    );
    expect(advancedMarkup).toContain(
      "Redimensionar desde el borde izquierdo",
    );
    expect(advancedMarkup).toContain("Mantén Alt para omitir las guías");
  });

  it("renders the editor grid only inside the private advanced preview", () => {
    const overlay = {
      ...imageBlock,
      mode: "overlay" as const,
    };

    const publicMarkup = renderSection(sectionWith(overlay));
    const advancedMarkup = renderSection(
      sectionWith(overlay),
      undefined,
      true,
      true,
      2.5,
    );

    expect(publicMarkup).not.toContain("data-widget-canvas-grid");
    expect(advancedMarkup).toContain('data-widget-canvas-grid="true"');
    expect(advancedMarkup).toContain("widget-studio-canvas-grid");
    expect(advancedMarkup).toContain("--widget-studio-grid-size:2.5%");
    expect(advancedMarkup).toContain("--widget-studio-major-grid-size:10%");
  });

  it("marks every selected overlay but exposes resize handles only on the primary one", () => {
    const first = { ...imageBlock, id: "image_first", groupId: "group_images", mode: "overlay" as const };
    const second = {
      ...imageBlock,
      id: "image_second",
      groupId: "group_images",
      mode: "overlay" as const,
      overlay: { ...imageBlock.overlay, x: 48 },
    };
    const section = { ...sectionWith(first), children: [first, second] };
    const markup = renderSection(
      section,
      undefined,
      true,
      false,
      5,
      [first.id, second.id],
    );

    expect(markup.match(/data-widget-multi-selected="true"/g)).toHaveLength(2);
    expect(markup.match(/data-widget-group-id="group_images"/g)).toHaveLength(2);
    expect(markup.match(/data-widget-resize-handle/g)).toHaveLength(8);
    expect(markup.match(/widget-studio-preview-transforming/g)).toHaveLength(1);
  });

  it("supports free positioning for editable text without duplicating it in the flow", () => {
    const block: Extract<WidgetContentBlock, { type: "text" }> = {
      id: "text_free",
      type: "text",
      name: "Título libre",
      hidden: false,
      locked: false,
      visibility: { mobile: true, tablet: true, desktop: true },
      canvas: {
        mode: "free",
        x: 18,
        y: 24,
        width: 50,
        zIndex: 4,
        mobileFallback: "flow",
      },
      semantic: "heading",
      content: "Texto en canvas",
      align: "left",
      size: "xl",
      color: "text",
    };
    const markup = renderSection(sectionWith(block), undefined, true, false, 5, [block.id]);

    expect(markup.match(/Texto en canvas/g)).toHaveLength(1);
    expect(markup).toContain('data-widget-canvas-transform="true"');
    expect(markup).toContain("--widget-canvas-x:18%");
    expect(markup).toContain("--widget-canvas-width:50%");
    expect(markup).toContain('contentEditable="true"');
  });

  it("uses the selected device override in the private preview and exposes all public breakpoint variables", () => {
    const block: Extract<WidgetContentBlock, { type: "text" }> = {
      id: "text_responsive",
      type: "text",
      name: "Texto responsive",
      hidden: false,
      locked: false,
      visibility: { mobile: true, tablet: true, desktop: true },
      canvas: {
        mode: "free",
        x: 12,
        y: 16,
        width: 44,
        zIndex: 2,
        mobileFallback: "scaled",
        responsive: {
          mobile: { x: 4, y: 8, width: 80 },
          tablet: { x: 20, y: 18, width: 60 },
        },
      },
      semantic: "heading",
      content: "Responsive",
      align: "left",
      size: "xl",
      color: "text",
    };

    const publicMarkup = renderSection(sectionWith(block));
    const mobilePreview = renderSection(
      sectionWith(block),
      undefined,
      true,
      false,
      5,
      [block.id],
      "mobile",
    );

    expect(publicMarkup).toContain("--widget-canvas-mobile-x:4%");
    expect(publicMarkup).toContain("--widget-canvas-tablet-width:60%");
    expect(publicMarkup).toContain("--widget-canvas-desktop-x:12%");
    expect(mobilePreview).toContain('data-widget-canvas-device="mobile"');
    expect(mobilePreview).toContain("left:4%");
    expect(mobilePreview).toContain("top:8%");
    expect(mobilePreview).toContain("width:80%");
  });

  it("does not execute custom button actions while the editor is designing", () => {
    const block: Extract<WidgetContentBlock, { type: "button" }> = {
      id: "button_editor_safe",
      type: "button",
      name: "Continuar",
      hidden: false,
      locked: false,
      visibility: { mobile: true, tablet: true, desktop: true },
      label: "Continuar",
      action: "next",
      url: "",
      newTab: false,
      variant: "primary",
      align: "stretch",
    };
    const markup = renderSection(sectionWith(block), vi.fn(), true, false, 5, [block.id]);

    expect(markup).not.toContain('<button type="button" class="flex w-full"');
    expect(markup).toContain('contentEditable="true"');
  });
});
