import { randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { assertContactLab, contactLabEnabled } from "@/server/contact-flow/policy";
import { runContactWorker, expireContactJobs } from "@/server/contact-flow/worker";
import { reconcileResendDeliveries } from "@/server/contact-flow/events";
import { recoverAbandonedGrowthUsage } from "@/server/puri/growth/budgets";
import { runGrowthScheduler } from "@/server/puri/growth/proactive";
import { reconcileReadyMercadoPagoPeriods } from "@/server/commercial-billing/operations";
import { runMpV2Reconciliation } from "@/server/commercial-billing/mercadopago-v2";
import { ensureFirstPaidPlusAlert } from "@/server/contact-flow/first-paid-plus";
import { isProductionContactRuntime } from "@/server/contact-flow/resend-test";
import { resendReleaseReadiness } from "@/server/contact-flow/resend-release";

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
  const budgetMs = Number(process.env.COMMERCIAL_WORKER_BUDGET_MS ?? 20000);
  if (!Number.isInteger(budgetMs) || budgetMs < 5000 || budgetMs > 20000) throw new Error("WORKER_BUDGET_INVALID");
  const startedAt = Date.now(), deadline = startedAt + budgetMs;
  const remaining = () => deadline - Date.now();
  const claim = await claimCommercialTick();
  if (!claim) return { busy: true };
  try {
    if (process.env.COMMERCIAL_WORKER_KILLED === "1") return { killed: true };
    const usage = await recoverAbandonedGrowthUsage(10);
    const expired = await expireContactJobs(10);
    // The older commercial laboratory reconciler refuses production. Native
    // V2 recovery owns production contracts; legacy cron jobs keep their work.
    const billing = isProductionContactRuntime() ? { applied: 0, failed: 0 } : await reconcileReadyMercadoPagoPeriods({ limit: 2 });
    const skippedStages: string[] = [], stageErrors: string[] = [];
    let v2: Awaited<ReturnType<typeof runMpV2Reconciliation>> | null = null;
    if (process.env.PURAGENDA_MP_V2_RECOVERY_ENABLED === "1") {
      if (remaining() >= 6000) {
        try { v2 = await runMpV2Reconciliation(undefined, { maxDurationMs: Math.min(8000, remaining() - 3000), limit: 2, maxRequests: 12 }); }
        catch { stageErrors.push("V2_BILLING_RECOVERY_FAILED"); }
      } else skippedStages.push("V2_BILLING");
    }
    const firstPaidPlus = await ensureFirstPaidPlusAlert();
    const contacts = remaining() >= 6000 ? await runContactWorker({ limit: 3, maxDurationMs: Math.min(6000, remaining() - 3000) }) : (skippedStages.push("CONTACT_DELIVERY"), { processed: 0, simulated: true, externalBlocked: !resendReleaseReadiness().deliveryEnabled });
    let receiptReconciliationFailed = false;
    let reconciled: Awaited<ReturnType<typeof reconcileResendDeliveries>> | null = null;
    if (process.env.CONTACT_FLOW_RESEND_TEST_ENABLED === "1" || process.env.CONTACT_FLOW_DELIVERY_MODE === "production") {
      if (remaining() >= 4000) reconciled = await reconcileResendDeliveries(1).catch(() => { receiptReconciliationFailed = true; return null; });
      else skippedStages.push("CONTACT_RECEIPTS");
    }
    const growth = process.env.PURI_PLUS_PROACTIVE_ENABLED === "1" && remaining() >= 3000
      ? await runGrowthScheduler({ after: claim.cursor, limit: 1, maxDurationMs: Math.min(3000, remaining() - 500) }) : null;
    if (process.env.PURI_PLUS_PROACTIVE_ENABLED === "1" && !growth) skippedStages.push("PROACTIVE");
    const summary = { processed: contacts.processed, recoveredUsage: usage.recovered, expiredJobs: expired.expired, reconciled: reconciled?.reconciled ?? 0,
      proactiveProcessed: growth?.processed ?? 0, proactiveFailed: growth?.failed ?? 0, billingApplied: billing.applied, billingFailed: billing.failed,
      v2Billing: v2, resendProReviewRequired: !!firstPaidPlus, receiptReconciliationFailed, stageErrors, skippedStages, durationMs: Date.now() - startedAt, budgetMs };
    const lastError = stageErrors[0] ?? (v2?.failed ? "V2_BILLING_RECONCILIATION_REQUIRED" : billing.failed ? "BILLING_RECONCILIATION_REQUIRED" : growth?.failed ? "PROACTIVE_PARTIAL_FAILURE" : receiptReconciliationFailed ? "CONTACT_RECEIPT_RECONCILIATION_REQUIRED" : skippedStages.length ? "WORKER_BUDGET_DEFERRED" : null);
    await prisma.commercialWorkerState.updateMany({ where: { key, leaseOwner: claim.leaseOwner, fence: claim.fence }, data: {
      cursor: growth ? growth.more ? growth.nextCursor : "" : claim.cursor,
      lastSuccessAt: lastError && lastError !== "WORKER_BUDGET_DEFERRED" ? claim.lastSuccessAt : new Date(), lastError, summary,
    } });
    return { ...summary, simulated: contacts.simulated, externalBlocked: contacts.externalBlocked };
  } catch {
    await prisma.commercialWorkerState.updateMany({ where: { key, leaseOwner: claim.leaseOwner, fence: claim.fence }, data: { lastError: "WORKER_TICK_FAILED" } });
    throw new Error("WORKER_TICK_FAILED");
  } finally {
    await prisma.commercialWorkerState.updateMany({ where: { key, leaseOwner: claim.leaseOwner, fence: claim.fence }, data: { leaseOwner: null, leaseUntil: null } });
  }
}
