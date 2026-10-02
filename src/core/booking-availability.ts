import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { buildSlots, type AvailabilityScheduleEntry, type AvailabilityScheduleOverride, type AvailabilitySlot } from "./availability";
import { isServiceAvailableAtTime, type ServiceAvailability } from "./service-availability";

export type BookingBusyRange = { startTime: string | Date; endTime: string | Date };
export type BookingSlotRules = {
  date: Date; duration: number; timezone: string; businessHours?: AvailabilityScheduleEntry[];
  staffSchedule?: AvailabilityScheduleEntry[]; scheduleOverrides?: AvailabilityScheduleOverride[];
  staffScheduleOverrides?: AvailabilityScheduleOverride[]; slotInterval: number;
  allowSameDayBookings: boolean; minAdvanceBookingMinutes: number; services: ServiceAvailability[];
  blocked?: BookingBusyRange[]; now?: Date;
};

/** Reject nonexistent local times and ranges whose UTC elapsed duration differs. In a
 * repeated hour, fromZonedTime selects one occurrence consistently for API and widget. */
export function slotToUtc(slot: AvailabilitySlot, timezone: string, duration: number) {
  const start = fromZonedTime(slot.start, timezone);
  const end = fromZonedTime(slot.end, timezone);
  const stamp = "yyyy-MM-dd'T'HH:mm:ss";
  if (format(toZonedTime(start, timezone), stamp) !== format(slot.start, stamp)
    || format(toZonedTime(end, timezone), stamp) !== format(slot.end, stamp)
    || end.getTime() - start.getTime() !== duration * 60000) return null;
  return { start, end };
}

export function isBookingSlotBlocked(slot: AvailabilitySlot, blocked: BookingBusyRange[], timezone: string) {
  const duration = (slot.end.getTime() - slot.start.getTime()) / 60000;
  const utc = slotToUtc(slot, timezone, duration);
  return !utc || blocked.some((range) => utc.start < new Date(range.endTime) && utc.end > new Date(range.startTime));
}

/** The widget's wall-clock candidates and all final UTC filters in one place. */
export function buildBookingSlots(rules: BookingSlotRules, includeBusy = true): AvailabilitySlot[] {
  const now = rules.now ?? new Date();
  const today = format(toZonedTime(now, rules.timezone), "yyyy-MM-dd");
  const day = format(rules.date, "yyyy-MM-dd");
  if (day < today || (day === today && !rules.allowSameDayBookings)) return [];
  const cutoff = now.getTime() + (day === today ? rules.minAdvanceBookingMinutes * 60000 : 0);
  return buildSlots(rules.date, rules.duration, rules.businessHours, rules.staffSchedule,
    rules.slotInterval, rules.scheduleOverrides, [], rules.staffScheduleOverrides).filter((slot) => {
    const utc = slotToUtc(slot, rules.timezone, rules.duration);
    return utc !== null && utc.start.getTime() > cutoff
      && rules.services.every((service) => isServiceAvailableAtTime(service, slot.start, slot.end))
      && (!includeBusy || !(rules.blocked ?? []).some((range) => utc.start < new Date(range.endTime) && utc.end > new Date(range.startTime)));
  });
}

export function localDateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

/** A bounded, slightly wider query avoids nonexistent midnight on DST dates;
 * final slots still belong to the exact requested civil day. */
export function bookingDayQueryBounds(key: string, timezone: string) {
  const noon = fromZonedTime(`${key}T12:00:00`, timezone).getTime();
  return { start: new Date(noon - 36 * 3600000), end: new Date(noon + 36 * 3600000) };
}
