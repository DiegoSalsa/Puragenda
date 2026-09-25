import { describe, expect, it } from "vitest";
import { formatTodayAppointmentTime, zonedAppointmentTime } from "@/lib/zoned-appointment-time";
import { locationDayWindow } from "@/lib/today-dashboard";
import { periodWindow, safeDateWindow } from "@/server/puri/dates";

describe("Puri timezone contract", () => {
  it("renders September UTC 15:00 as Chilean local 12:00", () => {
    const instant = "2026-09-25T15:00:00.000Z";
    expect(zonedAppointmentTime(instant, "America/Santiago")).toEqual({ utc: instant, timezone: "America/Santiago", localDate: "2026-09-25", localTime: "12:00" });
    expect(formatTodayAppointmentTime(instant, "America/Santiago")).toBe("12:00");
  });

  it("applies the historical winter offset instead of hardcoding minus three", () => {
    expect(zonedAppointmentTime("2026-07-25T15:00:00.000Z", "America/Santiago").localTime).toBe("11:00");
  });

  it("keeps a near-midnight instant on the previous local day", () => {
    expect(zonedAppointmentTime("2026-09-25T02:30:00.000Z", "America/Santiago")).toMatchObject({ localDate: "2026-09-24", localTime: "23:30" });
  });

  it("uses the IANA transition for local tomorrow and its UTC boundaries", () => {
    const window = periodWindow("tomorrow", "America/Santiago", new Date("2026-09-05T15:00:00.000Z"));
    expect(window.dateKey).toBe("2026-09-06");
    expect(window.start.toISOString()).toBe("2026-09-06T04:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-07T03:00:00.000Z");
    const today = locationDayWindow(new Date("2026-09-06T12:00:00.000Z"), "America/Santiago");
    expect(today.start.toISOString()).toBe(window.start.toISOString());
    expect(today.end.toISOString()).toBe(window.end.toISOString());
  });

  it("bounds requested availability dates without using the host timezone", () => {
    const window = safeDateWindow("2026-09-25", "America/Santiago", new Date("2026-09-25T15:00:00.000Z"));
    expect(window.start.toISOString()).toBe("2026-09-25T03:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-26T03:00:00.000Z");
  });
});
