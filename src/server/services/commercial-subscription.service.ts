import { prisma } from "@/server/db/prisma";
import { createHash } from "node:crypto";
import { isValid, parseISO } from "date-fns";

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

export type ManualSubscriptionPayment = {
  businessId: string;
  reference: string;
  amountClp: number;
  paidFrom: string;
  paidThrough: string;
  expectedPeriodEnd: string | null;
};

function confirmedInstant(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error("Las fechas deben ser instantes ISO con hora y zona explícitas");
  }
  const date = parseISO(value);
  if (!isValid(date)) throw new Error("Fecha de período inválida");
  return date;
}

/** Record an already received transfer. No provider, invoice or automatic date arithmetic. */
export async function recordManualSubscriptionPayment(input: ManualSubscriptionPayment, apply = false) {
  const reference = input.reference.trim();
  if (!input.businessId || reference.length < 3 || reference.length > 150 || !Number.isSafeInteger(input.amountClp) || input.amountClp < 1) {
    throw new Error("Indica negocio, referencia de pago y monto CLP positivos");
  }
  const paidFrom = confirmedInstant(input.paidFrom);
  const paidThrough = confirmedInstant(input.paidThrough);
  const expectedPeriodEnd = input.expectedPeriodEnd === null ? null : confirmedInstant(input.expectedPeriodEnd);
  if (paidThrough <= paidFrom) throw new Error("El término exclusivo debe ser posterior al inicio del período");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${input.businessId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Subscription" WHERE "businessId" = ${input.businessId} FOR UPDATE`;
    const subscription = await tx.subscription.findUnique({ where: { businessId: input.businessId } });
    const business = await tx.business.findUnique({ where: { id: input.businessId }, select: { countryCode: true } });
    if (!subscription || !business) throw new Error("Negocio o suscripción inexistente");

    // Reuse the audit table's primary key to deduplicate the same bank reference,
    // even if two operators submit it together or retry after a lost response.
    const auditId = `manual-transfer-${createHash("sha256").update(JSON.stringify([subscription.id, reference])).digest("hex")}`;
    const recorded = await tx.auditLog.findUnique({ where: { id: auditId } });
    if (recorded) {
      const evidence = JSON.parse(recorded.details ?? "{}");
      if (recorded.action !== "MANUAL_SUBSCRIPTION_PAYMENT_RECORDED" || evidence.amountClp !== input.amountClp ||
          evidence.paidFrom !== paidFrom.toISOString() || evidence.paidThrough !== paidThrough.toISOString()) {
        throw new Error("La referencia de pago ya está registrada con otros datos; no se reutilizará");
      }
      return { subscriptionId: subscription.id, applied: false, alreadyRecorded: true, blockers: [] as string[], currentPeriodEnd: subscription.currentPeriodEnd };
    }

    const blockers: string[] = [];
    if (business.countryCode !== "CL" || subscription.billingCycle !== "MONTHLY" || subscription.paymentMethod !== "BANK_TRANSFER" || subscription.isTrial) {
      blockers.push("Se requiere una suscripción mensual pagada por transferencia de Chile, fuera de prueba");
    }
    if (subscription.mpSubscriptionId || subscription.paddleSubscriptionId) blockers.push("El vínculo con el proveedor aún no está resuelto");
    if (!["ACTIVE", "INACTIVE"].includes(subscription.status)) blockers.push("Revisa el estado de la suscripción antes de renovarla manualmente");
    if (subscription.customMonthlyPriceClp !== input.amountClp) blockers.push("El monto recibido no coincide con el precio mensual configurado");
    if ((subscription.currentPeriodEnd?.getTime() ?? null) !== (expectedPeriodEnd?.getTime() ?? null)) {
      blockers.push("El período actual cambió; vuelve a revisar antes de aplicar");
    }
    if (subscription.currentPeriodEnd && paidFrom < subscription.currentPeriodEnd) blockers.push("El período recibido se superpone con el período ya registrado");
    if (paidThrough <= new Date()) blockers.push("El período recibido ya terminó; no se reactivará automáticamente");

    const changes = { status: "ACTIVE" as const, currentPeriodEnd: paidThrough };
    const evidence = {
      businessId: input.businessId, subscriptionId: subscription.id, reference,
      amountClp: input.amountClp, currency: "CLP", paidFrom: paidFrom.toISOString(), paidThrough: paidThrough.toISOString(),
      previousPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      previousStatus: subscription.status, source: "manual_transfer_operator",
    };
    if (apply) {
      if (blockers.length) throw new Error(blockers.join(". "));
      await tx.subscription.update({ where: { id: subscription.id }, data: changes });
      await tx.auditLog.create({ data: { id: auditId, action: "MANUAL_SUBSCRIPTION_PAYMENT_RECORDED", details: JSON.stringify(evidence) } });
    }
    return { subscriptionId: subscription.id, currentPeriodEnd: subscription.currentPeriodEnd, changes, evidence, applied: apply, alreadyRecorded: false, blockers };
  });
}
