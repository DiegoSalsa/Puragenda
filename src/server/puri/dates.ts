import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { startOfLocalDay } from "@/lib/zoned-appointment-time";
import { PuriAccessError } from "./types";

export type PuriPeriod = "today" | "tomorrow" | "yesterday" | "this_week" | "next_week" | "previous_week" | "this_month" | "previous_month";

function utcDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }

function addUtcDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

export function periodWindow(period: PuriPeriod, timezone: string, now = new Date()) {
  const local = toZonedTime(now, timezone);
  const day = utcDate(format(local, "yyyy-MM-dd"));
  let start = day;
  let end = addUtcDays(day, 1);
  const monday = addUtcDays(day, -((day.getUTCDay() + 6) % 7));
  if (period === "tomorrow") { start = addUtcDays(day, 1); end = addUtcDays(day, 2); }
  if (period === "yesterday") { start = addUtcDays(day, -1); end = day; }
  if (period === "this_week") { start = monday; end = addUtcDays(start, 7); }
  if (period === "next_week") { start = addUtcDays(monday, 7); end = addUtcDays(start, 7); }
  if (period === "previous_week") { start = addUtcDays(monday, -7); end = monday; }
  if (period === "this_month") { start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1)); end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 1)); }
  if (period === "previous_month") { start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, 1)); end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1)); }
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  return { dateKey: startKey, endKey, start: startOfLocalDay(startKey, timezone), end: startOfLocalDay(endKey, timezone) };
}

export function safeDateWindow(dateKey: string, timezone: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new PuriAccessError("INVALID_DATE");
  const date = utcDate(dateKey);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) throw new PuriAccessError("INVALID_DATE");
  const todayKey = format(toZonedTime(now, timezone), "yyyy-MM-dd");
  const distance = (Date.parse(dateKey) - Date.parse(todayKey)) / 86_400_000;
  if (distance < -90 || distance > 90) throw new PuriAccessError("DATE_OUT_OF_RANGE");
  const endKey = dateKeyForNextDay(date);
  return { dateKey, endKey, start: startOfLocalDay(dateKey, timezone), end: startOfLocalDay(endKey, timezone) };
}

function dateKeyForNextDay(date: Date) { return dateKey(addUtcDays(date, 1)); }
