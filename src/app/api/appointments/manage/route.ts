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
    timezone: appointment.business.timezone,
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
    const action = body.action === "confirm" || body.action === "cancel" ? body.action : null;
    if (!action) {
      return Response.json({ error: "Acción inválida" }, { status: 400 });
    }
    if (action === "cancel" && body.confirmation !== "CANCELAR") {
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
    if (action === "confirm" && appointment.status === "CONFIRMED") {
      return Response.json({ error: "Esta cita ya fue confirmada", alreadyProcessed: true }, { status: 409 });
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
        status: action === "cancel" ? "CANCELLED" : "CONFIRMED",
        customerActionTokenHash: null,
        customerActionTokenExpiresAt: null,
        customerActionTokenUsedAt: consumedAt,
      },
    });
    if (result.count !== 1) {
      return Response.json({ error: "Esta acción ya fue procesada", alreadyProcessed: true }, { status: 409 });
    }

    await syncAppointmentToGoogle(appointment.id);

    const notificationAction = action === "cancel" ? "cancelled" : "confirmed";
    const notifications: Promise<unknown>[] = [];
    if (action === "cancel") notifications.push(sendCancellationEmail(appointment));
    if (appointment.business.owner?.email) {
      notifications.push(sendAppointmentActionNotification({
        action: notificationAction,
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
        action: notificationAction,
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

    return Response.json({ ok: true, action: notificationAction });
  } catch (error) {
    console.error("[appointment manage action]", error);
    return Response.json({ error: "No se pudo procesar la cita" }, { status: 500 });
  }
}
