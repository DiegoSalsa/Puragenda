import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const updateSchema = z.object({
  status: z.enum([
    "AWAITING_DEPOSIT",
    "REFERENCES_REVIEW",
    "QUEUED",
    "IN_PRODUCTION",
    "QUALITY_CHECK",
    "BALANCE_DUE",
    "READY_TO_SHIP",
    "SHIPPED",
    "COMPLETED",
    "CANCELLED",
  ]).optional(),
  depositPaid: z.boolean().optional(),
  balancePaid: z.boolean().optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, "No hay cambios");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
    return Response.json({ error: "Sin permisos para gestionar encargos" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Datos invalidos" }, { status: 400 });
  }

  const existing = await prisma.productionOrder.findFirst({
    where: { id, businessId: business.id },
  });
  if (!existing) return Response.json({ error: "Encargo no encontrado" }, { status: 404 });

  const data = parsed.data;
  const nextStatus = data.depositPaid
    ? (existing.referenceImageUrls.length > 0 ? "REFERENCES_REVIEW" : "QUEUED")
    : data.balancePaid
      ? "READY_TO_SHIP"
      : data.status;

  const order = await prisma.productionOrder.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(data.depositPaid ? { depositPaymentStatus: "APPROVED" } : {}),
      ...(data.balancePaid ? { balancePaymentStatus: "APPROVED" } : {}),
      ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes } : {}),
    },
    include: { service: { select: { name: true } } },
  });
  return Response.json(order);
}
