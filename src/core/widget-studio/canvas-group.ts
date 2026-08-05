import {
  getWidgetCanvasPlacement,
  getWidgetCanvasPlacementForDevice,
  isWidgetCanvasBlock,
} from "@/core/widget-studio/canvas-block";
import { clampOverlayTransform, type WidgetOverlayTransform } from "@/core/widget-studio/canvas-transform";
import type { WidgetCanvasDevice, WidgetContentBlock, WidgetSection } from "@/core/widget-studio/schema";

export function canvasSelectionUnitIds(
  section: WidgetSection,
  block: WidgetContentBlock,
): string[] {
  if (!block.groupId || !isWidgetCanvasBlock(block)) return [block.id];
  return section.children
    .filter((candidate) =>
      candidate.groupId === block.groupId && isWidgetCanvasBlock(candidate)
    )
    .map((candidate) => candidate.id);
}

export function sharedCanvasGroupId(blocks: WidgetContentBlock[]): string | null {
  if (blocks.length < 2) return null;
  const groupId = blocks[0]?.groupId;
  return groupId && blocks.every((block) => block.groupId === groupId)
    ? groupId
    : null;
}

export function assignCanvasGroup(
  blocks: WidgetContentBlock[],
  groupId: string,
) {
  for (const block of blocks) block.groupId = groupId;
}

export function clearCanvasGroup(blocks: WidgetContentBlock[]) {
  for (const block of blocks) delete block.groupId;
}

export function remapCanvasGroupIds(
  blocks: WidgetContentBlock[],
  createGroupId: () => string,
) {
  const groupIds = new Map<string, string>();
  for (const block of blocks) {
    if (!block.groupId) continue;
    const replacement = groupIds.get(block.groupId) ?? createGroupId();
    groupIds.set(block.groupId, replacement);
    block.groupId = replacement;
  }
  return blocks;
}

/**
 * Applies the primary block's move/resize to every selected canvas block.
 * Relative positions and widths are preserved, so persistent groups behave
 * like a single object without introducing a new nested document shape.
 */
export function transformCanvasSelection(
  blocks: WidgetContentBlock[],
  primaryId: string,
  nextPrimary: WidgetOverlayTransform,
  device?: WidgetCanvasDevice,
): Record<string, WidgetOverlayTransform> {
  const canvasBlocks = blocks.filter(isWidgetCanvasBlock);
  const primary = canvasBlocks.find((block) => block.id === primaryId);
  if (!primary) return {};

  const placementFor = device
    ? (block: WidgetContentBlock) => getWidgetCanvasPlacementForDevice(block, device)
    : getWidgetCanvasPlacement;
  const previousPrimary = placementFor(primary);
  const next = clampOverlayTransform(nextPrimary);
  const scale = previousPrimary.width > 0
    ? next.width / previousPrimary.width
    : 1;

  return Object.fromEntries(canvasBlocks.map((block) => {
    const placement = placementFor(block);
    return [block.id, clampOverlayTransform({
      x: next.x + ((placement.x - previousPrimary.x) * scale),
      y: next.y + ((placement.y - previousPrimary.y) * scale),
      width: placement.width * scale,
    })];
  }));
}
