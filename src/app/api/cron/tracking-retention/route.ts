import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/server/auth/cron";
import { prisma } from "@/server/db/prisma";
import { ANALYTICS_RETENTION_DAYS, PRIVACY_REQUEST_RETENTION_DAYS } from "@/lib/analytics/policy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_RETENTION_DAYS = ANALYTICS_RETENTION_DAYS;
const MIN_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 730;

function analyticsRetentionDays() {
  const configured = Number.parseInt(process.env.ANALYTICS_RETENTION_DAYS ?? "", 10);
  if (!Number.isInteger(configured)) return DEFAULT_RETENTION_DAYS;

  return Math.min(Math.max(configured, MIN_RETENTION_DAYS), MAX_RETENTION_DAYS);
}

/**
 * Deletes only first-party pseudonymous product analytics events. It never
 * touches appointments, customers, payments, or other operational records.
 */
export async function GET(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const retentionDays = analyticsRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const privacyRequestCutoff = new Date(Date.now() - PRIVACY_REQUEST_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const [events, consents, privacyRequests] = await prisma.$transaction([
      prisma.trackingEvent.deleteMany({ where: { occurredAt: { lt: cutoff } } }),
      prisma.trackingConsent.deleteMany({ where: { occurredAt: { lt: cutoff } } }),
      prisma.privacyRequest.deleteMany({ where: { resolvedAt: { not: null, lt: privacyRequestCutoff } } }),
    ]);

    return NextResponse.json({
      ok: true,
      retentionDays,
      deletedEvents: events.count,
      deletedConsents: consents.count,
      deletedPrivacyRequests: privacyRequests.count,
    });
  } catch (error) {
    console.error("[cron/tracking-retention] Failed:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo aplicar la retención de analítica" },
      { status: 500 }
    );
  }
}
