import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { assertCommercialSandbox, commercialHash, commercialInteger } from "./commercial-internal";
import { commercialJson, materializeCommercialEntitlements } from "./commercial-subscription-v2.service";

const evidenceSchema = z.object({
  businessId: z.string().min(1), subscriptionId: z.string().min(1),
  provider: z.enum(["MERCADO_PAGO", "PADDLE", "BANK_TRANSFER", "MANUAL"]),
  eventId: z.string().min(1).max(200), reference: z.string().min(1).max(200),
  occurredAt: z.date(), kind: z.enum(["PAYMENT_CONFIRMED", "CONTRACT_CONFIRMED", "PAYMENT_PENDING", "PAST_DUE", "CANCELLED", "UNKNOWN"]),
  amountClp: z.number().int().nonnegative().max(2_147_483_647), currencyCode: z.literal("CLP"),
  periodStart: z.date(), periodEnd: z.date(), requestId: z.string().optional(),
}).strict();
export type ReconciledCommercialEvidence = z.infer<typeof evidenceSchema>;
/** Future adapters must verify raw webhook signatures, then re-fetch canonical
 * provider resources. This interface has no live implementation in iteration 3. */
export interface CommercialEvidenceVerifier {
  verifyAndFetch(envelope: unknown): Promise<ReconciledCommercialEvidence>;
}

export async function reconcileCommercialEvent(envelope: unknown, verifier: CommercialEvidenceVerifier, now = new Date()) {
  assertCommercialSandbox();
  const evidence = evidenceSchema.parse(await verifier.verifyAndFetch(envelope));
  commercialInteger(evidence.amountClp);
  if (evidence.occurredAt > now || evidence.periodEnd <= evidence.periodStart) throw new Error("INVALID_EVIDENCE_PERIOD");
  const hash = commercialHash(evidence);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${evidence.businessId} FOR UPDATE`;
    const snapshot = await tx.commercialSubscription.findFirst({ where: { id: evidence.subscriptionId, businessId: evidence.businessId } });
    if (!snapshot || snapshot.legacySubscriptionId) throw new Error("V2_SNAPSHOT_REQUIRED");
    const duplicate = await tx.commercialEvent.findUnique({ where: { source_eventId: { source: evidence.provider, eventId: evidence.eventId } } });
    if (duplicate) {
      if (duplicate.businessId !== evidence.businessId || duplicate.payloadHash !== hash) throw new Error("EVENT_IDEMPOTENCY_CONFLICT");
      return { duplicate: true, outcome: duplicate.outcome, eventId: duplicate.id };
    }
    const reject = async (rejectionCode: string) => {
      const rejected = await tx.commercialEvent.create({ data: { businessId: evidence.businessId, subscriptionId: snapshot.id,
        source: evidence.provider, eventId: evidence.eventId, operation: evidence.kind, occurredAt: evidence.occurredAt,
        payloadHash: hash, correlationId: evidence.requestId, outcome: "REJECTED", details: { rejectionCode } } });
      return { duplicate: false, outcome: "REJECTED" as const, eventId: rejected.id, rejectionCode };
    };
    if (snapshot.provider !== evidence.provider || snapshot.externalSubscriptionId !== evidence.reference || snapshot.currencyCode !== evidence.currencyCode) return reject("PROVIDER_REFERENCE_MISMATCH");
    let outcome: "APPLIED" | "IGNORED" | "UNKNOWN" = "APPLIED";
    if (snapshot.lastReconciledAt && evidence.occurredAt < snapshot.lastReconciledAt) outcome = "IGNORED";
    if (snapshot.lastReconciledAt && evidence.occurredAt.getTime() === snapshot.lastReconciledAt.getTime()) outcome = "UNKNOWN";
    if (outcome !== "IGNORED" && (evidence.kind === "UNKNOWN" || evidence.kind === "PAYMENT_PENDING" || (!evidence.requestId && evidence.periodStart > now))) outcome = "UNKNOWN";
    if (evidence.requestId) {
      const request = await tx.seatChangeRequest.findFirst({ where: { id: evidence.requestId, businessId: evidence.businessId, subscriptionId: snapshot.id } });
      if (!request || request.quotedAmountClp !== evidence.amountClp || request.requestedAt > evidence.occurredAt ||
          request.currencyCode !== evidence.currencyCode || !["PENDING_PAYMENT", "SCHEDULED", "UNKNOWN"].includes(request.status)) return reject("REQUEST_EVIDENCE_MISMATCH");
      if (outcome !== "IGNORED" && request.kind === "INCREASE" && evidence.kind !== "PAYMENT_CONFIRMED") outcome = "UNKNOWN";
    } else if (evidence.kind === "CONTRACT_CONFIRMED" || evidence.amountClp !== snapshot.totalPriceClp) return reject("CONTRACT_AMOUNT_MISMATCH");
    const event = await tx.commercialEvent.create({ data: {
      businessId: evidence.businessId, subscriptionId: snapshot.id, source: evidence.provider, eventId: evidence.eventId,
      operation: evidence.kind, occurredAt: evidence.occurredAt, providerReference: evidence.reference,
      correlationId: evidence.requestId, payloadHash: hash, outcome,
      details: commercialJson({ amountClp: evidence.amountClp, currencyCode: evidence.currencyCode,
        periodStart: evidence.periodStart.toISOString(), periodEnd: evidence.periodEnd.toISOString() }),
    } });
    if (outcome === "UNKNOWN" && evidence.requestId) await tx.seatChangeRequest.update({
      where: { id: evidence.requestId }, data: { status: "UNKNOWN", conflictReason: "PROVIDER_RECONCILIATION_REQUIRED" },
    });
    if (outcome === "APPLIED") {
      const isPayment = evidence.kind === "PAYMENT_CONFIRMED";
      const status = isPayment ? "ACTIVE" : evidence.kind === "PAST_DUE" ? "PAST_DUE_BLOCKED" : evidence.kind === "CANCELLED" ? "CANCELLED" : "PENDING_PAYMENT";
      const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: {
        lastReconciledAt: evidence.occurredAt, lastReconciledEventId: event.id,
        ...(evidence.requestId ? {} : { status, periodStart: evidence.periodStart, periodEnd: evidence.periodEnd,
          renewalAt: evidence.periodEnd, ...(isPayment ? { lastPaymentAt: evidence.occurredAt, lastPaymentEventId: event.id, lastPaymentStatus: "CONFIRMED" } : {}) }),
      } });
      if (!evidence.requestId) await materializeCommercialEntitlements(tx, updated, now);
    }
    return { duplicate: false, outcome, eventId: event.id };
  });
}
