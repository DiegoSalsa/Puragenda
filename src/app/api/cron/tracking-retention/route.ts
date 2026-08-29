import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/server/auth/cron";
import { prisma } from "@/server/db/prisma";
import { ANALYTICS_RETENTION_DAYS, PRIVACY_REQUEST_RETENTION_DAYS } from "@/lib/analytics/policy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DELETE_BATCH_SIZE = 1_000;
const MAX_BATCHES_PER_RUN = 50;

async function deleteExpiredInBatches(table: "TrackingEvent" | "TrackingConsent", cutoff: Date) {
  let total = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const deleted = await prisma.$executeRawUnsafe(
      `WITH candidates AS (
         SELECT "id" FROM "${table}"
         WHERE "occurredAt" < $1
           AND ("retentionHoldUntil" IS NULL OR "retentionHoldUntil" < NOW())
         ORDER BY "occurredAt" ASC LIMIT $2
       ) DELETE FROM "${table}" WHERE "id" IN (SELECT "id" FROM candidates)`,
      cutoff,
      DELETE_BATCH_SIZE,
    );
    total += deleted;
    if (deleted < DELETE_BATCH_SIZE) break;
  }
  return total;
}

/**
 * Deletes only first-party pseudonymous product analytics events. It never
 * touches appointments, customers, payments, or other operational records.
 */
export async function GET(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const retentionDays = ANALYTICS_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const privacyRequestCutoff = new Date(Date.now() - PRIVACY_REQUEST_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const deletedEvents = await deleteExpiredInBatches("TrackingEvent", cutoff);
    const deletedConsents = await deleteExpiredInBatches("TrackingConsent", cutoff);
    const [privacyRequests, rateLimitBuckets, overduePrivacyRequests] = await prisma.$transaction([
      prisma.privacyRequest.deleteMany({ where: { resolvedAt: { not: null, lt: privacyRequestCutoff } } }),
      prisma.apiRateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.privacyRequest.count({ where: { status: { in: ["RECEIVED", "IN_REVIEW"] }, dueAt: { lt: new Date() } } }),
    ]);

    return NextResponse.json({
      ok: true,
      retentionDays,
      deletedEvents,
      deletedConsents,
      deletedPrivacyRequests: privacyRequests.count,
      deletedRateLimitBuckets: rateLimitBuckets.count,
      overduePrivacyRequests,
    });
  } catch (error) {
    console.error("[cron/tracking-retention] Failed:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo aplicar la retención de analítica" },
      { status: 500 }
    );
  }
}
