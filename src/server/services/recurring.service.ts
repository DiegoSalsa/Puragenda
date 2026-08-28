import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import { addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getPublicBlockingScheduleBlockWhere } from "@/server/services/schedule-block.service";
import {
  removeAppointmentFromGoogle,
  getGoogleCalendarBusySlots,
  syncAppointmentToGoogle,
  syncRecurringBookingAppointments,
} from "@/server/services/google-calendar.service";

// ==========================================
// TYPES
// ==========================================

export interface SelectedTimes {
  [dayOfWeek: string]: string; // { "1": "08:00", "3": "10:00", "5": "09:00" }
}

export interface ConflictInfo {
  date: Date;
  dayOfWeek: number;
  time: string;
  conflictType: "APPOINTMENT" | "SCHEDULE_BLOCK" | "RECURRING" | "GOOGLE_CALENDAR";
}

const cancellableRecurringAppointmentStatuses = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"] as const;

type RecurringCancellationScope = {
  fromDate?: Date;
  dateRanges?: Array<{ start: Date; end: Date }>;
};

export type RecurringCancellationResult =
  | { ok: true; cancelledAppointmentIds: string[] }
  | { ok: false; code: "APPROVED" | "CONFLICT"; error: string };

class ApprovedRecurringDepositError extends Error {}
class RecurringCancellationConflictError extends Error {}

function recurringCancellationWhere(
  recurringBookingId: string,
  scope: RecurringCancellationScope,
): Prisma.AppointmentWhereInput {
  return {
    recurringBookingId,
    status: { in: [...cancellableRecurringAppointmentStatuses] },
    ...(scope.fromDate
      ? { startTime: { gte: scope.fromDate } }
      : scope.dateRanges?.length
        ? { OR: scope.dateRanges.map(({ start, end }) => ({ startTime: { gte: start, lt: end } })) }
        : {}),
  };
}

async function runSerializableTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error
        ? String(error.code)
        : undefined;
      if (code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("Unreachable");
}

async function syncCancelledRecurringAppointments(appointmentIds: string[]) {
  const results = await Promise.allSettled(
    appointmentIds.map((appointmentId) => syncAppointmentToGoogle(appointmentId)),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[recurring] Failed to sync cancelled appointment to Google Calendar:", result.reason);
    }
  }
}

/**
 * Cancels a set of recurring appointments only when none of them has an
 * approved deposit. The serializable transaction prevents a payment approval
 * racing this decision from being silently overwritten.
 */
export async function cancelRecurringSessionsUnlessDepositApproved(params: {
  recurringBookingId: string;
  fromDate?: Date;
  dateRanges?: Array<{ start: Date; end: Date }>;
}): Promise<RecurringCancellationResult> {
  const scope: RecurringCancellationScope = {
    fromDate: params.fromDate,
    dateRanges: params.dateRanges,
  };
  const baseWhere = recurringCancellationWhere(params.recurringBookingId, scope);

  try {
    const cancelledAppointmentIds = await runSerializableTransaction(async (tx) => {
      const approvedAppointment = await tx.appointment.findFirst({
        where: { ...baseWhere, paymentStatus: "APPROVED" },
        select: { id: true },
      });
      if (approvedAppointment) throw new ApprovedRecurringDepositError();

      const cancelled = await tx.appointment.updateManyAndReturn({
        where: { ...baseWhere, paymentStatus: { not: "APPROVED" } },
        data: { status: "CANCELLED" },
        select: { id: true },
      });
      return cancelled.map((appointment) => appointment.id);
    });

    await syncCancelledRecurringAppointments(cancelledAppointmentIds);
    return { ok: true, cancelledAppointmentIds };
  } catch (error) {
    if (error instanceof ApprovedRecurringDepositError) {
      return {
        ok: false,
        code: "APPROVED",
        error: "El plan tiene citas con abono aprobado. Requiere resoluciÃ³n manual.",
      };
    }
    if (error instanceof RecurringCancellationConflictError) {
      return {
        ok: false,
        code: "CONFLICT",
        error: "El plan cambiÃ³ mientras se procesaba la solicitud. Actualiza e intenta nuevamente.",
      };
    }
    throw error;
  }
}

/**
 * Atomically cancels recurring sessions and changes their parent plan state.
 * The parent is never paused/cancelled if any target session has an approved
 * deposit; the transaction rolls back instead of leaving mixed state behind.
 */
export async function cancelRecurringBookingUnlessDepositApproved(params: {
  recurringBookingId: string;
  businessId: string;
  fromDate?: Date;
  status: "CANCELLED" | "PAUSED";
  pausedUntil?: Date | null;
}): Promise<RecurringCancellationResult> {
  const scope: RecurringCancellationScope = { fromDate: params.fromDate };
  const baseWhere = recurringCancellationWhere(params.recurringBookingId, scope);

  try {
    const cancelledAppointmentIds = await runSerializableTransaction(async (tx) => {
      const approvedAppointment = await tx.appointment.findFirst({
        where: { ...baseWhere, paymentStatus: "APPROVED" },
        select: { id: true },
      });
      if (approvedAppointment) throw new ApprovedRecurringDepositError();

      const cancelled = await tx.appointment.updateManyAndReturn({
        where: { ...baseWhere, paymentStatus: { not: "APPROVED" } },
        data: { status: "CANCELLED" },
        select: { id: true },
      });

      const updatedBooking = await tx.recurringBooking.updateMany({
        where: {
          id: params.recurringBookingId,
          businessId: params.businessId,
          appointments: {
            none: { ...baseWhere, paymentStatus: "APPROVED" },
          },
        },
        data: {
          status: params.status,
          ...(params.status === "PAUSED" ? { pausedUntil: params.pausedUntil ?? null } : { pausedUntil: null }),
        },
      });
      if (updatedBooking.count !== 1) throw new RecurringCancellationConflictError();

      return cancelled.map((appointment) => appointment.id);
    });

    await syncCancelledRecurringAppointments(cancelledAppointmentIds);
    return { ok: true, cancelledAppointmentIds };
  } catch (error) {
    if (error instanceof ApprovedRecurringDepositError) {
      return {
        ok: false,
        code: "APPROVED",
        error: "El plan tiene citas con abono aprobado. Requiere resoluciÃ³n manual.",
      };
    }
    if (error instanceof RecurringCancellationConflictError) {
      return {
        ok: false,
        code: "CONFLICT",
        error: "El plan cambiÃ³ mientras se procesaba la solicitud. Actualiza e intenta nuevamente.",
      };
    }
    throw error;
  }
}

// ==========================================
// DATE / SLOT HELPERS
// ==========================================

/**
 * Parses a time string "HH:MM" into { hours, minutes }
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * Builds a Date for a given date + "HH:MM" time string
 */
function dateOnlyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateOnlyFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function shiftDateOnly(date: Date, days: number): Date {
  const shifted = dateOnlyFromKey(dateOnlyKey(date));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

export function addDaysToDateOnly(date: Date, days: number): Date {
  return shiftDateOnly(date, days);
}

function localDateKeyFromInput(date: Date, timezone: string): string {
  const isDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  return isDateOnly ? dateOnlyKey(date) : formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function addMonthsToDateOnly(date: Date, months: number): Date {
  const source = dateOnlyFromKey(dateOnlyKey(date));
  const targetMonthStart = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonthStart.setUTCDate(Math.min(source.getUTCDate(), lastDay));
  return targetMonthStart;
}

export function recurringEndDate(startDate: Date, durationMonths: number): Date {
  return shiftDateOnly(addMonthsToDateOnly(startDate, durationMonths), -1);
}

export function dateOnlyInTimezone(date: Date, timezone: string): Date {
  return dateOnlyFromKey(formatInTimeZone(date, timezone, "yyyy-MM-dd"));
}

function localDayBounds(date: Date, timezone: string): { start: Date; end: Date } {
  const key = localDateKeyFromInput(date, timezone);
  const next = shiftDateOnly(dateOnlyFromKey(key), 1);
  return {
    start: fromZonedTime(`${key}T00:00:00`, timezone),
    end: fromZonedTime(`${dateOnlyKey(next)}T00:00:00`, timezone),
  };
}

function getDatesForDayOfWeek(startDate: Date, endDate: Date, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  const current = dateOnlyFromKey(dateOnlyKey(startDate));
  while (current.getUTCDay() !== dayOfWeek) {
    current.setUTCDate(current.getUTCDate() + 1);
  }
  while (current.getTime() <= dateOnlyFromKey(dateOnlyKey(endDate)).getTime()) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return dates;
}

// ==========================================
// GENERATE APPOINTMENTS
// ==========================================

/**
 * Generates all Appointment records for a RecurringBooking.
 * Called inside a transaction at creation time.
 * Returns the list of Date+time pairs (one per appointment to create).
 */
export function buildRecurringSessions(
  startDate: Date,
  endDate: Date,
  selectedDays: number[],
  selectedTimes: SelectedTimes,
  serviceDurationMinutes: number,
  timezone: string,
): Array<{ startTime: Date; endTime: Date; dayOfWeek: number }> {
  const sessions: Array<{ startTime: Date; endTime: Date; dayOfWeek: number }> = [];

  for (const dayOfWeek of selectedDays) {
    const time = selectedTimes[String(dayOfWeek)];
    if (!time) continue;

    const dates = getDatesForDayOfWeek(startDate, endDate, dayOfWeek);
    for (const date of dates) {
      const startTime = fromZonedTime(`${dateOnlyKey(date)}T${time}:00`, timezone);
      const endTime = addMinutes(startTime, serviceDurationMinutes);
      sessions.push({ startTime, endTime, dayOfWeek });
    }
  }

  // Sort chronologically
  sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  return sessions;
}

/**
 * Creates all Appointment rows for a RecurringBooking inside a transaction.
 * Skips sessions that have a CANCELLED override.
 */
export async function generateAppointments(params: {
  recurringBookingId: string;
  locationId?: string | null;
  businessId: string;
  serviceId: string;
  staffId: string | null;
  clientId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress?: string | null;
  startDate: Date;
  endDate: Date;
  selectedDays: number[];
  selectedTimes: SelectedTimes;
  serviceDurationMinutes: number;
  timezone: string;
  cancelledDates?: Date[]; // Overrides from conflict detection
  db?: Prisma.TransactionClient;
  syncGoogle?: boolean;
}) {
  const sessions = buildRecurringSessions(
    params.startDate,
    params.endDate,
    params.selectedDays,
    params.selectedTimes,
    params.serviceDurationMinutes,
    params.timezone,
  );

  const cancelledTimestamps = new Set(
    (params.cancelledDates || []).map((d) => formatInTimeZone(d, params.timezone, "yyyy-MM-dd"))
  );

  const appointments = sessions
    .filter((s) => !cancelledTimestamps.has(formatInTimeZone(s.startTime, params.timezone, "yyyy-MM-dd")))
    .map((s) => ({
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone ?? undefined,
      customerAddress: params.customerAddress ?? undefined,
      startTime: s.startTime,
      endTime: s.endTime,
      status: "CONFIRMED" as const,
      businessId: params.businessId,
      serviceId: params.serviceId,
      staffId: params.staffId ?? undefined,
      clientId: params.clientId ?? undefined,
      recurringBookingId: params.recurringBookingId,
      locationId: params.locationId ?? undefined,
      additionalServiceIds: [],
    }));

  if (appointments.length === 0) return [];

  const db = params.db ?? prisma;
  await db.appointment.createMany({ data: appointments });

  // External calendar I/O must run after the surrounding DB transaction commits.
  if (params.syncGoogle !== false) {
    await syncRecurringBookingAppointments(params.recurringBookingId);
  }

  return appointments;
}

// ==========================================
// CONFLICT DETECTION
// ==========================================

/**
 * Detects ALL conflicts in the full recurring period before creating the booking.
 * Returns an array of ConflictInfo (not a blocker, just informational).
 */
export async function detectAllConflicts(params: {
  businessId: string;
  staffId: string | null;
  startDate: Date;
  endDate: Date;
  selectedDays: number[];
  selectedTimes: SelectedTimes;
  serviceDurationMinutes: number;
  timezone: string;
}): Promise<ConflictInfo[]> {
  const sessions = buildRecurringSessions(
    params.startDate,
    params.endDate,
    params.selectedDays,
    params.selectedTimes,
    params.serviceDurationMinutes,
    params.timezone,
  );

  const conflicts: ConflictInfo[] = [];
  const googleBusy = params.staffId
    ? await getGoogleCalendarBusySlots(
        params.staffId,
        params.startDate,
        fromZonedTime(`${dateOnlyKey(shiftDateOnly(params.endDate, 1))}T00:00:00`, params.timezone),
      )
    : [];

  for (const session of sessions) {
    // Check appointments (CONFIRMED, PENDING, AWAITING_PAYMENT, CHECKED_IN)
    const aptConflict = await prisma.appointment.findFirst({
      where: {
        businessId: params.businessId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        ...(params.staffId ? { staffId: params.staffId } : {}),
        startTime: { lt: session.endTime },
        endTime: { gt: session.startTime },
      },
      select: { id: true },
    });

    if (aptConflict) {
      conflicts.push({
        date: session.startTime,
        dayOfWeek: session.dayOfWeek,
        time: formatInTimeZone(session.startTime, params.timezone, "HH:mm"),
        conflictType: "APPOINTMENT",
      });
      continue;
    }

    if (
      googleBusy.some(
        (range) => session.startTime < range.endTime && session.endTime > range.startTime,
      )
    ) {
      conflicts.push({
        date: session.startTime,
        dayOfWeek: session.dayOfWeek,
        time: formatInTimeZone(session.startTime, params.timezone, "HH:mm"),
        conflictType: "GOOGLE_CALENDAR",
      });
      continue;
    }

    // Check schedule blocks
    if (params.staffId) {
      const blockConflict = await prisma.scheduleBlock.findFirst({
        where: {
          staffId: params.staffId,
          startTime: { lt: session.endTime },
          endTime: { gt: session.startTime },
          ...getPublicBlockingScheduleBlockWhere(),
        },
        select: { id: true },
      });

      if (blockConflict) {
        conflicts.push({
          date: session.startTime,
          dayOfWeek: session.dayOfWeek,
          time: formatInTimeZone(session.startTime, params.timezone, "HH:mm"),
          conflictType: "SCHEDULE_BLOCK",
        });
        continue;
      }
    }

    // Check other active recurring bookings for the same staff
    if (params.staffId) {
      const recurringConflict = await prisma.appointment.findFirst({
        where: {
          staffId: params.staffId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          recurringBookingId: { not: null },
          startTime: { lt: session.endTime },
          endTime: { gt: session.startTime },
        },
        select: { id: true },
      });

      if (recurringConflict) {
        conflicts.push({
          date: session.startTime,
          dayOfWeek: session.dayOfWeek,
          time: formatInTimeZone(session.startTime, params.timezone, "HH:mm"),
          conflictType: "RECURRING",
        });
      }
    }
  }

  return conflicts;
}

// ==========================================
// CANCEL / MODIFY SESSIONS
// ==========================================

/**
 * Cancels all future appointments of a RecurringBooking from a given date onwards.
 */
export async function cancelFutureSessions(recurringBookingId: string, fromDate: Date) {
  return cancelRecurringSessionsUnlessDepositApproved({ recurringBookingId, fromDate });
}

/**
 * Cancels specific appointments by their exact startTime dates.
 */
export async function cancelSpecificSessions(recurringBookingId: string, dates: Date[], timezone: string) {
  const dateRanges = dates.map((date) => localDayBounds(date, timezone));
  return cancelRecurringSessionsUnlessDepositApproved({ recurringBookingId, dateRanges });
}

/**
 * Regenerates future appointments from a given date (used after resuming a pause).
 * Deletes existing future PENDING/CONFIRMED ones first, then recreates.
 */
export async function regenerateFromDate(params: {
  recurringBookingId: string;
  fromDate: Date;
  businessId: string;
  serviceId: string;
  staffId: string | null;
  clientId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress?: string | null;
  endDate: Date;
  selectedDays: number[];
  selectedTimes: SelectedTimes;
  serviceDurationMinutes: number;
  timezone: string;
}) {
  const approvedAppointment = await prisma.appointment.findFirst({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: "APPROVED",
    },
    select: { id: true },
  });
  if (approvedAppointment) {
    throw new Error("No se pueden regenerar sesiones con abono aprobado. Requiere resoluciÃ³n manual.");
  }

  // Remove future unconfirmed/pending sessions
  const appointmentsToDelete = await prisma.appointment.findMany({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: { not: "APPROVED" },
    },
    select: { id: true },
  });
  await Promise.all(
    appointmentsToDelete.map((appointment) => removeAppointmentFromGoogle(appointment.id)),
  );
  await prisma.appointment.deleteMany({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: { not: "APPROVED" },
    },
  });

  await generateAppointments({
    ...params,
    startDate: params.fromDate,
  });
}

// ==========================================
// TIME CHANGE (per-session or permanent)
// ==========================================

/**
 * Changes the time of a specific session (one occurrence only).
 * Updates the appointment startTime/endTime and creates a RecurringSessionOverride.
 */
export async function applyTimePunctual(params: {
  recurringBookingId: string;
  targetDate: Date;
  newTime: string;
  serviceDurationMinutes: number;
  timezone: string;
  reason?: string;
  requestedByClient?: boolean;
}) {
  const { start: dayStart, end: dayEnd } = localDayBounds(params.targetDate, params.timezone);

  const appointment = await prisma.appointment.findFirst({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: dayStart, lt: dayEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
  });

  if (!appointment) {
    throw new Error("No se encontro el turno para esa fecha");
  }
  if (appointment.paymentStatus === "APPROVED") {
    throw new Error("No se puede cambiar una sesiÃ³n con abono aprobado. Requiere resoluciÃ³n manual.");
  }

  const localDateKey = localDateKeyFromInput(params.targetDate, params.timezone);
  const newStartTime = fromZonedTime(`${localDateKey}T${params.newTime}:00`, params.timezone);
  const newEndTime = addMinutes(newStartTime, params.serviceDurationMinutes);

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointment.id },
      data: { startTime: newStartTime, endTime: newEndTime },
    }),
    prisma.recurringSessionOverride.create({
      data: {
        recurringBookingId: params.recurringBookingId,
        originalDate: params.targetDate,
        action: "TIME_CHANGED",
        newTime: params.newTime,
        reason: params.reason,
        requestedByClient: params.requestedByClient ?? false,
      },
    }),
  ]);
  await syncAppointmentToGoogle(appointment.id);
}

/**
 * Changes the time for all future sessions from a given date onwards (permanent change).
 * Updates selectedTimes in RecurringBooking and recreates future appointments.
 */
export async function applyTimePermanent(params: {
  recurringBookingId: string;
  fromDate: Date;
  newTimes: SelectedTimes; // New times for each day
  serviceDurationMinutes: number;
  reason?: string;
  requestedByClient?: boolean;
}) {
  const booking = await prisma.recurringBooking.findUnique({
    where: { id: params.recurringBookingId },
    include: { service: true, staff: true, client: true, business: { select: { timezone: true } } },
  });

  if (!booking) throw new Error("Reserva recurrente no encontrada");

  const approvedAppointment = await prisma.appointment.findFirst({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: "APPROVED",
    },
    select: { id: true },
  });
  if (approvedAppointment) {
    throw new Error("No se pueden cambiar sesiones con abono aprobado. Requiere resoluciÃ³n manual.");
  }

  // Merge new times with existing (override only changed days)
  const currentTimes = booking.selectedTimes as SelectedTimes;
  const mergedTimes: SelectedTimes = { ...currentTimes, ...params.newTimes };

  // Delete future confirmed appointments
  const appointmentsToDelete = await prisma.appointment.findMany({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: { not: "APPROVED" },
    },
    select: { id: true },
  });
  await Promise.all(
    appointmentsToDelete.map((appointment) => removeAppointmentFromGoogle(appointment.id)),
  );
  await prisma.appointment.deleteMany({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
      paymentStatus: { not: "APPROVED" },
    },
  });

  // Update selectedTimes in the booking
  await prisma.recurringBooking.update({
    where: { id: params.recurringBookingId },
    data: { selectedTimes: mergedTimes },
  });

  // Regenerate appointments with new times
  await generateAppointments({
    recurringBookingId: params.recurringBookingId,
    businessId: booking.businessId,
    serviceId: booking.serviceId,
    staffId: booking.staffId,
    clientId: booking.clientId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress,
    startDate: params.fromDate,
    endDate: booking.endDate,
    selectedDays: booking.selectedDays,
    selectedTimes: mergedTimes,
    serviceDurationMinutes: params.serviceDurationMinutes,
    timezone: booking.business.timezone,
  });

  // Log the override
  await prisma.recurringSessionOverride.create({
    data: {
      recurringBookingId: params.recurringBookingId,
      originalDate: params.fromDate,
      action: "TIME_CHANGED",
      newTime: JSON.stringify(params.newTimes),
      reason: params.reason ?? "Cambio permanente de horario",
      requestedByClient: params.requestedByClient ?? false,
    },
  });
}

// ==========================================
// SCHEDULE BLOCK COLLISION CHECK
// ==========================================

/**
 * Detects all RecurringBooking appointments that collide with a ScheduleBlock.
 * Used in the cron to cancel affected sessions and notify clients.
 */
export async function checkScheduleBlockCollisions(scheduleBlockId: string): Promise<
  Array<{
    appointmentId: string;
    recurringBookingId: string;
    customerName: string;
    customerEmail: string;
    startTime: Date;
    endTime: Date;
    businessName: string;
    serviceName: string;
  }>
> {
  const block = await prisma.scheduleBlock.findUnique({
    where: { id: scheduleBlockId },
    select: { staffId: true, startTime: true, endTime: true, type: true },
  });

  if (!block || block.type === "PRIORITY") return [];

  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      staffId: block.staffId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      recurringBookingId: { not: null },
      startTime: { lt: block.endTime },
      endTime: { gt: block.startTime },
    },
    include: {
      business: { select: { name: true } },
      service: { select: { name: true } },
    },
  });

  return conflictingAppointments.map((apt) => ({
    appointmentId: apt.id,
    recurringBookingId: apt.recurringBookingId!,
    customerName: apt.customerName,
    customerEmail: apt.customerEmail,
    startTime: apt.startTime,
    endTime: apt.endTime,
    businessName: apt.business.name,
    serviceName: apt.service.name,
  }));
}

// ==========================================
// AVAILABLE SLOTS FOR RECURRING WIDGET
// ==========================================

/**
 * Returns available time slots for a given staff + dayOfWeek + date range,
 * accounting for existing recurring bookings already occupying those slots.
 * Used by the recurring widget to show available hours.
 */
export async function getRecurringAvailableSlots(params: {
  staffId: string;
  businessId: string;
  dayOfWeek: number;
  startDate: Date;
  endDate: Date;
  serviceDurationMinutes: number;
  slotInterval?: number;
  timezone: string;
}): Promise<string[]> {
  // Get staff schedule for this day
  const schedule = await prisma.staffSchedule.findFirst({
    where: {
      staffId: params.staffId,
      dayOfWeek: params.dayOfWeek,
      isWorking: true,
    },
  });

  if (!schedule) return [];

  // Generate all possible slots
  const [schedStart, schedEnd] = [schedule.startTime, schedule.endTime];
  const stepMinutes = params.slotInterval ?? params.serviceDurationMinutes;
  const allSlots = generateTimeSlots(schedStart, schedEnd, params.serviceDurationMinutes, stepMinutes);

  // Find all appointments on this dayOfWeek across the entire recurring period
  const rangeStart = fromZonedTime(`${dateOnlyKey(params.startDate)}T00:00:00`, params.timezone);
  const rangeEnd = fromZonedTime(`${dateOnlyKey(shiftDateOnly(params.endDate, 1))}T00:00:00`, params.timezone);
  const [existingAppointments, activeScheduleBlocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        staffId: params.staffId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startTime: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.scheduleBlock.findMany({
      where: {
        staffId: params.staffId,
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
        ...getPublicBlockingScheduleBlockWhere(),
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  return allSlots.filter((slot) => {
    const sessions = buildRecurringSessions(
      params.startDate,
      params.endDate,
      [params.dayOfWeek],
      { [String(params.dayOfWeek)]: slot },
      params.serviceDurationMinutes,
      params.timezone,
    );
    return sessions.every((session) =>
      !existingAppointments.some((appointment) => session.startTime < appointment.endTime && session.endTime > appointment.startTime) &&
      !activeScheduleBlocks.some((block) => session.startTime < block.endTime && session.endTime > block.startTime)
    );
  });
}

/**
 * Generates time slots between startTime and endTime with a given duration interval.
 * startTime / endTime are "HH:MM" strings.
 * stepMinutes controls the interval between slot starts (defaults to durationMinutes).
 */
function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number, stepMinutes?: number): string[] {
  const slots: string[] = [];
  const { hours: sh, minutes: sm } = parseTime(startTime);
  const { hours: eh, minutes: em } = parseTime(endTime);

  let current = sh * 60 + sm;
  const end = eh * 60 + em - durationMinutes;
  const step = stepMinutes ?? durationMinutes;

  while (current <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += step;
  }

  return slots;
}
