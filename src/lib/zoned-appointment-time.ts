import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/** One representation for appointment instants shown in Hoy and sent to Puri. */
export function zonedAppointmentTime(instant: Date | string, timezone: string) {
  const utc = instant instanceof Date ? instant : new Date(instant);
  const local = toZonedTime(utc, timezone);
  return {
    utc: utc.toISOString(),
    timezone,
    localDate: format(local, "yyyy-MM-dd"),
    localTime: format(local, "HH:mm"),
  };
}

export function formatTodayAppointmentTime(instant: Date | string, timezone: string) {
  return zonedAppointmentTime(instant, timezone).localTime;
}

/** First real instant on a local calendar day, including days with a skipped midnight. */
export function startOfLocalDay(dateKey: string, timezone: string) {
  const anchor = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(anchor)) throw new RangeError(`Invalid date: ${dateKey}`);
  let low = anchor - 48 * 60 * 60 * 1000;
  let high = anchor + 48 * 60 * 60 * 1000;
  while (low < high) {
    const midpoint = low + Math.floor((high - low) / 2);
    if (zonedAppointmentTime(new Date(midpoint), timezone).localDate >= dateKey) high = midpoint;
    else low = midpoint + 1;
  }
  if (zonedAppointmentTime(new Date(low), timezone).localDate !== dateKey) {
    throw new RangeError(`No local day for ${dateKey} in ${timezone}`);
  }
  return new Date(low);
}
