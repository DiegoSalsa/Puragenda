import { COMMERCIAL_CATALOG_VERSION, quoteCommercialContract } from "@/core/commercial-catalog";
import { PreApproval } from "mercadopago";
import { PRICING, EXTRA_STAFF_COST, ANNUAL_MULTIPLIER } from "@/core/constants";
import { mpClient } from "@/server/lib/mercadopago";
import { prisma } from "@/server/db/prisma";
import { isV2Plan } from "./commercial-plan-access";
import { hasPendingCommercialBenefit } from "./commercial-benefit-hold";
import { isTrialCurrentlyActive } from "@/core/subscription-access";

export const MIN_MERCADOPAGO_AMOUNT_CLP = 10;

type BillingStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "INACTIVE" | "CANCELLED";

export function pendingCheckoutSubscriptionState(subscription: {
  status?: BillingStatus | null;
  isTrial?: boolean | null;
  trialEndsAt?: Date | string | null;
} | null): { status: "TRIALING" | "INACTIVE"; isTrial: boolean } {
  if (isTrialCurrentlyActive(subscription)) {
    return { status: "TRIALING", isTrial: true };
  }

  return { status: "INACTIVE", isTrial: false };
}

export function stateForCancelledProviderSubscription(subscription: {
  status: BillingStatus;
  isTrial: boolean;
}): {
  status: "TRIALING" | "INACTIVE" | "CANCELLED";
  isTrial: boolean;
  clearProviderIds: boolean;
} {
  if (subscription.status === "TRIALING" || subscription.isTrial) {
    return { status: "TRIALING", isTrial: true, clearProviderIds: true };
  }

  if (subscription.status === "INACTIVE") {
    return { status: "INACTIVE", isTrial: false, clearProviderIds: true };
  }

  return { status: "CANCELLED", isTrial: false, clearProviderIds: false };
}

type BillingPlan = keyof typeof PRICING;
type BillingCycle = "MONTHLY" | "ANNUAL";

export type BillingSubscriptionInput = {
  id?: string;
  plan: BillingPlan;
  status?: "ACTIVE" | "TRIALING" | "PAST_DUE" | "INACTIVE" | "CANCELLED";
  billingCycle: BillingCycle;
  extraStaffCount: number;
  paymentMethod?: "AUTOMATIC" | "BANK_TRANSFER";
  customMonthlyPriceClp?: number | null;
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
  paymentMethod?: "AUTOMATIC" | "BANK_TRANSFER";
  customMonthlyPriceClp?: number | null;
}) {
  if (subscription.paymentMethod === "BANK_TRANSFER" && subscription.customMonthlyPriceClp != null) {
    return subscription.customMonthlyPriceClp;
  }
  if (subscription.plan === "PURAGENDA" || subscription.plan === "PURAGENDA_PLUS") return quoteCommercialContract({ plan: subscription.plan, professionalTotal: 1 + subscription.extraStaffCount, billingCycle: subscription.billingCycle, catalogVersion: COMMERCIAL_CATALOG_VERSION }).cycleTotal;
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

  if (subscription.paymentMethod === "BANK_TRANSFER") {
    return {
      baseAmount,
      amountDue: baseAmount,
      mpAmount: 0,
      discountPercentage: null,
      reason: "Transferencia bancaria manual, sin cobro automático",
      hasBenefit: false,
      usesMercadoPagoMinimum: false,
    };
  }

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
  if (isV2Plan(subscription.plan)) return {success:false as const,error:"V2_BENEFIT_PROVIDER_VALIDATION_REQUIRED",preview};

  if (subscription.paymentMethod === "BANK_TRANSFER") {
    return { success: true as const, skipped: true, preview };
  }

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

/** Consume a legacy benefit only for the persisted canonical approved invoice.
 * The receipt and balances commit together; retries may safely repeat amount sync. */
export async function advanceBillingBenefitAfterAuthorized(subscriptionId: string, invoiceId?:string, chargedAmount?:number, paidPeriodStart?:Date) {
  const initial=await prisma.subscription.findUnique({where:{id:subscriptionId}});
  if(!initial) return {success:false as const,error:"Suscripcion no encontrada"};
  if(initial.paymentMethod==="BANK_TRANSFER") return {success:true as const,skipped:true};
  if(isV2Plan(initial.plan)) return {success:false as const,error:"V2_BENEFIT_PROVIDER_VALIDATION_REQUIRED"};
  if(!invoiceId) return {success:false as const,error:"CONFIRMED_INVOICE_REQUIRED"};
  const matched=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${initial.businessId} FOR UPDATE`;
    const sub=await tx.subscription.findUniqueOrThrow({where:{id:subscriptionId}});
    if(sub.lastInvoiceId!==invoiceId || sub.lastPaymentStatus!=="approved") throw new Error("CONFIRMED_INVOICE_REQUIRED");
    const eventId=`${sub.id}:${invoiceId}`;
    if(await tx.commercialEvent.findUnique({where:{source_eventId:{source:"legacy_billing_benefit",eventId}}})) return true;
    const expected=calculateNextBillingPreview(sub).mpAmount;
    const reservation=sub.activePrizeId ? await tx.commercialEvent.findUnique({where:{source_eventId:{source:"legacy_benefit_reservation",eventId:sub.activePrizeId}}}) : null;
    if(hasPendingCommercialBenefit(sub) && (chargedAmount!==expected || (reservation && (!paidPeriodStart || paidPeriodStart<reservation.occurredAt)))) {
      await tx.commercialEvent.upsert({where:{source_eventId:{source:"legacy_billing_review",eventId}},update:{},create:{businessId:sub.businessId,source:"legacy_billing_review",eventId,operation:"BENEFIT_PAYMENT_REVIEW",outcome:"RECEIVED",occurredAt:new Date(),details:{invoiceId,expected,charged:chargedAmount ?? null,consumed:false}}});
      await tx.subscription.update({where:{id:sub.id},data:{lastBillingSyncError:"El importe cobrado requiere revisión antes de consumir el beneficio."}});
      return false;
    }
    const free=Math.max(sub.freeMonthsRemaining-1,0);
    const promoFree=sub.freeMonthsRemaining>0 ? sub.promoFreeMonthsRemaining : Math.max(sub.promoFreeMonthsRemaining-1,0);
    const promoDiscount=sub.freeMonthsRemaining<=0 && sub.promoFreeMonthsRemaining<=0 ? Math.max(sub.promoDiscountMonthsRemaining-1,0) : sub.promoDiscountMonthsRemaining;
    const finishPrize=!!sub.activePrizeId && free===0;
    if(finishPrize) await tx.prize.update({where:{id:sub.activePrizeId!},data:{status:"USED"}});
    await tx.subscription.update({where:{id:sub.id},data:{nextBillingOverrideAmount:null,pendingDiscountPercentage:null,freeMonthsRemaining:free,promoFreeMonthsRemaining:promoFree,
      promoDiscountMonthsRemaining:promoDiscount,promoDiscountPercentage:promoDiscount>0?sub.promoDiscountPercentage:null,promoName:promoFree>0||promoDiscount>0?sub.promoName:null,
      ...(finishPrize?{activePrizeId:null}:{})}});
    await tx.commercialEvent.create({data:{businessId:sub.businessId,source:"legacy_billing_benefit",eventId,operation:"APPROVED_INVOICE_BENEFIT",outcome:"APPLIED",occurredAt:new Date(),details:{invoiceId,hadBenefit:hasPendingCommercialBenefit(sub)}}});
    return true;
  });
  if(!matched) return {success:false as const,error:"LEGACY_BENEFIT_PAYMENT_REVIEW_REQUIRED"};
  return syncMercadoPagoSubscriptionAmount(subscriptionId);
}
