import { describe, expect, it } from "vitest";
import { buildSlots } from "@/app/widget/[slug]/widget-client";

describe("buildSlots", () => {
  it("deduplicates aligned appointment ends when the selected day retains seconds", () => {
    const date = new Date(2026, 7, 8, 11, 56, 34, 321);
    const slots = buildSlots(
      date,
      60,
      [{ dayOfWeek: date.getDay(), startTime: "11:00", endTime: "18:00", isOpen: true }],
      undefined,
      60,
      undefined,
      [new Date(2026, 7, 8, 11, 0), new Date(2026, 7, 8, 16, 0)],
    );

    expect(slots.map((slot) => `${slot.start.getHours()}:${String(slot.start.getMinutes()).padStart(2, "0")}`))
      .toEqual(["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]);
    expect(slots.every((slot) => slot.start.getSeconds() === 0 && slot.start.getMilliseconds() === 0)).toBe(true);
  });

  it("keeps hourly starts aligned when a 40-minute appointment ends off-grid", () => {
    const date = new Date(2026, 7, 4);
    const slots = buildSlots(
      date,
      40,
      [{ dayOfWeek: date.getDay(), startTime: "09:00", endTime: "13:00", isOpen: true }],
      undefined,
      60,
      undefined,
      [new Date(2026, 7, 4, 10, 40)],
    );

    expect(slots.map((slot) => `${slot.start.getHours()}:${String(slot.start.getMinutes()).padStart(2, "0")}`))
      .toEqual(["9:00", "10:00", "11:00", "12:00"]);
  });

  it("does not offer an appointment end when the selected service would exceed closing time", () => {
    const date = new Date(2026, 7, 4);
    const slots = buildSlots(
      date,
      45,
      [{ dayOfWeek: date.getDay(), startTime: "13:00", endTime: "15:00", isOpen: true }],
      undefined,
      60,
      undefined,
      [new Date(2026, 7, 4, 14, 30)],
    );

    expect(slots.some((slot) => slot.start.getHours() === 14 && slot.start.getMinutes() === 30)).toBe(false);
  });
});
