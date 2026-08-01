import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import {
  getCustomerAppointmentByToken,
  hashCustomerAppointmentToken,
} from "@/server/services/customer-appointment-action.service";
import {
  sendAppointmentActionNotification,
  sendAppointmentActionStaffNotification,
  sendCancellationEmail,
} from "@/server/email/send";
import { appointmentActionLimiter } from "@/server/lib/rate-limit";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";

export async function GET(request: NextRequest) {
  const limited = appointmentActionLimiter.check(request);
  if (limited) return limited;

  const token = request.nextUrl.searchParams.get("token") ?? "";
  const appointment = await getCustomerAppointmentByToken(token);
  if (
    !appointment ||
    !appointment.business.includeAppointmentActionsInConfirmationEmail ||
    ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status)
  ) {
    return Response.json({ error: "El enlace no es válido o ya venció" }, { status: 404 });
  }

  return Response.json({
    customerName: appointment.customerName,
    serviceName: appointment.service.name,
    staffName: appointment.staff?.name ?? "Sin asignar",
    businessName: appointment.business.name,
    businessSlug: appointment.business.slug,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const limited = appointmentActionLimiter.check(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    if (body.action !== "cancel" || body.confirmation !== "CANCELAR") {
      return Response.json({ error: "Debes escribir CANCELAR para confirmar" }, { status: 400 });
    }

    const appointment = await getCustomerAppointmentByToken(token);
    if (
      !appointment ||
      !appointment.business.includeAppointmentActionsInConfirmationEmail ||
      appointment.startTime <= new Date()
    ) {
      return Response.json({ error: "El enlace no es válido o ya venció" }, { status: 404 });
    }
    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status)) {
      return Response.json({ error: "Esta cita ya fue procesada", alreadyProcessed: true }, { status: 409 });
    }

    const consumedAt = new Date();
    const result = await prisma.appointment.updateMany({
      where: {
        id: appointment.id,
        customerActionTokenHash: hashCustomerAppointmentToken(token),
        customerActionTokenUsedAt: null,
        status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
      },
      data: {
        status: "CANCELLED",
        customerActionTokenHash: null,
        customerActionTokenExpiresAt: null,
        customerActionTokenUsedAt: consumedAt,
      },
    });
    if (result.count !== 1) {
      return Response.json({ error: "Esta acción ya fue procesada", alreadyProcessed: true }, { status: 409 });
    }

    await syncAppointmentToGoogle(appointment.id);

    const notifications: Promise<unknown>[] = [
      sendCancellationEmail(appointment),
    ];
    if (appointment.business.owner?.email) {
      notifications.push(sendAppointmentActionNotification({
        action: "cancelled",
        customerName: appointment.customerName,
        serviceName: appointment.service.name,
        staffName: appointment.staff?.name ?? "Sin asignar",
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        businessName: appointment.business.name,
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
      }));
    }
    await Promise.allSettled(notifications);

    return Response.json({ ok: true, action: "cancelled" });
  } catch (error) {
    console.error("[appointment manage cancel]", error);
    return Response.json({ error: "No se pudo cancelar la cita" }, { status: 500 });
  }
}
