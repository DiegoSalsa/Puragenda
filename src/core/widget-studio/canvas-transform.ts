export type WidgetOverlayTransform = {
  x: number;
  y: number;
  width: number;
};

export type WidgetOverlayResizeHandle =
  | "north-west"
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west";

export type WidgetOverlayGeometry = {
  /**
   * Converts a vertical delta expressed as a percentage of the section height
   * into a width delta expressed as a percentage of the section width.
   */
  verticalToWidth: number;
};

export type WidgetOverlaySnapGuide = "start" | "center" | "end";

export type WidgetOverlaySnapGuides = {
  vertical: WidgetOverlaySnapGuide | null;
  horizontal: WidgetOverlaySnapGuide | null;
};

export type WidgetOverlaySnapThresholds = {
  x: number;
  y: number;
};

export type WidgetOverlaySnapTarget = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WidgetOverlaySnapResult = {
  transform: WidgetOverlayTransform;
  guides: WidgetOverlaySnapGuides;
};

const OVERLAY_LIMITS = {
  minX: 0,
  maxX: 90,
  minY: 0,
  maxY: 90,
  minWidth: 10,
  maxWidth: 80,
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizedVerticalToWidth(geometry?: WidgetOverlayGeometry) {
  return geometry && Number.isFinite(geometry.verticalToWidth) && geometry.verticalToWidth > 0
    ? geometry.verticalToWidth
    : null;
}

export function overlayHeightPercent(
  width: number,
  geometry?: WidgetOverlayGeometry,
) {
  const verticalToWidth = normalizedVerticalToWidth(geometry);
  return verticalToWidth ? width / verticalToWidth : null;
}

export function clampOverlayTransform(
  transform: WidgetOverlayTransform,
  geometry?: WidgetOverlayGeometry,
): WidgetOverlayTransform {
  const verticalToWidth = normalizedVerticalToWidth(geometry);
  const geometryMaxWidth = verticalToWidth ? 100 * verticalToWidth : OVERLAY_LIMITS.maxWidth;
  const maximumWidth = Math.max(
    OVERLAY_LIMITS.minWidth,
    Math.min(OVERLAY_LIMITS.maxWidth, geometryMaxWidth),
  );
  const width = clamp(
    Number.isFinite(transform.width) ? transform.width : OVERLAY_LIMITS.minWidth,
    OVERLAY_LIMITS.minWidth,
    maximumWidth,
  );
  const x = clamp(
    Number.isFinite(transform.x) ? transform.x : 0,
    OVERLAY_LIMITS.minX,
    Math.min(OVERLAY_LIMITS.maxX, 100 - width),
  );
  const height = overlayHeightPercent(width, geometry);
  const y = clamp(
    Number.isFinite(transform.y) ? transform.y : 0,
    OVERLAY_LIMITS.minY,
    Math.max(
      OVERLAY_LIMITS.minY,
      Math.min(OVERLAY_LIMITS.maxY, height === null ? OVERLAY_LIMITS.maxY : 100 - height),
    ),
  );
  return { x: round(x), y: round(y), width: round(width) };
}

export function moveOverlayTransform(
  transform: WidgetOverlayTransform,
  deltaXPercent: number,
  deltaYPercent: number,
  geometry?: WidgetOverlayGeometry,
): WidgetOverlayTransform {
  return clampOverlayTransform({
    ...transform,
    x: transform.x + deltaXPercent,
    y: transform.y + deltaYPercent,
  }, geometry);
}

type WidgetOverlaySnapCandidate = {
  delta: number;
  guide: WidgetOverlaySnapGuide;
  priority?: number;
};

function normalizedGridStep(gridStep?: number | null) {
  return gridStep && Number.isFinite(gridStep) && gridStep > 0 && gridStep <= 25
    ? gridStep
    : null;
}

function nearestGridLine(value: number, gridStep?: number | null) {
  const step = normalizedGridStep(gridStep);
  return step ? clamp(Math.round(value / step) * step, 0, 100) : null;
}

function nearestSnap(
  candidates: WidgetOverlaySnapCandidate[],
  threshold: number,
) {
  return candidates
    .filter((candidate) => Math.abs(candidate.delta) <= threshold)
    .sort((left, right) =>
      Math.abs(left.delta) - Math.abs(right.delta) ||
      (right.priority ?? 0) - (left.priority ?? 0)
    )[0] ?? null;
}

/**
 * Aligns a moving overlay to the section edges and both center axes.
 * Thresholds are percentages of the section, allowing the UI to translate a
 * stable pixel distance into responsive canvas units.
 */
export function snapMovedOverlayTransform(
  transform: WidgetOverlayTransform,
  geometry: WidgetOverlayGeometry,
  thresholds: WidgetOverlaySnapThresholds,
  targets: WidgetOverlaySnapTarget[] = [],
  gridStep?: number | null,
): WidgetOverlaySnapResult {
  const clamped = clampOverlayTransform(transform, geometry);
  const height = overlayHeightPercent(clamped.width, geometry) ?? clamped.width;
  const verticalCandidates: WidgetOverlaySnapCandidate[] = [
    { delta: -clamped.x, guide: "start" },
    { delta: 50 - (clamped.x + (clamped.width / 2)), guide: "center" },
    { delta: 100 - (clamped.x + clamped.width), guide: "end" },
  ];
  const horizontalCandidates: WidgetOverlaySnapCandidate[] = [
    { delta: -clamped.y, guide: "start" },
    { delta: 50 - (clamped.y + (height / 2)), guide: "center" },
    { delta: 100 - (clamped.y + height), guide: "end" },
  ];
  const gridX = nearestGridLine(clamped.x, gridStep);
  const gridY = nearestGridLine(clamped.y, gridStep);
  if (gridX !== null) {
    verticalCandidates.push({
      delta: gridX - clamped.x,
      guide: "start",
      priority: -1,
    });
  }
  if (gridY !== null) {
    horizontalCandidates.push({
      delta: gridY - clamped.y,
      guide: "start",
      priority: -1,
    });
  }
  const movingXAnchors = [
    { value: clamped.x, guide: "start" as const },
    { value: clamped.x + (clamped.width / 2), guide: "center" as const },
    { value: clamped.x + clamped.width, guide: "end" as const },
  ];
  const movingYAnchors = [
    { value: clamped.y, guide: "start" as const },
    { value: clamped.y + (height / 2), guide: "center" as const },
    { value: clamped.y + height, guide: "end" as const },
  ];

  for (const target of targets) {
    const targetXAnchors = [target.x, target.x + (target.width / 2), target.x + target.width];
    const targetYAnchors = [target.y, target.y + (target.height / 2), target.y + target.height];
    for (const movingAnchor of movingXAnchors) {
      for (const targetAnchor of targetXAnchors) {
        verticalCandidates.push({
          delta: targetAnchor - movingAnchor.value,
          guide: movingAnchor.guide,
          priority: 1,
        });
      }
    }
    for (const movingAnchor of movingYAnchors) {
      for (const targetAnchor of targetYAnchors) {
        horizontalCandidates.push({
          delta: targetAnchor - movingAnchor.value,
          guide: movingAnchor.guide,
          priority: 1,
        });
      }
    }
  }

  const verticalSnap = nearestSnap(verticalCandidates, thresholds.x);
  const horizontalSnap = nearestSnap(horizontalCandidates, thresholds.y);
  const snapped = clampOverlayTransform({
    ...clamped,
    x: clamped.x + (verticalSnap?.delta ?? 0),
    y: clamped.y + (horizontalSnap?.delta ?? 0),
  }, geometry);

  return {
    transform: snapped,
    guides: {
      vertical: verticalSnap?.guide ?? null,
      horizontal: horizontalSnap?.guide ?? null,
    },
  };
}

export function resizeOverlayTransform(
  transform: WidgetOverlayTransform,
  deltaWidthPercent: number,
): WidgetOverlayTransform {
  return clampOverlayTransform({
    ...transform,
    width: transform.width + deltaWidthPercent,
  });
}

function hasWestAnchor(handle: WidgetOverlayResizeHandle) {
  return handle === "north-west" || handle === "west" || handle === "south-west";
}

function hasEastAnchor(handle: WidgetOverlayResizeHandle) {
  return handle === "north-east" || handle === "east" || handle === "south-east";
}

function hasNorthAnchor(handle: WidgetOverlayResizeHandle) {
  return handle === "north-west" || handle === "north" || handle === "north-east";
}

function hasSouthAnchor(handle: WidgetOverlayResizeHandle) {
  return handle === "south-west" || handle === "south" || handle === "south-east";
}

function dominantResizeDelta(horizontal: number | null, vertical: number | null) {
  if (horizontal === null) return vertical ?? 0;
  if (vertical === null) return horizontal;
  return Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
}

export function resizeOverlayTransformFromHandle(
  transform: WidgetOverlayTransform,
  handle: WidgetOverlayResizeHandle,
  deltaXPercent: number,
  deltaYPercent: number,
  geometry: WidgetOverlayGeometry,
): WidgetOverlayTransform {
  const verticalToWidth = normalizedVerticalToWidth(geometry) ?? 1;
  const west = hasWestAnchor(handle);
  const east = hasEastAnchor(handle);
  const north = hasNorthAnchor(handle);
  const south = hasSouthAnchor(handle);
  const horizontalDelta = east
    ? deltaXPercent
    : west
      ? -deltaXPercent
      : null;
  const verticalDelta = south
    ? deltaYPercent * verticalToWidth
    : north
      ? -deltaYPercent * verticalToWidth
      : null;
  const requestedDelta = dominantResizeDelta(horizontalDelta, verticalDelta);
  const currentHeight = overlayHeightPercent(transform.width, geometry) ?? transform.width;

  let maximumWidth = Math.min(OVERLAY_LIMITS.maxWidth, 100 * verticalToWidth);
  if (east) maximumWidth = Math.min(maximumWidth, 100 - transform.x);
  if (west) maximumWidth = Math.min(maximumWidth, transform.x + transform.width);
  if (south) maximumWidth = Math.min(maximumWidth, (100 - transform.y) * verticalToWidth);
  if (north) maximumWidth = Math.min(
    maximumWidth,
    (transform.y + currentHeight) * verticalToWidth,
  );

  const width = clamp(
    transform.width + requestedDelta,
    OVERLAY_LIMITS.minWidth,
    Math.max(OVERLAY_LIMITS.minWidth, maximumWidth),
  );
  const appliedDelta = width - transform.width;
  const x = west ? transform.x - appliedDelta : transform.x;
  const y = north ? transform.y - (appliedDelta / verticalToWidth) : transform.y;

  return clampOverlayTransform({ x, y, width }, geometry);
}

function resizedFromWidth(
  transform: WidgetOverlayTransform,
  handle: WidgetOverlayResizeHandle,
  width: number,
  geometry: WidgetOverlayGeometry,
) {
  const verticalToWidth = normalizedVerticalToWidth(geometry) ?? 1;
  const right = transform.x + transform.width;
  const bottom = transform.y + (overlayHeightPercent(transform.width, geometry) ?? transform.width);
  const normalizedWidth = clampOverlayTransform({
    ...transform,
    width,
  }, geometry).width;
  return clampOverlayTransform({
    x: hasWestAnchor(handle) ? right - normalizedWidth : transform.x,
    y: hasNorthAnchor(handle) ? bottom - (normalizedWidth / verticalToWidth) : transform.y,
    width: normalizedWidth,
  }, geometry);
}

/**
 * Snaps only the active resize edge. The opposite edge remains anchored and
 * the image aspect ratio remains unchanged.
 */
export function snapResizedOverlayTransform(
  transform: WidgetOverlayTransform,
  handle: WidgetOverlayResizeHandle,
  geometry: WidgetOverlayGeometry,
  thresholds: WidgetOverlaySnapThresholds,
  targets: WidgetOverlaySnapTarget[] = [],
  gridStep?: number | null,
): WidgetOverlaySnapResult {
  const clamped = clampOverlayTransform(transform, geometry);
  const height = overlayHeightPercent(clamped.width, geometry) ?? clamped.width;
  const right = clamped.x + clamped.width;
  const bottom = clamped.y + height;
  const verticalToWidth = normalizedVerticalToWidth(geometry) ?? 1;
  const candidates: Array<{
    distance: number;
    width: number;
    axis: "vertical" | "horizontal";
    guide: WidgetOverlaySnapGuide;
    target: number;
    priority: number;
  }> = [];

  const targetEntries = (
    canvasTargets: number[],
    siblingTargets: number[],
    activeEdge: number,
  ) => {
    const gridTarget = nearestGridLine(activeEdge, gridStep);
    return [
      ...canvasTargets.map((target) => ({ target, priority: 1 })),
      ...siblingTargets.map((target) => ({ target, priority: 2 })),
      ...(gridTarget === null ? [] : [{ target: gridTarget, priority: 0 }]),
    ];
  };

  if (hasEastAnchor(handle)) {
    const targetValues = targetEntries(
      [50, 100],
      targets.flatMap((target) => [
        target.x,
        target.x + (target.width / 2),
        target.x + target.width,
      ]),
      right,
    );
    for (const { target, priority } of targetValues) {
      const delta = target - right;
      if (Math.abs(delta) <= thresholds.x) {
        candidates.push({
          distance: Math.abs(delta / Math.max(thresholds.x, 0.001)),
          width: clamped.width + delta,
          axis: "vertical",
          guide: "end",
          target,
          priority,
        });
      }
    }
  }
  if (hasWestAnchor(handle)) {
    const targetValues = targetEntries(
      [0, 50],
      targets.flatMap((target) => [
        target.x,
        target.x + (target.width / 2),
        target.x + target.width,
      ]),
      clamped.x,
    );
    for (const { target, priority } of targetValues) {
      const delta = target - clamped.x;
      if (Math.abs(delta) <= thresholds.x) {
        candidates.push({
          distance: Math.abs(delta / Math.max(thresholds.x, 0.001)),
          width: clamped.width - delta,
          axis: "vertical",
          guide: "start",
          target,
          priority,
        });
      }
    }
  }
  if (hasSouthAnchor(handle)) {
    const targetValues = targetEntries(
      [50, 100],
      targets.flatMap((target) => [
        target.y,
        target.y + (target.height / 2),
        target.y + target.height,
      ]),
      bottom,
    );
    for (const { target, priority } of targetValues) {
      const delta = target - bottom;
      if (Math.abs(delta) <= thresholds.y) {
        candidates.push({
          distance: Math.abs(delta / Math.max(thresholds.y, 0.001)),
          width: clamped.width + (delta * verticalToWidth),
          axis: "horizontal",
          guide: "end",
          target,
          priority,
        });
      }
    }
  }
  if (hasNorthAnchor(handle)) {
    const targetValues = targetEntries(
      [0, 50],
      targets.flatMap((target) => [
        target.y,
        target.y + (target.height / 2),
        target.y + target.height,
      ]),
      clamped.y,
    );
    for (const { target, priority } of targetValues) {
      const delta = target - clamped.y;
      if (Math.abs(delta) <= thresholds.y) {
        candidates.push({
          distance: Math.abs(delta / Math.max(thresholds.y, 0.001)),
          width: clamped.width - (delta * verticalToWidth),
          axis: "horizontal",
          guide: "start",
          target,
          priority,
        });
      }
    }
  }

  const closest = candidates.sort((left, rightCandidate) =>
    left.distance - rightCandidate.distance ||
    rightCandidate.priority - left.priority
  )[0];
  if (!closest) {
    return {
      transform: clamped,
      guides: { vertical: null, horizontal: null },
    };
  }

  const snapped = resizedFromWidth(clamped, handle, closest.width, geometry);
  const snappedHeight = overlayHeightPercent(snapped.width, geometry) ?? snapped.width;
  const snappedRight = snapped.x + snapped.width;
  const snappedBottom = snapped.y + snappedHeight;
  const guides: WidgetOverlaySnapGuides = {
    vertical: null,
    horizontal: null,
  };

  if (closest.axis === "vertical") {
    const activeEdge = hasEastAnchor(handle) ? snappedRight : snapped.x;
    if (Math.abs(activeEdge - closest.target) < 0.11) {
      guides.vertical = closest.guide;
    }
  } else {
    const activeEdge = hasSouthAnchor(handle) ? snappedBottom : snapped.y;
    if (Math.abs(activeEdge - closest.target) < 0.11) {
      guides.horizontal = closest.guide;
    }
  }

  if (hasEastAnchor(handle) && Math.abs(snappedRight - 100) < 0.11) {
    guides.vertical = "end";
  } else if (hasWestAnchor(handle) && Math.abs(snapped.x) < 0.11) {
    guides.vertical = "start";
  }
  if (hasSouthAnchor(handle) && Math.abs(snappedBottom - 100) < 0.11) {
    guides.horizontal = "end";
  } else if (hasNorthAnchor(handle) && Math.abs(snapped.y) < 0.11) {
    guides.horizontal = "start";
  }

  return { transform: snapped, guides };
}
