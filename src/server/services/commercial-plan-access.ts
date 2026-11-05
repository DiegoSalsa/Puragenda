import type { CommercialSubscription, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { evaluateCommercialEntitlements, type CommercialEntitlementEvaluationInput } from "@/core/commercial-entitlements";
import { getStaffLimit } from "@/core/subscription-plan";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import type { CommercialCapability } from "@/core/commercial-catalog";
import { mpV2RenewalGraceDeadline, type RenewalGraceSnapshot } from "@/server/commercial-billing/mercadopago-v2-grace";

export const isV2Plan = (plan: string | null | undefined) => plan === "PURAGENDA" || plan === "PURAGENDA_PLUS";

/** Persisted registration provenance, independent of trial/payment/access status. */
export function isRegistrationV2Contract(contract: Pick<CommercialSubscription, "planCode" | "legacySubscriptionId" | "termsSnapshot"> | null | undefined) {
  return !!contract && isV2Plan(contract.planCode) && contract.legacySubscriptionId === null
    && (contract.termsSnapshot as { origin?: unknown } | null)?.origin === "registration_v2";
}
type AccessSnapshot = CommercialEntitlementEvaluationInput & RenewalGraceSnapshot & {
  trialStart?: Date | null; lastPaymentStatus?: string | null;
  lastPaymentAt?: Date | null; lastPaymentEventId?: string | null;
};
/** All effective V2 gates use this evaluation. A trial is a grant, not a payment. */
export function evaluateEffectiveCommercialAccess(sub: AccessSnapshot, now = new Date()) {
  const deadline = mpV2RenewalGraceDeadline(sub, now);
  const expired = !!sub.periodEnd && sub.periodEnd <= now;
  const effective = expired && deadline ? { ...sub, status: deadline > now ? "PAST_DUE_GRACE" as const : "PAST_DUE_BLOCKED" as const, gracePeriodEndsAt: deadline } : sub;
  const evaluation = evaluateCommercialEntitlements(effective, now);
  const trial = sub.status === "TRIALING" && !!sub.trialStart && sub.trialStart <= now && !!sub.trialEnd && sub.trialEnd > now;
  const paid = ["ACTIVE", "SCHEDULED_CHANGE", "PAST_DUE_GRACE"].includes(effective.status)
    && sub.lastPaymentStatus === "CONFIRMED" && !!sub.lastPaymentEventId
    && !!sub.lastPaymentAt && sub.lastPaymentAt <= now
    && !!sub.periodStart && sub.periodStart <= now && !!sub.periodEnd
    && (sub.periodEnd > now || (!!deadline && deadline > now));
  if (!isV2Plan(sub.plan) || !evaluation.commercialAccess || (!trial && !paid)) {
    return { ...evaluation, commercialAccess: false, capabilities: [], quantities: {}, reason: evaluation.reason ?? "VALID_TRIAL_OR_PAYMENT_REQUIRED" };
  }
  return evaluation;
}
export function effectiveSnapshotAccess(sub: Pick<CommercialSubscription, "planCode" | "status" | "professionalTotal" | "trialStart" | "trialEnd" | "periodStart" | "periodEnd" | "gracePeriodEndsAt" | "lastPaymentAt" | "lastPaymentStatus" | "lastPaymentEventId"> & RenewalGraceSnapshot, now = new Date()) {
  return evaluateEffectiveCommercialAccess({ ...sub, plan: sub.planCode }, now);
}
type AccessDb = Pick<Prisma.TransactionClient, "business">;
export async function getCommercialPlanAccess(businessId: string, now = new Date(), db: AccessDb = prisma) {
  const business = await db.business.findUnique({ where: { id: businessId }, select: { deletedAt: true, subscription: true, commercialSubscription: true } });
  const snapshot = business?.commercialSubscription;
  const v2 = isV2Plan(snapshot?.planCode) || isV2Plan(business?.subscription?.plan);
  const evaluation = snapshot && isV2Plan(snapshot.planCode) ? effectiveSnapshotAccess(snapshot, now) : null;
  const allowed = !!business && !business.deletedAt && (v2 ? !!evaluation?.commercialAccess : hasOperationalSubscriptionAccess(business.subscription, now));
  return {
    v2, allowed, snapshot: snapshot ?? null,
    professionalTotal: v2 ? (allowed ? evaluation?.professionalTotal ?? 0 : 0) : getStaffLimit(business?.subscription),
    has: (capability: CommercialCapability) => allowed && (v2 ? !!evaluation?.capabilities.includes(capability) : !["puri.plus", "contact_flow", "website.editor", "website.hosting", "analytics.commercial"].includes(capability)),
    reason: allowed ? null : evaluation?.reason ?? "SUBSCRIPTION_REQUIRED",
  };
}
