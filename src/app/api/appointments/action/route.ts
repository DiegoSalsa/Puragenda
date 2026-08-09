import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import {
  sendAppointmentActionNotification,
  sendAppointmentActionStaffNotification,
} from "@/server/email/send";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import { appointmentActionLimiter } from "@/server/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = appointmentActionLimiter.check(req as NextRequest);
  if (limited) return limited;

  try {
    const { token, action, confirmation } = await req.json();

    if (!token || !["confirm", "cancel"].includes(action)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (action === "cancel" && confirmation !== "CANCELAR") {
      return NextResponse.json({ error: "Debes escribir CANCELAR para confirmar" }, { status: 400 });
    }

    // Find appointment by action token
    const appointment = await prisma.appointment.findUnique({
      where: { actionToken: token },
      include: {
        service: { select: { name: true } },
        staff: { select: { name: true, email: true } },
        business: {
          select: {
            name: true,
            timezone: true,
            owner: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada o enlace expirado" }, { status: 404 });
    }
    if (appointment.startTime <= new Date()) {
      return NextResponse.json({ error: "Este enlace ya venció" }, { status: 410 });
    }

    // Don't allow actions on already cancelled/completed appointments
    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status)) {
      return NextResponse.json({
        error: `Esta cita ya fue ${appointment.status === "CANCELLED" ? "cancelada" : "completada"}.`,
        alreadyProcessed: true,
      }, { status: 409 });
    }
    if (action === "confirm" && appointment.status === "CONFIRMED") {
      return NextResponse.json({
        error: "Esta cita ya fue confirmada.",
        alreadyProcessed: true,
      }, { status: 409 });
    }

    if (action === "confirm") {
      // Confirm attendance → update to CONFIRMED
      const updated = await prisma.appointment.updateMany({
        where: { id: appointment.id, actionToken: token, status: { not: "CONFIRMED" } },
        data: { status: "CONFIRMED", actionToken: null },
      });
      if (updated.count !== 1) {
        return NextResponse.json({ error: "Esta cita ya fue procesada", alreadyProcessed: true }, { status: 409 });
      }
      await syncAppointmentToGoogle(appointment.id);

      // Notify business owner
      if (appointment.business.owner?.email) {
        await sendAppointmentActionNotification({
          action: "confirmed",
          customerName: appointment.customerName,
          serviceName: appointment.service.name,
          staffName: appointment.staff?.name || "Sin asignar",
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          businessName: appointment.business.name,
          timezone: appointment.business.timezone,
          ownerEmail: appointment.business.owner.email,
        });
      }

      if (appointment.staff?.email) {
        await sendAppointmentActionStaffNotification({
          action: "confirmed",
          customerName: appointment.customerName,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          staffEmail: appointment.staff.email,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          businessName: appointment.business.name,
          timezone: appointment.business.timezone,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Asistencia confirmada exitosamente",
        action: "confirmed",
      });
    }

    if (action === "cancel") {
      // Cancel appointment
      const updated = await prisma.appointment.updateMany({
        where: { id: appointment.id, actionToken: token, status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] } },
        data: { status: "CANCELLED", actionToken: null },
      });
      if (updated.count !== 1) {
        return NextResponse.json({ error: "Esta cita ya fue procesada", alreadyProcessed: true }, { status: 409 });
      }
      await syncAppointmentToGoogle(appointment.id);

      // Notify business owner
      if (appointment.business.owner?.email) {
        await sendAppointmentActionNotification({
          action: "cancelled",
          customerName: appointment.customerName,
          serviceName: appointment.service.name,
          staffName: appointment.staff?.name || "Sin asignar",
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          businessName: appointment.business.name,
          timezone: appointment.business.timezone,
          ownerEmail: appointment.business.owner.email,
        });
      }

      if (appointment.staff?.email) {
        await sendAppointmentActionStaffNotification({
          action: "cancelled",
          customerName: appointment.customerName,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          staffEmail: appointment.staff.email,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          businessName: appointment.business.name,
          timezone: appointment.business.timezone,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Cita cancelada exitosamente",
        action: "cancelled",
      });
    }
  } catch (err) {
    console.error("[Appointment Action] Error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
