import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import {
  sendAppointmentActionNotification,
  sendAppointmentActionStaffNotification,
  sendCancellationEmail,
} from "@/server/email/send";
import {
  getClientPortalAppointment,
  getClientPortalEmailFromRequest,
} from "@/server/services/client-portal.service";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const email = await getClientPortalEmailFromRequest(request);
  if (!email) return Response.json({ error: "Acceso vencido" }, { status: 401 });

  const { appointmentId } = await params;
  const appointment = await getClientPortalAppointment(appointmentId, email);
  if (!appointment) return Response.json({ error: "Cita no encontrada" }, { status: 404 });
  if (!appointment.business.includeAppointmentActionsInConfirmationEmail) {
    return Response.json({ error: "Este negocio no permite cancelar online" }, { status: 403 });
  }
  if (
    appointment.startTime <= new Date() ||
    ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status)
  ) {
    return Response.json({ error: "Esta cita ya no se puede cancelar" }, { status: 409 });
  }

  const result = await prisma.appointment.updateMany({
    where: {
      id: appointment.id,
      status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
      startTime: { gt: new Date() },
    },
    data: {
      status: "CANCELLED",
      actionToken: null,
      customerActionTokenHash: null,
      customerActionTokenExpiresAt: null,
      customerActionTokenUsedAt: new Date(),
    },
  });
  if (result.count !== 1) {
    return Response.json({ error: "Esta cita ya fue procesada" }, { status: 409 });
  }

  await syncAppointmentToGoogle(appointment.id);
  const notifications: Promise<unknown>[] = [sendCancellationEmail(appointment)];
  if (appointment.business.owner?.email) {
    notifications.push(sendAppointmentActionNotification({
      action: "cancelled",
      customerName: appointment.customerName,
      serviceName: appointment.service.name,
      staffName: appointment.staff?.name ?? "Sin asignar",
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      businessName: appointment.business.name,
      timezone: appointment.business.timezone,
      ownerEmail: appointment.business.owner.email,
    }));
  }
  if (appointment.staff?.email) {
    notifications.push(sendAppointmentActionStaffNotification({
      action: "cancelled",
      customerName: appointment.customerName,
      serviceName: appointment.service.name,
      staffName: appointment.staff.name,
      staffEmail: appointment.staff.email,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      businessName: appointment.business.name,
      timezone: appointment.business.timezone,
    }));
  }
  await Promise.allSettled(notifications);

  return Response.json({ ok: true });
}
