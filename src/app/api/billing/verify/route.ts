import { PreApproval } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { mpClient } from "@/server/lib/mercadopago";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  reconcileMercadoPagoSubscription,
} from "@/server/services/subscription-dunning.service";
import { isLocalPaymentSimulatorEnabled } from "@/server/services/local-payment-simulator";

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json(
        { error: "No tienes un negocio asociado" },
        { status: 404 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });
    if (subscription?.paymentMethod === "BANK_TRANSFER") {
      return NextResponse.json({ status: subscription.status, provider: "bank_transfer", currentPeriodEnd: subscription.currentPeriodEnd });
    }
    if (subscription?.paddleSubscriptionId) {
      return NextResponse.json({
        status: subscription.status,
        provider: "paddle",
        currentPeriodEnd: subscription.currentPeriodEnd,
      });
    }
    // Paddle creates the subscription asynchronously after Checkout succeeds.
    // Until the signed webhook arrives, this is an expected pending state rather
    // than a missing subscription error.
    if (business.countryCode !== "CL") {
      return NextResponse.json({
        status: subscription?.status ?? "INACTIVE",
        provider: "paddle",
        pending: true,
      });
    }
    if (!subscription?.mpSubscriptionId) {
      return NextResponse.json(
        { error: "No hay una suscripción enlazada" },
        { status: 404 }
      );
    }

    if (subscription.mpSubscriptionId.startsWith("LOCAL_SUBSCRIPTION:")) {
      if (!isLocalPaymentSimulatorEnabled()) {
        return NextResponse.json(
          { error: "La suscripción simulada solo existe en desarrollo" },
          { status: 409 },
        );
      }
      return NextResponse.json({
        status: subscription.status,
        simulated: true,
        currentPeriodEnd: subscription.currentPeriodEnd,
      });
    }

    const reconciliation = await reconcileMercadoPagoSubscription(
      subscription.mpSubscriptionId
    );
    if (reconciliation.handled) {
      const refreshed = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });
      return NextResponse.json({
        status: refreshed?.status ?? subscription.status,
        gracePeriodEndsAt: refreshed?.gracePeriodEndsAt ?? null,
        nextPaymentAttemptAt: refreshed?.nextPaymentAttemptAt ?? null,
        paymentRetryCount: refreshed?.paymentRetryCount ?? 0,
      });
    }

    // New subscriptions can be authorized before their first invoice exists.
    const preapproval = new PreApproval(mpClient);
    const mpSubscription = await preapproval.get({
      id: subscription.mpSubscriptionId,
    });

    // Authorization proves consent to future charges, never payment. Keep
    // recognized trial/courtesy/paid time exactly as recorded; only a canonical
    // approved invoice can create or extend the paid grant.

    return NextResponse.json({
      status: subscription.status,
      providerStatus: mpSubscription.status,
    });
  } catch (error) {
    console.error("[billing/verify] Error:", error);
    return NextResponse.json(
      { error: "No pudimos verificar el pago en este momento" },
      { status: 502 }
    );
  }
}
