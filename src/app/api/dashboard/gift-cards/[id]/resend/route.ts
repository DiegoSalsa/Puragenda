import { NextRequest } from "next/server";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { sendGiftCardEmail } from "@/server/email/gift-card";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiSessionUser(request);
  const business = user ? await getBusinessForUser(user.id) : null;
  if (!user || !business || !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE))) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const { id } = await params;
  const card = await prisma.giftCard.findFirst({ where: { id, businessId: business.id }, select: { id: true } });
  if (!card) return Response.json({ error: "Gift Card no encontrada" }, { status: 404 });
  await sendGiftCardEmail(card.id);
  return Response.json({ ok: true });
}
