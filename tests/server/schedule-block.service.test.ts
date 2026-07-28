import { describe, expect, it } from "vitest";
import {
  calculatePriorityReleaseAt,
  getPublicBlockingScheduleBlockWhere,
  isScheduleBlockPubliclyBlocking,
} from "@/server/services/schedule-block.service";

describe("cupos prioritarios", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");

  it("mantiene los bloqueos normales fuera de la reserva pública", () => {
    expect(
      isScheduleBlockPubliclyBlocking(
        { type: "UNAVAILABLE", releaseAt: new Date("2026-07-01T12:00:00.000Z") },
        now,
      ),
    ).toBe(true);
  });

  it("protege un cupo prioritario sin liberación automática", () => {
    expect(
      isScheduleBlockPubliclyBlocking({ type: "PRIORITY", releaseAt: null }, now),
    ).toBe(true);
  });

  it("libera el cupo cuando llega su fecha configurada", () => {
    expect(
      isScheduleBlockPubliclyBlocking(
        { type: "PRIORITY", releaseAt: new Date("2026-08-01T12:00:00.000Z") },
        now,
      ),
    ).toBe(false);
  });

  it("calcula la liberación relativa al inicio del cupo", () => {
    const start = new Date("2026-08-05T15:00:00.000Z");
    expect(calculatePriorityReleaseAt(start, 48)?.toISOString()).toBe(
      "2026-08-03T15:00:00.000Z",
    );
    expect(calculatePriorityReleaseAt(start, null)).toBeNull();
  });

  it("genera un filtro que excluye solo cupos prioritarios ya liberados", () => {
    expect(getPublicBlockingScheduleBlockWhere(now)).toEqual({
      OR: [
        { type: "UNAVAILABLE" },
        {
          type: "PRIORITY",
          OR: [{ releaseAt: null }, { releaseAt: { gt: now } }],
        },
      ],
    });
  });
});
