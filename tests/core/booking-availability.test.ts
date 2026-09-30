import { describe, expect, it } from "vitest";
import { buildBookingSlots, isBookingSlotBlocked, localDateFromKey, slotToUtc, type BookingSlotRules } from "@/core/booking-availability";
import { format } from "date-fns";

function rules(date = "2026-10-01", timezone = "America/Santiago"): BookingSlotRules {
  return { date: localDateFromKey(date), duration: 60, timezone, slotInterval: 30, allowSameDayBookings: true, minAdvanceBookingMinutes: 60,
    businessHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: true, startTime: "09:00", endTime: "13:00", breakStart: "11:00", breakEnd: "12:00" })),
    services: [], blocked: [], now: new Date("2026-09-30T12:00:00Z") };
}
describe("shared widget/API final slot rules", () => {
  it("applies business hours, pauses and cadence", () => {
    expect(buildBookingSlots(rules()).map((slot) => format(slot.start, "HH:mm"))).toEqual(["09:00", "09:30", "10:00", "12:00"]);
  });
  it("applies exceptions and intersected staff schedules", () => {
    const data = rules();
    data.scheduleOverrides = [{ date: "2026-10-01", isOpen: true, startTime: "10:00", endTime: "14:00" }];
    data.staffScheduleOverrides = [{ date: "2026-10-01", isOpen: true, startTime: "12:00", endTime: "13:30", breakStart: "13:00", breakEnd: "13:30" }];
    expect(buildBookingSlots(data).map((slot) => format(slot.start, "HH:mm"))).toEqual(["12:00"]);
  });
  it("returns empty for a closed day, past date and closed staff override", () => {
    const data = rules();
    data.scheduleOverrides = [{ date: "2026-10-01", isOpen: false, startTime: null, endTime: null }];
    expect(buildBookingSlots(data)).toEqual([]);
    expect(buildBookingSlots(rules("2026-09-29"))).toEqual([]);
    expect(buildBookingSlots({ ...rules(), staffScheduleOverrides: [{ date: "2026-10-01", isOpen: false, startTime: null, endTime: null }] })).toEqual([]);
  });
  it("applies same-day permission and strict advance cutoff in UTC", () => {
    const data = rules("2026-09-30");
    expect(buildBookingSlots(data).map((slot) => format(slot.start, "HH:mm"))).toEqual(["12:00"]);
    expect(buildBookingSlots({ ...data, allowSameDayBookings: false })).toEqual([]);
    expect(buildBookingSlots({ ...data, minAdvanceBookingMinutes: 300 })).toEqual([]);
  });
  it("filters special services and bookings across day boundaries", () => {
    const data = rules();
    data.services = [{ availabilityType: "SPECIAL", specialWeekDays: [4], specialStartTime: "10:00", specialEndTime: "13:00" }];
    data.blocked = [{ startTime: "2026-09-30T23:00:00Z", endTime: "2026-10-01T13:30:00Z" }];
    expect(buildBookingSlots(data).map((slot) => format(slot.start, "HH:mm"))).toEqual(["12:00"]);
  });
  it("widget candidate + busy filter is identical to the API final list", () => {
    const data = rules();
    data.blocked = [{ startTime: "2026-10-01T12:00:00Z", endTime: "2026-10-01T13:00:00Z" }];
    expect(buildBookingSlots(data, false).filter((slot) => !isBookingSlotBlocked(slot, data.blocked!, data.timezone))).toEqual(buildBookingSlots(data));
  });
  it.each([
    ["2026-03-08", "America/New_York", "01:00", "04:00", ["01:00", "03:00"]],
    ["2026-11-01", "America/New_York", "00:00", "04:00", ["00:00", "01:00", "02:00", "03:00"]],
    ["2026-09-06", "America/Santiago", "00:00", "03:00", ["01:00", "02:00"]],
  ])("keeps %s DST candidates real and their elapsed durations canonical", (date, timezone, open, close, expected) => {
    const data = rules(date, timezone);
    data.now = new Date("2026-01-01T00:00:00Z");
    data.duration = 30;
    data.slotInterval = 60;
    data.businessHours = [{ dayOfWeek: data.date.getDay(), isOpen: true, startTime: open, endTime: close }];
    const slots = buildBookingSlots(data);
    expect(slots.map((slot) => format(slot.start, "HH:mm"))).toEqual(expected);
    expect(slots.every((slot) => {
      const utc = slotToUtc(slot, timezone, 30)!;
      return utc.end.getTime() - utc.start.getTime() === 30 * 60000;
    })).toBe(true);
  });
});
