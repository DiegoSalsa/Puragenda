import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  getAppointmentByIdAndBusiness,
  updateAppointmentStatus,
} from "@/server/services/appointment.service";
import { sendConfirmationEmail, sendCancellationEmail } from "@/server/email/send";
import { processLoyaltyStamps } from "@/server/actions/loyalty.actions";
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

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const existing = await getAppointmentByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Cita no encontrada" }, { status: 404 });

    const body = await request.json();
    const { status } = body;

    if (!status || !["PENDING", "CONFIRMED", "CANCELLED", "CHECKED_IN", "COMPLETED", "NO_SHOW"].includes(status)) {
      return Response.json(
        { error: "Estado inválido" },
        { status: 400 }
      );
    }

    const appointment = await updateAppointmentStatus(id, status);

    // ── CRM: Update Client stats based on status change ──
    if (existing.clientId) {
      if (status === "NO_SHOW") {
        // Incrementar contador de inasistencias
        await prisma.client.update({
          where: { id: existing.clientId },
          data: { noShowCount: { increment: 1 } },
        });
      }

      if (status === "CHECKED_IN") {
        // Add to totalSpent when checked in — fall back to service price if totalPrice not set
        const amount = existing.totalPrice || existing.service.price;
        if (amount > 0) {
          await prisma.client.update({
            where: { id: existing.clientId },
            data: { totalSpent: { increment: amount } },
          });
        }
      }

      // ── Loyalty: Process stamps when appointment is CHECKED_IN ──
      if (status === "CHECKED_IN") {
        processLoyaltyStamps(id).catch((err) =>
          console.error("Error processing loyalty stamps:", err)
        );
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
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json(
      { error: "Error al actualizar la cita" },
      { status: 500 }
    );
  }
}
