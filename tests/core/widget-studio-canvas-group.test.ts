import { describe, expect, it } from "vitest";
import {
  assignCanvasGroup,
  canvasSelectionUnitIds,
  clearCanvasGroup,
  remapCanvasGroupIds,
  sharedCanvasGroupId,
  transformCanvasSelection,
} from "@/core/widget-studio/canvas-group";
import type { WidgetContentBlock, WidgetSection } from "@/core/widget-studio/schema";

function textBlock(id: string, x: number, y: number, width: number): WidgetContentBlock {
  return {
    id,
    name: id,
    type: "text",
    hidden: false,
    locked: false,
    visibility: { mobile: true, tablet: true, desktop: true },
    canvas: { mode: "free", x, y, width, zIndex: 2, mobileFallback: "flow" },
    semantic: "paragraph",
    content: id,
    align: "left",
    size: "base",
    color: "text",
  };
}

function section(children: WidgetContentBlock[]): WidgetSection {
  return {
    id: "section_group_test",
    type: "section",
    name: "Grupo",
    hidden: false,
    locked: false,
    layout: "stack",
    columns: "1",
    align: "stretch",
    gap: 16,
    padding: 16,
    minHeight: 320,
    backgroundColor: "transparent",
    backgroundFit: "cover",
    backgroundFocalPoint: { x: 50, y: 50 },
    overlayColor: "#000000",
    overlayOpacity: 0,
    radius: 0,
    visibility: { mobile: true, tablet: true, desktop: true },
    children,
  };
}

describe("widget canvas groups", () => {
  it("selects a persistent group as one unit and can ungroup it", () => {
    const blocks = [textBlock("text_one", 10, 10, 20), textBlock("text_two", 40, 20, 30)];
    assignCanvasGroup(blocks, "group_alpha");

    expect(sharedCanvasGroupId(blocks)).toBe("group_alpha");
    expect(canvasSelectionUnitIds(section(blocks), blocks[0])).toEqual(["text_one", "text_two"]);

    clearCanvasGroup(blocks);
    expect(sharedCanvasGroupId(blocks)).toBeNull();
    expect(canvasSelectionUnitIds(section(blocks), blocks[0])).toEqual(["text_one"]);
  });

  it("moves and scales the full selection from the primary transform", () => {
    const blocks = [textBlock("text_one", 10, 10, 20), textBlock("text_two", 40, 20, 30)];
    const moved = transformCanvasSelection(blocks, "text_one", { x: 20, y: 25, width: 20 });
    expect(moved).toEqual({
      text_one: { x: 20, y: 25, width: 20 },
      text_two: { x: 50, y: 35, width: 30 },
    });

    const scaled = transformCanvasSelection(blocks, "text_one", { x: 5, y: 5, width: 30 });
    expect(scaled).toEqual({
      text_one: { x: 5, y: 5, width: 30 },
      text_two: { x: 50, y: 20, width: 45 },
    });
  });

  it("remaps copied groups without linking them to the originals", () => {
    const blocks = [textBlock("text_one", 10, 10, 20), textBlock("text_two", 40, 20, 30)];
    assignCanvasGroup(blocks, "group_original");
    remapCanvasGroupIds(blocks, () => "group_copy");
    expect(blocks.map((block) => block.groupId)).toEqual(["group_copy", "group_copy"]);
  });

  it("transforms a group using the active device geometry", () => {
    const blocks = [textBlock("text_one", 10, 10, 20), textBlock("text_two", 40, 20, 30)];
    blocks[0].canvas = {
      ...blocks[0].canvas!,
      responsive: { mobile: { x: 5, y: 8, width: 40 } },
    };
    blocks[1].canvas = {
      ...blocks[1].canvas!,
      responsive: { mobile: { x: 55, y: 18, width: 30 } },
    };

    expect(transformCanvasSelection(
      blocks,
      "text_one",
      { x: 10, y: 12, width: 40 },
      "mobile",
    )).toEqual({
      text_one: { x: 10, y: 12, width: 40 },
      text_two: { x: 60, y: 22, width: 30 },
    });
  });
});
