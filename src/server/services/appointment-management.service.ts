import type { Prisma } from "@prisma/client";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/server/db/prisma";
import { checkAppointmentCollision } from "@/server/services/appointment.service";
import type { ManagedAppointmentInput } from "@/server/validations/appointment-management";
import { isServiceAvailableAtTime } from "@/core/service-availability";
import { usesBusinessScheduleOnly } from "@/core/subscription-plan";

type ResolvedManagedAppointment = {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalPrice: number;
  selectedOptions: Prisma.InputJsonValue;
  service: { id: string; name: string };
  staff: { id: string; name: string };
};

function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function resolveManagedAppointment(
  business: { id: string; timezone: string; subscription?: { plan: "INDIVIDUAL" | "EQUIPO" | "TEST" } | null },
  input: ManagedAppointmentInput,
  excludeAppointmentId?: string,
): Promise<{ error: string } | { value: ResolvedManagedAppointment }> {
  const requestedStart = new Date(input.startTime);
  if (Number.isNaN(requestedStart.getTime()) || requestedStart <= new Date()) {
    return { error: "La cita debe comenzar en una fecha futura" };
  }

  const [service, staff] = await Promise.all([
    prisma.service.findFirst({
      where: { id: input.serviceId, businessId: business.id, bookingMode: "APPOINTMENT" },
      include: {
        optionCategories: {
          orderBy: { position: "asc" },
          include: { alternatives: { orderBy: { position: "asc" } } },
        },
      },
    }),
    prisma.staff.findFirst({
      where: { id: input.staffId, businessId: business.id, isActive: true },
      include: {
        services: { select: { id: true } },
        schedule: true,
      },
    }),
  ]);

  if (!service) return { error: "El servicio no pertenece al negocio" };
  if (!staff) return { error: "El profesional no pertenece al negocio o está inactivo" };

  const assignedServiceIds = new Set(staff.services.map((item) => item.id));
  if (assignedServiceIds.size > 0 && !assignedServiceIds.has(service.id)) {
    return { error: `${staff.name} no realiza el servicio seleccionado` };
  }

  const selectedIds = new Set(input.selectedOptionAlternativeIds);
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
  let totalDuration = service.duration;
  let totalPrice = service.price;

  for (const category of service.optionCategories) {
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

  if (matchedIds.size !== selectedIds.size) {
    return { error: "Una o más opciones no pertenecen al servicio seleccionado" };
  }

  const endTime = new Date(requestedStart.getTime() + totalDuration * 60_000);
  const localStart = toZonedTime(requestedStart, business.timezone);
  const localEnd = toZonedTime(endTime, business.timezone);
  const dayOfWeek = localStart.getDay();
  const useBusinessScheduleOnly = usesBusinessScheduleOnly(business.subscription?.plan);

  if (!isServiceAvailableAtTime({
    availabilityType: service.availabilityType,
    specialWeekDays: service.specialWeekDays,
    specialStartDate: service.specialStartDate?.toISOString().slice(0, 10) ?? null,
    specialEndDate: service.specialEndDate?.toISOString().slice(0, 10) ?? null,
    specialStartTime: service.specialStartTime,
    specialEndTime: service.specialEndTime,
  }, localStart, localEnd)) {
    return { error: `${service.name} no está disponible en el día u horario seleccionado` };
  }

  // Build a date-only key for override lookups
  const dateKey = [
    localStart.getFullYear(),
    String(localStart.getMonth() + 1).padStart(2, "0"),
    String(localStart.getDate()).padStart(2, "0"),
  ].join("-");

  const [businessHour, businessOverride, staffOverride] = await Promise.all([
    prisma.businessHours.findUnique({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek } },
    }),
    prisma.businessScheduleOverride.findUnique({
      where: { businessId_date: { businessId: business.id, date: new Date(`${dateKey}T00:00:00.000Z`) } },
    }),
    !useBusinessScheduleOnly && staff.id
      ? prisma.staffScheduleOverride.findUnique({
          where: { staffId_date: { staffId: staff.id, date: new Date(`${dateKey}T00:00:00.000Z`) } },
        })
      : Promise.resolve(null),
  ]);

  // ── Business schedule validation (override takes priority) ──
  if (businessOverride) {
    if (!businessOverride.isOpen) return { error: "El negocio está cerrado ese día" };
    if (businessOverride.startTime && businessOverride.endTime) {
      const starts = minutesOfDay(localStart);
      const ends = minutesOfDay(localEnd);
      if (starts < parseClock(businessOverride.startTime) || ends > parseClock(businessOverride.endTime)) {
        return { error: "La cita queda fuera del horario de atención del negocio" };
      }
      if (businessOverride.breakStart && businessOverride.breakEnd && starts < parseClock(businessOverride.breakEnd) && ends > parseClock(businessOverride.breakStart)) {
        return { error: "La cita se cruza con la pausa del negocio" };
      }
    }
  } else {
    if (businessHour && !businessHour.isOpen) return { error: "El negocio está cerrado ese día" };
    if (businessHour) {
      const starts = minutesOfDay(localStart);
      const ends = minutesOfDay(localEnd);
      if (starts < parseClock(businessHour.startTime) || ends > parseClock(businessHour.endTime)) {
        return { error: "La cita queda fuera del horario de atención del negocio" };
      }
    }
  }

  // ── Staff schedule validation (override takes priority) ──
  if (!useBusinessScheduleOnly && staffOverride) {
    if (!staffOverride.isWorking) return { error: `${staff.name} no trabaja ese día` };
    if (staffOverride.startTime && staffOverride.endTime) {
      const starts = minutesOfDay(localStart);
      const ends = minutesOfDay(localEnd);
      if (starts < parseClock(staffOverride.startTime) || ends > parseClock(staffOverride.endTime)) {
        return { error: `La cita queda fuera del horario de ${staff.name}` };
      }
      if (staffOverride.breakStart && staffOverride.breakEnd && starts < parseClock(staffOverride.breakEnd) && ends > parseClock(staffOverride.breakStart)) {
        return { error: `La cita se cruza con la pausa de ${staff.name}` };
      }
    }
  } else if (!useBusinessScheduleOnly && staff.schedule.length > 0) {
    const staffDay = staff.schedule.find((entry) => entry.dayOfWeek === dayOfWeek);
    if (!staffDay?.isWorking) return { error: `${staff.name} no trabaja ese día` };
    const starts = minutesOfDay(localStart);
    const ends = minutesOfDay(localEnd);
    if (starts < parseClock(staffDay.startTime) || ends > parseClock(staffDay.endTime)) {
      return { error: `La cita queda fuera del horario de ${staff.name}` };
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
    checkAppointmentCollision(business.id, requestedStart, endTime, staff.id, excludeAppointmentId),
    prisma.scheduleBlock.findFirst({
      where: {
        staffId: staff.id,
        type: "UNAVAILABLE",
        startTime: { lt: endTime },
        endTime: { gt: requestedStart },
      },
      select: { id: true },
    }),
  ]);

  if (appointmentCollision.hasCollision) return { error: "Ese horario ya está ocupado" };
  if (scheduleBlock) return { error: "El profesional tiene un bloqueo en ese horario" };

  return {
    value: {
      startTime: requestedStart,
      endTime,
      totalDuration,
      totalPrice,
      selectedOptions,
      service: { id: service.id, name: service.name },
      staff: { id: staff.id, name: staff.name },
    },
  };
}
