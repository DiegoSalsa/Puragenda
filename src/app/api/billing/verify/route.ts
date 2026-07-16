import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { PreApproval } from "mercadopago";
import { addDays } from "date-fns";
import { mpClient } from "@/server/lib/mercadopago";
import { incrementPaidReferrals } from "@/server/services/affiliate.service";
import { markPlatformDiscountApplied } from "@/server/services/platform-discount.service";
import { advanceBillingBenefitAfterAuthorized } from "@/server/services/subscription-billing.service";

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json({ error: "No tienes un negocio asociado" }, { status: 404 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    if (!subscription || !subscription.mpSubscriptionId) {
      return NextResponse.json({ error: "No hay suscripción pendiente" }, { status: 404 });
    }

    if (subscription.status === "ACTIVE") {
      return NextResponse.json({ status: "ACTIVE" }, { status: 200 });
    }

    // Query MercadoPago directly
    const preapproval = new PreApproval(mpClient);
    const mpSubscription = await preapproval.get({ id: subscription.mpSubscriptionId });

    if (!mpSubscription) {
      return NextResponse.json({ error: "Suscripción no encontrada en MercadoPago" }, { status: 404 });
    }

    if (mpSubscription.status === "authorized") {
      // ── Revert discount if pending (same logic as webhook) ──
      

      // Payment successful — activate immediately
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          isTrial: false,
          currentPeriodEnd: addDays(new Date(), 30),
          pendingDiscountPercentage: null,
          hasCountedAsPaidReferral: true,
        },
      });

      await advanceBillingBenefitAfterAuthorized(subscription.id);

      await markPlatformDiscountApplied(subscription.id);

      // ── Count for affiliate (same logic as webhook) ──
      if (!subscription.hasCountedAsPaidReferral) {
        await incrementPaidReferrals(subscription.businessId);
      }

      return NextResponse.json({ status: "ACTIVE" }, { status: 200 });
    }

    return NextResponse.json({ status: mpSubscription.status }, { status: 200 });
  } catch (error) {
    console.error("[billing/verify] Error:", error);
    return NextResponse.json({ error: "Error al verificar el pago" }, { status: 500 });
  }
}
