import { PreApproval } from "mercadopago";
import { PRICING, EXTRA_STAFF_COST, ANNUAL_MULTIPLIER } from "@/core/constants";
import { mpClient } from "@/server/lib/mercadopago";
import { prisma } from "@/server/db/prisma";

export const MIN_MERCADOPAGO_AMOUNT_CLP = 10;

type BillingPlan = keyof typeof PRICING;
type BillingCycle = "MONTHLY" | "ANNUAL";

export type BillingSubscriptionInput = {
  id?: string;
  plan: BillingPlan;
  status?: "ACTIVE" | "TRIALING" | "INACTIVE" | "CANCELLED";
  billingCycle: BillingCycle;
  extraStaffCount: number;
  pendingDiscountPercentage?: number | null;
  freeMonthsRemaining?: number | null;
  promoName?: string | null;
  promoFreeMonthsRemaining?: number | null;
  promoDiscountPercentage?: number | null;
  promoDiscountMonthsRemaining?: number | null;
  nextBillingOverrideAmount?: number | null;
  mpSubscriptionId?: string | null;
  currentPeriodEnd?: Date | string | null;
};

export type NextBillingPreview = {
  baseAmount: number;
  amountDue: number;
  mpAmount: number;
  discountPercentage: number | null;
  reason: string;
  hasBenefit: boolean;
  usesMercadoPagoMinimum: boolean;
};

export function calculateSubscriptionBaseAmount(subscription: {
  plan: BillingPlan;
  billingCycle: BillingCycle;
  extraStaffCount: number;
}) {
  const planPricing = PRICING[subscription.plan] ?? PRICING.INDIVIDUAL;
  let monthlyAmount = planPricing.monthly;

  if (subscription.plan === "EQUIPO" && subscription.extraStaffCount > 0) {
    monthlyAmount += subscription.extraStaffCount * EXTRA_STAFF_COST.EQUIPO;
  }

  return subscription.billingCycle === "ANNUAL"
    ? monthlyAmount * ANNUAL_MULTIPLIER
    : monthlyAmount;
}

export function calculateNextBillingPreview(subscription: BillingSubscriptionInput): NextBillingPreview {
  const baseAmount = calculateSubscriptionBaseAmount(subscription);
  const overrideAmount = subscription.nextBillingOverrideAmount;
  const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;

  if (
    subscription.status === "ACTIVE" &&
    !subscription.mpSubscriptionId &&
    periodEnd &&
    periodEnd.getTime() > Date.now()
  ) {
    return {
      baseAmount,
      amountDue: 0,
      mpAmount: 0,
      discountPercentage: 100,
      reason: subscription.promoName || "Cortesia activa sin tarjeta",
      hasBenefit: true,
      usesMercadoPagoMinimum: false,
    };
  }

  if (overrideAmount !== null && overrideAmount !== undefined) {
    const amountDue = Math.max(Math.round(overrideAmount), 0);
    return {
      baseAmount,
      amountDue,
      mpAmount: Math.max(amountDue, MIN_MERCADOPAGO_AMOUNT_CLP),
      discountPercentage: null,
      reason: "Monto manual para el proximo cobro",
      hasBenefit: true,
      usesMercadoPagoMinimum: amountDue === 0,
    };
  }

  if ((subscription.freeMonthsRemaining ?? 0) > 0) {
    return {
      baseAmount,
      amountDue: 0,
      mpAmount: MIN_MERCADOPAGO_AMOUNT_CLP,
      discountPercentage: 100,
      reason: "Mes gratis por premio/referido",
      hasBenefit: true,
      usesMercadoPagoMinimum: true,
    };
  }

  if ((subscription.promoFreeMonthsRemaining ?? 0) > 0) {
    return {
      baseAmount,
      amountDue: 0,
      mpAmount: MIN_MERCADOPAGO_AMOUNT_CLP,
      discountPercentage: 100,
      reason: subscription.promoName || "Mes gratis por campana",
      hasBenefit: true,
      usesMercadoPagoMinimum: true,
    };
  }

  if (
    (subscription.promoDiscountMonthsRemaining ?? 0) > 0 &&
    subscription.promoDiscountPercentage !== null &&
    subscription.promoDiscountPercentage !== undefined
  ) {
    const discountPercentage = Math.min(Math.max(subscription.promoDiscountPercentage, 0), 100);
    const amountDue = Math.max(Math.round(baseAmount * (1 - discountPercentage / 100)), 0);
    return {
      baseAmount,
      amountDue,
      mpAmount: Math.max(amountDue, MIN_MERCADOPAGO_AMOUNT_CLP),
      discountPercentage,
      reason: subscription.promoName || `${discountPercentage}% de descuento por campana`,
      hasBenefit: true,
      usesMercadoPagoMinimum: amountDue === 0,
    };
  }

  if (subscription.pendingDiscountPercentage !== null && subscription.pendingDiscountPercentage !== undefined) {
    const discountPercentage = Math.min(Math.max(subscription.pendingDiscountPercentage, 0), 100);
    const amountDue = Math.max(Math.round(baseAmount * (1 - discountPercentage / 100)), 0);
    return {
      baseAmount,
      amountDue,
      mpAmount: Math.max(amountDue, MIN_MERCADOPAGO_AMOUNT_CLP),
      discountPercentage,
      reason: "Descuento pendiente",
      hasBenefit: true,
      usesMercadoPagoMinimum: amountDue === 0,
    };
  }

  return {
    baseAmount,
    amountDue: baseAmount,
    mpAmount: Math.max(baseAmount, MIN_MERCADOPAGO_AMOUNT_CLP),
    discountPercentage: null,
    reason: "Precio normal",
    hasBenefit: false,
    usesMercadoPagoMinimum: false,
  };
}

export async function syncMercadoPagoSubscriptionAmount(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return { success: false as const, error: "Suscripcion no encontrada" };
  }

  const preview = calculateNextBillingPreview(subscription);

  if (!subscription.mpSubscriptionId) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        lastBillingSyncAt: new Date(),
        lastBillingSyncError: "Sin suscripcion enlazada en MercadoPago",
      },
    });
    return {
      success: false as const,
      error: "Esta cuenta aun no tiene una suscripcion enlazada en MercadoPago.",
      preview,
    };
  }

  try {
    const preapproval = new PreApproval(mpClient);
    await preapproval.update({
      id: subscription.mpSubscriptionId,
      body: {
        auto_recurring: {
          transaction_amount: preview.mpAmount,
          currency_id: "CLP",
        },
      },
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        lastBillingSyncAt: new Date(),
        lastBillingSyncError: null,
      },
    });

    return { success: true as const, preview };
  } catch (error) {
    console.error("[subscription-billing] Failed to sync MercadoPago amount:", error);
    const message = "No se pudo sincronizar el monto con MercadoPago.";
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        lastBillingSyncAt: new Date(),
        lastBillingSyncError: message,
      },
    });
    return { success: false as const, error: message, preview };
  }
}

export async function advanceBillingBenefitAfterAuthorized(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) return { success: false as const, error: "Suscripcion no encontrada" };

  const nextFreeMonthsRemaining = Math.max((subscription.freeMonthsRemaining ?? 0) - 1, 0);
  const nextPromoFreeMonthsRemaining = Math.max((subscription.promoFreeMonthsRemaining ?? 0) - 1, 0);
  const shouldConsumePromoDiscount =
    (subscription.freeMonthsRemaining ?? 0) <= 0 &&
    (subscription.promoFreeMonthsRemaining ?? 0) <= 0 &&
    (subscription.promoDiscountMonthsRemaining ?? 0) > 0;

  const nextPromoDiscountMonthsRemaining = shouldConsumePromoDiscount
    ? Math.max((subscription.promoDiscountMonthsRemaining ?? 0) - 1, 0)
    : subscription.promoDiscountMonthsRemaining;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      nextBillingOverrideAmount: null,
      pendingDiscountPercentage: null,
      freeMonthsRemaining: nextFreeMonthsRemaining,
      promoFreeMonthsRemaining: nextPromoFreeMonthsRemaining,
      promoDiscountMonthsRemaining: nextPromoDiscountMonthsRemaining,
      promoDiscountPercentage: nextPromoDiscountMonthsRemaining > 0 ? subscription.promoDiscountPercentage : null,
      promoName:
        nextPromoFreeMonthsRemaining > 0 || nextPromoDiscountMonthsRemaining > 0
          ? subscription.promoName
          : null,
    },
  });

  return syncMercadoPagoSubscriptionAmount(subscription.id);
}
