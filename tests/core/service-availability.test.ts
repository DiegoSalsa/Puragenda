import { describe, expect, it } from "vitest";
import { isServiceAvailableAtTime, isServiceAvailableOnDate } from "@/core/service-availability";

const normal = {
  availabilityType: "NORMAL" as const,
  specialWeekDays: [],
};

const special = {
  availabilityType: "SPECIAL" as const,
  specialWeekDays: [2],
  specialStartDate: "2026-08-01",
  specialEndDate: "2026-08-31",
  specialStartTime: "10:00",
  specialEndTime: "14:00",
};

describe("disponibilidad de servicios especiales", () => {
  it("no modifica la disponibilidad de servicios normales", () => {
    expect(isServiceAvailableOnDate(normal, new Date(2026, 7, 19))).toBe(true);
  });

  it("limita un servicio especial por día y vigencia", () => {
    expect(isServiceAvailableOnDate(special, new Date(2026, 7, 18, 12))).toBe(true);
    expect(isServiceAvailableOnDate(special, new Date(2026, 7, 19, 12))).toBe(false);
    expect(isServiceAvailableOnDate(special, new Date(2026, 8, 1, 12))).toBe(false);
  });

  it("exige que la cita completa quepa en el horario especial", () => {
    expect(isServiceAvailableAtTime(special, new Date(2026, 7, 18, 10), new Date(2026, 7, 18, 14))).toBe(true);
    expect(isServiceAvailableAtTime(special, new Date(2026, 7, 18, 13, 30), new Date(2026, 7, 18, 14, 30))).toBe(false);
  });
});
