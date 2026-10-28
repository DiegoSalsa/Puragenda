import { randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { assertContactLab, contactLabEnabled } from "@/server/contact-flow/policy";
import { runContactWorker, expireContactJobs } from "@/server/contact-flow/worker";
import { reconcileResendDeliveries } from "@/server/contact-flow/events";
import { recoverAbandonedGrowthUsage } from "@/server/puri/growth/budgets";
import { runGrowthScheduler } from "@/server/puri/growth/proactive";
import { reconcileReadyMercadoPagoPeriods } from "@/server/commercial-billing/operations";

const key = "PURAGENDA_NEXT";
export function commercialWorkerEnabled() {
  return process.env.COMMERCIAL_WORKER_ENABLED === "1" && contactLabEnabled();
}
export function authorizeCommercialWorker(request: Request) {
  if (!commercialWorkerEnabled()) return new Response(null, { status: 404 });
  const secret = process.env.COMMERCIAL_WORKER_SECRET ?? "";
  if (secret.length < 32) return Response.json({ code: "WORKER_NOT_CONFIGURED" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return new Response(null, { status: 401 });
  return null;
}
export async function claimCommercialTick(now = new Date()) {
  assertContactLab();
  if (!commercialWorkerEnabled()) throw new Error("WORKER_DISABLED");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(726841911)::text`;
    const state = await tx.commercialWorkerState.upsert({ where: { key }, create: { key }, update: {} });
    if (state.leaseUntil && state.leaseUntil > now) return null;
    return tx.commercialWorkerState.update({ where: { key }, data: {
      leaseOwner: randomUUID(), leaseUntil: new Date(+now + 120000), fence: { increment: 1 }, lastStartedAt: now,
    } });
  });
}

// Each awaited stage is bounded. No background work survives the HTTP response.
// Crash recovery uses leases; a stale runner cannot advance a newer cursor.
export async function runCommercialTick() {
  const claim = await claimCommercialTick();
  if (!claim) return { busy: true };
  try {
    if (process.env.COMMERCIAL_WORKER_KILLED === "1") return { killed: true };
    const usage = await recoverAbandonedGrowthUsage(10);
    const expired = await expireContactJobs(10);
    const billing = await reconcileReadyMercadoPagoPeriods({ limit: 2 });
    const contacts = await runContactWorker({ limit: 3, maxDurationMs: 15000 });
    const reconciled = process.env.CONTACT_FLOW_RESEND_TEST_ENABLED === "1" ? await reconcileResendDeliveries(2) : null;
    const growth = process.env.PURI_PLUS_PROACTIVE_ENABLED === "1"
      ? await runGrowthScheduler({ after: claim.cursor, limit: 2, maxDurationMs: 8000 }) : null;
    const summary = { processed: contacts.processed, recoveredUsage: usage.recovered, expiredJobs: expired.expired, reconciled: reconciled?.reconciled ?? 0,
      proactiveProcessed: growth?.processed ?? 0, proactiveFailed: growth?.failed ?? 0, billingApplied: billing.applied, billingFailed: billing.failed };
    await prisma.commercialWorkerState.updateMany({ where: { key, leaseOwner: claim.leaseOwner, fence: claim.fence }, data: {
      cursor: growth ? growth.more ? growth.nextCursor : "" : claim.cursor,
      lastSuccessAt: new Date(), lastError: billing.failed ? "BILLING_RECONCILIATION_REQUIRED" : growth?.failed ? "PROACTIVE_PARTIAL_FAILURE" : null, summary,
    } });
    return { ...summary, simulated: contacts.simulated, externalBlocked: contacts.externalBlocked };
  } catch {
    await prisma.commercialWorkerState.updateMany({ where: { key, leaseOwner: claim.leaseOwner, fence: claim.fence }, data: { lastError: "WORKER_TICK_FAILED" } });
    throw new Error("WORKER_TICK_FAILED");
  } finally {
    await prisma.commercialWorkerState.updateMany({ where: { key, leaseOwner: claim.leaseOwner, fence: claim.fence }, data: { leaseOwner: null, leaseUntil: null } });
  }
}
