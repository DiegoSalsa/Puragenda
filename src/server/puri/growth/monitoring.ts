import { prisma } from "@/server/db/prisma";
import { assertGrowthSandbox } from "./access";
export async function growthPlatformMetrics(actorId: string, now = new Date()) {
  assertGrowthSandbox();
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { isSuperAdmin: true, deletedAt: true },
  });
  if (!user || user.deletedAt || !user.isSuperAdmin)
    throw new Error("SUPERADMIN_REQUIRED");
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [
    eligible,
    using,
    signals,
    recommendations,
    events,
    runs,
    usage,
    exhausted,
    runStatuses,
    requests,
  ] = await Promise.all([
    prisma.commercialSubscription.count({
      where: {
        planCode: "PURAGENDA_PLUS",
        business: { deletedAt: null },
        OR: [
          {
            status: { in: ["ACTIVE", "SCHEDULED_CHANGE"] },
            periodEnd: { gt: now },
          },
          {
            status: "PAST_DUE_GRACE",
            periodEnd: { not: null },
            gracePeriodEndsAt: { gt: now },
          },
        ],
        periodStart: { lte: now },
        lastPaymentStatus: "CONFIRMED",
        lastPaymentAt: { lte: now },
        lastPaymentEventId: { not: null },
      },
    }),
    prisma.puriGrowthRun.findMany({
      where: { createdAt: { gte: since } },
      distinct: ["businessId"],
      select: { businessId: true },
    }),
    prisma.puriGrowthSignal.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.puriGrowthRecommendation.groupBy({
      by: ["status", "generation"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.puriGrowthAudit.groupBy({
      by: ["event"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.puriGrowthRun.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { cacheHits: true, durationMs: true },
      _count: true,
      _avg: { durationMs: true },
    }),
    prisma.puriUsageReservation.groupBy({
      by: ["category", "state"],
      where: { createdAt: { gte: since } },
      _sum: {
        actualMicros: true,
        inputTokens: true,
        outputTokens: true,
        cachedTokens: true,
        reservedMicros: true,
      },
      _count: true,
    }),
    prisma.puriBudgetBucket.count({
      where: { periodStart: since, alertLevel: 100, businessId: { not: null } },
    }),
    prisma.puriGrowthRun.groupBy({
      by: ["kind", "status", "errorCode"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.puriRequest.groupBy({
      by: ["capabilityTier", "status", "errorCode"],
      where: {
        capabilityTier: { in: ["PURI_PLUS", "PURI_PLUS_PREPARE"] },
        createdAt: { gte: since },
      },
      _count: true,
      _avg: { totalDurationMs: true },
    }),
  ]);
  return {
    periodStart: since,
    eligiblePaidSubscriptions: eligible,
    businessesUsing: using.length,
    signals,
    recommendations,
    events,
    runs,
    runStatuses,
    requests,
    usage,
    exhaustedBuckets: exhausted,
    attribution: "NOT_IMPLEMENTED",
    cacheMetric: "HITS_AVOIDING_FULL_ANALYSIS_ONLY",
    unknownCost: "UNKNOWN_RESERVATIONS_RETAIN_MAXIMUM_COMMITMENT",
  };
}
