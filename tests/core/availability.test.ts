import { describe, expect, it } from "vitest";
import { buildSlots } from "@/core/availability";

describe("shared availability engine", () => {
  const monday = new Date(2026, 7, 10, 12, 34, 45, 120);

  it("does not generate slots on a closed business day", () => {
    expect(buildSlots(monday, 60, [
      { dayOfWeek: monday.getDay(), startTime: "09:00", endTime: "18:00", isOpen: false },
    ])).toEqual([]);
  });

  it("does not generate slots when the professional is not working", () => {
    expect(buildSlots(
      monday,
      60,
      [{ dayOfWeek: monday.getDay(), startTime: "09:00", endTime: "18:00", isOpen: true }],
      [{ dayOfWeek: monday.getDay(), startTime: "09:00", endTime: "18:00", isWorking: false }],
    )).toEqual([]);
  });

  it("applies a staff date override and keeps slots minute-aligned", () => {
    const slots = buildSlots(
      monday,
      60,
      [{ dayOfWeek: monday.getDay(), startTime: "09:00", endTime: "18:00", isOpen: true }],
      [{ dayOfWeek: monday.getDay(), startTime: "09:00", endTime: "18:00", isWorking: true }],
      60,
      undefined,
      [],
      [{ date: "2026-08-10", isOpen: true, startTime: "13:00", endTime: "16:00" }],
    );

    expect(slots.map((slot) => `${slot.start.getHours()}:${String(slot.start.getMinutes()).padStart(2, "0")}`))
      .toEqual(["13:00", "14:00", "15:00"]);
    expect(slots.every((slot) => slot.start.getSeconds() === 0 && slot.start.getMilliseconds() === 0)).toBe(true);
  });
});
