import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiSessionUser(request);
  const business = user ? await getBusinessForUser(user.id) : null;
  if (!user || !business || !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE))) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const parsed = z.object({ reason: z.string().trim().min(5).max(300) }).safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Indica un motivo de al menos 5 caracteres" }, { status: 400 });
  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.findFirst({ where: { id, businessId: business.id }, include: { purchase: true, entitlements: true, redemptions: { where: { status: { in: ["RESERVED", "COMMITTED"] } } } } });
      if (!card) throw new Error("Gift Card no encontrada");
      if (card.purchase.paymentMethod !== "MANUAL") throw new Error("Las ventas Mercado Pago no se anulan desde este módulo");
      const balanceUsed = card.type === "BALANCE" && card.remainingBalance !== card.initialBalance;
      const serviceUsed = card.entitlements.some((item) => item.quantityRemaining !== item.quantityInitial);
      if (balanceUsed || serviceUsed || card.redemptions.length > 0) throw new Error("Solo puedes anular una Gift Card manual sin consumos");
      await tx.giftCard.update({ where: { id: card.id }, data: { status: "VOIDED", voidReason: parsed.data.reason, remainingBalance: card.type === "BALANCE" ? 0 : null, entitlements: card.type === "SERVICE" ? { updateMany: { where: {}, data: { quantityRemaining: 0 } } } : undefined } });
      await tx.giftCardTransaction.create({ data: { giftCardId: card.id, amount: -(card.remainingBalance ?? 0), type: "VOID", reason: parsed.data.reason, createdById: user.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo anular" }, { status: 409 });
  }
}
