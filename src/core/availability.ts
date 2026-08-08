import { addMinutes, setHours, setMinutes, startOfMinute } from "date-fns";

export interface AvailabilityScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen?: boolean;
  isWorking?: boolean;
  breakStart?: string | null;
  breakEnd?: string | null;
}

export interface AvailabilityScheduleOverride {
  date: string;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function scheduleTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function dateTimeToMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function addBreakRange(
  ranges: Array<{ start: number; end: number }>,
  start?: string | null,
  end?: string | null,
) {
  if (!start || !end) return;
  ranges.push({ start: scheduleTimeToMinutes(start), end: scheduleTimeToMinutes(end) });
}

/** Builds wall-clock candidates; callers handle timezone conversion to UTC. */
export function buildSlots(
  date: Date,
  duration: number,
  businessHours?: AvailabilityScheduleEntry[],
  staffSchedule?: AvailabilityScheduleEntry[],
  slotInterval: number = 30,
  scheduleOverrides?: AvailabilityScheduleOverride[],
  additionalStartTimes: Date[] = [],
  staffScheduleOverrides?: AvailabilityScheduleOverride[],
): AvailabilitySlot[] {
  const dayOfWeek = date.getDay();
  let startMinutes = 9 * 60;
  let endMinutes = 19 * 60;
  const breakRanges: Array<{ start: number; end: number }> = [];

  const businessOverride = scheduleOverrides?.find((entry) => entry.date === dateKey(date));
  if (businessOverride) {
    if (!businessOverride.isOpen) return [];
    if (businessOverride.startTime && businessOverride.endTime) {
      startMinutes = scheduleTimeToMinutes(businessOverride.startTime);
      endMinutes = scheduleTimeToMinutes(businessOverride.endTime);
    }
    addBreakRange(breakRanges, businessOverride.breakStart, businessOverride.breakEnd);
  } else if (businessHours?.length) {
    const businessDay = businessHours.find((entry) => entry.dayOfWeek === dayOfWeek);
    if (!businessDay || businessDay.isOpen === false) return [];
    startMinutes = scheduleTimeToMinutes(businessDay.startTime);
    endMinutes = scheduleTimeToMinutes(businessDay.endTime);
    addBreakRange(breakRanges, businessDay.breakStart, businessDay.breakEnd);
  }

  const staffOverride = staffScheduleOverrides?.find((entry) => entry.date === dateKey(date));
  if (staffOverride) {
    if (!staffOverride.isOpen) return [];
    if (staffOverride.startTime && staffOverride.endTime) {
      startMinutes = Math.max(startMinutes, scheduleTimeToMinutes(staffOverride.startTime));
      endMinutes = Math.min(endMinutes, scheduleTimeToMinutes(staffOverride.endTime));
    }
    addBreakRange(breakRanges, staffOverride.breakStart, staffOverride.breakEnd);
  } else if (staffSchedule?.length) {
    const staffDay = staffSchedule.find((entry) => entry.dayOfWeek === dayOfWeek);
    if (!staffDay || staffDay.isWorking === false) return [];
    startMinutes = Math.max(startMinutes, scheduleTimeToMinutes(staffDay.startTime));
    endMinutes = Math.min(endMinutes, scheduleTimeToMinutes(staffDay.endTime));
    addBreakRange(breakRanges, staffDay.breakStart, staffDay.breakEnd);
  }

  if (duration <= 0 || slotInterval <= 0 || endMinutes <= startMinutes) return [];

  const slots: AvailabilitySlot[] = [];
  const slotStarts = new Set<number>();
  let current = startOfMinute(setMinutes(setHours(date, Math.floor(startMinutes / 60)), startMinutes % 60));
  const end = startOfMinute(setMinutes(setHours(date, Math.floor(endMinutes / 60)), endMinutes % 60));

  while (addMinutes(current, duration) <= end) {
    const slotEnd = addMinutes(current, duration);
    const currentMinutes = dateTimeToMinutes(current);
    const slotEndMinutes = dateTimeToMinutes(slotEnd);
    const overlapsBreak = breakRanges.some((range) => currentMinutes < range.end && slotEndMinutes > range.start);
    if (!overlapsBreak) {
      slots.push({ start: current, end: slotEnd });
      slotStarts.add(current.getTime());
    }
    current = addMinutes(current, slotInterval);
  }

  for (const rawStart of additionalStartTimes) {
    const minuteStart = startOfMinute(rawStart);
    const start = minuteStart.getTime() === rawStart.getTime() ? minuteStart : addMinutes(minuteStart, 1);
    if (dateKey(start) !== dateKey(date) || slotStarts.has(start.getTime())) continue;

    const slotEnd = addMinutes(start, duration);
    const currentMinutes = dateTimeToMinutes(start);
    const slotEndMinutes = dateTimeToMinutes(slotEnd);
    const withinWorkingHours = currentMinutes >= startMinutes && slotEndMinutes <= endMinutes;
    const overlapsBreak = breakRanges.some((range) => currentMinutes < range.end && slotEndMinutes > range.start);
    if (withinWorkingHours && !overlapsBreak) {
      slots.push({ start, end: slotEnd });
      slotStarts.add(start.getTime());
    }
  }

  return slots.sort((left, right) => left.start.getTime() - right.start.getTime());
}
