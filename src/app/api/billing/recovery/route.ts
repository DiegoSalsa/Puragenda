import { addHours } from "date-fns";
import { PreApproval } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { mpClient } from "@/server/lib/mercadopago";
import { billingLimiter } from "@/server/lib/rate-limit";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  DUNNING_GRACE_HOURS,
  reconcileMercadoPagoSubscription,
} from "@/server/services/subscription-dunning.service";

const recoverySchema = z.object({
  cardToken: z.string().trim().min(10).max(500),
});

async function getAuthenticatedSubscription(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return { error: "No autorizado", status: 401 } as const;

  const business = await getBusinessForUser(user.id);
  if (!business) {
    return { error: "No tienes un negocio asociado", status: 404 } as const;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: business.id },
  });
  if (!subscription?.mpSubscriptionId) {
    return {
      error: "No hay una suscripción de Mercado Pago enlazada",
      status: 404,
    } as const;
  }

  if (subscription.status !== "PAST_DUE") {
    return {
      error: "La suscripción no tiene un pago atrasado",
      status: 409,
    } as const;
  }

  return { user, business, subscription } as const;
}

export async function GET(request: NextRequest) {
  const blocked = billingLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await getAuthenticatedSubscription(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const mpSubscriptionId = auth.subscription.mpSubscriptionId;
    if (!mpSubscriptionId) {
      return NextResponse.json(
        { error: "No hay una suscripción enlazada" },
        { status: 404 }
      );
    }

    const preapprovalClient = new PreApproval(mpClient);
    const providerSubscription = await preapprovalClient.get({
      id: mpSubscriptionId,
    });
    const providerData = providerSubscription as typeof providerSubscription & {
      card_id?: string | number | null;
    };
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.trim();

    if (!publicKey) {
      return NextResponse.json(
        { error: "El pago seguro no está configurado temporalmente" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      publicKey,
      cardId: providerData.card_id?.toString() ?? null,
      paymentMethodId: providerSubscription.payment_method_id ?? null,
      checkoutUrl: providerSubscription.init_point ?? null,
      gracePeriodEndsAt: auth.subscription.gracePeriodEndsAt,
      nextPaymentAttemptAt: auth.subscription.nextPaymentAttemptAt,
    });
  } catch (error) {
    console.error("[billing/recovery] Failed to prepare recovery:", error);
    return NextResponse.json(
      { error: "No pudimos preparar el pago en este momento" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const blocked = billingLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await getAuthenticatedSubscription(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const mpSubscriptionId = auth.subscription.mpSubscriptionId;
    if (!mpSubscriptionId) {
      return NextResponse.json(
        { error: "No hay una suscripción enlazada" },
        { status: 404 }
      );
    }

    const parsed = recoverySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "La autorización de la tarjeta no es válida" },
        { status: 400 }
      );
    }

    const preapprovalClient = new PreApproval(mpClient);
    await preapprovalClient.update({
      id: mpSubscriptionId,
      body: { card_token_id: parsed.data.cardToken },
    });

    const requestedAt = new Date();
    const requestedGraceEnd = addHours(requestedAt, DUNNING_GRACE_HOURS);
    const gracePeriodEndsAt =
      auth.subscription.gracePeriodEndsAt &&
      auth.subscription.gracePeriodEndsAt > requestedGraceEnd
        ? auth.subscription.gracePeriodEndsAt
        : requestedGraceEnd;

    await prisma.subscription.update({
      where: { id: auth.subscription.id },
      data: {
        gracePeriodEndsAt,
        lastPaymentAttemptAt: requestedAt,
        graceExpiryWarningSentAt: null,
      },
    });

    // Updating the card keeps the same preapproval. Mercado Pago owns the
    // retry schedule; reconcile immediately in case it already processed it.
    const reconciliation = await reconcileMercadoPagoSubscription(
      mpSubscriptionId
    );
    const refreshed = await prisma.subscription.findUnique({
      where: { id: auth.subscription.id },
    });

    return NextResponse.json({
      ok: true,
      status: refreshed?.status ?? "PAST_DUE",
      gracePeriodEndsAt: refreshed?.gracePeriodEndsAt ?? gracePeriodEndsAt,
      nextPaymentAttemptAt: refreshed?.nextPaymentAttemptAt ?? null,
      reconciliation,
      message:
        refreshed?.status === "ACTIVE"
          ? "Pago confirmado. Tu suscripción está activa."
          : "Tarjeta reautorizada. Mercado Pago usará esta misma suscripción en el próximo intento.",
    });
  } catch (error) {
    console.error("[billing/recovery] Failed to update payment method:", error);
    return NextResponse.json(
      {
        error:
          "Mercado Pago no pudo reautorizar la tarjeta. Revisa los datos e intenta nuevamente.",
      },
      { status: 502 }
    );
  }
}
