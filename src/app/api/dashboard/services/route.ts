import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getServicesByBusinessId, createService } from "@/server/services/service.service";
import { serviceSchema } from "@/server/validations/booking";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const services = await getServicesByBusinessId(business.id);
    return Response.json(services);
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const body = await request.json();

    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return Response.json(
        { error: "Errores de validación", details: errors },
        { status: 400 }
      );
    }
    if (parsed.data.bookingMode === "PRODUCTION" && !business.productionOrdersEnabled) {
      return Response.json(
        { error: "Activa Encargos en Configuración antes de crear este tipo de servicio" },
        { status: 400 },
      );
    }

    const service = await createService({
      ...parsed.data,
      description: parsed.data.description || "",
      businessId: business.id,
    });

    return Response.json(service, { status: 201 });
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}
