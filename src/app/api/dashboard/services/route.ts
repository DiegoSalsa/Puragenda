import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getServicesByBusinessId, createService, reorderServices } from "@/server/services/service.service";
import { getServiceCategoryByIdAndBusiness } from "@/server/services/service-category.service";
import { serviceSchema } from "@/server/validations/booking";
import { NextRequest } from "next/server";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

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
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
      return Response.json({ error: "Sin permisos para gestionar servicios" }, { status: 403 });
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
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
      return Response.json({ error: "Sin permisos para gestionar servicios" }, { status: 403 });
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
    if (
      parsed.data.categoryId &&
      !(await getServiceCategoryByIdAndBusiness(parsed.data.categoryId, business.id))
    ) {
      return Response.json({ error: "La categoría seleccionada no pertenece a tu negocio" }, { status: 400 });
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

export async function PATCH(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
      return Response.json({ error: "Sin permisos para gestionar servicios" }, { status: 403 });
    }

    const body = await request.json();
    if (
      !Array.isArray(body.orderedIds) ||
      body.orderedIds.length > 500 ||
      body.orderedIds.some((id: unknown) => typeof id !== "string")
    ) {
      return Response.json({ error: "Orden inválido" }, { status: 400 });
    }

    await reorderServices(business.id, body.orderedIds);
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron ordenar los servicios";
    const status = message.startsWith("El orden debe incluir") ? 400 : 500;
    if (status === 500) console.error("[services] Reorder error:", error);
    return Response.json({ error: message }, { status });
  }
}
