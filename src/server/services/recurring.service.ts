import { prisma } from "@/server/db/prisma";
import { addDays, startOfDay, format, isAfter, getDay } from "date-fns";
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
function buildDateTime(date: Date, time: string): Date {
  const { hours, minutes } = parseTime(time);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Generates all dates from startDate to endDate for a given dayOfWeek (0=Sun, 1=Mon, ... 6=Sat)
 */
function getDatesForDayOfWeek(startDate: Date, endDate: Date, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  // Advance to the first occurrence of this day of week
  while (getDay(current) !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }
  while (!isAfter(current, endDate)) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
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
  serviceDurationMinutes: number
): Array<{ startTime: Date; endTime: Date; dayOfWeek: number }> {
  const sessions: Array<{ startTime: Date; endTime: Date; dayOfWeek: number }> = [];

  for (const dayOfWeek of selectedDays) {
    const time = selectedTimes[String(dayOfWeek)];
    if (!time) continue;

    const dates = getDatesForDayOfWeek(startDate, endDate, dayOfWeek);
    for (const date of dates) {
      const startTime = buildDateTime(date, time);
      const endTime = new Date(startTime.getTime() + serviceDurationMinutes * 60 * 1000);
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
  cancelledDates?: Date[]; // Overrides from conflict detection
}) {
  const sessions = buildRecurringSessions(
    params.startDate,
    params.endDate,
    params.selectedDays,
    params.selectedTimes,
    params.serviceDurationMinutes
  );

  const cancelledTimestamps = new Set(
    (params.cancelledDates || []).map((d) => d.getTime())
  );

  const appointments = sessions
    .filter((s) => !cancelledTimestamps.has(startOfDay(s.startTime).getTime()))
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
      additionalServiceIds: [],
    }));

  if (appointments.length === 0) return [];

  await prisma.appointment.createMany({ data: appointments });
  await syncRecurringBookingAppointments(params.recurringBookingId);

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
}): Promise<ConflictInfo[]> {
  const sessions = buildRecurringSessions(
    params.startDate,
    params.endDate,
    params.selectedDays,
    params.selectedTimes,
    params.serviceDurationMinutes
  );

  const conflicts: ConflictInfo[] = [];
  const googleBusy = params.staffId
    ? await getGoogleCalendarBusySlots(
        params.staffId,
        params.startDate,
        addDays(params.endDate, 1),
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
        time: format(session.startTime, "HH:mm"),
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
        time: format(session.startTime, "HH:mm"),
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
          time: format(session.startTime, "HH:mm"),
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
          time: format(session.startTime, "HH:mm"),
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
  const appointments = await prisma.appointment.findMany({
    where: {
      recurringBookingId,
      startTime: { gte: fromDate },
      status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_IN", "COMPLETED"] },
    },
    select: { id: true },
  });
  await prisma.appointment.updateMany({
    where: {
      recurringBookingId,
      startTime: { gte: fromDate },
      status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_IN", "COMPLETED"] },
    },
    data: { status: "CANCELLED" },
  });
  await Promise.all(appointments.map((appointment) => syncAppointmentToGoogle(appointment.id)));
}

/**
 * Cancels specific appointments by their exact startTime dates.
 */
export async function cancelSpecificSessions(recurringBookingId: string, dates: Date[]) {
  for (const date of dates) {
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    const appointments = await prisma.appointment.findMany({
      where: {
        recurringBookingId,
        startTime: { gte: dayStart, lt: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: { id: true },
    });
    await prisma.appointment.updateMany({
      where: {
        recurringBookingId,
        startTime: { gte: dayStart, lt: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      data: { status: "CANCELLED" },
    });
    await Promise.all(appointments.map((appointment) => syncAppointmentToGoogle(appointment.id)));
  }
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
}) {
  // Remove future unconfirmed/pending sessions
  const appointmentsToDelete = await prisma.appointment.findMany({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
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
  reason?: string;
  requestedByClient?: boolean;
}) {
  const dayStart = startOfDay(params.targetDate);
  const dayEnd = addDays(dayStart, 1);

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

  const newStartTime = buildDateTime(params.targetDate, params.newTime);
  const newEndTime = new Date(newStartTime.getTime() + params.serviceDurationMinutes * 60 * 1000);

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
    include: { service: true, staff: true, client: true },
  });

  if (!booking) throw new Error("Reserva recurrente no encontrada");

  // Merge new times with existing (override only changed days)
  const currentTimes = booking.selectedTimes as SelectedTimes;
  const mergedTimes: SelectedTimes = { ...currentTimes, ...params.newTimes };

  // Delete future confirmed appointments
  const appointmentsToDelete = await prisma.appointment.findMany({
    where: {
      recurringBookingId: params.recurringBookingId,
      startTime: { gte: params.fromDate },
      status: { in: ["PENDING", "CONFIRMED"] },
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
  const [existingAppointments, activeScheduleBlocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        staffId: params.staffId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startTime: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.scheduleBlock.findMany({
      where: {
        staffId: params.staffId,
        startTime: { lt: params.endDate },
        endTime: { gt: params.startDate },
        ...getPublicBlockingScheduleBlockWhere(),
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  // Group by day-of-week and collect occupied slots
  const occupiedSlots = new Set<string>();
  for (const apt of existingAppointments) {
    if (getDay(apt.startTime) === params.dayOfWeek) {
      occupiedSlots.add(format(apt.startTime, "HH:mm"));
    }
  }

  return allSlots.filter((slot) => {
    if (occupiedSlots.has(slot)) return false;

    const slotMinutes = parseTime(slot);
    const slotStart = slotMinutes.hours * 60 + slotMinutes.minutes;
    const slotEnd = slotStart + params.serviceDurationMinutes;

    return !activeScheduleBlocks.some((block) => {
      if (getDay(block.startTime) !== params.dayOfWeek) return false;
      const blockStartParts = parseTime(format(block.startTime, "HH:mm"));
      const blockEndParts = parseTime(format(block.endTime, "HH:mm"));
      const blockStart = blockStartParts.hours * 60 + blockStartParts.minutes;
      const blockEnd = blockEndParts.hours * 60 + blockEndParts.minutes;
      return slotStart < blockEnd && slotEnd > blockStart;
    });
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
