import type { Prisma } from "@prisma/client";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/server/db/prisma";
import { checkAppointmentCollision } from "@/server/services/appointment.service";
import type { ManagedAppointmentInput } from "@/server/validations/appointment-management";
import { isServiceAvailableAtTime } from "@/core/service-availability";
import { usesBusinessScheduleOnly } from "@/core/subscription-plan";
import { formatInTimeZone } from "date-fns-tz";
import { loadBookingContext, getBookingAvailability } from "@/server/booking/read.service";
import { getPublicBlockingScheduleBlockWhere } from "@/server/services/schedule-block.service";
import { BookingSelectionError } from "@/core/booking-selection";
import { z } from "zod";

type RescheduleTarget = { startTime?: Date; endTime?: Date; id: string; businessId: string; serviceId: string; staffId: string | null; totalPrice: number | null; selectedOptions: unknown; totalDuration: number | null; service: { price: number; duration: number } };

/** Shared slot validation for adapters that only move an existing appointment.
 * Uses the public v1 schedule/selection engine; no alternate scheduling rules.
 */
export async function validateAppointmentReschedule(a: RescheduleTarget, start: Date, end: Date, locationId: string, db: Prisma.TransactionClient = prisma, checkGoogle = true) {
  const fail = () => new BookingSelectionError("La cita o el horario cambió", "SLOT_CONFLICT", 409);
  const data = await loadBookingContext(a.businessId, db);
  const location = data.locations.find((l) => l.id === locationId);
  if (!location) throw fail();
  // A move keeps the contracted duration/price and snapshots, even if an option
  // was retired. Only availability is recomputed from today's schedule.
  const contracted = await db.service.findFirst({ where: { id: a.serviceId, businessId: a.businessId }, include: {
    category: true, locations: { where: { location: { businessId: a.businessId, isActive: true } } },
  } });
  if (!contracted) throw fail();
  const duration = a.totalDuration ?? (a.startTime && a.endTime ? (a.endTime.getTime() - a.startTime.getTime()) / 60_000 : a.service.duration);
  if (end.getTime() - start.getTime() !== duration * 60_000) throw fail();
  data.services = [...data.services.filter(s => s.id !== a.serviceId), { ...contracted, price: a.totalPrice ?? a.service.price, duration, optionCategories: [] }];
  const available = await getBookingAvailability(data, { date: formatInTimeZone(start, location.timezone, "yyyy-MM-dd"), serviceId: a.serviceId,
    staffId: a.staffId ?? undefined, locationId, selectedOptionAlternativeIds: [] }, new Date(), { db, skipBusy: true });
  if (!available.slots.some((s) => s.startTime === start.toISOString() && s.endTime === end.toISOString())) throw fail();
  if ((await checkAppointmentCollision(a.businessId, start, end, a.staffId, a.id, locationId, db, checkGoogle)).hasCollision) throw fail();
  const block = await db.scheduleBlock.findFirst({ where: { staff: { businessId: a.businessId }, ...(a.staffId ? { staffId: a.staffId } : {}),
    OR: [{ locationId }, { locationId: null }], startTime: { lt: end }, endTime: { gt: start }, ...getPublicBlockingScheduleBlockWhere() }, select: { id: true } });
  if (block) throw fail();
}

/** Caller owns the capacity lock and transaction, so receipt result and mutation
 * commit together. Never changes customer, price, services or payment state.
 */
export async function rescheduleAppointmentWithinTransaction(db: Prisma.TransactionClient, appointment: RescheduleTarget & { updatedAt: Date }, start: Date, end: Date, locationId: string) {
  await validateAppointmentReschedule(appointment, start, end, locationId, db, false);
  const changed = await db.appointment.updateMany({ where: { id: appointment.id, businessId: appointment.businessId, updatedAt: appointment.updatedAt,
    status: { in: ["PENDING", "CONFIRMED", "AWAITING_PAYMENT"] }, paymentStatus: { not: "APPROVED" }, recurringBookingId: null },
    data: { startTime: start, endTime: end, customerActionTokenHash: null, customerActionTokenExpiresAt: null, customerActionTokenUsedAt: new Date() } });
  if (changed.count !== 1) throw new BookingSelectionError("La cita cambió", "APPOINTMENT_CHANGED", 409);
}

type ResolvedManagedAppointment = {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalPrice: number;
  additionalServiceIds: string[];
  selectedOptions: Prisma.InputJsonValue;
  service: { id: string; name: string };
  staff: { id: string; name: string };
  locationId?: string;
  preserveContract: boolean;
};

type ManagedAppointmentResolutionError = {
  error: string;
  code?: "OUTSIDE_SCHEDULE" | "APPOINTMENT_OVERLAP";
  requiresConfirmation?: boolean;
};

function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function manualConflictMessage(
  conflict: { customerName: string; startTime: Date; endTime: Date },
  timezone: string,
) {
  const formatTime = (value: Date) => new Intl.DateTimeFormat("es-CL", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
  const source = conflict.customerName === "Google Calendar"
    ? "un evento de Google Calendar"
    : "una cita existente";
  return `La reserva se cruza con ${source} de ${formatTime(conflict.startTime)} a ${formatTime(conflict.endTime)}. ¿Agendar igualmente?`;
}

export async function resolveManagedAppointment(
  business: { id: string; timezone: string; subscription?: { plan: "INDIVIDUAL" | "EQUIPO" | "TEST" } | null },
  input: ManagedAppointmentInput,
  excludeAppointmentId?: string,
): Promise<ManagedAppointmentResolutionError | { value: ResolvedManagedAppointment }> {
  const requestedStart = new Date(input.startTime);
  if (Number.isNaN(requestedStart.getTime()) || requestedStart <= new Date()) {
    return { error: "La cita debe comenzar en una fecha futura" };
  }

  const additionalServiceIds = [...new Set(input.additionalServiceIds ?? [])].filter((id) => id !== input.serviceId);
  const previous = excludeAppointmentId ? await prisma.appointment.findFirst({ where: { id: excludeAppointmentId, businessId: business.id } }) : null;
  const previousOptions = z.array(z.object({ alternativeId: z.string() }).passthrough()).safeParse(previous?.selectedOptions ?? []);
  const oldIds = previousOptions.success ? previousOptions.data.map(o => o.alternativeId).sort() : [];
  const preserveContract = !!previous && previous.serviceId === input.serviceId && previousOptions.success &&
    JSON.stringify(oldIds) === JSON.stringify([...(input.selectedOptionAlternativeIds ?? [])].sort()) &&
    JSON.stringify([...(previous.additionalServiceIds ?? [])].sort()) === JSON.stringify([...additionalServiceIds].sort());
  const [service, additionalServices, staff, locations, subscription] = await Promise.all([
    prisma.service.findFirst({
      where: { ...(preserveContract ? {} : { isActive: true }), id: input.serviceId, businessId: business.id, bookingMode: "APPOINTMENT" },
      include: {
        locations: { select: { locationId: true } },
        optionCategories: { where: { isActive: true },
          orderBy: { position: "asc" },
          include: { alternatives: { where: { isActive: true }, orderBy: { position: "asc" } } },
        },
      },
    }),
    prisma.service.findMany({
      where: { id: { in: additionalServiceIds }, businessId: business.id, isActive: true, bookingMode: "APPOINTMENT" },
      include: {
        locations: { select: { locationId: true } },
        optionCategories: { where: { isActive: true }, orderBy: { position: "asc" }, include: { alternatives: { where: { isActive: true }, orderBy: { position: "asc" } } } },
      },
    }),
    prisma.staff.findFirst({
      where: { id: input.staffId, businessId: business.id, isActive: true },
      include: {
        services: { select: { id: true } },
        schedule: true,
        locations: { where: { isActive: true }, include: { schedule: true } },
      },
    }),
    prisma.businessLocation.findMany({ where: { businessId: business.id }, include: { hours: true } }),
    prisma.subscription.findUnique({ where: { businessId: business.id }, select: { plan: true } }),
  ]);

  if (!service) return { error: "El servicio no pertenece al negocio" };
  if (additionalServices.length !== additionalServiceIds.length) return { error: "Uno o más servicios no pertenecen al negocio" };
  if (!staff) return { error: "El profesional no pertenece al negocio o está inactivo" };
  const activeLocations = locations.filter(item => item.isActive);
  const location = input.locationId ? activeLocations.find(item => item.id === input.locationId) : activeLocations.length === 1 ? activeLocations[0] : undefined;
  if ((input.locationId && !location) || (!location && locations.length > 0)) return { error: "Selecciona una sucursal válida" };
  const staffLocation = location ? staff.locations.find(item => item.locationId === location.id) : undefined;
  if (location && (!staffLocation || [service, ...additionalServices].some(item => !item.locations.some(assignment => assignment.locationId === location.id)))) {
    return { error: "El servicio o profesional no está asignado a esta sucursal" };
  }
  const timezone = location?.timezone || business.timezone;

  const assignedServiceIds = new Set(staff.services.map((item) => item.id));
  if (assignedServiceIds.size > 0) {
    const unassigned = [service, ...additionalServices].filter((item) => !assignedServiceIds.has(item.id));
    if (unassigned.length > 0) return { error: `${staff.name} no realiza: ${unassigned.map((item) => item.name).join(", ")}` };
  }

  const selectedIds = new Set(input.selectedOptionAlternativeIds ?? []);
  const matchedIds = new Set<string>();
  const selectedOptions: {
    serviceId: string;
    serviceName: string;
    categoryId: string;
    categoryName: string;
    alternativeId: string;
    alternativeName: string;
    priceDelta: number;
    durationDelta: number;
    isHomeService: boolean;
  }[] = [];
  let totalDuration = [service, ...additionalServices].reduce((total, item) => total + item.duration, 0);
  let totalPrice = [service, ...additionalServices].reduce((total, item) => total + item.price, 0);

  for (const category of preserveContract ? [] : service.optionCategories) {
    const selected = category.alternatives.filter((alternative) => selectedIds.has(alternative.id));
    if (selected.length > category.maxSelections) {
      return { error: `Selecciona como máximo ${category.maxSelections} opción(es) en ${category.name}` };
    }
    if (category.isRequired && selected.length === 0) {
      return { error: `Selecciona una opción en ${category.name}` };
    }
    for (const alternative of selected) {
      matchedIds.add(alternative.id);
      totalDuration += alternative.durationDelta;
      totalPrice += alternative.priceDelta;
      selectedOptions.push({
        serviceId: service.id,
        serviceName: service.name,
        categoryId: category.id,
        categoryName: category.name,
        alternativeId: alternative.id,
        alternativeName: alternative.name,
        priceDelta: alternative.priceDelta,
        durationDelta: alternative.durationDelta,
        isHomeService: alternative.isHomeService,
      });
    }
  }

  if (!preserveContract && matchedIds.size !== selectedIds.size) {
    return { error: "Una o más opciones no pertenecen al servicio seleccionado" };
  }

  if (preserveContract && previous) {
    totalDuration = previous.totalDuration ?? (previous.endTime.getTime() - previous.startTime.getTime()) / 60_000;
    totalPrice = previous.totalPrice ?? service.price;
    selectedOptions.push(...(previous.selectedOptions as unknown as typeof selectedOptions ?? []));
  }
  const endTime = new Date(requestedStart.getTime() + totalDuration * 60_000);
  const localStart = toZonedTime(requestedStart, timezone);
  const localEnd = toZonedTime(endTime, timezone);
  if (formatInTimeZone(requestedStart, timezone, "yyyy-MM-dd") !== formatInTimeZone(endTime, timezone, "yyyy-MM-dd")) return { error: "La cita debe quedar dentro del horario del mismo día" };
  const dayOfWeek = localStart.getDay();
  const useBusinessScheduleOnly = usesBusinessScheduleOnly(subscription?.plan);
  const effectiveStaffSchedule = staffLocation?.schedule.length ? staffLocation.schedule : staff.schedule;

  for (const selectedService of [service, ...additionalServices]) {
    if (!isServiceAvailableAtTime({
      availabilityType: selectedService.availabilityType,
      specialWeekDays: selectedService.specialWeekDays,
      specialStartDate: selectedService.specialStartDate?.toISOString().slice(0, 10) ?? null,
      specialEndDate: selectedService.specialEndDate?.toISOString().slice(0, 10) ?? null,
      specialStartTime: selectedService.specialStartTime,
      specialEndTime: selectedService.specialEndTime,
    }, localStart, localEnd)) {
      return { error: `${selectedService.name} no está disponible en el día u horario seleccionado` };
    }
  }

  // Build a date-only key for override lookups
  const dateKey = [
    localStart.getFullYear(),
    String(localStart.getMonth() + 1).padStart(2, "0"),
    String(localStart.getDate()).padStart(2, "0"),
  ].join("-");

  const [businessHour, businessOverride, staffOverride, blockedDay] = await Promise.all([
    location?.hours.length ? Promise.resolve(location.hours.find(item => item.dayOfWeek === dayOfWeek) ?? null) : prisma.businessHours.findUnique({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek } },
    }),
    (async () => (location ? await prisma.locationScheduleOverride.findUnique({ where: { locationId_date: { locationId: location.id, date: new Date(`${dateKey}T00:00:00.000Z`) } } }) : null) ?? await prisma.businessScheduleOverride.findUnique({
      where: { businessId_date: { businessId: business.id, date: new Date(`${dateKey}T00:00:00.000Z`) } },
    }))(),
    !useBusinessScheduleOnly && staff.id
      ? prisma.staffScheduleOverride.findUnique({
          where: { staffId_date: { staffId: staff.id, date: new Date(`${dateKey}T00:00:00.000Z`) } },
        })
      : Promise.resolve(null),
    prisma.blockedDate.findUnique({ where: { businessId_date: { businessId: business.id, date: new Date(`${dateKey}T00:00:00.000Z`) } }, select: { id: true } }),
  ]);
  if (blockedDay) return { error: "El negocio está bloqueado ese día" };

  // ── Business schedule validation (override takes priority) ──
  if (businessOverride) {
    if (!businessOverride.isOpen) return { error: "El negocio está cerrado ese día" };
    if (businessOverride.startTime && businessOverride.endTime) {
      const starts = minutesOfDay(localStart);
      const ends = minutesOfDay(localEnd);
      if (starts < parseClock(businessOverride.startTime)) return { error: "La cita comienza antes del horario de atención del negocio" };
      if (ends > parseClock(businessOverride.endTime) && input.allowOutsideSchedule !== true) {
        return { error: "El servicio excede el horario de término del negocio. ¿Agendar igualmente?", code: "OUTSIDE_SCHEDULE", requiresConfirmation: true };
      }
      if (businessOverride.breakStart && businessOverride.breakEnd && starts < parseClock(businessOverride.breakEnd) && ends > parseClock(businessOverride.breakStart)) {
        return { error: "La cita se cruza con la pausa del negocio" };
      }
    }
  } else {
    if (location?.hours.length && !businessHour) return { error: "El negocio está cerrado ese día" };
    if (businessHour && !businessHour.isOpen) return { error: "El negocio está cerrado ese día" };
    if (businessHour) {
      const starts = minutesOfDay(localStart);
      const ends = minutesOfDay(localEnd);
      if (starts < parseClock(businessHour.startTime)) return { error: "La cita comienza antes del horario de atención del negocio" };
      if (ends > parseClock(businessHour.endTime) && input.allowOutsideSchedule !== true) {
        return { error: "El servicio excede el horario de término del negocio. ¿Agendar igualmente?", code: "OUTSIDE_SCHEDULE", requiresConfirmation: true };
      }
      if (businessHour.breakStart && businessHour.breakEnd && starts < parseClock(businessHour.breakEnd) && ends > parseClock(businessHour.breakStart)) {
        return { error: "La cita se cruza con la pausa del negocio" };
      }
    }
  }

  // ── Staff schedule validation (override takes priority) ──
  if (!useBusinessScheduleOnly && staffOverride) {
    if (!staffOverride.isWorking) return { error: `${staff.name} no trabaja ese día` };
    if (staffOverride.startTime && staffOverride.endTime) {
      const starts = minutesOfDay(localStart);
      const ends = minutesOfDay(localEnd);
      if (starts < parseClock(staffOverride.startTime)) return { error: `La cita comienza antes del horario de ${staff.name}` };
      if (ends > parseClock(staffOverride.endTime) && input.allowOutsideSchedule !== true) {
        return { error: `El servicio excede el horario de término de ${staff.name}. ¿Agendar igualmente?`, code: "OUTSIDE_SCHEDULE", requiresConfirmation: true };
      }
      if (staffOverride.breakStart && staffOverride.breakEnd && starts < parseClock(staffOverride.breakEnd) && ends > parseClock(staffOverride.breakStart)) {
        return { error: `La cita se cruza con la pausa de ${staff.name}` };
      }
    }
  } else if (!useBusinessScheduleOnly && effectiveStaffSchedule.length > 0) {
    const staffDay = effectiveStaffSchedule.find((entry) => entry.dayOfWeek === dayOfWeek);
    if (!staffDay?.isWorking) return { error: `${staff.name} no trabaja ese día` };
    const starts = minutesOfDay(localStart);
    const ends = minutesOfDay(localEnd);
    if (starts < parseClock(staffDay.startTime)) return { error: `La cita comienza antes del horario de ${staff.name}` };
    if (ends > parseClock(staffDay.endTime) && input.allowOutsideSchedule !== true) {
      return { error: `El servicio excede el horario de término de ${staff.name}. ¿Agendar igualmente?`, code: "OUTSIDE_SCHEDULE", requiresConfirmation: true };
    }
    if (
      staffDay.breakStart &&
      staffDay.breakEnd &&
      starts < parseClock(staffDay.breakEnd) &&
      ends > parseClock(staffDay.breakStart)
    ) {
      return { error: `La cita se cruza con la pausa de ${staff.name}` };
    }
  }

  const [appointmentCollision, scheduleBlock] = await Promise.all([
    input.allowConflictingAppointments === true
      ? Promise.resolve({ hasCollision: false as const })
      : checkAppointmentCollision(business.id, requestedStart, endTime, staff.id, excludeAppointmentId, location?.id),
    prisma.scheduleBlock.findFirst({
      where: {
        staffId: staff.id,
        type: "UNAVAILABLE",
        ...(location ? { OR: [{ locationId: location.id }, { locationId: null }] } : {}),
        startTime: { lt: endTime },
        endTime: { gt: requestedStart },
      },
      select: { id: true },
    }),
  ]);

  if (appointmentCollision.hasCollision && appointmentCollision.conflictingAppointment) {
    return {
      error: manualConflictMessage(appointmentCollision.conflictingAppointment, timezone),
      code: "APPOINTMENT_OVERLAP",
      requiresConfirmation: true,
    };
  }
  if (scheduleBlock) return { error: "El profesional tiene un bloqueo en ese horario" };

  return {
    value: {
      startTime: requestedStart,
      endTime,
      totalDuration,
      totalPrice,
      additionalServiceIds,
      selectedOptions,
      preserveContract,
      service: { id: service.id, name: service.name },
      staff: { id: staff.id, name: staff.name },
      locationId: location?.id,
    },
  };
}
