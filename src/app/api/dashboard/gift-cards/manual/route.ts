import { NextRequest } from "next/server";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { sendGiftCardEmail } from "@/server/email/gift-card";
import { getBusinessForUser } from "@/server/services/business.service";
import { issueManualGiftCard } from "@/server/services/gift-card.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { manualGiftCardSaleSchema } from "@/server/validations/gift-card";

export async function POST(request: NextRequest) {
  const user = await getApiSessionUser(request);
  const business = user ? await getBusinessForUser(user.id) : null;
  if (!user || !business || !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE))) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const parsed = manualGiftCardSaleSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
  try {
    const issued = await issueManualGiftCard({ businessId: business.id, ...parsed.data, paymentMethod: "MANUAL", paymentStatus: "MANUAL_PAID", createdById: user.id });
    let emailWarning: string | null = null;
    try { await sendGiftCardEmail(issued.giftCard.id); } catch { emailWarning = "La Gift Card fue emitida, pero el correo quedó pendiente. Puedes reenviarlo desde Ventas."; }
    return Response.json({ giftCardId: issued.giftCard.id, publicCode: issued.giftCard.publicCode, emailWarning }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo emitir la Gift Card" }, { status: 400 });
  }
}
