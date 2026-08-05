import { describe, expect, it } from "vitest";
import {
  applyCanvasLayoutCommand,
  toggleCanvasSelection,
  type CanvasLayoutItem,
} from "@/core/widget-studio/canvas-layout";

const items: CanvasLayoutItem[] = [
  { id: "a", transform: { x: 10, y: 20, width: 20 }, height: 10 },
  { id: "b", transform: { x: 32, y: 44, width: 10 }, height: 20 },
  { id: "c", transform: { x: 70, y: 72, width: 20 }, height: 10 },
];

describe("Widget Studio canvas layout commands", () => {
  it("aligns overlays to all six canvas anchors", () => {
    expect(applyCanvasLayoutCommand(items, "align-left").a.x).toBe(0);
    expect(applyCanvasLayoutCommand(items, "align-center-x").a.x).toBe(40);
    expect(applyCanvasLayoutCommand(items, "align-right").a.x).toBe(80);
    expect(applyCanvasLayoutCommand(items, "align-top").a.y).toBe(0);
    expect(applyCanvasLayoutCommand(items, "align-center-y").a.y).toBe(45);
    expect(applyCanvasLayoutCommand(items, "align-bottom").a.y).toBe(90);
  });

  it("distributes three overlays by their horizontal centers", () => {
    const result = applyCanvasLayoutCommand(items, "distribute-x");
    expect(result.a).toEqual(items[0].transform);
    expect(result.c).toEqual(items[2].transform);
    expect(result.b.x).toBe(45);
  });

  it("distributes three overlays by their vertical centers", () => {
    const result = applyCanvasLayoutCommand(items, "distribute-y");
    expect(result.a).toEqual(items[0].transform);
    expect(result.c).toEqual(items[2].transform);
    expect(result.b.y).toBe(41);
  });

  it("leaves distribution unchanged with fewer than three overlays", () => {
    expect(applyCanvasLayoutCommand(items.slice(0, 2), "distribute-x")).toEqual({
      a: items[0].transform,
      b: items[1].transform,
    });
  });

  it("supports replace, add and toggle selection semantics", () => {
    expect(toggleCanvasSelection(["a", "b"], "c", false)).toEqual(["c"]);
    expect(toggleCanvasSelection(["a"], "b", true)).toEqual(["a", "b"]);
    expect(toggleCanvasSelection(["a", "b"], "a", true)).toEqual(["b"]);
  });
});
