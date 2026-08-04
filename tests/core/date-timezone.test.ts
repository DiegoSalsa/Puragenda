import { describe, expect, it } from "vitest";
import { dateKeyInTimezone, isTomorrowInTimezone } from "@/lib/date";

describe("business timezone date boundaries", () => {
  it("distinguishes Argentina from Chile around their one-hour winter difference", () => {
    const now = new Date("2026-08-04T02:30:00.000Z");
    const appointment = new Date("2026-08-04T03:30:00.000Z");

    expect(dateKeyInTimezone(now, "America/Argentina/Buenos_Aires")).toBe("2026-08-03");
    expect(dateKeyInTimezone(appointment, "America/Argentina/Buenos_Aires")).toBe("2026-08-04");
    expect(isTomorrowInTimezone(appointment, now, "America/Argentina/Buenos_Aires")).toBe(true);
    expect(isTomorrowInTimezone(appointment, now, "America/Santiago")).toBe(false);
  });

  it("handles Chile daylight-saving dates through the IANA timezone", () => {
    const now = new Date("2026-12-10T02:30:00.000Z");
    const appointment = new Date("2026-12-10T04:00:00.000Z");

    expect(dateKeyInTimezone(now, "America/Santiago")).toBe("2026-12-09");
    expect(isTomorrowInTimezone(appointment, now, "America/Santiago")).toBe(true);
  });
});
