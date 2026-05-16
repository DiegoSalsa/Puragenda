import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  getServiceByIdAndBusiness,
  updateService,
  deleteService,
} from "@/server/services/service.service";
import { NextRequest } from "next/server";

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

    const existing = await getServiceByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Servicio no encontrado" }, { status: 404 });

    const body = await request.json();
    const { name, description, duration, price, depositAmount } = body;

    const parsedDuration = duration !== undefined ? Number(duration) : undefined;
    const parsedPrice = price !== undefined ? Number(price) : undefined;
    const parsedDeposit = depositAmount !== undefined ? Math.max(0, Math.floor(Number(depositAmount) || 0)) : undefined;

    if (parsedDuration !== undefined && Number.isNaN(parsedDuration)) {
      return Response.json({ error: "Duración inválida" }, { status: 400 });
    }

    if (parsedPrice !== undefined && Number.isNaN(parsedPrice)) {
      return Response.json({ error: "Precio inválido" }, { status: 400 });
    }

    const service = await updateService(id, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(parsedDuration !== undefined && { duration: parsedDuration }),
      ...(parsedPrice !== undefined && { price: parsedPrice }),
      ...(parsedDeposit !== undefined && { depositAmount: parsedDeposit }),
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

    const existing = await getServiceByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Servicio no encontrado" }, { status: 404 });

    await deleteService(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
