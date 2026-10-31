import type { Prisma, CommercialSubscription } from "@prisma/client";
import { effectiveSnapshotAccess, isV2Plan } from "./commercial-plan-access";
import { prisma } from "@/server/db/prisma";
import { COMMERCIAL_CATALOG_VERSION, getCommercialPlanMetadata, quoteCommercialPlan, type CommercialBillingCycle, type CommercialPlanIdentifier } from "@/core/commercial-catalog";
import { evaluateCommercialEntitlements } from "@/core/commercial-entitlements";
import { assertCommercialSandbox, commercialHash, commercialInteger } from "./commercial-internal";

export type CommercialSnapshotStatus = CommercialSubscription["status"];
export type CommercialSnapshotProvider = CommercialSubscription["provider"];
export type CommercialSnapshotInput = {
  businessId: string; plan: CommercialPlanIdentifier; catalogVersion?: string;
  billingCycle: CommercialBillingCycle; status: CommercialSnapshotStatus;
  provider?: CommercialSnapshotProvider; currencyCode?: string; professionalTotal: number;
  legacySubscriptionId?: string | null; legacyExtraStaffCount?: number;
  basePriceClp?: number | null; totalPriceClp?: number | null; termsSnapshot?: unknown;
  externalCustomerId?: string | null; externalSubscriptionId?: string | null; externalReference?: string | null;
  periodStart?: Date | null; periodEnd?: Date | null; renewalAt?: Date | null;
  trialStart?: Date | null; trialEnd?: Date | null; gracePeriodEndsAt?: Date | null; effectiveFrom?: Date;
  legacyAddon?: { code: string; description: string; amountClp: number | null; quantity?: number; pricingSnapshot?: unknown };
};
export type CommercialSnapshotResult = {
  snapshotId: string; created: boolean; alreadyExists: boolean; snapshotHash: string;
  professionalTotal: number; totalPriceClp: number | null;
};
export const commercialJson = (value: unknown) => value as Prisma.InputJsonValue;
type SnapshotDb = Pick<Prisma.TransactionClient, "business" | "subscription" | "commercialSubscription" | "commercialSubscriptionItem" | "commercialEntitlement" | "commercialEvent">;

/** Entitlements are a rebuildable projection, never a separately editable contract. */
export async function materializeCommercialEntitlements(
  db: Pick<Prisma.TransactionClient, "commercialEntitlement"> & Partial<Pick<Prisma.TransactionClient, "subscription">>,
  snapshot: Pick<CommercialSubscription, "id" | "businessId" | "planCode" | "status" | "professionalTotal" | "periodStart" | "periodEnd" | "trialEnd" | "gracePeriodEndsAt" | "termsSnapshot" | "trialStart" | "lastPaymentAt" | "lastPaymentStatus" | "lastPaymentEventId" | "billingCycle">,
  now = new Date(),
) {
  const terms = snapshot.termsSnapshot as { websiteAddon?: { active?: boolean; validUntil?: string | null } } | null;
  const evaluation = isV2Plan(snapshot.planCode) ? effectiveSnapshotAccess(snapshot, now) : evaluateCommercialEntitlements({
    ...snapshot, plan: snapshot.planCode,
    legacyWebsiteActive: terms?.websiteAddon?.active,
    legacyWebsiteUntil: terms?.websiteAddon?.validUntil ? new Date(terms.websiteAddon.validUntil) : null,
  }, now);
  await db.commercialEntitlement.updateMany({
    where: { subscriptionId: snapshot.id, businessId: snapshot.businessId },
    data: { status: "REVOKED", reason: evaluation.reason || "PROJECTION_REBUILT" },
  });
  const boundaries = [snapshot.status === "PAST_DUE_GRACE" ? snapshot.gracePeriodEndsAt : snapshot.periodEnd,
    snapshot.status === "TRIALING" ? snapshot.trialEnd : null].filter((d): d is Date => Boolean(d));
  const validTo = boundaries.length ? new Date(Math.min(...boundaries.map(d => d.getTime()))) : null;
  for (const capability of evaluation.capabilities) {
    const websiteUntil = ["INDIVIDUAL", "EQUIPO", "TEST"].includes(snapshot.planCode) && terms?.websiteAddon?.validUntil ? new Date(terms.websiteAddon.validUntil) : null;
    const expiry = capability.startsWith("website.") && websiteUntil && (!validTo || websiteUntil < validTo) ? websiteUntil : validTo;
    const data = { status: "ACTIVE" as const, quantity: evaluation.quantities[capability] ?? 1,
      validFrom: now, validTo: expiry, reason: null, metadata: { commercialOnly: true, shadow: true } };
    await db.commercialEntitlement.upsert({
      where: { dedupeKey: `${snapshot.id}:${capability}` },
      create: { ...data, businessId: snapshot.businessId, subscriptionId: snapshot.id, capability,
        source: "commercial_snapshot", dedupeKey: `${snapshot.id}:${capability}` }, update: data,
    });
  }
  if (db.subscription && isV2Plan(snapshot.planCode)) {
    const effective = effectiveSnapshotAccess(snapshot, now);
    await db.subscription.updateMany({ where: { businessId: snapshot.businessId, plan: { in: ["PURAGENDA", "PURAGENDA_PLUS"] } }, data: {
      status: effective.commercialAccess ? (snapshot.status === "TRIALING" ? "TRIALING" : snapshot.status === "PAST_DUE_GRACE" ? "PAST_DUE" : "ACTIVE") : "INACTIVE",
      gracePeriodEndsAt: snapshot.gracePeriodEndsAt,
      billingCycle: snapshot.billingCycle, isTrial: snapshot.status === "TRIALING", trialEndsAt: snapshot.trialEnd, currentPeriodEnd: snapshot.periodEnd,
      plan: snapshot.planCode as "PURAGENDA" | "PURAGENDA_PLUS", staffLimitOverride: snapshot.professionalTotal, extraStaffCount: snapshot.professionalTotal - 1,
    } });
  }
  return evaluation;
}

/** Called only while holding Business FOR UPDATE. All writes remain disposable-only. */
export async function createCommercialSnapshotInTransaction(db: SnapshotDb, input: CommercialSnapshotInput): Promise<CommercialSnapshotResult> {
  assertCommercialSandbox();
  const metadata = getCommercialPlanMetadata(input.plan);
  commercialInteger(input.professionalTotal, 1);
  const currencyCode = input.currencyCode ?? "CLP";
  const catalogVersion = input.catalogVersion ?? (metadata.legacy ? "legacy-current" : COMMERCIAL_CATALOG_VERSION);
  const quote = metadata.legacy ? null : quoteCommercialPlan({ ...input, catalogVersion });
  if (quote && currencyCode !== "CLP") throw new Error("CURRENCY_MISMATCH");
  if (metadata.legacy && !input.legacySubscriptionId) throw new Error("LEGACY_REFERENCE_REQUIRED");
  if (input.legacySubscriptionId && !await db.subscription.findFirst({ where: { id: input.legacySubscriptionId, businessId: input.businessId } })) throw new Error("TENANT_MISMATCH");
  const basePriceClp = quote?.baseMonthly ?? input.basePriceClp ?? null;
  const totalPriceClp = quote?.monthlyTotal ?? input.totalPriceClp ?? null;
  for (const amount of [basePriceClp, totalPriceClp]) if (amount !== null) commercialInteger(amount);
  if (quote) commercialInteger(quote.professionalSurchargeMonthly);
  // An ACTIVE label alone is insufficient for V2 access. Activation is performed
  // only by the reconciler; fixture setup also starts as pending.
  if (quote && !["DRAFT", "PENDING_PAYMENT", "UNKNOWN"].includes(input.status)) throw new Error("RECONCILED_EVIDENCE_REQUIRED");
  const effectiveFrom = input.effectiveFrom ?? new Date();
  const identity = { ...input, effectiveFrom: undefined, basePriceClp, totalPriceClp, catalogVersion, currencyCode };
  const snapshotHash = commercialHash(identity);
  const existing = await db.commercialSubscription.findUnique({ where: { businessId: input.businessId } });
  if (existing) {
    if (existing.snapshotHash !== snapshotHash) throw new Error("SNAPSHOT_CONFLICT_REQUIRES_REVIEW");
    return { snapshotId: existing.id, created: false, alreadyExists: true, snapshotHash,
      professionalTotal: existing.professionalTotal, totalPriceClp: existing.totalPriceClp };
  }
  const snapshot = await db.commercialSubscription.create({ data: {
    businessId: input.businessId, legacySubscriptionId: input.legacySubscriptionId,
    catalogVersion, planCode: input.plan, legacyPlanCode: metadata.legacy ? input.plan : null,
    currencyCode, billingCycle: input.billingCycle, status: input.status, provider: input.provider ?? "NONE",
    externalCustomerId: input.externalCustomerId, externalSubscriptionId: input.externalSubscriptionId,
    externalReference: input.externalReference, periodStart: input.periodStart, periodEnd: input.periodEnd,
    renewalAt: input.renewalAt, trialStart: input.trialStart, trialEnd: input.trialEnd, gracePeriodEndsAt: input.gracePeriodEndsAt,
    basePriceClp, professionalTotal: input.professionalTotal, totalPriceClp,
    lastPaymentStatus: metadata.legacy ? "LEGACY_UNVERIFIED" : null,
    termsSnapshot: input.termsSnapshot === undefined ? undefined : commercialJson(input.termsSnapshot), snapshotHash,
  } });
  await db.commercialSubscriptionItem.createMany({ data: [
    { subscriptionId: snapshot.id, kind: "BASE_PLAN", code: input.plan, quantity: 1,
      unitAmountClp: basePriceClp, amountClp: basePriceClp, currencyCode, catalogVersion, effectiveFrom },
    { subscriptionId: snapshot.id, kind: "PROFESSIONAL_SEATS", code: "professional_seats", quantity: input.professionalTotal,
      unitAmountClp: null, amountClp: quote?.professionalSurchargeMonthly ?? null, currencyCode, catalogVersion, effectiveFrom,
      pricingSnapshot: commercialJson({ professionalTotal: input.professionalTotal, surchargeSteps: quote?.surchargeSteps ?? [], legacyAmountNotSplit: metadata.legacy }) },
  ] });
  if (input.legacyAddon) {
    const quantity = commercialInteger(input.legacyAddon.quantity ?? 1, 1);
    const amount = input.legacyAddon.amountClp === null ? null : commercialInteger(input.legacyAddon.amountClp * quantity);
    await db.commercialSubscriptionItem.create({ data: {
      subscriptionId: snapshot.id, kind: "LEGACY_ADDON", code: input.legacyAddon.code, description: input.legacyAddon.description,
      quantity, amountClp: amount, unitAmountClp: input.legacyAddon.amountClp, currencyCode, catalogVersion, effectiveFrom,
      pricingSnapshot: input.legacyAddon.pricingSnapshot === undefined ? undefined : commercialJson(input.legacyAddon.pricingSnapshot),
    } });
  }
  await materializeCommercialEntitlements(db, snapshot, effectiveFrom);
  await db.commercialEvent.create({ data: { businessId: input.businessId, subscriptionId: snapshot.id,
    source: "commercial_snapshot", eventId: snapshotHash, operation: "SNAPSHOT_CREATED", occurredAt: effectiveFrom,
    outcome: "APPLIED", payloadHash: snapshotHash, details: { plan: input.plan, catalogVersion } } });
  return { snapshotId: snapshot.id, created: true, alreadyExists: false, snapshotHash,
    professionalTotal: snapshot.professionalTotal, totalPriceClp: snapshot.totalPriceClp };
}
export async function createCommercialSubscriptionSnapshot(input: CommercialSnapshotInput) {
  assertCommercialSandbox();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${input.businessId} FOR UPDATE`;
    return createCommercialSnapshotInTransaction(tx, input);
  });
}
