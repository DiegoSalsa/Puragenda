import {
  buildSlots,
  type AvailabilityScheduleEntry,
  type AvailabilityScheduleOverride,
} from "@/core/availability";
import { localDateFromKey, slotToUtc } from "@/core/booking-availability";
import type { GrowthWindow } from "./contracts";
import { dateKeyInTimezone } from "@/lib/date";

export type Range = { startTime: Date; endTime: Date };
export function unionRanges(ranges: Range[]): Range[] {
  const sorted = ranges
    .filter((r) => r.endTime > r.startTime)
    .map((r) => ({ ...r }))
    .sort((a, b) => +a.startTime - +b.startTime);
  const result: Range[] = [];
  for (const r of sorted) {
    const last = result.at(-1);
    if (last && r.startTime <= last.endTime)
      last.endTime = new Date(Math.max(+last.endTime, +r.endTime));
    else result.push(r);
  }
  return result;
}
function minutes(ranges: Range[]) {
  return unionRanges(ranges).reduce(
    (n, r) => n + (+r.endTime - +r.startTime) / 60000,
    0,
  );
}
function subtract(ranges: Range[], blocks: Range[]) {
  let result = unionRanges(ranges);
  for (const b of unionRanges(blocks))
    result = result.flatMap((r) =>
      r.startTime >= b.endTime || r.endTime <= b.startTime
        ? [r]
        : [
            ...(r.startTime < b.startTime
              ? [{ startTime: r.startTime, endTime: b.startTime }]
              : []),
            ...(r.endTime > b.endTime
              ? [{ startTime: b.endTime, endTime: r.endTime }]
              : []),
          ],
    );
  return result;
}
type Schedule = {
  hours: AvailabilityScheduleEntry[];
  overrides: AvailabilityScheduleOverride[];
};
export type CapacityAgenda = Schedule & {
  staffId: string | null;
  locationId: string | null;
  timezone: string;
  createdAt: Date;
  staffHours?: AvailabilityScheduleEntry[];
  staffOverrides?: AvailabilityScheduleOverride[];
};
export type CapacityBlock = Range & {
  staffId: string | null;
  locationId: string | null;
  type: string;
  releaseAt: Date | null;
};
export function calculateOccupancy(input: {
  window: GrowthWindow;
  agendas: CapacityAgenda[];
  blockedDates: string[];
  blocks: CapacityBlock[];
  appointments: (Range & { staffId: string | null })[];
  warnings?: string[];
}) {
  const warnings = new Set(input.warnings ?? []);
  warnings.add("HISTORICAL_SCHEDULE_NOT_VERSIONED");
  const byStaff = new Map<string, Range[]>();
  for (const agenda of input.agendas) {
    const ranges: Range[] = [];
    for (
      let day = new Date(`${input.window.startKey}T12:00Z`);
      day.toISOString().slice(0, 10) < input.window.endKey;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      const key = day.toISOString().slice(0, 10),
        date = localDateFromKey(key);
      if (
        input.blockedDates.includes(key) ||
        key < dateKeyInTimezone(agenda.createdAt, agenda.timezone)
      )
        continue;
      const override = agenda.overrides.find((o) => o.date === key);
      if (
        !agenda.hours.length &&
        (!override ||
          (override.isOpen && (!override.startTime || !override.endTime)))
      ) {
        warnings.add("MISSING_SCHEDULE");
        continue;
      }
      // No defaults from buildSlots when the stored schedule is absent.
      if (override?.isOpen && (!override.startTime || !override.endTime)) {
        warnings.add("INCOMPLETE_OVERRIDE");
        continue;
      }
      const staffOverride = agenda.staffOverrides?.find((o) => o.date === key);
      if (
        staffOverride?.isOpen &&
        (!staffOverride.startTime || !staffOverride.endTime)
      ) {
        warnings.add("INCOMPLETE_OVERRIDE");
        continue;
      }
      const local = buildSlots(
        date,
        1,
        agenda.hours,
        agenda.staffHours,
        1,
        agenda.overrides,
        [],
        agenda.staffOverrides,
      );
      const merged = unionRanges(
        local.map((s) => ({ startTime: s.start, endTime: s.end })),
      );
      for (const r of merged) {
        const utc = slotToUtc(
          { start: r.startTime, end: r.endTime },
          agenda.timezone,
          (+r.endTime - +r.startTime) / 60000,
        );
        if (!utc) {
          warnings.add("DST_CAPACITY_UNCERTAIN");
          continue;
        }
        const startTime = new Date(Math.max(+utc.start, +input.window.start)),
          endTime = new Date(Math.min(+utc.end, +input.window.end));
        if (endTime > startTime) ranges.push({ startTime, endTime });
      }
    }
    const blocks = input.blocks
      .filter(
        (b) =>
          b.staffId === agenda.staffId &&
          (!b.locationId || b.locationId === agenda.locationId),
      )
      .map((b) => ({
        startTime: b.startTime,
        endTime:
          b.type === "PRIORITY" && b.releaseAt
            ? new Date(Math.min(+b.endTime, +b.releaseAt))
            : b.endTime,
      }));
    const key = agenda.staffId ?? "business";
    byStaff.set(key, [
      ...(byStaff.get(key) ?? []),
      ...subtract(ranges, blocks),
    ]);
  }
  let availableMinutes = 0,
    occupiedMinutes = 0;
  const professionals: {
    professional: string;
    availableMinutes: number;
    occupiedMinutes: number;
  }[] = [];
  const weekdays = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    availableMinutes: 0,
    occupiedMinutes: 0,
  }));
  const hours = Array.from({ length: 24 }, (_, localHour) => ({
    localHour,
    availableMinutes: 0,
    occupiedMinutes: 0,
  }));
  let ordinal = 0;
  for (const [staffId, raw] of byStaff) {
    const capacity = unionRanges(raw),
      bookings = unionRanges(
        input.appointments
          .filter(
            (a) => a.staffId === (staffId === "business" ? null : staffId),
          )
          .map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
      );
    const occupied = capacity
      .flatMap((c) =>
        bookings.map((b) => ({
          startTime: new Date(Math.max(+c.startTime, +b.startTime)),
          endTime: new Date(Math.min(+c.endTime, +b.endTime)),
        })),
      )
      .filter((r) => r.endTime > r.startTime);
    const a = minutes(capacity),
      o = minutes(occupied);
    availableMinutes += a;
    occupiedMinutes += o;
    professionals.push({
      professional: `Agenda ${++ordinal}`,
      availableMinutes: a,
      occupiedMinutes: o,
    });
    // Civil weekday aggregates; ranges have already been clipped to each work day.
    const tz = input.window.timezone;
    const clock = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const addHours = (
      r: Range,
      field: "availableMinutes" | "occupiedMinutes",
    ) => {
      let start = +r.startTime;
      while (start < +r.endTime) {
        const parts = Object.fromEntries(
          clock.formatToParts(new Date(start)).map((p) => [p.type, p.value]),
        );
        const end = Math.min(
          +r.endTime,
          start + (60 - Number(parts.minute)) * 60000,
        );
        hours[Number(parts.hour)][field] += (end - start) / 60000;
        start = end;
      }
    };
    const weekday = (d: Date) =>
      new Date(
        `${new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d)}T12:00Z`,
      ).getUTCDay();
    for (const r of capacity) {
      weekdays[weekday(r.startTime)].availableMinutes +=
        (+r.endTime - +r.startTime) / 60000;
      addHours(r, "availableMinutes");
    }
    for (const r of unionRanges(occupied)) {
      weekdays[weekday(r.startTime)].occupiedMinutes +=
        (+r.endTime - +r.startTime) / 60000;
      addHours(r, "occupiedMinutes");
    }
  }
  if (!input.agendas.length) warnings.add("NO_CAPACITY_AGENDA");
  if (
    input.appointments.some((a) => a.staffId === null) &&
    !byStaff.has("business")
  )
    warnings.add("UNASSIGNED_APPOINTMENTS");
  const complete = [...warnings].every(
    (w) => w === "HISTORICAL_SCHEDULE_NOT_VERSIONED",
  );
  return {
    availableMinutes,
    occupiedMinutes,
    percent:
      complete && availableMinutes
        ? Math.round((occupiedMinutes / availableMinutes) * 1000) / 10
        : null,
    complete,
    basis: "CURRENT_SCHEDULE_WITH_STORED_OVERRIDES",
    chartTimezone: input.window.timezone,
    warnings: [...warnings].sort(),
    professionals,
    weekdays,
    hours: hours.filter((h) => h.availableMinutes > 0),
  };
}
