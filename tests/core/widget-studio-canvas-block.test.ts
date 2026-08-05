import { describe, expect, it } from "vitest";
import {
  getWidgetCanvasPlacement,
  getWidgetCanvasPlacementForDevice,
  hasWidgetCanvasBreakpointOverride,
  isWidgetCanvasBlock,
  setWidgetCanvasBreakpointOverride,
  setWidgetCanvasMode,
  updateWidgetCanvasPlacement,
  updateWidgetCanvasPlacementForDevice,
} from "@/core/widget-studio/canvas-block";
import type { WidgetContentBlock } from "@/core/widget-studio/schema";

const base = {
  id: "block_canvas_test",
  name: "Texto de prueba",
  hidden: false,
  locked: false,
  visibility: { mobile: true, tablet: true, desktop: true },
} as const;

function textBlock(): Extract<WidgetContentBlock, { type: "text" }> {
  return {
    ...base,
    type: "text",
    semantic: "heading",
    content: "Hola",
    align: "left",
    size: "xl",
    color: "text",
  };
}

describe("widget canvas blocks", () => {
  it("keeps legacy flow blocks in the document flow", () => {
    const block = textBlock();
    expect(isWidgetCanvasBlock(block)).toBe(false);
    expect(getWidgetCanvasPlacement(block)).toMatchObject({ mode: "flow", x: 10, y: 10 });
  });

  it("moves text to the free canvas without changing its content", () => {
    const block = textBlock();
    setWidgetCanvasMode(block, "free");
    updateWidgetCanvasPlacement(block, { x: 24, y: 18, width: 52, zIndex: 4 });

    expect(isWidgetCanvasBlock(block)).toBe(true);
    expect(block.content).toBe("Hola");
    expect(getWidgetCanvasPlacement(block)).toMatchObject({
      mode: "free",
      x: 24,
      y: 18,
      width: 52,
      zIndex: 4,
    });
  });

  it("maps legacy image overlays to the same canvas contract", () => {
    const block: Extract<WidgetContentBlock, { type: "image" }> = {
      ...base,
      type: "image",
      assetId: "asset_test",
      alt: "",
      decorative: true,
      caption: "",
      linkUrl: "",
      mode: "overlay",
      presentation: {
        fit: "cover",
        aspectRatio: "16:9",
        focalPoint: { x: 50, y: 50 },
        width: 100,
        radius: 16,
        opacity: 1,
      },
      overlay: { x: 8, y: 12, width: 40, zIndex: 3, mobileFallback: "scaled" },
    };

    expect(isWidgetCanvasBlock(block)).toBe(true);
    expect(getWidgetCanvasPlacement(block)).toMatchObject({ mode: "free", x: 8, y: 12 });
    setWidgetCanvasMode(block, "flow");
    expect(block.mode).toBe("flow");
  });

  it("keeps the general geometry until a device receives an explicit override", () => {
    const block = textBlock();
    setWidgetCanvasMode(block, "free");
    updateWidgetCanvasPlacement(block, { x: 14, y: 20, width: 48 });

    expect(getWidgetCanvasPlacementForDevice(block, "mobile")).toMatchObject({
      x: 14,
      y: 20,
      width: 48,
    });
    expect(hasWidgetCanvasBreakpointOverride(block, "mobile")).toBe(false);

    setWidgetCanvasBreakpointOverride(block, "mobile", true);
    updateWidgetCanvasPlacementForDevice(block, "mobile", { x: 8, y: 12, width: 76 });

    expect(hasWidgetCanvasBreakpointOverride(block, "mobile")).toBe(true);
    expect(getWidgetCanvasPlacementForDevice(block, "mobile")).toMatchObject({
      x: 8,
      y: 12,
      width: 76,
    });
    expect(getWidgetCanvasPlacementForDevice(block, "desktop")).toMatchObject({
      x: 14,
      y: 20,
      width: 48,
    });
  });

  it("restores inheritance without leaving an empty responsive object", () => {
    const block = textBlock();
    setWidgetCanvasMode(block, "free");
    setWidgetCanvasBreakpointOverride(block, "tablet", true);
    updateWidgetCanvasPlacementForDevice(block, "tablet", { x: 86, width: 40 });

    expect(getWidgetCanvasPlacementForDevice(block, "tablet").x).toBe(60);
    setWidgetCanvasBreakpointOverride(block, "tablet", false);

    expect(hasWidgetCanvasBreakpointOverride(block, "tablet")).toBe(false);
    expect(getWidgetCanvasPlacement(block).responsive).toBeUndefined();
  });
});
