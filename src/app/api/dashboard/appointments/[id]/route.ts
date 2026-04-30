import { getApiSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import {
  getAppointmentByIdAndBusiness,
  updateAppointmentStatus,
} from "@/server/services/appointment.service";
import { sendConfirmationEmail, sendCancellationEmail } from "@/server/email/send";
import { prisma } from "@/server/db/prisma";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getFirstBusinessByOwnerId(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const existing = await getAppointmentByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Cita no encontrada" }, { status: 404 });

    const body = await request.json();
    const { status } = body;

    if (!status || !["PENDING", "CONFIRMED", "CANCELLED", "CHECKED_IN", "NO_SHOW"].includes(status)) {
      return Response.json(
        { error: "Estado inválido" },
        { status: 400 }
      );
    }

    const appointment = await updateAppointmentStatus(id, status);

    // ── CRM: Update Client stats based on status change ──
    if (existing.clientId) {
      if (status === "NO_SHOW") {
        // Increment no-show counter
        await prisma.client.update({
          where: { id: existing.clientId },
          data: { noShowCount: { increment: 1 } },
        });
      }

      if (status === "CHECKED_IN" && existing.totalPrice) {
        // Add to totalSpent when checked in
        await prisma.client.update({
          where: { id: existing.clientId },
          data: { totalSpent: { increment: existing.totalPrice } },
        });
      }
    }

    // Send confirmation email when status changes to CONFIRMED
    if (status === "CONFIRMED") {
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: true,
          staff: true,
          business: { include: { owner: { select: { email: true, name: true } } } },
        },
      });

      if (fullAppointment) {
        sendConfirmationEmail(fullAppointment).catch(() => {});
      }
    }

    // Send cancellation email when status changes to CANCELLED
    if (status === "CANCELLED") {
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: true,
          staff: true,
          business: { include: { owner: { select: { email: true, name: true } } } },
        },
      });

      if (fullAppointment) {
        sendCancellationEmail(fullAppointment).catch(() => {});
      }
    }

    return Response.json(appointment);
  } catch {
    return Response.json(
      { error: "Error al actualizar la cita" },
      { status: 500 }
    );
  }
}
