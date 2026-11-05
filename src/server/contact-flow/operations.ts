import { prisma } from "@/server/db/prisma";
import { resendReleaseReadiness } from "./resend-release";
import { ensureFirstPaidPlusAlert } from "./first-paid-plus";
import { RESEND_CAPACITY_STATE } from "./resend-capacity";
export async function contactOperationalStatus(actorId: string, now = new Date()) {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { isSuperAdmin: true, deletedAt: true } });
  if (!actor?.isSuperAdmin || actor.deletedAt) throw new Error("SUPERADMIN_REQUIRED");
  const [worker, pending, unknown, states, bounces, complaints, capacity, proReview] = await Promise.all([
    prisma.commercialWorkerState.findUnique({ where: { key: "PURAGENDA_NEXT" }, select: { lastStartedAt: true, lastSuccessAt: true, lastError: true, leaseUntil: true } }),
    prisma.cfOutbox.findFirst({ where: { state: "PENDING", nextAttemptAt: { lte: now } }, orderBy: { nextAttemptAt: "asc" }, select: { nextAttemptAt: true } }),
    prisma.cfOutbox.count({ where: { state: "UNKNOWN" } }),
    prisma.cfOutbox.groupBy({ by: ["state"], _count: true }),
    prisma.cfMessage.count({ where: { state: "BOUNCED", createdAt: { gte: new Date(+now - 30 * 86400_000) } } }),
    prisma.cfMessage.count({ where: { state: "COMPLAINED", createdAt: { gte: new Date(+now - 30 * 86400_000) } } }),
    prisma.commercialWorkerState.findUnique({ where: { key: RESEND_CAPACITY_STATE }, select: { lastSuccessAt: true, lastError: true, summary: true } }),
    ensureFirstPaidPlusAlert(now),
  ]);
  return { release: resendReleaseReadiness(), worker, capacity, proReview: proReview ? { id: proReview.id, businessId: proReview.businessId, occurredAt: proReview.occurredAt, code: "FIRST_PAID_PLUS_REVIEW_RESEND_PRO" } : null, states: Object.fromEntries(states.map(row => [row.state, row._count])), oldestDueAt: pending?.nextAttemptAt ?? null, unknown, bounces, complaints,
    needsAttention: unknown > 0 || !!worker?.lastError || !!capacity?.lastError || !!pending && (!worker?.lastSuccessAt || +now - +worker.lastSuccessAt > 10 * 60_000) };
}
