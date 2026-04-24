// ═══════════════════════════════════════════
// Puragenda — Timezone-aware date helpers
// Uses date-fns-tz for Chile timezone support
// ═══════════════════════════════════════════

import { format as fnsFormat, addDays, addMinutes, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  DEFAULT_TIMEZONE,
  DEFAULT_WORK_START_HOUR,
  DEFAULT_WORK_END_HOUR,
  SLOT_STEP_MINUTES,
} from "@/core/constants";
import type { TimeSlot, BlockedSlot } from "@/core/entities";
import { isSlotBlocked } from "@/core/validators/date-utils";

/**
 * Convert a UTC Date to the business timezone for display.
 */
export function toLocalTime(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  return toZonedTime(date, timezone);
}

/**
 * Convert a local Date (in business timezone) to UTC for storage.
 */
export function toUTC(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Format a date in the business timezone.
 */
export function formatInTimezone(
  date: Date,
  formatStr: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const zonedDate = toZonedTime(date, timezone);
  return fnsFormat(zonedDate, formatStr, { locale: es });
}

/**
 * Build available days starting from tomorrow.
 */
export function buildAvailableDays(count: number = 10): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(new Date(), i + 1));
}

/**
 * Build time slots for a given date and service duration.
 * Marks slots as blocked if they overlap with existing appointments.
 */
export function buildTimeSlots(
  date: Date,
  durationMinutes: number,
  timezone: string = DEFAULT_TIMEZONE,
  blockedSlots: BlockedSlot[] = [],
  workStartHour: number = DEFAULT_WORK_START_HOUR,
  workEndHour: number = DEFAULT_WORK_END_HOUR
): Array<TimeSlot & { blocked: boolean }> {
  const slots: Array<TimeSlot & { blocked: boolean }> = [];

  // Build slots in local timezone
  const dayStart = setMinutes(setHours(date, workStartHour), 0);
  const dayEnd = setMinutes(setHours(date, workEndHour), 0);

  let current = dayStart;

  while (addMinutes(current, durationMinutes) <= dayEnd) {
    const slotStart = current;
    const slotEnd = addMinutes(current, durationMinutes);

    // Convert to UTC for comparison with blocked slots (which are in UTC)
    const slotStartUTC = toUTC(slotStart, timezone);
    const slotEndUTC = toUTC(slotEnd, timezone);

    const slot: TimeSlot = { start: slotStartUTC, end: slotEndUTC };
    const blocked = isSlotBlocked(slot, blockedSlots);

    slots.push({
      start: slotStart,  // Keep local time for display
      end: slotEnd,
      blocked,
    });

    current = addMinutes(current, SLOT_STEP_MINUTES);
  }

  return slots;
}

/**
 * Format a date for display in Spanish.
 */
export function formatDateES(date: Date, formatStr: string): string {
  return fnsFormat(date, formatStr, { locale: es });
}
