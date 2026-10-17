import { prisma } from "@/server/db/prisma";

export type ManualTeamTerms = {
  businessId: string;
  staffLimit: number;
  monthlyPriceClp: number;
};

/** Operator-only helper, deliberately not a Server Action or public API. */
export async function configureManualTeamSubscription(input: ManualTeamTerms, apply = false) {
  if (!input.businessId || !Number.isSafeInteger(input.staffLimit) || input.staffLimit < 1 ||
      !Number.isSafeInteger(input.monthlyPriceClp) || input.monthlyPriceClp < 1) {
    throw new Error("Indica negocio, límite y precio mensual CLP positivos");
  }

  return prisma.$transaction(async (tx) => {
    // Same lock order as staff creation/reactivation; prevent a new staff member
    // from racing the capacity check while an operator installs a smaller cap.
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${input.businessId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Subscription" WHERE "businessId" = ${input.businessId} FOR UPDATE`;
    const business = await tx.business.findUnique({ where: { id: input.businessId }, select: { id: true, name: true, slug: true, countryCode: true } });
    const subscription = await tx.subscription.findUnique({ where: { businessId: input.businessId } });
    if (!business || !subscription) throw new Error("Negocio o suscripción inexistente");
    const activeStaff = await tx.staff.count({ where: { businessId: business.id, isActive: true } });
    const blockers: string[] = [];
    if (business.countryCode !== "CL" || subscription.billingCycle !== "MONTHLY") {
      blockers.push("Esta configuración requiere Chile y ciclo mensual");
    }
    if (subscription.mpSubscriptionId || subscription.paddleSubscriptionId) {
      blockers.push("Resuelve y verifica el vínculo existente con el proveedor antes de configurar transferencia; este script nunca cancela ni desvincula suscripciones");
    }
    if (subscription.status !== "ACTIVE" || subscription.isTrial) {
      blockers.push("Confirma el pago y activa la suscripción existente antes de aplicar condiciones comerciales");
    }
    if (activeStaff > input.staffLimit) blockers.push("Hay más profesionales activos que el límite solicitado; no se desactivará ni borrará ninguno");

    const changes = {
      plan: "EQUIPO" as const,
      staffLimitOverride: input.staffLimit,
      paymentMethod: "BANK_TRANSFER" as const,
      customMonthlyPriceClp: input.monthlyPriceClp,
    };
    const current = {
      plan: subscription.plan,
      staffLimitOverride: subscription.staffLimitOverride,
      paymentMethod: subscription.paymentMethod,
      customMonthlyPriceClp: subscription.customMonthlyPriceClp,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      activeStaff,
      hasProviderSubscription: !!(subscription.mpSubscriptionId || subscription.paddleSubscriptionId),
    };

    if (apply) {
      if (blockers.length) throw new Error(blockers.join(". "));
      await tx.subscription.update({ where: { id: subscription.id }, data: changes });
    }
    return { business, subscriptionId: subscription.id, current, changes, blockers, applied: apply };
  });
}
