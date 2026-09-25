import { describe, expect, it } from "vitest";
import { periodWindow, safeDateWindow } from "@/server/puri/dates";

describe("Puri date windows", () => {
  it("uses the business timezone for today", () => {
    const now = new Date("2026-09-25T02:30:00.000Z");
    const window = periodWindow("today", "America/Santiago", now);
    expect(window.dateKey).toBe("2026-09-24");
    expect(window.endKey).toBe("2026-09-25");
  });

  it("rejects dates outside the bounded availability range", () => {
    expect(() => safeDateWindow("2027-01-01", "America/Santiago", new Date("2026-09-25T12:00:00Z"))).toThrow("DATE_OUT_OF_RANGE");
  });

  it("supports week comparisons with Monday as the first day", () => {
    const window = periodWindow("previous_week", "America/Santiago", new Date("2026-09-25T12:00:00Z"));
    expect(window.dateKey).toBe("2026-09-14");
    expect(window.endKey).toBe("2026-09-21");
  });
});
