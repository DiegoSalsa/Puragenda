import { describe, expect, it } from "vitest";
import {
  canRemoveWidgetNodes,
  removeWidgetNodes,
} from "@/core/widget-studio/document-selection";
import { createLegacyWidgetDocument } from "@/core/widget-studio/legacy-adapter";
import type { WidgetContentBlock, WidgetSection } from "@/core/widget-studio/schema";

const business = {
  name: "Negocio",
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

function block(id: string, locked = false): WidgetContentBlock {
  return {
    id,
    type: "text",
    name: id,
    hidden: false,
    locked,
    visibility: { mobile: true, tablet: true, desktop: true },
    semantic: "paragraph",
    content: id,
    align: "left",
    size: "base",
    color: "text",
  };
}

function section(id: string, children: WidgetContentBlock[]): WidgetSection {
  return {
    id,
    type: "section",
    name: id,
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
    children,
  };
}

describe("widget document selection removal", () => {
  it("removes valid targets across sections even with a stale system id", () => {
    const document = createLegacyWidgetDocument(business, []);
    document.globalSlots.afterHeader = [
      section("section_one", [block("block_one"), block("block_keep")]),
      section("section_two", [block("block_two")]),
    ];

    expect(canRemoveWidgetNodes(document, ["system.shell", "block_one", "block_two"])).toBe(true);
    expect(removeWidgetNodes(document, ["system.shell", "block_one", "block_two"])).toEqual({
      removedBlocks: 2,
      removedSections: 1,
    });
    expect(document.globalSlots.afterHeader).toHaveLength(1);
    expect(document.globalSlots.afterHeader[0].children.map((item) => item.id)).toEqual(["block_keep"]);
  });

  it("preserves locked targets and reports a no-op before history changes", () => {
    const document = createLegacyWidgetDocument(business, []);
    document.globalSlots.afterHeader = [section("section_locked_child", [block("block_locked", true)])];
    expect(canRemoveWidgetNodes(document, ["block_locked", "missing"])).toBe(false);
    expect(removeWidgetNodes(document, ["block_locked", "missing"])).toEqual({
      removedBlocks: 0,
      removedSections: 0,
    });
  });
});
