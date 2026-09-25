import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { PuriAccessError } from "./types";

export type PuriPeriod = "today" | "tomorrow" | "yesterday" | "this_week" | "next_week" | "previous_week" | "this_month" | "previous_month";

export function periodWindow(period: PuriPeriod, timezone: string, now = new Date()) {
  const local = toZonedTime(now, timezone);
  const day = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  let start = day;
  let end = addDays(day, 1);
  if (period === "tomorrow") { start = addDays(day, 1); end = addDays(day, 2); }
  if (period === "yesterday") { start = subDays(day, 1); end = day; }
  if (period === "this_week") { start = startOfWeek(day, { weekStartsOn: 1 }); end = addWeeks(start, 1); }
  if (period === "next_week") { start = addWeeks(startOfWeek(day, { weekStartsOn: 1 }), 1); end = addWeeks(start, 1); }
  if (period === "previous_week") { start = subWeeks(startOfWeek(day, { weekStartsOn: 1 }), 1); end = addWeeks(start, 1); }
  if (period === "this_month") { start = startOfMonth(day); end = addMonths(start, 1); }
  if (period === "previous_month") { start = subMonths(startOfMonth(day), 1); end = addMonths(start, 1); }
  const dateKey = format(start, "yyyy-MM-dd");
  const endKey = format(end, "yyyy-MM-dd");
  return { dateKey, endKey, start: fromZonedTime(`${dateKey}T00:00:00`, timezone), end: fromZonedTime(`${endKey}T00:00:00`, timezone) };
}

export function safeDateWindow(dateKey: string, timezone: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new PuriAccessError("INVALID_DATE");
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) throw new PuriAccessError("INVALID_DATE");
  const todayKey = format(toZonedTime(now, timezone), "yyyy-MM-dd");
  const distance = (Date.parse(dateKey) - Date.parse(todayKey)) / 86_400_000;
  if (distance < -90 || distance > 90) throw new PuriAccessError("DATE_OUT_OF_RANGE");
  const endKey = format(addDays(date, 1), "yyyy-MM-dd");
  return { dateKey, endKey, start: fromZonedTime(`${dateKey}T00:00:00`, timezone), end: fromZonedTime(`${endKey}T00:00:00`, timezone) };
}
