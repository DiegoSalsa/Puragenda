import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/dashboard/recurring/[id]/cancel-future
 * Cancels all future appointments of a recurring booking from a given date.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const business = await getBusinessForUser(user.id);
    if (!business) return NextResponse.json({ error: "Sin negocio" }, { status: 403 });

    const { id } = await params;
    const { fromDate } = await req.json();
    if (!fromDate) return NextResponse.json({ error: "fromDate requerido" }, { status: 400 });

    // Verify the recurring booking belongs to this business
    const booking = await prisma.recurringBooking.findFirst({
      where: { id, businessId: business.id },
    });
    if (!booking) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

    const from = new Date(fromDate);

    // Cancel all future appointments that are still active
    const result = await prisma.appointment.updateMany({
      where: {
        recurringBookingId: id,
        startTime: { gte: from },
        status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_IN", "COMPLETED"] },
      },
      data: { status: "CANCELLED" },
    });

    // If no more future active appointments remain, mark the booking as CANCELLED
    const remainingActive = await prisma.appointment.count({
      where: {
        recurringBookingId: id,
        startTime: { gte: new Date() },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    });

    if (remainingActive === 0) {
      await prisma.recurringBooking.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    }

    return NextResponse.json({
      ok: true,
      cancelled: result.count,
      bookingCancelled: remainingActive === 0,
    });
  } catch (err) {
    console.error("[API] Cancel future recurring sessions error:", err);
    return NextResponse.json(
      { error: "Error interno", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
