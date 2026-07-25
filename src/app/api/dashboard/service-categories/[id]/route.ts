import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  deleteServiceCategory,
  getServiceCategoryByIdAndBusiness,
  updateServiceCategory,
} from "@/server/services/service-category.service";
import { serviceCategoryNameSchema } from "@/server/validations/booking";
import { NextRequest } from "next/server";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function getAuthorizedCategory(request: NextRequest, categoryId: string) {
  const user = await getApiSessionUser(request);
  if (!user) return { error: Response.json({ error: "No autenticado" }, { status: 401 }) };

  const business = await getBusinessForUser(user.id);
  if (!business) {
    return { error: Response.json({ error: "Negocio no encontrado" }, { status: 404 }) };
  }

  const category = await getServiceCategoryByIdAndBusiness(categoryId, business.id);
  if (!category) {
    return { error: Response.json({ error: "Categoría no encontrada" }, { status: 404 }) };
  }

  return { category };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const authorization = await getAuthorizedCategory(request, id);
    if ("error" in authorization) return authorization.error;

    const body = await request.json();
    const parsedName = serviceCategoryNameSchema.safeParse(body.name);
    if (!parsedName.success) {
      return Response.json(
        { error: parsedName.error.issues[0]?.message ?? "Nombre inválido" },
        { status: 400 }
      );
    }

    const category = await updateServiceCategory(id, parsedName.data);
    return Response.json(category);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
    }
    console.error("[service-categories/id] Update error:", error);
    return Response.json({ error: "No se pudo actualizar la categoría" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const authorization = await getAuthorizedCategory(request, id);
    if ("error" in authorization) return authorization.error;

    await deleteServiceCategory(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[service-categories/id] Delete error:", error);
    return Response.json({ error: "No se pudo eliminar la categoría" }, { status: 500 });
  }
}
