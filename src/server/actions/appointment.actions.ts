"use server";

import { prisma } from "@/server/db/prisma";
import {
  sendAppointmentActionStaffNotification,
  sendConfirmationEmail,
} from "@/server/email/send";

/**
 * Public action: reschedule an appointment.
 * Does NOT require user session — used by clients via the /reagendar/[id] page.
 */
export async function rescheduleAppointmentAction(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          allowRescheduling: true,
          rescheduleHoursLimit: true,
          address: true,
          mapsUrl: true,
          owner: { select: { email: true, name: true } },
        },
      },
      service: { select: { id: true, name: true, duration: true } },
      staff: { select: { id: true, name: true, email: true } },
    },
  });

  if (!appointment) return { error: "Cita no encontrada" };
  if (appointment.status === "CANCELLED") return { error: "Esta cita ya fue cancelada" };
  if (appointment.recurringBookingId) return { error: "Las sesiones de un plan recurrente no se pueden reagendar por esta vía" };
  if (!appointment.business.allowRescheduling) return { error: "Este negocio no permite reagendamiento" };

  // Validate minimum hours
  const hoursUntil = (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < appointment.business.rescheduleHoursLimit) {
    return { error: `Ya no puedes reagendar (mínimo ${appointment.business.rescheduleHoursLimit} horas de anticipación)` };
  }

  const newStart = new Date(newStartTime);
  const newEnd = new Date(newEndTime);

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

  // Cancel old, create new
  const [, newApt] = await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    }),
    prisma.appointment.create({
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
    }),
  ]);

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
