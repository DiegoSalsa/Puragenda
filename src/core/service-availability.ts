export type ServiceAvailability = {
  availabilityType: "NORMAL" | "SPECIAL";
  specialWeekDays: number[];
  specialStartDate?: string | null;
  specialEndDate?: string | null;
  specialStartTime?: string | null;
  specialEndTime?: string | null;
};

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function clockMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isServiceAvailableOnDate(service: ServiceAvailability, date: Date) {
  if (service.availabilityType !== "SPECIAL") return true;

  const key = localDateKey(date);
  if (service.specialStartDate && key < service.specialStartDate) return false;
  if (service.specialEndDate && key > service.specialEndDate) return false;
  if (service.specialWeekDays.length > 0 && !service.specialWeekDays.includes(date.getDay())) {
    return false;
  }
  return true;
}

export function isServiceAvailableAtTime(
  service: ServiceAvailability,
  start: Date,
  end: Date,
) {
  if (!isServiceAvailableOnDate(service, start)) return false;
  if (service.availabilityType !== "SPECIAL" || !service.specialStartTime || !service.specialEndTime) {
    return true;
  }

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  return (
    startMinutes >= clockMinutes(service.specialStartTime) &&
    endMinutes <= clockMinutes(service.specialEndTime)
  );
}
