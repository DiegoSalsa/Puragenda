import { describe, expect, it } from "vitest";
import {
  clampOverlayTransform,
  moveOverlayTransform,
  overlayHeightPercent,
  resizeOverlayTransform,
  resizeOverlayTransformFromHandle,
  snapMovedOverlayTransform,
  snapResizedOverlayTransform,
} from "@/core/widget-studio/canvas-transform";

describe("Widget Studio canvas transforms", () => {
  it("keeps overlays inside the editable canvas", () => {
    expect(clampOverlayTransform({ x: 95, y: -12, width: 36 })).toEqual({
      x: 64,
      y: 0,
      width: 36,
    });
  });

  it("moves overlays with stable decimal precision", () => {
    expect(
      moveOverlayTransform({ x: 10, y: 20, width: 36 }, 3.333, -2.222),
    ).toEqual({
      x: 13.3,
      y: 17.8,
      width: 36,
    });
  });

  it("resizes without crossing the canvas edge or schema limits", () => {
    expect(
      resizeOverlayTransform({ x: 40, y: 20, width: 36 }, 50),
    ).toEqual({
      x: 20,
      y: 20,
      width: 80,
    });
    expect(
      resizeOverlayTransform({ x: 40, y: 20, width: 36 }, -40),
    ).toEqual({
      x: 40,
      y: 20,
      width: 10,
    });
  });

  it("uses the rendered geometry to keep the whole overlay inside the section", () => {
    const geometry = { verticalToWidth: 1 };
    expect(
      clampOverlayTransform({ x: 88, y: 84, width: 30 }, geometry),
    ).toEqual({
      x: 70,
      y: 70,
      width: 30,
    });
    expect(overlayHeightPercent(30, geometry)).toBe(30);
  });

  it("keeps the opposite edge fixed for west and north handles", () => {
    const geometry = { verticalToWidth: 1 };
    const start = { x: 30, y: 30, width: 40 };

    expect(
      resizeOverlayTransformFromHandle(start, "west", 10, 0, geometry),
    ).toEqual({
      x: 40,
      y: 30,
      width: 30,
    });
    expect(
      resizeOverlayTransformFromHandle(start, "north", 0, 10, geometry),
    ).toEqual({
      x: 30,
      y: 40,
      width: 30,
    });
  });

  it("supports all eight resize handles while preserving aspect ratio", () => {
    const geometry = { verticalToWidth: 1 };
    const start = { x: 30, y: 30, width: 40 };
    const cases = [
      ["north-west", -10, -10, { x: 20, y: 20, width: 50 }],
      ["north", 0, -10, { x: 30, y: 20, width: 50 }],
      ["north-east", 10, -2, { x: 30, y: 20, width: 50 }],
      ["east", 10, 0, { x: 30, y: 30, width: 50 }],
      ["south-east", 10, 2, { x: 30, y: 30, width: 50 }],
      ["south", 0, 10, { x: 30, y: 30, width: 50 }],
      ["south-west", -10, 2, { x: 20, y: 30, width: 50 }],
      ["west", -10, 0, { x: 20, y: 30, width: 50 }],
    ] as const;

    for (const [handle, deltaX, deltaY, expected] of cases) {
      expect(
        resizeOverlayTransformFromHandle(
          start,
          handle,
          deltaX,
          deltaY,
          geometry,
        ),
      ).toEqual(expected);
    }
  });

  it("stops handle resizing at every canvas edge", () => {
    const geometry = { verticalToWidth: 1 };
    expect(
      resizeOverlayTransformFromHandle(
        { x: 70, y: 20, width: 20 },
        "east",
        50,
        0,
        geometry,
      ),
    ).toEqual({ x: 70, y: 20, width: 30 });
    expect(
      resizeOverlayTransformFromHandle(
        { x: 10, y: 20, width: 20 },
        "west",
        -50,
        0,
        geometry,
      ),
    ).toEqual({ x: 0, y: 20, width: 30 });
    expect(
      resizeOverlayTransformFromHandle(
        { x: 20, y: 70, width: 20 },
        "south",
        0,
        50,
        geometry,
      ),
    ).toEqual({ x: 20, y: 70, width: 30 });
    expect(
      resizeOverlayTransformFromHandle(
        { x: 20, y: 10, width: 20 },
        "north",
        0,
        -50,
        geometry,
      ),
    ).toEqual({ x: 20, y: 0, width: 30 });
  });

  it("snaps a moving overlay to section edges using responsive thresholds", () => {
    const geometry = { verticalToWidth: 1 };

    expect(
      snapMovedOverlayTransform(
        { x: 1.2, y: 69, width: 30 },
        geometry,
        { x: 1.5, y: 1.5 },
      ),
    ).toEqual({
      transform: { x: 0, y: 70, width: 30 },
      guides: { vertical: "start", horizontal: "end" },
    });
  });

  it("snaps to both center axes without changing the overlay size", () => {
    const geometry = { verticalToWidth: 1 };

    expect(
      snapMovedOverlayTransform(
        { x: 35.8, y: 34.4, width: 30 },
        geometry,
        { x: 1, y: 1 },
      ),
    ).toEqual({
      transform: { x: 35, y: 35, width: 30 },
      guides: { vertical: "center", horizontal: "center" },
    });
  });

  it("does not snap when the closest guide is outside the threshold", () => {
    const geometry = { verticalToWidth: 1 };

    expect(
      snapMovedOverlayTransform(
        { x: 12, y: 18, width: 30 },
        geometry,
        { x: 1, y: 1 },
      ),
    ).toEqual({
      transform: { x: 12, y: 18, width: 30 },
      guides: { vertical: null, horizontal: null },
    });
  });

  it("snaps resize handles while preserving the opposite edge and aspect ratio", () => {
    const geometry = { verticalToWidth: 1 };

    expect(
      snapResizedOverlayTransform(
        { x: 30, y: 30, width: 19.2 },
        "east",
        geometry,
        { x: 1, y: 1 },
      ),
    ).toEqual({
      transform: { x: 30, y: 30, width: 20 },
      guides: { vertical: "end", horizontal: null },
    });
    expect(
      snapResizedOverlayTransform(
        { x: 0.8, y: 20, width: 49.2 },
        "west",
        geometry,
        { x: 1, y: 1 },
      ),
    ).toEqual({
      transform: { x: 0, y: 20, width: 50 },
      guides: { vertical: "start", horizontal: null },
    });
  });

  it("shows both edge guides when a corner reaches both section limits", () => {
    const geometry = { verticalToWidth: 1 };

    expect(
      snapResizedOverlayTransform(
        { x: 70.5, y: 70.5, width: 29 },
        "south-east",
        geometry,
        { x: 1, y: 1 },
      ),
    ).toEqual({
      transform: { x: 70.5, y: 70.5, width: 29.5 },
      guides: { vertical: "end", horizontal: "end" },
    });
  });

  it("does not show a guide when a minimum-size constraint prevents alignment", () => {
    const geometry = { verticalToWidth: 1 };

    expect(
      snapResizedOverlayTransform(
        { x: 49.5, y: 20, width: 10 },
        "west",
        geometry,
        { x: 1, y: 1 },
      ),
    ).toEqual({
      transform: { x: 49.5, y: 20, width: 10 },
      guides: { vertical: null, horizontal: null },
    });
  });

  it("aligns a moving overlay to sibling edges and centers", () => {
    const geometry = { verticalToWidth: 1 };
    const sibling = { x: 60, y: 10, width: 20, height: 20 };

    expect(
      snapMovedOverlayTransform(
        { x: 39.2, y: 30.7, width: 20 },
        geometry,
        { x: 1, y: 1 },
        [sibling],
      ),
    ).toEqual({
      transform: { x: 40, y: 30, width: 20 },
      guides: { vertical: "end", horizontal: "start" },
    });
  });

  it("snaps an active resize edge to a sibling without moving the opposite edge", () => {
    const geometry = { verticalToWidth: 1 };
    const sibling = { x: 60, y: 10, width: 20, height: 20 };

    expect(
      snapResizedOverlayTransform(
        { x: 40, y: 40, width: 19.3 },
        "east",
        geometry,
        { x: 1, y: 1 },
        [sibling],
      ),
    ).toEqual({
      transform: { x: 40, y: 40, width: 20 },
      guides: { vertical: "end", horizontal: null },
    });
  });

  it("snaps movement to the configured grid when no stronger guide is nearby", () => {
    expect(
      snapMovedOverlayTransform(
        { x: 22.8, y: 37.2, width: 20 },
        { verticalToWidth: 1 },
        { x: 3, y: 3 },
        [],
        5,
      ),
    ).toEqual({
      transform: { x: 25, y: 35, width: 20 },
      guides: { vertical: "start", horizontal: "start" },
    });
  });

  it("prioritizes a sibling alignment over an equally close grid line", () => {
    expect(
      snapMovedOverlayTransform(
        { x: 39, y: 70, width: 20 },
        { verticalToWidth: 1 },
        { x: 1, y: 0.1 },
        [{ x: 38, y: 10, width: 20, height: 20 }],
        10,
      ),
    ).toEqual({
      transform: { x: 38, y: 70, width: 20 },
      guides: { vertical: "start", horizontal: "start" },
    });
  });

  it("snaps the active resize edge to the configured grid", () => {
    expect(
      snapResizedOverlayTransform(
        { x: 20, y: 20, width: 23.7 },
        "east",
        { verticalToWidth: 1 },
        { x: 2, y: 2 },
        [],
        5,
      ),
    ).toEqual({
      transform: { x: 20, y: 20, width: 25 },
      guides: { vertical: "end", horizontal: null },
    });
  });
});
