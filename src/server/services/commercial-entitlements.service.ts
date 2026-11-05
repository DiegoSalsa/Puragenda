import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { effectiveSnapshotAccess, isRegistrationV2Contract } from "./commercial-plan-access";
import {
  evaluateCommercialEntitlements,
  type CommercialEntitlementEvaluation,
} from "@/core/commercial-entitlements";

type EntitlementDb = Pick<Prisma.TransactionClient, "commercialSubscription" | "commercialEntitlement">;

export type CommercialEntitlementShadow = CommercialEntitlementEvaluation & {
  businessId: string;
  subscriptionId: string | null;
  persistedEntitlements: readonly {
    capability: string;
    status: string;
    quantity: number | null;
    validFrom: Date;
    validTo: Date | null;
  }[];
  source: "COMMERCIAL_SNAPSHOT" | "NO_SNAPSHOT";
  shadow: true;
  error: string | null;
};

/**
 * Reads only the new commercial projection. It is deliberately a shadow API:
 * callers can compare it with legacy permissions without changing access for
 * reservations, dashboard routes or staff roles.
 */
export async function getCommercialEntitlementShadow(
  businessId: string,
  db: EntitlementDb = prisma,
  now = new Date(),
): Promise<CommercialEntitlementShadow> {
  try {
    const snapshot = await db.commercialSubscription.findUnique({
      where: { businessId },
      include: {
        legacySubscription: { select: { updatedAt: true } },
        business: { select: { websiteAddon: { select: { updatedAt: true } } } },
        entitlements: {
          orderBy: { capability: "asc" },
          select: { capability: true, status: true, quantity: true, validFrom: true, validTo: true },
        },
      },
    });
    if (!snapshot) {
      return {
        businessId,
        subscriptionId: null,
        plan: "TEST",
        status: "UNKNOWN",
        commercialAccess: false,
        professionalTotal: 0,
        capabilities: [],
        quantities: { "professional.seats": 0 },
        reason: "NO_SNAPSHOT",
        persistedEntitlements: [],
        source: "NO_SNAPSHOT",
        shadow: true,
        error: null,
      };
    }
    const sourceUpdatedAt = (snapshot.termsSnapshot as { sourceUpdatedAt?: string } | null)?.sourceUpdatedAt;
    const websiteUpdatedAt = (snapshot.termsSnapshot as { sourceWebsiteUpdatedAt?: string | null } | null)?.sourceWebsiteUpdatedAt;
    if (snapshot.legacySubscription && (sourceUpdatedAt !== snapshot.legacySubscription.updatedAt.toISOString() ||
        websiteUpdatedAt !== (snapshot.business.websiteAddon?.updatedAt.toISOString() ?? null))) {
      return { businessId, subscriptionId: snapshot.id, plan: snapshot.planCode as CommercialEntitlementEvaluation["plan"],
        status: "UNKNOWN", commercialAccess: false, professionalTotal: snapshot.professionalTotal, capabilities: [],
        quantities: { "professional.seats": 0 }, reason: "LEGACY_SOURCE_DRIFT_REQUIRES_REVIEW", persistedEntitlements: snapshot.entitlements,
        source: "COMMERCIAL_SNAPSHOT", shadow: true, error: null };
    }
    const evaluation = isRegistrationV2Contract(snapshot) ? effectiveSnapshotAccess(snapshot, now) : evaluateCommercialEntitlements(
      {
        ...snapshot,
        plan: snapshot.planCode,
        legacyWebsiteActive: (snapshot.termsSnapshot as { websiteAddon?: { active?: boolean } } | null)?.websiteAddon?.active,
        legacyWebsiteUntil: (() => { const date = (snapshot.termsSnapshot as { websiteAddon?: { validUntil?: string } } | null)?.websiteAddon?.validUntil; return date ? new Date(date) : null; })(),
        status: snapshot.status,
        professionalTotal: snapshot.professionalTotal,
        trialEnd: snapshot.trialEnd,
        gracePeriodEndsAt: snapshot.gracePeriodEndsAt,
        periodEnd: snapshot.periodEnd,
      },
      now,
    );
    return {
      ...evaluation,
      businessId,
      subscriptionId: snapshot.id,
      persistedEntitlements: snapshot.entitlements,
      source: "COMMERCIAL_SNAPSHOT",
      shadow: true,
      error: null,
    };
  } catch {
    return {
      businessId,
      subscriptionId: null,
      plan: "TEST",
      status: "UNKNOWN",
      commercialAccess: false,
      professionalTotal: 0,
      capabilities: [],
      quantities: { "professional.seats": 0 },
      reason: "SHADOW_EVALUATION_ERROR",
      persistedEntitlements: [],
      source: "NO_SNAPSHOT",
      shadow: true,
      error: "COMMERCIAL_SHADOW_UNAVAILABLE",
    };
  }
}

export async function hasCommercialEntitlementShadow(
  businessId: string,
  capability: string,
  db: EntitlementDb = prisma,
  now = new Date(),
) {
  const evaluation = await getCommercialEntitlementShadow(businessId, db, now);
  return evaluation.commercialAccess && evaluation.capabilities.includes(capability as never);
}

export type EffectiveCommercialCapability = {
  capability: string;
  quantity: number | null;
  status: string;
  validFrom: Date;
  validTo: Date | null;
};

/** Server-only read helper for future cutover; it does not grant role rights. */
export async function listPersistedCommercialEntitlements(
  businessId: string,
  db: EntitlementDb = prisma,
): Promise<EffectiveCommercialCapability[]> {
  const rows = await db.commercialEntitlement.findMany({
    where: { businessId },
    orderBy: { capability: "asc" },
    select: { capability: true, quantity: true, status: true, validFrom: true, validTo: true },
  });
  return rows;
}
