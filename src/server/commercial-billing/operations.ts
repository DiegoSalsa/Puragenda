import { z } from "zod";
import type { CommercialBillingOperation, CommercialPaymentEvidence, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { quoteCommercialPlan } from "@/core/commercial-catalog";
import { assertCommercialSandbox, assertNoOpenCommercialMigration, commercialHash } from "@/server/services/commercial-internal";
import { withCommercialCapacityLock } from "@/server/services/commercial-capacity.service";
import { commercialJson, materializeCommercialEntitlements } from "@/server/services/commercial-subscription-v2.service";
import { assertSandboxMutation, type BillingContext, type BillingProvider, type BillingStrategy, type ProviderPreview, type SandboxBillingAdapter } from "./contracts";
import { assertMercadoPagoSandboxMutation } from "./mercadopago-sandbox";
import { applyMercadoPagoRenewal, confirmMercadoPagoCancellation } from "./mercadopago-lifecycle";

export function contractHash(snapshot: { planCode: string; professionalTotal: number; totalPriceClp: number | null; periodEnd: Date | null; status: string; externalSubscriptionId: string | null }) {
  return commercialHash({ plan: snapshot.planCode, seats: snapshot.professionalTotal, amount: snapshot.totalPriceClp,
    periodEnd: snapshot.periodEnd, status: snapshot.status, providerId: snapshot.externalSubscriptionId });
}
function quoteOf(op: CommercialBillingOperation) {
  const version = z.object({ catalogVersion: z.string() }).parse(op.quoteSnapshot).catalogVersion;
  const quote = quoteCommercialPlan({ catalogVersion: version, plan: op.targetPlanCode, professionalTotal: op.targetProfessionalTotal });
  if (commercialHash(quote) !== commercialHash(op.quoteSnapshot)) throw new Error("BILLING_QUOTE_CHANGED");
  return quote;
}
const contextOf = (op: CommercialBillingOperation): BillingContext => ({ operationId: op.id, businessId: op.businessId,
  quote: quoteOf(op), strategy: op.strategy as BillingStrategy, effectiveAt: op.effectiveAt, providerSubscriptionId: op.providerSubscriptionId });
async function ownedOperation(id: string, adapter: SandboxBillingAdapter) {
  assertCommercialSandbox();
  const op = await prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
  if (op.provider !== adapter.provider || op.environment !== "SANDBOX") throw new Error("OPERATION_PROVIDER_MISMATCH");
  return op;
}
export async function prepareSandboxBillingOperation(input: {
  businessId: string; provider: BillingProvider; plan: string; professionalTotal: number; strategy: BillingStrategy;
  idempotencyKey: string; effectiveAt: Date; seatChangeRequestId?: string;
}, now = new Date()) {
  assertCommercialSandbox();
  if (!/^[\w:.-]{8,200}$/.test(input.idempotencyKey) || !["NEXT_RENEWAL", "IMMEDIATE"].includes(input.strategy) ||
      !["PADDLE", "MERCADO_PAGO"].includes(input.provider) || !Number.isFinite(input.effectiveAt.getTime())) throw new Error("INVALID_BILLING_INTENT");
  const quote = quoteCommercialPlan({ catalogVersion: "puragenda-next-v1", plan: input.plan, professionalTotal: input.professionalTotal });
  const inputHash = commercialHash(input);
  return withCommercialCapacityLock(input.businessId, async tx => {
    const existing = await tx.commercialBillingOperation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) { if (existing.inputHash !== inputHash) throw new Error("BILLING_IDEMPOTENCY_CONFLICT"); return existing; }
    await assertNoOpenCommercialMigration(tx, input.businessId);
    const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { businessId: input.businessId }, include: { items: true } });
    if (snapshot.legacySubscriptionId || (snapshot.termsSnapshot as { sandboxFixture?: boolean } | null)?.sandboxFixture !== true) throw new Error("SANDBOX_FIXTURE_REQUIRED_LEGACY_UNTOUCHED");
    if (snapshot.provider !== input.provider || snapshot.currencyCode !== "CLP") throw new Error("BILLING_CONTRACT_MISMATCH");
    if (input.provider === "MERCADO_PAGO" && snapshot.renewalCancellationStatus) throw new Error("RENEWAL_CANCELLATION_PENDING");
    const kind = snapshot.externalSubscriptionId ? "CONTRACT_CHANGE" : "NEW_SUBSCRIPTION";
    if (kind === "CONTRACT_CHANGE" && snapshot.status !== "ACTIVE") throw new Error("CONTRACT_NOT_ACTIVE");
    if (kind === "NEW_SUBSCRIPTION" && !["DRAFT", "PENDING_PAYMENT"].includes(snapshot.status)) throw new Error("CONTRACT_NOT_PENDING");
    if (input.effectiveAt < now || (input.strategy === "NEXT_RENEWAL" && (!snapshot.renewalAt || input.effectiveAt < snapshot.renewalAt))) throw new Error("INVALID_BILLING_EFFECTIVE_DATE");
    if (input.plan === "PURAGENDA_PLUS" && snapshot.items.some(item => item.kind === "LEGACY_ADDON" && !item.effectiveTo)) throw new Error("WEBSITE_ADDON_MIGRATION_REQUIRED");
    if (input.seatChangeRequestId) {
      const request = await tx.seatChangeRequest.findFirst({ where: { id: input.seatChangeRequestId, businessId: input.businessId, subscriptionId: snapshot.id } });
      if (!request || request.requestedProfessionalTotal !== input.professionalTotal || request.quotedAmountClp !== quote.monthlyTotal || request.effectiveAt.getTime() !== input.effectiveAt.getTime()) throw new Error("SEAT_REQUEST_BINDING_MISMATCH");
    }
    return tx.commercialBillingOperation.create({ data: { businessId: input.businessId, subscriptionId: snapshot.id,
      seatChangeRequestId: input.seatChangeRequestId, provider: input.provider, kind, strategy: input.strategy,
      status: input.strategy === "NEXT_RENEWAL" ? "SCHEDULED" : "PREPARED", idempotencyKey: input.idempotencyKey, inputHash,
      previousContractHash: contractHash(snapshot), targetPlanCode: quote.plan, targetProfessionalTotal: quote.professionalTotal,
      quoteSnapshot: commercialJson(quote), recurringAmountMinor: quote.monthlyTotal, currencyCode: "CLP",
      effectiveAt: input.effectiveAt, providerSubscriptionId: snapshot.externalSubscriptionId } });
  });
}
export async function previewSandboxBillingOperation(id: string, adapter: SandboxBillingAdapter) {
  const op = await ownedOperation(id, adapter);
  if (!["PREPARED", "SCHEDULED"].includes(op.status)) throw new Error("BILLING_OPERATION_ALREADY_STARTED");
  const preview = await adapter.preview(contextOf(op));
  if (preview.currencyCode !== op.currencyCode) throw new Error("UNAPPROVED_PROVIDER_CURRENCY");
  return withCommercialCapacityLock(op.businessId, async tx => {
    const current = await tx.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
    if (!["PREPARED", "SCHEDULED"].includes(current.status)) throw new Error("BILLING_OPERATION_ALREADY_STARTED");
    return tx.commercialBillingOperation.update({ where: { id }, data: { providerPreview: commercialJson(preview),
      expectedPaymentMinor: preview.expectedPaymentMinor, taxAmountMinor: preview.taxAmountMinor,
      failureCode: preview.supported ? null : preview.blockers.join(",") } });
  });
}
export async function executeSandboxBillingOperation(id: string, adapter: SandboxBillingAdapter, payerEmail?: string, now = new Date()) {
  if (adapter.provider === "MERCADO_PAGO") assertMercadoPagoSandboxMutation(); else assertSandboxMutation();
  const op = await ownedOperation(id, adapter);
  const claimed = await withCommercialCapacityLock(op.businessId, async tx => {
    const current = await tx.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
    if (!["PREPARED", "SCHEDULED"].includes(current.status)) return null;
    if (current.effectiveAt > now) return null;
    const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { id: current.subscriptionId } });
    if (contractHash(snapshot) !== current.previousContractHash) throw new Error("BILLING_CONTRACT_CHANGED");
    const preview = current.providerPreview as ProviderPreview | null;
    if (!preview?.supported || current.expectedPaymentMinor === null || now.getTime() - new Date(preview.previewedAt).getTime() > 60_000) throw new Error("PROVIDER_PREVIEW_REQUIRED");
    return tx.commercialBillingOperation.update({ where: { id }, data: { status: "EXECUTING", executionStartedAt: now } });
  });
  if (!claimed) return prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
  // Durable claim is committed BEFORE the network. Never retry a mutation after
  // a timeout or a local persistence failure; EXECUTING/UNKNOWN both need lookup.
  try {
    const result = await adapter.execute(contextOf(claimed), claimed.providerPreview as ProviderPreview, payerEmail);
    return await withCommercialCapacityLock(op.businessId, async tx => {
      const current = await tx.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
      if (current.status !== "EXECUTING") return current;
      return tx.commercialBillingOperation.update({ where: { id }, data: { status: "AWAITING_PAYMENT",
        providerSubscriptionId: result.providerSubscriptionId, providerOperationId: result.providerOperationId } });
    });
  } catch {
    // If this write also fails, the durable EXECUTING row still prevents retries.
    await prisma.commercialBillingOperation.updateMany({ where: { id, status: "EXECUTING" }, data: { status: "UNKNOWN", failureCode: "PROVIDER_OR_PERSISTENCE_RESULT_UNKNOWN" } });
    return prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
  }
}
export async function resolveUnknownSandboxOperation(id: string, adapter: SandboxBillingAdapter) {
  const op = await ownedOperation(id, adapter);
  if (!["UNKNOWN", "EXECUTING"].includes(op.status)) return op;
  const found = await adapter.findUnknown(contextOf(op));
  if (!found) return op;
  return withCommercialCapacityLock(op.businessId, async tx => {
    const current = await tx.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
    if (!["UNKNOWN", "EXECUTING"].includes(current.status)) return current;
    return tx.commercialBillingOperation.update({ where: { id }, data: { providerSubscriptionId: found.providerSubscriptionId,
      providerOperationId: found.providerOperationId, status: "AWAITING_PAYMENT", failureCode: null } });
  });
}

async function applyPaid(tx: Prisma.TransactionClient, op: CommercialBillingOperation, payment: CommercialPaymentEvidence, now: Date) {
  if (op.status === "APPLIED") {
    if (op.provider === "MERCADO_PAGO") return applyMercadoPagoRenewal(tx, op, payment, now);
    return { applied: false, alreadyApplied: true };
  }
  if (op.status !== "PAID" || payment.status !== "CONFIRMED" || payment.operationId !== op.id || payment.amountMinor !== op.expectedPaymentMinor ||
      payment.currencyCode !== op.currencyCode || !op.executionStartedAt || payment.occurredAt < op.executionStartedAt) throw new Error("VERIFIED_PAYMENT_REQUIRED");
  if (op.effectiveAt > now || payment.periodStart > now) return { applied: false, scheduled: true };
  if (payment.periodEnd <= now || (op.strategy === "NEXT_RENEWAL" && payment.periodStart < op.effectiveAt)) throw new Error("PAYMENT_PERIOD_MISMATCH");
  const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { id: op.subscriptionId } });
  if (contractHash(snapshot) !== op.previousContractHash) throw new Error("BILLING_CONTRACT_CHANGED");
  const quote = quoteCommercialPlan({ catalogVersion: quoteOf(op).catalogVersion, plan: op.targetPlanCode, professionalTotal: op.targetProfessionalTotal });
  if (commercialHash(quote) !== commercialHash(op.quoteSnapshot)) throw new Error("BILLING_QUOTE_CHANGED");
  const active = await tx.staff.count({ where: { businessId: op.businessId, isActive: true } });
  if (active > quote.professionalTotal) {
    await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { failureCode: "ACTIVE_STAFF_CONFLICT" } });
    if (op.seatChangeRequestId) await tx.seatChangeRequest.update({ where: { id: op.seatChangeRequestId }, data: { conflictReason: "ACTIVE_STAFF_CONFLICT" } });
    return { applied: false, conflict: true };
  }
  await tx.commercialSubscriptionItem.updateMany({ where: { subscriptionId: snapshot.id, kind: { in: ["BASE_PLAN", "PROFESSIONAL_SEATS"] }, effectiveTo: null }, data: { effectiveTo: now } });
  await tx.commercialSubscriptionItem.createMany({ data: [
    { subscriptionId: snapshot.id, kind: "BASE_PLAN", code: quote.plan, quantity: 1, unitAmountClp: quote.baseMonthly,
      amountClp: quote.baseMonthly, currencyCode: "CLP", catalogVersion: quote.catalogVersion, effectiveFrom: now },
    { subscriptionId: snapshot.id, kind: "PROFESSIONAL_SEATS", code: "professional_seats", quantity: quote.professionalTotal,
      amountClp: quote.professionalSurchargeMonthly, currencyCode: "CLP", catalogVersion: quote.catalogVersion, effectiveFrom: now,
      pricingSnapshot: commercialJson({ surchargeSteps: quote.surchargeSteps }) },
  ] });
  const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: { planCode: quote.plan,
    professionalTotal: quote.professionalTotal, basePriceClp: quote.baseMonthly, totalPriceClp: quote.monthlyTotal, status: "ACTIVE",
    periodStart: payment.periodStart, periodEnd: payment.periodEnd, renewalAt: payment.periodEnd,
    externalSubscriptionId: payment.providerSubscriptionId, lastPaymentAt: payment.occurredAt, lastPaymentStatus: "CONFIRMED", lastPaymentEventId: payment.id, lastReconciledAt: payment.occurredAt, lastReconciledEventId: payment.eventId } });
  await materializeCommercialEntitlements(tx, updated, now);
  await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { status: "APPLIED", appliedAt: now, failureCode: null } });
  if (op.seatChangeRequestId) await tx.seatChangeRequest.update({ where: { id: op.seatChangeRequestId }, data: { status: "APPLIED", appliedAt: now,
    providerReference: payment.providerSubscriptionId, paymentEvidence: { billingEvidenceId: payment.id }, conflictReason: null } });
  return { applied: true, alreadyApplied: false };
}
export async function applyPaidSandboxOperation(id: string, now = new Date()) {
  assertCommercialSandbox();
  const op = await prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
  return withCommercialCapacityLock(op.businessId, async tx => {
    const current = await tx.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
    const payment = await tx.commercialPaymentEvidence.findFirstOrThrow({ where: { operationId: id, status: "CONFIRMED" },
      orderBy: op.provider === "MERCADO_PAGO" ? [{ periodStart: "desc" }, { occurredAt: "desc" }] : { occurredAt: "desc" } });
    return applyPaid(tx, current, payment, now);
  });
}
export async function processSandboxBillingWebhook(raw: string, headers: Headers, adapter: SandboxBillingAdapter, now = new Date()) {
  assertCommercialSandbox();
  if (Buffer.byteLength(raw, "utf8") > 262_144) throw new Error("WEBHOOK_TOO_LARGE");
  const notification = await adapter.verifyNotification(raw, headers);
  if (notification.occurredAt > now) throw new Error("FUTURE_PROVIDER_EVENT");
  const location = await adapter.locate(notification);
  const priorPayment = location.paymentId ? await prisma.commercialPaymentEvidence.findUnique({ where: { provider_paymentId: { provider: adapter.provider, paymentId: location.paymentId } } }) : null;
  const op = await prisma.commercialBillingOperation.findFirst({ where: { provider: adapter.provider,
    ...(priorPayment ? { id: priorPayment.operationId } : location.operationReference ? { id: location.operationReference } : { id: "__unmapped__" }) } });
  if (!op) return { ignored: true, reason: "UNMAPPED_SANDBOX_EVENT" };
  if (op.providerOperationId?.startsWith("txn_") && location.paymentId && location.paymentId !== op.providerOperationId) throw new Error("PROVIDER_TRANSACTION_BINDING_MISMATCH");
  if (!op.executionStartedAt) throw new Error("OPERATION_NOT_EXECUTED");
  const observation = await adapter.observe({ ...contextOf(op), providerSubscriptionId: op.providerSubscriptionId ?? location.subscriptionId }, notification, op.providerPreview as ProviderPreview | null);
  return withCommercialCapacityLock(op.businessId, async tx => {
    const current = await tx.commercialBillingOperation.findUniqueOrThrow({ where: { id: op.id } });
    const source = `billing_v2_${adapter.provider}`;
    const duplicate = await tx.commercialEvent.findUnique({ where: { source_eventId: { source, eventId: notification.eventId } } });
    if (duplicate) {
      if (duplicate.payloadHash !== notification.rawHash || duplicate.businessId !== op.businessId) throw new Error("BILLING_EVENT_ID_CONFLICT");
      return { duplicate: true, outcome: duplicate.outcome };
    }
    const currentSnapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { id: op.subscriptionId } });
    const previous = observation.paymentId ? await tx.commercialPaymentEvidence.findUnique({ where: { provider_paymentId: { provider: adapter.provider, paymentId: observation.paymentId } } }) : null;
    let outcome: "APPLIED" | "UNKNOWN" | "REJECTED" | "IGNORED" = "UNKNOWN";
    const terminal = observation.state === "REFUNDED" || observation.state === "CHARGEBACK";
    if ((previous && observation.resourceUpdatedAt < previous.occurredAt) || (!terminal && currentSnapshot.lastReconciledAt && observation.resourceUpdatedAt < currentSnapshot.lastReconciledAt)) outcome = "IGNORED";
    else if (previous && previous.operationId !== op.id) outcome = "REJECTED";
    else if ((current.providerSubscriptionId && current.providerSubscriptionId !== observation.providerSubscriptionId) ||
      observation.currencyCode !== current.currencyCode || (!terminal && (!observation.contractMatches || observation.operationReference !== op.id)) ||
      observation.resourceUpdatedAt < current.executionStartedAt! || observation.resourceUpdatedAt > now) outcome = "REJECTED";
    else if (observation.state === "CONFIRMED") {
      if (previous && ["REFUNDED", "CHARGEBACK"].includes(previous.status)) outcome = "IGNORED";
      else if (observation.amountMinor === current.expectedPaymentMinor && observation.paymentId && observation.periodStart && observation.periodEnd &&
        observation.periodStart < observation.periodEnd && observation.periodEnd > now) outcome = "APPLIED";
      else outcome = "REJECTED";
    } else if (terminal && previous) outcome = "APPLIED";
    else if (["CANCELLED", "REJECTED"].includes(observation.state)) outcome = "APPLIED";
    const event = await tx.commercialEvent.create({ data: { businessId: op.businessId, subscriptionId: op.subscriptionId, source,
      eventId: notification.eventId, operation: `BILLING_${observation.state}`, occurredAt: notification.occurredAt,
      outcome, correlationId: op.id, payloadHash: notification.rawHash,
      details: { origin: observation.origin, amountMinor: observation.amountMinor, currencyCode: observation.currencyCode,
        periodStart: observation.periodStart?.toISOString() ?? null, periodEnd: observation.periodEnd?.toISOString() ?? null } } });
    if (outcome !== "APPLIED") return { outcome, eventId: event.id };
    if (["CANCELLED", "REJECTED"].includes(observation.state)) {
      if (adapter.provider === "MERCADO_PAGO" && observation.state === "CANCELLED") {
        await confirmMercadoPagoCancellation(tx, currentSnapshot, observation.resourceUpdatedAt, event.id, now);
        if (current.status !== "APPLIED") await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { status: "CANCELLED" } });
        return { outcome, lifecycleUpdated: true };
      }
      // A failed renewal attempt does not erase an already paid period.
      if (adapter.provider === "MERCADO_PAGO" && observation.state === "REJECTED" && currentSnapshot.lastPaymentStatus === "CONFIRMED" && currentSnapshot.periodEnd && currentSnapshot.periodEnd > now) {
        return { outcome, lifecycleUpdated: false, paidPeriodPreserved: true };
      }
      const updated = await tx.commercialSubscription.update({ where: { id: op.subscriptionId }, data: {
        status: observation.state === "CANCELLED" ? "CANCELLED" : "PAST_DUE_BLOCKED",
        lastReconciledAt: observation.resourceUpdatedAt, lastReconciledEventId: event.id } });
      await materializeCommercialEntitlements(tx, updated, now);
      if (observation.state === "CANCELLED" && current.status !== "APPLIED") await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { status: "CANCELLED" } });
      return { outcome, lifecycleUpdated: true };
    }
    if (terminal && previous) {
      await tx.commercialPaymentEvidence.update({ where: { id: previous.id }, data: { status: observation.state, occurredAt: observation.resourceUpdatedAt, eventId: notification.eventId } });
      const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { id: op.subscriptionId } });
      if (snapshot.lastPaymentEventId === previous.id) {
        const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: { status: "PAST_DUE_BLOCKED", lastPaymentStatus: observation.state } });
        await materializeCommercialEntitlements(tx, updated, now);
      }
      return { outcome, reversed: true };
    }
    const payment = await tx.commercialPaymentEvidence.upsert({ where: { provider_paymentId: { provider: adapter.provider, paymentId: observation.paymentId! } },
      create: { businessId: op.businessId, operationId: op.id, provider: adapter.provider, paymentId: observation.paymentId!, status: "CONFIRMED",
        origin: observation.origin, amountMinor: observation.amountMinor!, currencyCode: observation.currencyCode, periodStart: observation.periodStart!,
        periodEnd: observation.periodEnd!, occurredAt: observation.resourceUpdatedAt, providerSubscriptionId: observation.providerSubscriptionId, eventId: notification.eventId },
      update: { eventId: notification.eventId } });
    const paid = current.status === "APPLIED" ? current : await tx.commercialBillingOperation.update({ where: { id: op.id }, data: {
      status: "PAID", providerSubscriptionId: observation.providerSubscriptionId, failureCode: null } });
    const applied = await applyPaid(tx, paid, payment, now);
    return { outcome, eventId: event.id, ...applied };
  });
}

export async function cancelPreparedSandboxOperation(id: string) {
  assertCommercialSandbox();
  const op = await prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
  return withCommercialCapacityLock(op.businessId, async tx => {
    const current = await tx.commercialBillingOperation.findUniqueOrThrow({ where: { id } });
    if (current.status === "CANCELLED") return current;
    if (current.executionStartedAt || !["PREPARED", "SCHEDULED"].includes(current.status)) throw new Error("EXTERNAL_RESULT_MUST_BE_RECONCILED");
    return tx.commercialBillingOperation.update({ where: { id }, data: { status: "CANCELLED" } });
  });
}

/** Rebuild paid rights from already verified evidence; never calls a provider. */
export async function reconcileReadyMercadoPagoPeriods(input: { businessId?: string; limit?: number; now?: Date } = {}) {
  assertCommercialSandbox();
  const limit = Math.max(1, Math.min(5, Math.trunc(input.limit ?? 5))), now = input.now ?? new Date();
  const rows = await prisma.$queryRaw<Array<{ operationId: string }>>`
    SELECT DISTINCT p."operationId" FROM "CommercialPaymentEvidence" p
    JOIN "CommercialBillingOperation" op ON op.id=p."operationId" AND op."businessId"=p."businessId"
    JOIN "CommercialSubscription" s ON s.id=op."subscriptionId" AND s."businessId"=op."businessId"
    WHERE op.provider='MERCADO_PAGO' AND op.status IN ('PAID','APPLIED') AND p.status='CONFIRMED'
      AND p."periodStart"<=${now} AND p."periodEnd">${now} AND s."lastPaymentEventId" IS DISTINCT FROM p.id
      AND (s."periodEnd" IS NULL OR p."periodEnd">s."periodEnd")
      AND (${input.businessId ?? null}::text IS NULL OR s."businessId"=${input.businessId ?? null})
    ORDER BY p."operationId" LIMIT ${limit}`;
  let applied = 0, failed = 0;
  for (const row of rows) {
    try { if ((await applyPaidSandboxOperation(row.operationId, now)).applied) applied++; } catch { failed++; }
  }
  return { applied, failed };
}
