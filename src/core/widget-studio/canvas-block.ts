import type {
  WidgetCanvasDevice,
  WidgetCanvasPlacement,
  WidgetContentBlock,
} from "@/core/widget-studio/schema";

type WidgetCanvasGeometry = Pick<WidgetCanvasPlacement, "x" | "y" | "width">;

export const DEFAULT_WIDGET_CANVAS_PLACEMENT: WidgetCanvasPlacement = {
  mode: "flow",
  x: 10,
  y: 10,
  width: 36,
  zIndex: 2,
  mobileFallback: "flow",
};

export function supportsFreeCanvas(block: WidgetContentBlock) {
  return block.type !== "spacer";
}

export function isWidgetCanvasBlock(block: WidgetContentBlock) {
  if (block.type === "image") return block.mode === "overlay";
  return supportsFreeCanvas(block) && block.canvas?.mode === "free";
}

export function getWidgetCanvasPlacement(
  block: WidgetContentBlock,
): WidgetCanvasPlacement {
  if (block.type === "image") {
    return {
      mode: block.mode === "overlay" ? "free" : "flow",
      ...block.overlay,
    };
  }
  return {
    ...DEFAULT_WIDGET_CANVAS_PLACEMENT,
    ...block.canvas,
  };
}

export function hasWidgetCanvasBreakpointOverride(
  block: WidgetContentBlock,
  device: WidgetCanvasDevice,
) {
  return Boolean(getWidgetCanvasPlacement(block).responsive?.[device]);
}

export function getWidgetCanvasPlacementForDevice(
  block: WidgetContentBlock,
  device: WidgetCanvasDevice,
): WidgetCanvasPlacement {
  const placement = getWidgetCanvasPlacement(block);
  const override = placement.responsive?.[device];
  if (!override) return placement;
  const width = Math.min(80, Math.max(10, override.width));
  return {
    ...placement,
    ...override,
    width,
    x: Math.min(100 - width, Math.max(0, override.x)),
    y: Math.min(90, Math.max(0, override.y)),
  };
}

export function setWidgetCanvasBreakpointOverride(
  block: WidgetContentBlock,
  device: WidgetCanvasDevice,
  enabled: boolean,
) {
  if (!supportsFreeCanvas(block)) return;
  const placement = getWidgetCanvasPlacement(block);
  const responsive = { ...placement.responsive };
  if (enabled) {
    const current = getWidgetCanvasPlacementForDevice(block, device);
    responsive[device] = {
      x: current.x,
      y: current.y,
      width: current.width,
    };
  } else {
    delete responsive[device];
  }
  updateWidgetCanvasPlacement(block, {
    responsive: Object.keys(responsive).length > 0 ? responsive : undefined,
  });
}

export function updateWidgetCanvasPlacementForDevice(
  block: WidgetContentBlock,
  device: WidgetCanvasDevice,
  update: Partial<WidgetCanvasGeometry>,
) {
  if (!supportsFreeCanvas(block)) return;
  const placement = getWidgetCanvasPlacement(block);
  if (!placement.responsive?.[device]) {
    updateWidgetCanvasPlacement(block, update);
    return;
  }
  const current = getWidgetCanvasPlacementForDevice(block, device);
  const width = Math.min(80, Math.max(10, update.width ?? current.width));
  const responsive = {
    ...placement.responsive,
    [device]: {
      x: Math.min(100 - width, Math.max(0, update.x ?? current.x)),
      y: Math.min(90, Math.max(0, update.y ?? current.y)),
      width,
    },
  };
  updateWidgetCanvasPlacement(block, { responsive });
}

export function setWidgetCanvasMode(
  block: WidgetContentBlock,
  mode: WidgetCanvasPlacement["mode"],
) {
  if (!supportsFreeCanvas(block)) return;
  if (block.type === "image") {
    block.mode = mode === "free" ? "overlay" : "flow";
    return;
  }
  block.canvas = {
    ...DEFAULT_WIDGET_CANVAS_PLACEMENT,
    ...block.canvas,
    mode,
  };
}

export function updateWidgetCanvasPlacement(
  block: WidgetContentBlock,
  update: Partial<Omit<WidgetCanvasPlacement, "mode">>,
) {
  if (!supportsFreeCanvas(block)) return;
  if (block.type === "image") {
    block.overlay = { ...block.overlay, ...update };
    return;
  }
  block.canvas = {
    ...DEFAULT_WIDGET_CANVAS_PLACEMENT,
    ...block.canvas,
    ...update,
    mode: "free",
  };
}
