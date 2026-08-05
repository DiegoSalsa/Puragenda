export type WidgetCanvasRect = {
  id: string;
  sectionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WidgetCanvasCollision = {
  firstId: string;
  secondId: string;
  sectionId: string;
};

export type WidgetCanvasLayoutHealth = {
  overflowIds: string[];
  collisions: WidgetCanvasCollision[];
};

const EDGE_TOLERANCE = 0.5;
const COLLISION_TOLERANCE = 0.75;

export function detectWidgetCanvasLayoutHealth(
  rectangles: WidgetCanvasRect[],
): WidgetCanvasLayoutHealth {
  const overflowIds = rectangles
    .filter((rect) =>
      rect.x < -EDGE_TOLERANCE ||
      rect.y < -EDGE_TOLERANCE ||
      rect.x + rect.width > 100 + EDGE_TOLERANCE ||
      rect.y + rect.height > 100 + EDGE_TOLERANCE
    )
    .map((rect) => rect.id);

  const collisions: WidgetCanvasCollision[] = [];
  for (let index = 0; index < rectangles.length; index += 1) {
    const first = rectangles[index];
    for (let candidateIndex = index + 1; candidateIndex < rectangles.length; candidateIndex += 1) {
      const second = rectangles[candidateIndex];
      if (first.sectionId !== second.sectionId) continue;
      const overlapWidth = Math.min(first.x + first.width, second.x + second.width) -
        Math.max(first.x, second.x);
      const overlapHeight = Math.min(first.y + first.height, second.y + second.height) -
        Math.max(first.y, second.y);
      if (overlapWidth <= COLLISION_TOLERANCE || overlapHeight <= COLLISION_TOLERANCE) {
        continue;
      }
      collisions.push({
        firstId: first.id,
        secondId: second.id,
        sectionId: first.sectionId,
      });
    }
  }

  return { overflowIds, collisions };
}
