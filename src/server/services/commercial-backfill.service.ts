import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { assertCommercialSandbox, commercialHash } from "./commercial-internal";
import { getCommercialPlanMetadata, quoteLegacyPlan, type CommercialPlanIdentifier } from "@/core/commercial-catalog";
import { evaluateCommercialEntitlements } from "@/core/commercial-entitlements";
import { getSubscriptionAccessState } from "@/core/subscription-access";
import { getStaffLimit } from "@/core/subscription-plan";
import {
  createCommercialSnapshotInTransaction,
  type CommercialSnapshotInput,
  type CommercialSnapshotStatus,
} from "@/server/services/commercial-subscription-v2.service";

type BackfillDb = Pick<
  Prisma.TransactionClient,
  | "$queryRaw"
  | "business"
  | "subscription"
  | "staff"
  | "websiteAddon"
  | "commercialSubscription"
  | "commercialSubscriptionItem"
  | "commercialEntitlement"
  | "commercialEvent"
>;

export type LegacyBackfillReport = {
  businessId: string;
  legacySubscriptionId: string;
  snapshotInput: CommercialSnapshotInput;
  warnings: readonly string[];
  differences: readonly string[];
  legacyAccess: boolean;
  commercialAccess: boolean;
  legacyCapabilities: readonly string[];
  commercialCapabilities: readonly string[];
  alreadyBackfilled: boolean;
  snapshotId: string | null;
};

function statusFromLegacy(
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "INACTIVE" | "CANCELLED",
  isTrial: boolean,
  trialEndsAt: Date | null,
  gracePeriodEndsAt: Date | null,
  now: Date,
): CommercialSnapshotStatus {
  if (status === "TRIALING") return isTrial && trialEndsAt && trialEndsAt > now ? "TRIALING" : "UNKNOWN";
  if (status === "PAST_DUE") return gracePeriodEndsAt && gracePeriodEndsAt > now ? "PAST_DUE_GRACE" : "PAST_DUE_BLOCKED";
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "INACTIVE") return "INACTIVE";
  return "CANCELLED";
}

function activeWebsiteAddon(addon: { status: string; validUntil: Date | null } | null, now: Date) {
  if (!addon) return false;
  if (!["ACTIVE", "TRIALING", "PAST_DUE"].includes(addon.status)) return false;
  return !addon.validUntil || addon.validUntil > now;
}

function stableTerms(subscription: {
  plan: string;
  status: string;
  billingCycle: string;
  isTrial: boolean;
  trialEndsAt: Date | null;
  extraStaffCount: number;
  staffLimitOverride: number | null;
  paymentMethod: string;
  customMonthlyPriceClp: number | null;
  pendingDiscountPercentage: number | null;
  hasCountedAsPaidReferral: boolean;
  freeMonthsRemaining: number;
  activePrizeId: string | null;
  promoName: string | null;
  promoFreeMonthsRemaining: number;
  promoDiscountPercentage: number | null;
  promoDiscountMonthsRemaining: number;
  nextBillingOverrideAmount: number | null;
  billingNotes: string | null;
}, website: { active: boolean; provider: string; validUntil: Date | null } | null, warnings: readonly string[]) {
  return {
    source: "legacy_subscription",
    plan: subscription.plan,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    isTrial: subscription.isTrial,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    extraStaffCount: subscription.extraStaffCount,
    staffLimitOverride: subscription.staffLimitOverride,
    paymentMethod: subscription.paymentMethod,
    customMonthlyPriceClp: subscription.customMonthlyPriceClp,
    pendingDiscountPercentage: subscription.pendingDiscountPercentage,
    hasCountedAsPaidReferral: subscription.hasCountedAsPaidReferral,
    freeMonthsRemaining: subscription.freeMonthsRemaining,
    activePrizeId: subscription.activePrizeId,
    promoName: subscription.promoName,
    promoFreeMonthsRemaining: subscription.promoFreeMonthsRemaining,
    promoDiscountPercentage: subscription.promoDiscountPercentage,
    promoDiscountMonthsRemaining: subscription.promoDiscountMonthsRemaining,
    nextBillingOverrideAmount: subscription.nextBillingOverrideAmount,
    billingNotesHash: subscription.billingNotes ? commercialHash(subscription.billingNotes) : null,
    websiteAddon: website ? { ...website, validUntil: website.validUntil?.toISOString() ?? null } : null,
    warnings,
  } satisfies Prisma.InputJsonValue;
}

async function readLegacyReport(
  db: Pick<BackfillDb, "business" | "subscription" | "staff" | "websiteAddon" | "commercialSubscription">,
  businessId: string,
  now: Date,
): Promise<LegacyBackfillReport> {
  const [business, subscription, activeStaff, historicalStaff, websiteAddon] = await Promise.all([
    db.business.findUnique({ where: { id: businessId }, select: { id: true, currencyCode: true, websiteOfferEligibility: true } }),
    db.subscription.findUnique({ where: { businessId } }),
    db.staff.count({ where: { businessId, isActive: true } }),
    db.staff.count({ where: { businessId } }),
    db.websiteAddon.findUnique({ where: { businessId }, select: { status: true, provider: true, validUntil: true, updatedAt: true } }),
  ]);
  if (!business) throw new Error("Negocio inexistente");
  if (!subscription) throw new Error("Suscripción legacy inexistente");

  const warnings: string[] = ["LEGACY_PRICE_NOT_PROVIDER_RECONCILED"];
  const differences: string[] = [];
  const plan = subscription.plan as CommercialPlanIdentifier;
  const metadata = getCommercialPlanMetadata(plan);
  const professionalTotal = getStaffLimit(subscription);
  const extraStaffCount = subscription.extraStaffCount;
  if (subscription.staffLimitOverride !== null) warnings.push("STAFF_LIMIT_OVERRIDE_PRESERVED");
  if (subscription.currentPeriodEnd === null && subscription.status === "ACTIVE") warnings.push("ACTIVE_PERIOD_END_MISSING");
  if (subscription.status === "PAST_DUE") warnings.push("PAST_DUE_REQUIRES_PROVIDER_RECONCILIATION");
  if (subscription.isTrial && (!subscription.trialEndsAt || subscription.trialEndsAt <= now)) warnings.push("TRIAL_DATE_INCONSISTENT");
  if (business.currencyCode !== "CLP") warnings.push("CURRENCY_NOT_CLP");
  if (websiteAddon && activeWebsiteAddon(websiteAddon, now)) warnings.push("ACTIVE_WEBSITE_ADDON_PRESERVED_AS_LEGACY_ITEM");
  if (activeStaff > professionalTotal) warnings.push("ACTIVE_STAFF_ABOVE_LEGACY_CAPACITY");
  if (subscription.customMonthlyPriceClp !== null) warnings.push("MANUAL_PRICE_PRESERVED");
  if (subscription.lastPaymentStatus && !["approved", "completed", "paid"].includes(subscription.lastPaymentStatus)) warnings.push("LEGACY_PAYMENT_REQUIRES_RECONCILIATION");
  if (historicalStaff > activeStaff) differences.push("INACTIVE_STAFF_HISTORY_PRESENT");

  const commercialStatus = statusFromLegacy(subscription.status, subscription.isTrial, subscription.trialEndsAt, subscription.gracePeriodEndsAt, now);
  const legacyAccess = getSubscriptionAccessState(subscription, now) === "ACTIVE" ||
    getSubscriptionAccessState(subscription, now) === "TRIAL_ACTIVE" ||
    getSubscriptionAccessState(subscription, now) === "PAST_DUE_GRACE";
  const evaluation = evaluateCommercialEntitlements({
    plan,
    status: commercialStatus,
    professionalTotal,
    trialEnd: subscription.trialEndsAt,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt,
    periodEnd: subscription.currentPeriodEnd,
    legacyWebsiteActive: activeWebsiteAddon(websiteAddon, now),
    legacyWebsiteUntil: websiteAddon?.validUntil,
  }, now);
  if (legacyAccess !== evaluation.commercialAccess) differences.push("ACCESS_STATE_DIFFERS");
  if (subscription.customMonthlyPriceClp !== null) differences.push("CUSTOM_PRICE_REQUIRES_EXPLICIT_TERMS_REVIEW");

  const websiteActive = activeWebsiteAddon(websiteAddon, now);
  const termsSnapshot = stableTerms(subscription, websiteAddon ? {
    active: websiteActive,
    provider: websiteAddon.provider,
    validUntil: websiteAddon.validUntil,
  } : null, warnings);
  const tariff = quoteLegacyPlan({ plan, billingCycle: subscription.billingCycle, extraStaffCount });
  const hasBenefits = subscription.freeMonthsRemaining > 0 || subscription.promoFreeMonthsRemaining > 0 ||
    subscription.pendingDiscountPercentage !== null || subscription.promoDiscountMonthsRemaining > 0 ||
    subscription.nextBillingOverrideAmount !== null || Boolean(subscription.activePrizeId);
  if (hasBenefits) warnings.push("BENEFIT_AMOUNT_REQUIRES_RECONCILIATION");
  if (subscription.paddleSubscriptionId && subscription.mpSubscriptionId) warnings.push("MULTIPLE_PROVIDER_REFERENCES");
  if (websiteActive) warnings.push("WEBSITE_AMOUNT_UNKNOWN_NOT_ZERO");
  // A catalogue tariff is reference data, not evidence of the agreed charge.
  // Incomplete/ambiguous economic conditions stay explicitly unknown.
  const manualPrice = subscription.paymentMethod === "BANK_TRANSFER" ? subscription.customMonthlyPriceClp : null;
  const snapshotInput: CommercialSnapshotInput = {
    businessId,
    plan,
    catalogVersion: "legacy-current",
    billingCycle: subscription.billingCycle,
    status: commercialStatus,
    provider: subscription.paddleSubscriptionId && subscription.mpSubscriptionId ? "NONE" : subscription.paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : subscription.paddleSubscriptionId ? "PADDLE" : subscription.mpSubscriptionId ? "MERCADO_PAGO" : "NONE",
    currencyCode: business.currencyCode,
    professionalTotal,
    legacySubscriptionId: subscription.id,
    legacyExtraStaffCount: extraStaffCount,
    basePriceClp: business.currencyCode === "CLP" ? (manualPrice ?? tariff.total) : null,
    totalPriceClp: business.currencyCode === "CLP" && !hasBenefits ? (manualPrice ?? tariff.total) : null,
    termsSnapshot: { ...termsSnapshot, sourceUpdatedAt: subscription.updatedAt?.toISOString() ?? null,
      sourceWebsiteUpdatedAt: websiteAddon?.updatedAt?.toISOString() ?? null,
      websiteOffer: business.websiteOfferEligibility ? JSON.parse(JSON.stringify(business.websiteOfferEligibility)) : null,
      // Provider references stay private and retain conflicts for manual review.
      providerReferences: { mp: subscription.mpSubscriptionId, paddle: subscription.paddleSubscriptionId },
      legacyPaymentEvidence: { verifiedForV2: false, lastPaymentId: subscription.lastPaymentId ?? null,
        lastPaymentStatus: subscription.lastPaymentStatus ?? null, lastInvoiceId: subscription.lastInvoiceId ?? null,
        lastInvoiceStatus: subscription.lastInvoiceStatus ?? null, lastPaymentAttemptAt: subscription.lastPaymentAttemptAt?.toISOString() ?? null,
        lastProviderEventAt: subscription.paddleLastEventAt?.toISOString() ?? null, lastProviderEventId: subscription.paddleLastEventId ?? null },
    },
    externalCustomerId: subscription.paddleCustomerId ?? subscription.mpCustomerId,
    externalSubscriptionId: subscription.paddleSubscriptionId && subscription.mpSubscriptionId ? null : subscription.paddleSubscriptionId ?? subscription.mpSubscriptionId,
    periodEnd: subscription.currentPeriodEnd,
    renewalAt: subscription.currentPeriodEnd,
    trialEnd: subscription.trialEndsAt,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt,
    legacyAddon: websiteActive ? {
      code: "legacy.website_addon",
      description: "Complemento Website legacy; importe pendiente de inventario",
      amountClp: null,
      pricingSnapshot: {
        amountKnown: false,
        provider: websiteAddon?.provider ?? null,
        validUntil: websiteAddon?.validUntil?.toISOString() ?? null,
      },
    } : undefined,
  };
  const existing = await db.commercialSubscription.findUnique({ where: { businessId }, select: { id: true, legacySubscriptionId: true } });
  return {
    businessId,
    legacySubscriptionId: subscription.id,
    snapshotInput,
    warnings,
    differences,
    legacyAccess,
    commercialAccess: evaluation.commercialAccess,
    legacyCapabilities: legacyAccess ? [...metadata.capabilities, ...(websiteActive ? ["website.editor", "website.hosting"] : [])] : [],
    commercialCapabilities: evaluation.capabilities,
    alreadyBackfilled: Boolean(existing),
    snapshotId: existing?.id ?? null,
  };
}

/**
 * Produces an anonymizable legacy report by default. `apply=true` writes only
 * the additive snapshot and ledger rows, never mutating Subscription, Staff,
 * WebsiteAddon or any provider record.
 */
export async function backfillLegacySubscription(
  businessId: string,
  apply = false,
  now = new Date(),
) {
  if (!businessId) throw new Error("Falta businessId");
  assertCommercialSandbox();
  if (!apply) return readLegacyReport(prisma, businessId, now);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
    const report = await readLegacyReport(tx, businessId, now);
    const existing = await tx.commercialSubscription.findUnique({ where: { businessId } });
    if (existing) {
      const sourceHash = commercialHash(report.snapshotInput);
      const previous = await tx.commercialEvent.findFirst({ where: { businessId, source: "legacy_backfill", eventId: sourceHash } });
      if (!previous) return { ...report, alreadyBackfilled: true, warnings: [...report.warnings, "LEGACY_SOURCE_DRIFT_REQUIRES_REVIEW"], result: null };
      return { ...report, alreadyBackfilled: true, result: null };
    }
    const result = await createCommercialSnapshotInTransaction(tx, report.snapshotInput);
    await tx.commercialEvent.create({ data: { businessId, subscriptionId: result.snapshotId, source: "legacy_backfill",
      eventId: commercialHash(report.snapshotInput), operation: "LEGACY_BACKFILLED", occurredAt: now, outcome: "APPLIED",
      details: { warnings: [...report.warnings], differences: [...report.differences] } } });
    return { ...report, snapshotId: result.snapshotId, alreadyBackfilled: result.alreadyExists, result };
  });
}

export { readLegacyReport };

/** Bounded, resumable local-only backfill. Cursor advances even after a failed
 * row; failures remain in the ledger and may be retried individually. */
export async function backfillLegacyBatch(input: { afterBusinessId?: string; limit?: number; apply?: boolean }) {
  assertCommercialSandbox();
  const limit = input.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("INVALID_BATCH_LIMIT");
  const rows = await prisma.business.findMany({ where: { subscription: { isNot: null },
    ...(input.afterBusinessId ? { id: { gt: input.afterBusinessId } } : {}) }, orderBy: { id: "asc" }, take: limit, select: { id: true } });
  const reports = [];
  for (const row of rows) {
    try {
      const report = await backfillLegacySubscription(row.id, input.apply ?? false);
      reports.push({ businessId: row.id, outcome: "REPORTED", warnings: report.warnings, differences: report.differences });
    } catch {
      if (input.apply) await prisma.commercialEvent.upsert({
        where: { source_eventId: { source: "legacy_backfill_error", eventId: row.id } },
        create: { businessId: row.id, source: "legacy_backfill_error", eventId: row.id, operation: "BACKFILL_REVIEW_REQUIRED", occurredAt: new Date(), outcome: "UNKNOWN" },
        update: { outcome: "UNKNOWN" },
      });
      reports.push({ businessId: row.id, outcome: "MANUAL_REVIEW_REQUIRED", warnings: ["BACKFILL_FAILED"], differences: [] });
    }
  }
  return { reports, nextCursor: rows.at(-1)?.id ?? input.afterBusinessId ?? null, hasMore: rows.length === limit };
}
