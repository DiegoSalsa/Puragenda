import { describe, expect, it } from "vitest";
import { getDefaultBreakRange } from "@/lib/time";

describe("default break range", () => {
  it("centers a one-hour break inside an afternoon shift", () => {
    expect(getDefaultBreakRange("14:00", "20:00")).toEqual({
      startTime: "16:30",
      endTime: "17:30",
    });
  });

  it("keeps the suggestion within a full business day", () => {
    expect(getDefaultBreakRange("08:00", "20:00")).toEqual({
      startTime: "13:30",
      endTime: "14:30",
    });
  });

  it("uses a shorter break for a shift under two hours", () => {
    expect(getDefaultBreakRange("09:00", "10:30")).toEqual({
      startTime: "09:30",
      endTime: "10:00",
    });
  });

  it("does not suggest a break for invalid or very short shifts", () => {
    expect(getDefaultBreakRange("20:00", "14:00")).toBeNull();
    expect(getDefaultBreakRange("09:00", "09:20")).toBeNull();
  });
});
