import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  createServiceCategory,
  getServiceCategoriesByBusinessId,
} from "@/server/services/service-category.service";
import { serviceCategoryNameSchema } from "@/server/validations/booking";
import { NextRequest } from "next/server";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const business = await getBusinessForUser(user.id);
  if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
    return Response.json({ error: "Sin permisos para gestionar categorías" }, { status: 403 });
  }

  const categories = await getServiceCategoriesByBusinessId(business.id);
  return Response.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
      return Response.json({ error: "Sin permisos para gestionar categorías" }, { status: 403 });
    }

    const body = await request.json();
    const parsedName = serviceCategoryNameSchema.safeParse(body.name);
    if (!parsedName.success) {
      return Response.json(
        { error: parsedName.error.issues[0]?.message ?? "Nombre inválido" },
        { status: 400 }
      );
    }

    const category = await createServiceCategory(business.id, parsedName.data);
    return Response.json(category, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
    }
    console.error("[service-categories] Error:", error);
    return Response.json({ error: "No se pudo crear la categoría" }, { status: 500 });
  }
}
