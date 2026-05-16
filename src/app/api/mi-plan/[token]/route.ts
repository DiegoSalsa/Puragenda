import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/mi-plan/[token]?email=...
 * Public API endpoint for clients to view their recurring booking plan.
 * Validates identity via email query param.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const booking = await prisma.recurringBooking.findUnique({
      where: { managementToken: token },
      include: {
        service: { select: { name: true, duration: true } },
        staff: { select: { name: true } },
        business: { select: { name: true, primaryColor: true, slug: true } },
        appointments: {
          select: { id: true, startTime: true, endTime: true, status: true },
          orderBy: { startTime: "asc" },
        },
        sessionOverrides: {
          select: { id: true, originalDate: true, action: true, newTime: true, reason: true, createdAt: true },
          orderBy: { originalDate: "asc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    // Verify identity
    if (booking.customerEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email no coincide" }, { status: 403 });
    }

    // Serialize dates, exclude sensitive fields
    return NextResponse.json({
      id: booking.id,
      customerName: booking.customerName,
      status: booking.status,
      selectedDays: booking.selectedDays,
      selectedTimes: booking.selectedTimes,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      durationMonths: booking.durationMonths,
      pausedUntil: booking.pausedUntil?.toISOString() ?? null,
      service: booking.service,
      staff: booking.staff,
      business: booking.business,
      appointments: booking.appointments.map((a) => ({
        id: a.id,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        status: a.status,
      })),
      sessionOverrides: booking.sessionOverrides.map((o) => ({
        id: o.id,
        originalDate: o.originalDate.toISOString(),
        action: o.action,
        newTime: o.newTime,
        reason: o.reason,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[API] mi-plan GET error:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
