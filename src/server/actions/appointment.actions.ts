"use server";

import { prisma } from "@/server/db/prisma";
import {
  sendAppointmentActionStaffNotification,
  sendConfirmationEmail,
} from "@/server/email/send";
import {
  getCustomerAppointmentByToken,
  hashCustomerAppointmentToken,
} from "@/server/services/customer-appointment-action.service";
import { getPublicBlockingScheduleBlockWhere } from "@/server/services/schedule-block.service";
import { toZonedTime } from "date-fns-tz";
import { timeToMinutes } from "@/lib/time";

type ScheduleWindow = {
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
};

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function validateScheduleWindow(
  start: Date,
  end: Date,
  window: ScheduleWindow,
  label: string,
) {
  if (localDateKey(start) !== localDateKey(end)) {
    return `La cita debe comenzar y terminar el mismo día según el horario de ${label}`;
  }

  const windowStart = timeToMinutes(window.startTime);
  const windowEnd = timeToMinutes(window.endTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  if (windowStart === null || windowEnd === null) {
    return `El horario de ${label} no está configurado correctamente`;
  }
  if (startMinutes < windowStart || endMinutes > windowEnd) {
    return `El horario seleccionado está fuera del horario de ${label}`;
  }

  const breakStart = window.breakStart ? timeToMinutes(window.breakStart) : null;
  const breakEnd = window.breakEnd ? timeToMinutes(window.breakEnd) : null;
  if (
    breakStart !== null &&
    breakEnd !== null &&
    startMinutes < breakEnd &&
    endMinutes > breakStart
  ) {
    return `El horario seleccionado coincide con la pausa de ${label}`;
  }

  return null;
}

/**
 * Public action: reschedule an appointment.
 * Does NOT require user session — used by clients via the /reagendar/[id] page.
 */
export async function rescheduleAppointmentAction(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string,
  token: string,
) {
  const appointment = await getCustomerAppointmentByToken(token);

  if (
    !appointment ||
    appointment.id !== appointmentId ||
    !appointment.business.includeAppointmentActionsInConfirmationEmail
  ) {
    return { error: "El enlace no es válido, ya fue utilizado o venció" };
  }
  if (appointment.status === "CANCELLED") return { error: "Esta cita ya fue cancelada" };
  if (appointment.recurringBookingId) return { error: "Las sesiones de un plan recurrente no se pueden reagendar por esta vía" };
  if (!appointment.business.allowRescheduling) return { error: "Este negocio no permite reagendamiento" };

  // Validate minimum hours
  const hoursUntil = (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < appointment.business.rescheduleHoursLimit) {
    return { error: `Ya no puedes reagendar (mínimo ${appointment.business.rescheduleHoursLimit} horas de anticipación)` };
  }

  const newStart = new Date(newStartTime);
  const requestedEnd = new Date(newEndTime);
  if (Number.isNaN(newStart.getTime()) || Number.isNaN(requestedEnd.getTime())) {
    return { error: "La nueva fecha no es válida" };
  }
  const canonicalDuration = appointment.totalDuration ?? appointment.service.duration;
  const newEnd = new Date(newStart.getTime() + canonicalDuration * 60_000);
  if (Math.abs(newEnd.getTime() - requestedEnd.getTime()) > 60_000) {
    return { error: "La duración de la cita no es válida" };
  }

  // Validate the new slot is in the future
  if (newStart <= new Date()) {
    return { error: "La nueva fecha debe ser en el futuro" };
  }

  const timezone = appointment.business.timezone || "America/Santiago";
  const localStart = toZonedTime(newStart, timezone);
  const localEnd = toZonedTime(newEnd, timezone);
  const localNow = toZonedTime(new Date(), timezone);
  const bookingDateKey = localDateKey(localStart);
  const todayKey = localDateKey(localNow);

  if (localDateKey(localStart) !== localDateKey(localEnd)) {
    return { error: "La cita debe comenzar y terminar el mismo día" };
  }
  if (bookingDateKey < todayKey) {
    return { error: "La nueva fecha debe ser en el futuro" };
  }
  if (bookingDateKey === todayKey) {
    if (!appointment.business.allowSameDayBookings) {
      return { error: "Este negocio no acepta reservas para el mismo día" };
    }
    const earliestAllowed =
      Date.now() + appointment.business.minAdvanceBookingMinutes * 60_000;
    if (newStart.getTime() < earliestAllowed) {
      return {
        error: `Debes reagendar con al menos ${appointment.business.minAdvanceBookingMinutes} minutos de anticipación`,
      };
    }
  }

  const [blockedDate, businessHours, staffSchedule] = await Promise.all([
    prisma.blockedDate.findUnique({
      where: {
        businessId_date: {
          businessId: appointment.business.id,
          date: new Date(`${bookingDateKey}T00:00:00.000Z`),
        },
      },
      select: { id: true },
    }),
    prisma.businessHours.findMany({
      where: { businessId: appointment.business.id },
      orderBy: { dayOfWeek: "asc" },
    }),
    appointment.staffId
      ? prisma.staffSchedule.findMany({
          where: { staffId: appointment.staffId },
          orderBy: { dayOfWeek: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (blockedDate) {
    return { error: "El negocio no atiende el día seleccionado" };
  }

  const dayOfWeek = localStart.getDay();

  // Check for schedule overrides (take priority over weekly schedule)
  const [businessOverride, staffOverride] = await Promise.all([
    prisma.businessScheduleOverride.findUnique({
      where: {
        businessId_date: {
          businessId: appointment.business.id,
          date: new Date(`${bookingDateKey}T00:00:00.000Z`),
        },
      },
    }),
    appointment.staffId
      ? prisma.staffScheduleOverride.findUnique({
          where: {
            staffId_date: {
              staffId: appointment.staffId,
              date: new Date(`${bookingDateKey}T00:00:00.000Z`),
            },
          },
        })
      : Promise.resolve(null),
  ]);

  // ── Business schedule validation (override takes priority) ──
  if (businessOverride) {
    if (!businessOverride.isOpen) {
      return { error: "El negocio está cerrado el día seleccionado" };
    }
    if (businessOverride.startTime && businessOverride.endTime) {
      const businessScheduleError = validateScheduleWindow(
        localStart,
        localEnd,
        {
          startTime: businessOverride.startTime,
          endTime: businessOverride.endTime,
          breakStart: businessOverride.breakStart,
          breakEnd: businessOverride.breakEnd,
        },
        "atención del negocio",
      );
      if (businessScheduleError) return { error: businessScheduleError };
    }
  } else {
    const businessDay = businessHours.find((entry) => entry.dayOfWeek === dayOfWeek);
    const defaultBusinessDay = {
      startTime: "09:00",
      endTime: "19:00",
      isOpen: dayOfWeek >= 1 && dayOfWeek <= 5,
      breakStart: null,
      breakEnd: null,
    };
    const effectiveBusinessDay =
      businessHours.length === 0 ? defaultBusinessDay : businessDay;
    if (!effectiveBusinessDay?.isOpen) {
      return { error: "El negocio está cerrado el día seleccionado" };
    }
    const businessScheduleError = validateScheduleWindow(
      localStart,
      localEnd,
      effectiveBusinessDay,
      "atención del negocio",
    );
    if (businessScheduleError) return { error: businessScheduleError };
  }

  // ── Staff schedule validation (override takes priority) ──
  if (staffOverride) {
    if (!staffOverride.isWorking) {
      return { error: "El profesional no trabaja el día seleccionado" };
    }
    if (staffOverride.startTime && staffOverride.endTime) {
      const staffScheduleError = validateScheduleWindow(
        localStart,
        localEnd,
        {
          startTime: staffOverride.startTime,
          endTime: staffOverride.endTime,
          breakStart: staffOverride.breakStart,
          breakEnd: staffOverride.breakEnd,
        },
        appointment.staff?.name ?? "trabajo del profesional",
      );
      if (staffScheduleError) return { error: staffScheduleError };
    }
  } else if (staffSchedule.length > 0) {
    const staffDay = staffSchedule.find((entry) => entry.dayOfWeek === dayOfWeek);
    if (!staffDay?.isWorking) {
      return { error: "El profesional no trabaja el día seleccionado" };
    }
    const staffScheduleError = validateScheduleWindow(
      localStart,
      localEnd,
      staffDay,
      appointment.staff?.name ?? "trabajo del profesional",
    );
    if (staffScheduleError) return { error: staffScheduleError };
  }

  // Check for collisions with other appointments
  const collision = await prisma.appointment.findFirst({
    where: {
      id: { not: appointmentId },
      staffId: appointment.staffId,
      startTime: { lt: newEnd },
      endTime: { gt: newStart },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
  });

  if (collision) {
    return { error: "Ese horario ya no está disponible" };
  }

  if (appointment.staffId) {
    const block = await prisma.scheduleBlock.findFirst({
      where: {
        staffId: appointment.staffId,
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
        ...getPublicBlockingScheduleBlockWhere(),
      },
      select: { id: true },
    });
    if (block) return { error: "Ese horario está bloqueado por el profesional" };
  }

  // Cancel old, create new
  const newApt = await prisma.$transaction(async (tx) => {
    const consumed = await tx.appointment.updateMany({
      where: {
        id: appointmentId,
        customerActionTokenHash: hashCustomerAppointmentToken(token),
        customerActionTokenUsedAt: null,
        status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
      },
      data: {
        status: "CANCELLED",
        customerActionTokenHash: null,
        customerActionTokenExpiresAt: null,
        customerActionTokenUsedAt: new Date(),
      },
    });
    if (consumed.count !== 1) throw new Error("ACTION_ALREADY_USED");

    return tx.appointment.create({
      data: {
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        customerPhone: appointment.customerPhone,
        customerAddress: appointment.customerAddress,
        startTime: newStart,
        endTime: newEnd,
        status: "CONFIRMED",
        businessId: appointment.business.id,
        serviceId: appointment.service.id,
        staffId: appointment.staffId,
        clientId: appointment.clientId,
        totalDuration: appointment.totalDuration,
        totalPrice: appointment.totalPrice,
        originalTotalPrice: appointment.originalTotalPrice,
        discountAmount: appointment.discountAmount,
        promotionId: appointment.promotionId,
        promotionTitle: appointment.promotionTitle,
        storyCampaignId: appointment.storyCampaignId,
        additionalServiceIds: appointment.additionalServiceIds,
        selectedOptions: appointment.selectedOptions ?? undefined,
        depositAmount: appointment.depositAmount,
        paymentStatus: appointment.paymentStatus,
        mpPaymentId: appointment.mpPaymentId,
        mpPreferenceId: appointment.mpPreferenceId,
        internalNotes: appointment.internalNotes,
      },
      include: {
        business: {
          select: {
            name: true,
            timezone: true,
            address: true,
            mapsUrl: true,
            owner: { select: { email: true, name: true } },
          },
        },
        service: { select: { name: true } },
        staff: { select: { name: true, email: true } },
      },
    });
  }).catch((error) => {
    if (error instanceof Error && error.message === "ACTION_ALREADY_USED") return null;
    throw error;
  });

  if (!newApt) return { error: "Este enlace ya fue utilizado" };

  // Send confirmation email for the new appointment
  try {
    await sendConfirmationEmail({
      id: newApt.id,
      businessId: newApt.businessId,
      customerName: newApt.customerName,
      customerEmail: newApt.customerEmail,
      customerPhone: newApt.customerPhone,
      startTime: newApt.startTime,
      endTime: newApt.endTime,
      service: newApt.service,
      staff: newApt.staff,
      business: newApt.business,
    });
    if (newApt.staff?.email) {
      await sendAppointmentActionStaffNotification({
        action: "confirmed",
        customerName: newApt.customerName,
        serviceName: newApt.service.name,
        staffName: newApt.staff.name,
        staffEmail: newApt.staff.email,
        startTime: newApt.startTime,
        endTime: newApt.endTime,
        businessName: newApt.business.name,
        timezone: newApt.business.timezone,
      });
    }
  } catch (err) {
    console.error("[Reschedule] Error sending confirmation:", err);
  }

  return { success: true, newAppointmentId: newApt.id };
}
