import { prisma } from "@/server/db/prisma";
import { getRecurringAvailableSlots } from "@/server/services/recurring.service";
import { addMonths } from "date-fns";
import { NextRequest } from "next/server";

/**
 * GET /api/widget/[slug]/recurring
 * ?staffId=...&dayOfWeek=1&startDate=2026-06-01&durationMonths=1&serviceDurationMinutes=60
 *
 * Returns available HH:MM slots for a recurring booking day.
 * No auth required (public widget endpoint).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const sp = request.nextUrl.searchParams;
    const staffId = sp.get("staffId");
    const dayOfWeekRaw = sp.get("dayOfWeek");
    const startDateRaw = sp.get("startDate");
    const durationMonthsRaw = sp.get("durationMonths");
    const serviceDurationRaw = sp.get("serviceDurationMinutes");

    if (!staffId || !dayOfWeekRaw || !startDateRaw || !durationMonthsRaw || !serviceDurationRaw) {
      return Response.json({ error: "Faltan parametros" }, { status: 400 });
    }

    const dayOfWeek = parseInt(dayOfWeekRaw, 10);
    const durationMonths = parseInt(durationMonthsRaw, 10);
    const serviceDurationMinutes = parseInt(serviceDurationRaw, 10);

    if (isNaN(dayOfWeek) || isNaN(durationMonths) || isNaN(serviceDurationMinutes)) {
      return Response.json({ error: "Parametros invalidos" }, { status: 400 });
    }

    const startDate = new Date(startDateRaw);
    if (isNaN(startDate.getTime())) {
      return Response.json({ error: "Fecha de inicio invalida" }, { status: 400 });
    }

    const endDate = addMonths(startDate, durationMonths);

    const slots = await getRecurringAvailableSlots({
      staffId,
      businessId: business.id,
      dayOfWeek,
      startDate,
      endDate,
      serviceDurationMinutes,
    });

    return Response.json(slots);
  } catch (error) {
    console.error("[api/widget/recurring] Error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}
