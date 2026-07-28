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
  const canonicalDuration = appointment.totalDuration ?? appointment.service.duration;
  const newEnd = new Date(newStart.getTime() + canonicalDuration * 60_000);
  if (Math.abs(newEnd.getTime() - new Date(newEndTime).getTime()) > 60_000) {
    return { error: "La duración de la cita no es válida" };
  }

  // Validate the new slot is in the future
  if (newStart <= new Date()) {
    return { error: "La nueva fecha debe ser en el futuro" };
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
        startTime: newStart,
        endTime: newEnd,
        status: "CONFIRMED",
        businessId: appointment.business.id,
        serviceId: appointment.service.id,
        staffId: appointment.staffId,
        clientId: appointment.clientId,
        totalDuration: appointment.totalDuration,
        totalPrice: appointment.totalPrice,
        additionalServiceIds: appointment.additionalServiceIds,
        selectedOptions: appointment.selectedOptions ?? undefined,
      },
      include: {
        business: {
          select: {
            name: true,
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
      });
    }
  } catch (err) {
    console.error("[Reschedule] Error sending confirmation:", err);
  }

  return { success: true, newAppointmentId: newApt.id };
}
