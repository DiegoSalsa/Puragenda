import { NextRequest } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  DashboardAvailabilityError,
  getDashboardAvailability,
} from "@/server/services/dashboard-availability.service";
import { dashboardAvailabilityRequestSchema } from "@/server/validations/dashboard-availability";

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const parsed = dashboardAvailabilityRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Solicitud invalida" },
        { status: 400 },
      );
    }

    const availability = await getDashboardAvailability(user, business, parsed.data);
    return Response.json(availability, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof DashboardAvailabilityError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[dashboard availability]", error);
    return Response.json({ error: "No se pudo calcular la disponibilidad" }, { status: 500 });
  }
}
