import { NextResponse } from "next/server";

import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { processPendingDepositPaymentDeliveries } from "@/server/services/deposit.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Operator-triggered recovery for unfinished payment effects. It is scoped to
 * the authenticated business and is deliberately not a scheduled endpoint.
 */
export async function POST() {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "Sin negocio" }, { status: 403 });
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return NextResponse.json({ error: "Sin permisos para reintentar entregas de pago" }, { status: 403 });
  }

  try {
    const result = await processPendingDepositPaymentDeliveries({
      businessId: business.id,
      force: true,
      limit: 10,
    });
    return NextResponse.json({ ok: result.errors.length === 0, ...result });
  } catch (error) {
    console.error("[dashboard/deposit-payment-deliveries/retry] Error:", error);
    return NextResponse.json({ error: "No se pudieron reintentar las entregas" }, { status: 500 });
  }
}
