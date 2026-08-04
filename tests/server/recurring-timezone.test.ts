import { describe, expect, it } from "vitest";
import {
  addMonthsToDateOnly,
  buildRecurringSessions,
  recurringEndDate,
} from "@/server/services/recurring.service";

describe("recurring sessions in the business timezone", () => {
  it("stores the same local Argentine and Chilean time as different UTC instants in winter", () => {
    const start = new Date("2026-08-03T00:00:00.000Z");
    const end = new Date("2026-08-03T00:00:00.000Z");

    const argentina = buildRecurringSessions(start, end, [1], { "1": "10:00" }, 60, "America/Argentina/Buenos_Aires");
    const chile = buildRecurringSessions(start, end, [1], { "1": "10:00" }, 60, "America/Santiago");

    expect(argentina[0].startTime.toISOString()).toBe("2026-08-03T13:00:00.000Z");
    expect(chile[0].startTime.toISOString()).toBe("2026-08-03T14:00:00.000Z");
  });

  it("uses Chile daylight-saving rules without changing Argentina", () => {
    const start = new Date("2026-12-07T00:00:00.000Z");
    const argentina = buildRecurringSessions(start, start, [1], { "1": "10:00" }, 30, "America/Argentina/Buenos_Aires");
    const chile = buildRecurringSessions(start, start, [1], { "1": "10:00" }, 30, "America/Santiago");

    expect(argentina[0].startTime.toISOString()).toBe("2026-12-07T13:00:00.000Z");
    expect(chile[0].startTime.toISOString()).toBe("2026-12-07T13:00:00.000Z");
  });

  it("clamps month-end dates and keeps an inclusive recurring period", () => {
    const january31 = new Date("2027-01-31T00:00:00.000Z");
    expect(addMonthsToDateOnly(january31, 1).toISOString()).toBe("2027-02-28T00:00:00.000Z");
    expect(recurringEndDate(january31, 1).toISOString()).toBe("2027-02-27T00:00:00.000Z");
  });
});
