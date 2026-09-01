import { prisma } from "@/server/db/prisma";

type DiscountPlan = "INDIVIDUAL" | "EQUIPO" | "TEST";

export type PlatformDiscountQuote = {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  originalAmount: number;
  discountedAmount: number;
  savings: number;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function calculateDiscountedAmount(type: string, value: number, amount: number) {
  if (type === "PERCENTAGE") {
    return Math.max(Math.round(amount * (1 - value / 100)), 10);
  }
  if (type === "FIXED") {
    return Math.max(amount - value, 10);
  }
  return amount;
}

export async function quotePlatformDiscount(params: {
  code: string;
  plan: DiscountPlan;
  businessId: string;
  amount: number;
}): Promise<{ discount?: PlatformDiscountQuote; error?: string }> {
  const code = normalizeCode(params.code);
  if (!code) return { error: "Ingresa un codigo de descuento" };

  const discount = await prisma.platformDiscountCode.findUnique({
    where: { code },
    include: {
      redemptions: {
        where: {
          status: { in: ["PENDING", "APPLIED"] },
        },
        select: { businessId: true, status: true },
      },
    },
  });

  if (!discount || !discount.isActive) return { error: "Codigo de descuento invalido" };

  const now = new Date();
  if (discount.startsAt && discount.startsAt > now) return { error: "Este codigo aun no esta activo" };
  if (discount.expiresAt && discount.expiresAt < now) return { error: "Este codigo ya expiro" };
  if (discount.appliesToPlans.length > 0 && !discount.appliesToPlans.includes(params.plan)) {
    return { error: "Este codigo no aplica para el plan seleccionado" };
  }
  if (discount.maxRedemptions !== null && discount.redeemedCount >= discount.maxRedemptions) {
    return { error: "Este codigo ya alcanzo su limite de usos" };
  }
  if (discount.redemptions.some((r) => r.businessId === params.businessId && r.status === "APPLIED")) {
    return { error: "Este negocio ya uso este codigo" };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { businessId: params.businessId },
    select: {
      status: true,
      trialEndsAt: true,
      hasCountedAsPaidReferral: true,
      lastPaymentId: true,
    },
  });

  const isAwaitingFirstPayment =
    subscription !== null &&
    (subscription.status === "TRIALING" || subscription.status === "INACTIVE") &&
    !subscription.hasCountedAsPaidReferral &&
    !subscription.lastPaymentId;

  if (!isAwaitingFirstPayment || !subscription) {
    return { error: "Este codigo es exclusivo para el primer pago de usuarios nuevos" };
  }

  if (
    (discount.trialEndsAtFrom || discount.trialEndsAtTo) &&
    (!subscription.trialEndsAt ||
      (discount.trialEndsAtFrom && subscription.trialEndsAt < discount.trialEndsAtFrom) ||
      (discount.trialEndsAtTo && subscription.trialEndsAt > discount.trialEndsAtTo))
  ) {
    return { error: "Este codigo no aplica a la fecha de termino de tu prueba" };
  }

  const discountedAmount = calculateDiscountedAmount(discount.discountType, discount.discountValue, params.amount);

  return {
    discount: {
      id: discount.id,
      code: discount.code,
      name: discount.name,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      originalAmount: params.amount,
      discountedAmount,
      savings: params.amount - discountedAmount,
    },
  };
}

export async function reservePlatformDiscount(params: {
  discountCodeId: string;
  businessId: string;
  subscriptionId: string;
  originalAmount: number;
  discountedAmount: number;
}) {
  await prisma.platformDiscountRedemption.upsert({
    where: {
      discountCodeId_businessId: {
        discountCodeId: params.discountCodeId,
        businessId: params.businessId,
      },
    },
    create: {
      discountCodeId: params.discountCodeId,
      businessId: params.businessId,
      subscriptionId: params.subscriptionId,
      originalAmount: params.originalAmount,
      discountedAmount: params.discountedAmount,
      status: "PENDING",
    },
    update: {
      subscriptionId: params.subscriptionId,
      originalAmount: params.originalAmount,
      discountedAmount: params.discountedAmount,
      status: "PENDING",
      appliedAt: null,
    },
  });
}

export async function markPlatformDiscountApplied(subscriptionId: string) {
  const redemption = await prisma.platformDiscountRedemption.findFirst({
    where: { subscriptionId, status: "PENDING" },
    select: { id: true, discountCodeId: true },
  });

  if (!redemption) return;

  await prisma.$transaction([
    prisma.platformDiscountRedemption.update({
      where: { id: redemption.id },
      data: { status: "APPLIED", appliedAt: new Date() },
    }),
    prisma.platformDiscountCode.update({
      where: { id: redemption.discountCodeId },
      data: { redeemedCount: { increment: 1 } },
    }),
  ]);
}
