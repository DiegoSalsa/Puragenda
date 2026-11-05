import type { CommercialBillingOperation, CommercialPaymentEvidence, CommercialSubscription, Prisma } from "@prisma/client";
import { materializeCommercialEntitlements } from "@/server/services/commercial-subscription-v2.service";

export async function applyMercadoPagoRenewal(tx: Prisma.TransactionClient, op: CommercialBillingOperation, payment: CommercialPaymentEvidence, now: Date) {
  const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { id: op.subscriptionId } });
  if (snapshot.lastPaymentEventId === payment.id) return { applied: false, alreadyApplied: true };
  if (op.provider !== "MERCADO_PAGO" || payment.status !== "CONFIRMED" || payment.operationId !== op.id ||
    payment.providerSubscriptionId !== snapshot.externalSubscriptionId || payment.amountMinor !== op.recurringAmountMinor ||
    payment.currencyCode !== snapshot.currencyCode || snapshot.planCode !== op.targetPlanCode ||
    snapshot.professionalTotal !== op.targetProfessionalTotal || snapshot.totalPriceClp !== op.recurringAmountMinor ||
    snapshot.legacySubscriptionId) throw new Error("RENEWAL_CONTRACT_MISMATCH");
  if (payment.periodEnd <= now || (snapshot.periodEnd && payment.periodEnd <= snapshot.periodEnd)) return { applied: false, alreadyApplied: true };
  if (snapshot.periodEnd && payment.periodStart < snapshot.periodEnd) throw new Error("OVERLAPPING_RENEWAL_PERIOD");
  if (payment.periodStart > now) return { applied: false, scheduled: true };
  const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: {
    status: snapshot.renewalCancelledAt ? "SCHEDULED_CHANGE" : "ACTIVE", periodStart: payment.periodStart,
    periodEnd: payment.periodEnd, renewalAt: snapshot.renewalCancelledAt ? null : payment.periodEnd,
    lastPaymentStatus: "CONFIRMED", lastPaymentEventId: payment.id, lastPaymentAt: payment.occurredAt,
    lastReconciledAt: payment.occurredAt, lastReconciledEventId: payment.eventId,
  } });
  await materializeCommercialEntitlements(tx, updated, now);
  return { applied: true, alreadyApplied: false, renewed: true };
}

export async function confirmMercadoPagoCancellation(tx: Prisma.TransactionClient, snapshot: CommercialSubscription, occurredAt: Date, eventId: string, now: Date) {
  // An active contract or provider authorization is insufficient. Retain only
  // the period represented by the current confirmed canonical payment.
  const evidence = snapshot.lastPaymentEventId ? await tx.commercialPaymentEvidence.findFirst({ where: {
    id: snapshot.lastPaymentEventId, businessId: snapshot.businessId, provider: "MERCADO_PAGO", status: "CONFIRMED",
    providerSubscriptionId: snapshot.externalSubscriptionId ?? "__unbound__",
  } }) : null;
  const paid = evidence && snapshot.lastPaymentStatus === "CONFIRMED" && snapshot.periodEnd &&
    snapshot.periodEnd <= evidence.periodEnd && snapshot.periodEnd > now;
  const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: {
    status: paid ? "SCHEDULED_CHANGE" : "CANCELLED", renewalAt: null, renewalCancellationStatus: "CONFIRMED",
    renewalCancelledAt: snapshot.renewalCancelledAt ?? occurredAt, lastReconciledAt: occurredAt, lastReconciledEventId: eventId,
  } });
  await materializeCommercialEntitlements(tx, updated, now);
  return updated;
}
