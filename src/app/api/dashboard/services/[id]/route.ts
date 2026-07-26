import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  getServiceByIdAndBusiness,
  updateService,
  updateServiceImage,
  deleteService,
} from "@/server/services/service.service";
import { getServiceCategoryByIdAndBusiness } from "@/server/services/service-category.service";
import { serviceSchema } from "@/server/validations/booking";
import { NextRequest } from "next/server";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
      return Response.json({ error: "Sin permisos para gestionar servicios" }, { status: 403 });
    }

    const existing = await getServiceByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Servicio no encontrado" }, { status: 404 });

    const body = await request.json();

    if (Object.keys(body).length === 1 && "imageUrl" in body) {
      const parsedImageUrl = body.imageUrl === "" ? null : body.imageUrl;
      if (parsedImageUrl !== null && typeof parsedImageUrl !== "string") {
        return Response.json({ error: "URL de imagen invalida" }, { status: 400 });
      }

      const service = await updateServiceImage(id, business.id, parsedImageUrl);
      return Response.json(service);
    }

    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return Response.json(
        { error: "Errores de validacion", details: errors },
        { status: 400 }
      );
    }
    if (parsed.data.bookingMode === "PRODUCTION" && !business.productionOrdersEnabled) {
      return Response.json(
        { error: "Activa Encargos en Configuración antes de usar este tipo de servicio" },
        { status: 400 },
      );
    }
    if (
      parsed.data.categoryId &&
      !(await getServiceCategoryByIdAndBusiness(parsed.data.categoryId, business.id))
    ) {
      return Response.json({ error: "La categoría seleccionada no pertenece a tu negocio" }, { status: 400 });
    }

    const service = await updateService(id, {
      ...parsed.data,
      description: parsed.data.description || "",
    });

    return Response.json(service);
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
      return Response.json({ error: "Sin permisos para gestionar servicios" }, { status: 403 });
    }

    const existing = await getServiceByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Servicio no encontrado" }, { status: 404 });

    await deleteService(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
