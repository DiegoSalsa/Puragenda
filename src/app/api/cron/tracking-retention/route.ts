import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/server/auth/cron";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_RETENTION_DAYS = 395;
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

  try {
    const result = await prisma.trackingEvent.deleteMany({
      where: { occurredAt: { lt: cutoff } },
    });

    return NextResponse.json({
      ok: true,
      retentionDays,
      deletedEvents: result.count,
    });
  } catch (error) {
    console.error("[cron/tracking-retention] Failed:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo aplicar la retención de analítica" },
      { status: 500 }
    );
  }
}
