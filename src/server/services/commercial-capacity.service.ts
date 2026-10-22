import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { quoteCommercialPlan } from "@/core/commercial-catalog";
import { evaluateCommercialEntitlements } from "@/core/commercial-entitlements";
import { assertCommercialSandbox, assertNoOpenCommercialMigration, commercialHash, commercialInteger } from "./commercial-internal";
import { commercialJson, materializeCommercialEntitlements } from "./commercial-subscription-v2.service";

export class CommercialCapacityError extends Error {
  constructor(public readonly code: string, message = code) { super(message); this.name = "CommercialCapacityError"; }
}
type CapacityDb = Pick<Prisma.TransactionClient, "commercialSubscription" | "staff">;
export async function getCommercialCapacityInfo(businessId: string, db: CapacityDb = prisma, now = new Date()) {
  const [snapshot, activeProfessionalTotal, total] = await Promise.all([
    db.commercialSubscription.findUnique({ where: { businessId }, include: {
      items: { where: { kind: "PROFESSIONAL_SEATS", effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] } },
      seatChangeRequests: { where: { status: { in: ["DRAFT", "PENDING_PAYMENT", "SCHEDULED", "UNKNOWN"] } }, take: 1 },
    } }),
    db.staff.count({ where: { businessId, isActive: true } }), db.staff.count({ where: { businessId } }),
  ]);
  const capacity = snapshot?.items.length === 1 ? snapshot.items[0].quantity : 0;
  const evaluation = snapshot ? evaluateCommercialEntitlements({ ...snapshot, plan: snapshot.planCode }, now) : null;
  const accessGranted = Boolean(evaluation?.commercialAccess && capacity === snapshot?.professionalTotal);
  return { businessId, subscriptionId: snapshot?.id ?? null, status: snapshot?.status ?? null, planCode: snapshot?.planCode ?? null,
    contractedProfessionalTotal: capacity, activeProfessionalTotal, historicalProfessionalTotal: total - activeProfessionalTotal,
    accessGranted, canAddProfessional: accessGranted && activeProfessionalTotal < capacity,
    pendingChange: snapshot?.seatChangeRequests[0] ?? null };
}
export async function assertCommercialStaffCapacity(businessId: string, db: CapacityDb, now = new Date()) {
  const info = await getCommercialCapacityInfo(businessId, db, now);
  if (info.planCode !== "PURAGENDA" && info.planCode !== "PURAGENDA_PLUS") throw new CommercialCapacityError("V2_SNAPSHOT_REQUIRED");
  if (!info.canAddProfessional) throw new CommercialCapacityError("CAPACITY_EXCEEDED");
  return info;
}
export async function withCommercialCapacityLock<T>(businessId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  assertCommercialSandbox();
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
    if (!rows.length) throw new CommercialCapacityError("BUSINESS_NOT_FOUND");
    return operation(tx);
  }, { maxWait: 10_000, timeout: 15_000 });
}
export type SeatChangeRequestInput = { businessId: string; requestedProfessionalTotal: number; idempotencyKey: string; effectiveAt: Date };
export async function requestCommercialSeatChange(input: SeatChangeRequestInput, now = new Date()) {
  commercialInteger(input.requestedProfessionalTotal, 1);
  if (!/^[\w:.-]{8,200}$/.test(input.idempotencyKey)) throw new CommercialCapacityError("INVALID_IDEMPOTENCY_KEY");
  if (!(input.effectiveAt instanceof Date) || !Number.isFinite(input.effectiveAt.getTime()) ) throw new CommercialCapacityError("INVALID_EFFECTIVE_DATE");
  return withCommercialCapacityLock(input.businessId, async tx => {
    const existing = await tx.seatChangeRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.businessId !== input.businessId || existing.requestedProfessionalTotal !== input.requestedProfessionalTotal || existing.effectiveAt.getTime() !== input.effectiveAt.getTime()) throw new CommercialCapacityError("IDEMPOTENCY_CONFLICT");
      return { ...existing, alreadyExists: true };
    }
    if (input.effectiveAt < now) throw new CommercialCapacityError("INVALID_EFFECTIVE_DATE");
    await assertNoOpenCommercialMigration(tx, input.businessId);
    const snapshot = await tx.commercialSubscription.findUnique({ where: { businessId: input.businessId } });
    if (!snapshot || snapshot.legacySubscriptionId) throw new CommercialCapacityError("V2_SNAPSHOT_REQUIRED");
    if (!evaluateCommercialEntitlements({ ...snapshot, plan: snapshot.planCode }, now).commercialAccess || snapshot.status !== "ACTIVE") throw new CommercialCapacityError("COMMERCIAL_ACCESS_BLOCKED");
    if (await tx.seatChangeRequest.findFirst({ where: { businessId: input.businessId, status: { in: ["DRAFT", "PENDING_PAYMENT", "SCHEDULED", "UNKNOWN"] } } })) throw new CommercialCapacityError("OPEN_CHANGE_EXISTS");
    if (input.requestedProfessionalTotal === snapshot.professionalTotal) throw new CommercialCapacityError("NO_CAPACITY_CHANGE");
    const quote = quoteCommercialPlan({ catalogVersion: snapshot.catalogVersion, plan: snapshot.planCode, professionalTotal: input.requestedProfessionalTotal });
    commercialInteger(quote.monthlyTotal);
    const kind = input.requestedProfessionalTotal > snapshot.professionalTotal ? "INCREASE" : "DECREASE";
    if (kind === "DECREASE" && (!snapshot.renewalAt || input.effectiveAt < snapshot.renewalAt)) throw new CommercialCapacityError("REDUCTION_REQUIRES_RENEWAL_DATE");
    const active = await tx.staff.count({ where: { businessId: input.businessId, isActive: true } });
    const request = await tx.seatChangeRequest.create({ data: {
      ...input, subscriptionId: snapshot.id, kind, status: kind === "INCREASE" ? "PENDING_PAYMENT" : "SCHEDULED",
      requestedAt: now, previousProfessionalTotal: snapshot.professionalTotal, activeProfessionalsAtRequest: active,
      quotedAmountClp: quote.monthlyTotal, currencyCode: quote.currencyCode, catalogVersion: quote.catalogVersion,
      quoteSnapshot: commercialJson(quote), conflictReason: kind === "DECREASE" && active > input.requestedProfessionalTotal ? "ACTIVE_STAFF_CONFLICT" : null,
    } });
    await tx.commercialEvent.create({ data: { businessId: input.businessId, subscriptionId: snapshot.id,
      source: "seat_change_request", eventId: input.idempotencyKey, operation: "SEAT_CHANGE_REQUESTED", occurredAt: now,
      outcome: "RECEIVED", correlationId: request.id, details: { kind, requestedProfessionalTotal: input.requestedProfessionalTotal } } });
    return { ...request, alreadyExists: false };
  });
}

/** Only a persisted, canonical reconciled ledger event may authorize application. */
export async function applyCommercialSeatChange(businessId: string, requestId: string, paymentEventId: string, now = new Date()) {
  return withCommercialCapacityLock(businessId, async tx => {
    // Re-read AFTER locking, including duplicate retries after timeout.
    const request = await tx.seatChangeRequest.findFirst({ where: { id: requestId, businessId }, include: { subscription: true } });
    if (!request) throw new CommercialCapacityError("REQUEST_NOT_FOUND");
    if (request.status === "APPLIED") return { applied: false, alreadyApplied: true };
    if (!["SCHEDULED", "PENDING_PAYMENT", "UNKNOWN"].includes(request.status)) throw new CommercialCapacityError("REQUEST_CLOSED");
    if (request.effectiveAt > now) return { applied: false, pending: true };
    const snapshot = request.subscription;
    if (snapshot.professionalTotal !== request.previousProfessionalTotal || snapshot.catalogVersion !== request.catalogVersion) {
      await tx.seatChangeRequest.update({ where: { id: request.id }, data: { status: "REJECTED", conflictReason: "STALE_REQUEST" } });
      return { applied: false, rejected: true };
    }
    const event = await tx.commercialEvent.findFirst({ where: { id: paymentEventId, businessId, subscriptionId: snapshot.id,
      correlationId: request.id, source: snapshot.provider, providerReference: snapshot.externalSubscriptionId, outcome: "APPLIED",
      operation: { in: request.kind === "INCREASE" ? ["PAYMENT_CONFIRMED"] : ["PAYMENT_CONFIRMED", "CONTRACT_CONFIRMED"] } } });
    if (!event || event.occurredAt < request.requestedAt || (snapshot.lastReconciledAt && event.occurredAt < snapshot.lastReconciledAt)) throw new CommercialCapacityError("RECONCILED_EVIDENCE_REQUIRED");
    const details = event.details as { amountClp?: number; currencyCode?: string; periodStart?: string; periodEnd?: string } | null;
    const periodStart = new Date(details?.periodStart ?? ""); const periodEnd = new Date(details?.periodEnd ?? "");
    if (details?.amountClp !== request.quotedAmountClp || details.currencyCode !== request.currencyCode || !(periodStart <= now && periodEnd > now)) throw new CommercialCapacityError("PAYMENT_MISMATCH");
    if (snapshot.status !== "ACTIVE") throw new CommercialCapacityError("COMMERCIAL_ACCESS_BLOCKED");
    const active = await tx.staff.count({ where: { businessId, isActive: true } });
    if (active > request.requestedProfessionalTotal) {
      await tx.seatChangeRequest.update({ where: { id: request.id }, data: { conflictReason: "ACTIVE_STAFF_CONFLICT" } });
      return { applied: false, blockedByActiveStaff: true };
    }
    const quote = quoteCommercialPlan({ catalogVersion: request.catalogVersion, plan: snapshot.planCode, professionalTotal: request.requestedProfessionalTotal });
    if (commercialHash(quote) !== commercialHash(request.quoteSnapshot)) throw new CommercialCapacityError("QUOTE_CHANGED_REQUIRES_REVIEW");
    const seat = await tx.commercialSubscriptionItem.findFirst({ where: { subscriptionId: snapshot.id, code: "professional_seats", effectiveTo: null } });
    if (!seat || seat.quantity !== request.previousProfessionalTotal || seat.effectiveFrom >= now) throw new CommercialCapacityError("INCONSISTENT_CAPACITY_ITEMS");
    await tx.commercialSubscriptionItem.update({ where: { id: seat.id }, data: { effectiveTo: now } });
    await tx.commercialSubscriptionItem.create({ data: { subscriptionId: snapshot.id, kind: "PROFESSIONAL_SEATS", code: seat.code,
      quantity: quote.professionalTotal, unitAmountClp: null, amountClp: quote.professionalSurchargeMonthly, currencyCode: quote.currencyCode,
      catalogVersion: quote.catalogVersion, effectiveFrom: now, pricingSnapshot: commercialJson({ surchargeSteps: quote.surchargeSteps }) } });
    const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: {
      professionalTotal: quote.professionalTotal, totalPriceClp: quote.monthlyTotal, status: "ACTIVE", periodStart, periodEnd, renewalAt: periodEnd,
      ...(event.operation === "PAYMENT_CONFIRMED" ? { lastPaymentAt: event.occurredAt, lastPaymentEventId: event.id, lastPaymentStatus: "CONFIRMED" } : {}),
    } });
    await materializeCommercialEntitlements(tx, updated, now);
    await tx.seatChangeRequest.update({ where: { id: request.id }, data: { status: "APPLIED", appliedAt: now, paymentEventId: event.id,
      providerReference: event.providerReference, paymentEvidence: { ledgerEventId: event.id }, conflictReason: null } });
    await tx.commercialEvent.updateMany({ where: { businessId, source: "seat_change_request", correlationId: request.id }, data: { outcome: "APPLIED" } });
    await tx.commercialEvent.create({ data: { businessId, subscriptionId: snapshot.id, source: "seat_change_application", eventId: request.id,
      operation: "SEAT_CHANGE_APPLIED", occurredAt: now, outcome: "APPLIED", correlationId: request.id,
      details: { previous: request.previousProfessionalTotal, current: quote.professionalTotal } } });
    return { applied: true, alreadyApplied: false };
  });
}

/** Isolated staff writer used by integration tests/future cutover, never by current routes. */
export async function createCommercialStaff(businessId: string, input: { name: string; locationIds?: string[] }, idempotencyKey: string) {
  return withCommercialCapacityLock(businessId, async tx => {
    if (!/^[\w:.-]{8,200}$/.test(idempotencyKey) || !input.name.trim()) throw new Error("INVALID_STAFF_INPUT");
    const hash = commercialHash({ businessId, ...input });
    const previous = await tx.commercialEvent.findUnique({ where: { source_eventId: { source: "commercial_staff", eventId: idempotencyKey } } });
    if (previous) {
      if (previous.businessId !== businessId || previous.payloadHash !== hash) throw new Error("IDEMPOTENCY_CONFLICT");
      return tx.staff.findFirstOrThrow({ where: { id: previous.correlationId!, businessId } });
    }
    const locations = [...new Set(input.locationIds ?? [])];
    if (locations.length !== await tx.businessLocation.count({ where: { id: { in: locations }, businessId } })) throw new Error("LOCATION_TENANT_MISMATCH");
    await assertCommercialStaffCapacity(businessId, tx);
    const staff = await tx.staff.create({ data: { businessId, name: input.name, isActive: true,
      locations: { create: locations.map(locationId => ({ locationId })) } } });
    await tx.commercialEvent.create({ data: { businessId, source: "commercial_staff", eventId: idempotencyKey,
      operation: "STAFF_CREATED", occurredAt: new Date(), outcome: "APPLIED", correlationId: staff.id, payloadHash: hash } });
    return staff;
  });
}
export async function reactivateCommercialStaff(businessId: string, staffId: string) {
  return withCommercialCapacityLock(businessId, async tx => {
    const staff = await tx.staff.findFirstOrThrow({ where: { id: staffId, businessId } });
    if (staff.isActive) return staff;
    await assertCommercialStaffCapacity(businessId, tx);
    return tx.staff.update({ where: { id: staff.id }, data: { isActive: true } });
  });
}

export async function cancelCommercialSeatChange(businessId: string, requestId: string, now = new Date()) {
  return withCommercialCapacityLock(businessId, async tx => {
    const request = await tx.seatChangeRequest.findFirstOrThrow({ where: { id: requestId, businessId } });
    if (request.status === "CANCELLED") return { cancelled: true, alreadyCancelled: true };
    if (!["DRAFT", "PENDING_PAYMENT", "SCHEDULED"].includes(request.status)) throw new CommercialCapacityError("RECONCILIATION_REQUIRED_BEFORE_CANCELLATION");
    if (await tx.commercialEvent.findFirst({ where: { businessId, correlationId: request.id, outcome: "APPLIED",
      operation: { in: ["PAYMENT_CONFIRMED", "CONTRACT_CONFIRMED"] } } })) throw new CommercialCapacityError("RECONCILIATION_REQUIRED_BEFORE_CANCELLATION");
    await tx.seatChangeRequest.update({ where: { id: request.id }, data: { status: "CANCELLED", cancelledAt: now } });
    await tx.commercialEvent.updateMany({ where: { businessId, source: "seat_change_request", correlationId: request.id }, data: { outcome: "IGNORED" } });
    await tx.commercialEvent.create({ data: { businessId, subscriptionId: request.subscriptionId,
      source: "seat_change_cancellation", eventId: request.id, operation: "SEAT_CHANGE_CANCELLED", occurredAt: now, outcome: "APPLIED", correlationId: request.id } });
    return { cancelled: true, alreadyCancelled: false };
  });
}
