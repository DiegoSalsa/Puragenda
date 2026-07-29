const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function timeToMinutes(value: string): number | null {
  if (!isValidTime(value)) return null;

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  return start !== null && end !== null && start < end;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getDefaultBreakRange(
  startTime: string,
  endTime: string,
): { startTime: string; endTime: string } | null {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end - start < 30) return null;

  const shiftDuration = end - start;
  const breakDuration = shiftDuration >= 120 ? 60 : 30;
  const centeredStart = start + Math.floor((shiftDuration - breakDuration) / 2);
  const breakStart = Math.round(centeredStart / 5) * 5;

  return {
    startTime: minutesToTime(breakStart),
    endTime: minutesToTime(breakStart + breakDuration),
  };
}
