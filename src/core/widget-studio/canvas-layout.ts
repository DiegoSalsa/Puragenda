import {
  clampOverlayTransform,
  type WidgetOverlayTransform,
} from "@/core/widget-studio/canvas-transform";

export type CanvasLayoutCommand =
  | "align-left"
  | "align-center-x"
  | "align-right"
  | "align-top"
  | "align-center-y"
  | "align-bottom"
  | "distribute-x"
  | "distribute-y";

export type CanvasLayoutItem = {
  id: string;
  transform: WidgetOverlayTransform;
  height: number;
};

function roundCanvasValue(value: number) {
  return Math.round(value * 10) / 10;
}

function centeredTransform(
  item: CanvasLayoutItem,
  axis: "x" | "y",
  center: number,
) {
  const size = axis === "x" ? item.transform.width : item.height;
  const maximum = Math.max(0, 100 - size);
  return Math.max(0, Math.min(maximum, center - (size / 2)));
}

function alignItem(item: CanvasLayoutItem, command: CanvasLayoutCommand) {
  const next = { ...item.transform };
  if (command === "align-left") next.x = 0;
  if (command === "align-center-x") next.x = (100 - next.width) / 2;
  if (command === "align-right") next.x = 100 - next.width;
  if (command === "align-top") next.y = 0;
  if (command === "align-center-y") next.y = (100 - item.height) / 2;
  if (command === "align-bottom") next.y = 100 - item.height;
  return clampOverlayTransform({
    ...next,
    x: roundCanvasValue(next.x),
    y: roundCanvasValue(next.y),
  });
}

function distributeItems(
  items: CanvasLayoutItem[],
  axis: "x" | "y",
) {
  if (items.length < 3) {
    return Object.fromEntries(items.map((item) => [item.id, item.transform]));
  }
  const centerOf = (item: CanvasLayoutItem) => axis === "x"
    ? item.transform.x + (item.transform.width / 2)
    : item.transform.y + (item.height / 2);
  const ordered = [...items].sort((left, right) => centerOf(left) - centerOf(right));
  const firstCenter = centerOf(ordered[0]);
  const lastCenter = centerOf(ordered[ordered.length - 1]);
  const interval = (lastCenter - firstCenter) / (ordered.length - 1);

  return Object.fromEntries(ordered.map((item, index) => {
    if (index === 0 || index === ordered.length - 1) {
      return [item.id, item.transform];
    }
    const next = { ...item.transform };
    const position = centeredTransform(item, axis, firstCenter + (interval * index));
    if (axis === "x") next.x = roundCanvasValue(position);
    else next.y = roundCanvasValue(position);
    return [item.id, clampOverlayTransform(next)];
  }));
}

export function applyCanvasLayoutCommand(
  items: CanvasLayoutItem[],
  command: CanvasLayoutCommand,
): Record<string, WidgetOverlayTransform> {
  if (command === "distribute-x") return distributeItems(items, "x");
  if (command === "distribute-y") return distributeItems(items, "y");
  return Object.fromEntries(items.map((item) => [item.id, alignItem(item, command)]));
}

export function toggleCanvasSelection(
  selectedIds: string[],
  id: string,
  additive: boolean,
) {
  if (!additive) return [id];
  if (selectedIds.includes(id)) return selectedIds.filter((selectedId) => selectedId !== id);
  return [...selectedIds, id];
}
