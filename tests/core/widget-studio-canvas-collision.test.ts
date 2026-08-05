import { describe, expect, it } from "vitest";
import { detectWidgetCanvasLayoutHealth } from "@/core/widget-studio/canvas-collision";

describe("widget canvas responsive health", () => {
  it("reports overlaps only inside the same section", () => {
    const result = detectWidgetCanvasLayoutHealth([
      { id: "one", sectionId: "section_a", x: 10, y: 10, width: 40, height: 20 },
      { id: "two", sectionId: "section_a", x: 35, y: 15, width: 30, height: 20 },
      { id: "three", sectionId: "section_b", x: 35, y: 15, width: 30, height: 20 },
    ]);

    expect(result.collisions).toEqual([
      { firstId: "one", secondId: "two", sectionId: "section_a" },
    ]);
  });

  it("allows edge contact but reports elements outside the canvas", () => {
    const result = detectWidgetCanvasLayoutHealth([
      { id: "inside", sectionId: "section_a", x: 0, y: 0, width: 100, height: 100 },
      { id: "outside", sectionId: "section_b", x: 82, y: 91, width: 20, height: 12 },
      { id: "edge_a", sectionId: "section_c", x: 0, y: 0, width: 50, height: 20 },
      { id: "edge_b", sectionId: "section_c", x: 50, y: 0, width: 50, height: 20 },
    ]);

    expect(result.overflowIds).toEqual(["outside"]);
    expect(result.collisions).toEqual([]);
  });
});
