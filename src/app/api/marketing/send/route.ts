import { getCommercialPlanAccess, isV2Plan } from "@/server/services/commercial-plan-access";
import { NextRequest, NextResponse } from "next/server";
import { marketingLimiter } from "@/server/lib/rate-limit";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getSubscriptionByBusinessId } from "@/server/services/subscription.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { requireSameOrigin } from "@/server/security/same-origin";

export async function POST(request: NextRequest) {
  const blocked = marketingLimiter.check(request);
  if (blocked) return blocked;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  try {
    const user = await getApiSessionUser(request);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const business = await getBusinessForUser(user.id);
    if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.MARKETING_MANAGE)))
      return NextResponse.json({ error: "Sin permisos para gestionar marketing" }, { status: 403 });
    const subscription = await getSubscriptionByBusinessId(business.id);
    if (isV2Plan(subscription?.plan ?? "INDIVIDUAL")) {
      if (!(await getCommercialPlanAccess(business.id)).allowed)
        return NextResponse.json({ error: "Suscripción vencida" }, { status: 403 });
      return NextResponse.json({ code: "CONTACT_FLOW_REQUIRED", message: "Prepara y autoriza las campañas desde Contact Flow en Puragenda+." }, { status: 409 });
    }
    // acceptsMarketing and MarketingCampaign cannot prove consent, suppress an
    // opt-out, reserve shared capacity or recover an ambiguous provider result.
    // Preserve legacy data/terms; reopening dispatch requires a reviewed durable
    // path with those guarantees. No environment flag bypasses this safety stop.
    return NextResponse.json({
      code: "LEGACY_MARKETING_REVIEW_REQUIRED",
      error: "Envíos comerciales pausados",
      message: "El envío de campañas anteriores está pausado hasta completar la verificación de consentimientos y entrega segura. Tu historial y las condiciones de tu contrato se conservan. Los correos de reservas y pagos siguen disponibles.",
    }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
