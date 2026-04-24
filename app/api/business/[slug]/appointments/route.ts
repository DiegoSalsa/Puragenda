import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { getBlockedSlots } from "@/server/services/appointment.service";
import { NextRequest } from "next/server";

/**
 * GET /api/business/[slug]/appointments?date=2026-04-25
 *
 * Returns blocked time slots for the widget calendar.
 * Requires x-api-key header.
 * Only returns time ranges — no customer data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const business = await getBusinessBySlug(slug);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // Validate API Key
    const apiKey = request.headers.get("x-api-key");
    if (!validateApiKey(business, apiKey)) {
      return Response.json(
        { error: "API Key inválida o no proporcionada" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");

    if (!dateParam) {
      return Response.json(
        { error: "Parámetro 'date' es obligatorio (formato: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Parse date range for the entire day
    const dateStart = new Date(`${dateParam}T00:00:00.000Z`);
    const dateEnd = new Date(`${dateParam}T23:59:59.999Z`);

    if (isNaN(dateStart.getTime())) {
      return Response.json(
        { error: "Formato de fecha inválido" },
        { status: 400 }
      );
    }

    const staffId = url.searchParams.get("staffId") || undefined;

    const blocked = await getBlockedSlots(
      business.id,
      dateStart,
      dateEnd,
      staffId
    );

    return Response.json(
      blocked.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      }))
    );
  } catch {
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
