import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getClientPortalEmailFromRequest, normalizeClientPortalEmail } from "@/server/services/client-portal.service";
import { portalPlanWhere } from "@/server/services/portal-plan.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/mi-plan/[token]?email=...
 * Requires the owner's authenticated portal session. The path is a locator;
 * an optional email only checks consistency with that verified identity.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const sessionEmail = await getClientPortalEmailFromRequest(req);
    if (!sessionEmail) return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const { token } = await params;
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (email && normalizeClientPortalEmail(email) !== sessionEmail) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

    const booking = await prisma.recurringBooking.findFirst({
      where: portalPlanWhere(token, sessionEmail),
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
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[API] mi-plan GET error:");
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
