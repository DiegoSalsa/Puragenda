import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { cancelFutureSessions, regenerateFromDate, type SelectedTimes } from "@/server/services/recurring.service";

export const dynamic = "force-dynamic";

type ActionType = "pause" | "resume" | "cancel";

/**
 * POST /api/mi-plan/[token]/actions
 * Public API endpoint for clients to perform actions on their recurring booking plan.
 * Validates identity via email in the request body.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { email, action, pauseUntil } = body as {
      email: string;
      action: ActionType;
      pauseUntil?: string;
    };

    if (!email || !action) {
      return NextResponse.json({ error: "Email y acción requeridos" }, { status: 400 });
    }

    const booking = await prisma.recurringBooking.findUnique({
      where: { managementToken: token },
      include: {
        business: { select: { name: true } },
        service: { select: { name: true, duration: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    if (booking.customerEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email no coincide" }, { status: 403 });
    }

    switch (action) {
      case "pause": {
        if (booking.status !== "ACTIVE") {
          return NextResponse.json({ error: "Solo puedes pausar un plan activo" }, { status: 400 });
        }
        if (!pauseUntil) {
          return NextResponse.json({ error: "Fecha de pausa requerida" }, { status: 400 });
        }
        // Cancel all future appointments (same as dashboard pause)
        const now = new Date();
        await cancelFutureSessions(booking.id, now);
        await prisma.recurringBooking.update({
          where: { id: booking.id },
          data: { status: "PAUSED", pausedUntil: new Date(pauseUntil) },
        });
        return NextResponse.json({ ok: true, message: "Plan pausado" });
      }

      case "resume": {
        if (booking.status !== "PAUSED") {
          return NextResponse.json({ error: "Solo puedes reanudar un plan pausado" }, { status: 400 });
        }
        const resumeDate = new Date();
        // If endDate already passed, mark as completed
        if (booking.endDate < resumeDate) {
          await prisma.recurringBooking.update({
            where: { id: booking.id },
            data: { status: "COMPLETED", pausedUntil: null },
          });
          return NextResponse.json({ error: "El plan ya expiró y se marcó como completado" }, { status: 400 });
        }
        // Regenerate future appointments (same as dashboard resume)
        const selectedTimes = booking.selectedTimes as SelectedTimes;
        await regenerateFromDate({
          recurringBookingId: booking.id,
          fromDate: resumeDate,
          businessId: booking.businessId,
          serviceId: booking.serviceId,
          staffId: booking.staffId,
          clientId: booking.clientId,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          endDate: booking.endDate,
          selectedDays: booking.selectedDays,
          selectedTimes,
          serviceDurationMinutes: booking.service.duration,
        });
        await prisma.recurringBooking.update({
          where: { id: booking.id },
          data: { status: "ACTIVE", pausedUntil: null },
        });
        return NextResponse.json({ ok: true, message: "Plan reanudado" });
      }

      case "cancel": {
        if (!["ACTIVE", "PAUSED"].includes(booking.status)) {
          return NextResponse.json({ error: "No puedes cancelar este plan" }, { status: 400 });
        }
        // Cancel all future appointments
        const now = new Date();
        await cancelFutureSessions(booking.id, now);
        await prisma.recurringBooking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
        });

        // Send cancellation email
        try {
          const { sendRecurringBookingCancelledClient } = await import("@/server/email/send");
          await sendRecurringBookingCancelledClient({
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            serviceName: booking.service.name,
            businessName: booking.business.name,
          });
        } catch (emailErr) {
          console.error("[mi-plan] Error sending cancel email:", emailErr);
        }

        return NextResponse.json({ ok: true, message: "Plan cancelado" });
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (err) {
    console.error("[API] mi-plan actions error:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
