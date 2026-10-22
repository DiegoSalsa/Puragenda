import { prisma } from "@/server/db/prisma";
import { getCommercialEntitlementShadow } from "./commercial-entitlements.service";

/** Internal, bounded Superadmin projection; no public analytics or booking hook. */
export async function getCommercialDiagnostics(businessId: string, now = new Date()) {
  const [shadow, events, changes, backfill] = await Promise.all([
    getCommercialEntitlementShadow(businessId, prisma, now),
    prisma.commercialEvent.findMany({ where: { businessId, outcome: { in: ["RECEIVED", "UNKNOWN", "REJECTED"] } }, orderBy: { occurredAt: "desc" }, take: 50,
      select: { operation: true, outcome: true, occurredAt: true, correlationId: true } }),
    prisma.seatChangeRequest.findMany({ where: { businessId, status: { in: ["PENDING_PAYMENT", "SCHEDULED", "UNKNOWN"] } }, take: 50,
      orderBy: { effectiveAt: "asc" }, select: { id: true, status: true, effectiveAt: true, conflictReason: true } }),
    prisma.commercialEvent.findFirst({ where: { businessId, source: "legacy_backfill" }, orderBy: { occurredAt: "desc" }, select: { details: true } }),
  ]);
  const persisted = new Set(shadow.persistedEntitlements.filter(row => row.status === "ACTIVE" && row.validFrom <= now && (!row.validTo || row.validTo > now)).map(row => row.capability));
  const mismatches = shadow.capabilities.filter(cap => !persisted.has(cap));
  for (const cap of persisted) if (!shadow.capabilities.includes(cap as never)) mismatches.push(cap as never);
  const backfillWarnings = (backfill?.details as { warnings?: string[] } | null)?.warnings ?? [];
  return { shadow: true, backfillWarnings, error: shadow.error, mismatches, unresolvedEvents: events, pendingChanges: changes,
    overdueChanges: changes.filter(row => row.effectiveAt <= now).length, manualReviewRequired: Boolean(backfillWarnings.length || shadow.error || mismatches.length || events.some(row => row.outcome === "UNKNOWN" || row.outcome === "REJECTED") || changes.some(row => row.conflictReason)) };
}
