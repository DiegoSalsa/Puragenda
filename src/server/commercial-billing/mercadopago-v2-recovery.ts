import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { CommercialBillingOperation, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { assertCommercialSandbox, commercialHash } from "@/server/services/commercial-internal";
import { createMpV2Provider, MpV2Provider, mpV2InvoiceSchema, type MpV2Port } from "./mercadopago-v2-provider";
import { reconcileMpV2Invoice, reconcileMpV2Operation, reconcileMpV2SubscriptionStatus } from "./mercadopago-v2";
import { refreshMpV2Dunning } from "./mercadopago-v2-dunning";

export type MpV2RecoveryOptions = { limit?: number; maxRequests?: number; maxDurationMs?: number; minimumIntervalMs?: number; businessId?: string };
const openStatuses = ["UNKNOWN", "AWAITING_PAYMENT", "SCHEDULED", "PAID"];
const pageSchema = z.object({ results: z.array(mpV2InvoiceSchema).max(100), paging: z.object({ total: z.number().int().nonnegative() }).optional() });
const progressSchema = z.object({ failures: z.number().int().nonnegative().default(0), lastError: z.string().nullable().default(null) });
const bounded = (value: number | undefined, fallback: number, maximum: number) => Number.isFinite(value) ? Math.max(1, Math.min(maximum, Math.floor(value!))) : fallback;
const budgetError = (error: unknown) => error instanceof Error && ["V2_RECOVERY_BUDGET", "V2_RECOVERY_FENCED"].includes(error.message);
function failureCode(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.some(issue => issue.path.includes("currency_id")) ? "V2_PAYMENT_CURRENCY_MISMATCH" : "V2_PROVIDER_PAYLOAD_INVALID";
  const message = error instanceof Error ? error.message : "";
  return /^V2_[A-Z0-9_]+$/.test(message) ? message : "V2_PROVIDER_COMMUNICATION_FAILED";
}
export function mpV2RecoveryKey(provider: MpV2Provider) { return `MP_V2_RECOVERY:${provider.config.accountId}:${provider.config.applicationId}`; }
function assertRecoveryEnvironment(provider?: MpV2Provider) {
  const production = process.env.VERCEL_ENV === "production" || process.env.PURAGENDA_MP_V2_ENVIRONMENT === "production" || provider?.config.environment === "V2_PRODUCTION";
  if (production) {
    if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV !== "production" || process.env.PURAGENDA_NEXT_ENABLED !== "1" || process.env.PURAGENDA_MP_V2_ENABLED !== "1" || process.env.PURAGENDA_MP_V2_ENVIRONMENT !== "production" || process.env.PURAGENDA_MP_V2_PRODUCTION_WRITES !== "1" || process.env.PURAGENDA_MP_V2_PRODUCTION_RECOVERY_ENABLED !== "1" || provider && provider.config.environment !== "V2_PRODUCTION") throw new Error("V2_RECOVERY_SANDBOX_REQUIRED");
    return;
  }
  assertCommercialSandbox();
}

export async function claimMpV2Recovery(provider: MpV2Provider, now = new Date()) {
  assertRecoveryEnvironment(provider);
  const key = mpV2RecoveryKey(provider);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('lock_timeout', '1000ms', true)`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(726841912)::text`;
    const state = await tx.commercialWorkerState.upsert({ where: { key }, create: { key }, update: {} });
    if (state.leaseUntil && state.leaseUntil > now) return null;
    return tx.commercialWorkerState.update({ where: { key }, data: { leaseOwner: randomUUID(), leaseUntil: new Date(+now + 60_000), fence: { increment: 1 }, lastStartedAt: now } });
  }, { maxWait: 2000, timeout: 3000 });
}

/** Only registration_v2 contracts in the explicitly enabled environment. No new provider POST. */
export async function runMpV2Recovery(supplied?: MpV2Provider, options: MpV2RecoveryOptions = {}) {
  const metrics = { completed: 0, failed: 0, requests: 0, invoicePages: 0, invoices: 0, confirmed: 0, pending: 0, rejected: 0, stale: 0, monetaryMismatches: 0, alerts: 0, exhausted: false };
  if (process.env.PURAGENDA_MP_V2_RECOVERY_ENABLED !== "1") return { ...metrics, disabled: true };
  assertRecoveryEnvironment(supplied);
  const provider = supplied ?? createMpV2Provider({ timeoutMs: 1500 });
  assertRecoveryEnvironment(provider);
  const claim = await claimMpV2Recovery(provider);
  if (!claim) return { ...metrics, busy: true };
  const deadline = Date.now() + bounded(options.maxDurationMs, 18_000, 18_000), maxRequests = bounded(options.maxRequests, 32, 64);
  const guard = () => { if (metrics.requests >= maxRequests || Date.now() + 1500 >= deadline) throw new Error("V2_RECOVERY_BUDGET"); };
  const port = Object.fromEntries(Object.entries(provider.port).map(([name, method]) => [name, async (...args: unknown[]) => {
    guard(); metrics.requests++;
    // Refuse new subscriptions during recovery; UNKNOWN is resolved by search.
    if (name === "create" || name === "preference") throw new Error("V2_RECOVERY_CREATION_FORBIDDEN");
    return (method as (...input: unknown[]) => Promise<unknown>).apply(provider.port, args);
  }])) as MpV2Port;
  const limited = new MpV2Provider(provider.config, port);
  const progressKey = (id: string) => `MP_V2_RECOVERY_OPERATION:${id}`;
  const leaseWhere = () => ({ key: claim.key, leaseOwner: claim.leaseOwner, fence: claim.fence, leaseUntil: { gt: new Date() } });
  async function persist(op: CommercialBillingOperation, offset: number, failures: number, code: string | null, alert: string | null, resolveAlerts = false) {
    await prisma.$transaction(async tx => {
      const active = await tx.commercialWorkerState.updateMany({ where: leaseWhere(), data: { lastError: code } });
      if (!active.count) throw new Error("V2_RECOVERY_FENCED");
      await tx.commercialWorkerState.upsert({ where: { key: progressKey(op.id) }, create: { key: progressKey(op.id), cursor: String(offset), summary: { failures, lastError: code } },
        update: { cursor: String(offset), summary: { failures, lastError: code }, lastError: code, lastStartedAt: new Date(), ...(code ? {} : { lastSuccessAt: new Date() }) } });
      await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { updatedAt: new Date() } });
      if (alert) {
        const eventId = `${op.id}:${alert}:${new Date().toISOString().slice(0, 10)}`;
        await tx.commercialEvent.upsert({ where: { source_eventId: { source: "mp_v2_recovery_alert", eventId } }, update: { outcome: "UNKNOWN", receivedAt: new Date(), details: { code: alert, failures, environment: "V2_SANDBOX" } },
          create: { businessId: op.businessId, subscriptionId: op.subscriptionId, source: "mp_v2_recovery_alert", eventId, providerReference: op.id, operation: alert, outcome: "UNKNOWN", occurredAt: new Date(), payloadHash: commercialHash({ op: op.id, alert }), details: { code: alert, failures, environment: "V2_SANDBOX" } } });
      } else if (!code && resolveAlerts) {
        await tx.commercialEvent.updateMany({ where: { source: "mp_v2_recovery_alert", providerReference: op.id, outcome: "UNKNOWN" }, data: { outcome: "APPLIED" } });
      }
    }, { maxWait: 2000, timeout: 3000 });
  }
  try {
    const now = new Date(), recent = new Date(+now - 90 * 86400_000);
    const eligible: Prisma.CommercialBillingOperationWhereInput = {
      provider: "MERCADO_PAGO", environment: provider.config.environment, ...(options.businessId ? { businessId: options.businessId } : {}),
      updatedAt: { lte: new Date(+now - Math.max(0, options.minimumIntervalMs ?? 60_000)) },
      subscription: { legacySubscriptionId: null, planCode: { in: ["PURAGENDA", "PURAGENDA_PLUS"] }, termsSnapshot: { path: ["origin"], equals: "registration_v2" },
        business: { deletedAt: null, countryCode: "CL", currencyCode: "CLP", owner: { deletedAt: null }, subscription: { plan: { in: ["PURAGENDA", "PURAGENDA_PLUS"] }, mpSubscriptionId: null, paddleSubscriptionId: null, paymentMethod: { not: "BANK_TRANSFER" } } } },
      OR: [
        { status: { in: openStatuses } },
        { status: "EXECUTING", executionStartedAt: { lt: new Date(+now - 120_000) } },
        { kind: "NEW_SUBSCRIPTION", status: { in: ["APPLIED", "CANCELLED"] }, providerSubscriptionId: { not: null }, OR: [{ subscription: { periodEnd: { gte: recent } } }, { subscription: { trialEnd: { gte: recent } } }, { createdAt: { gte: recent } }] },
      ],
    };
    const operations = await prisma.commercialBillingOperation.findMany({ where: eligible, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: bounded(options.limit, 5, 10) });
    for (const op of operations) {
      const prior = await prisma.commercialWorkerState.findUnique({ where: { key: progressKey(op.id) } });
      let offset = /^\d+$/.test(prior?.cursor ?? "") ? Number(prior!.cursor) : 0;
      if (!Number.isSafeInteger(offset)) offset = 0;
      const failures = progressSchema.safeParse(prior?.summary).data?.failures ?? 0;
      try {
        guard();
        await limited.checkAccount();
        if (op.kind === "NEW_SUBSCRIPTION" && op.providerSubscriptionId) {
          const { root } = await reconcileMpV2SubscriptionStatus(op.providerSubscriptionId, limited);
          if (root.id !== op.id || root.businessId !== op.businessId) throw new Error("V2_CONTRACT_BINDING_MISMATCH");
          const page = pageSchema.parse(await limited.port.invoices(op.providerSubscriptionId, offset));
          metrics.invoicePages++;
          if (!page.results.length && page.paging && offset < page.paging.total) throw new Error("V2_INVOICE_PAGINATION_INCOMPLETE");
          for (const invoice of page.results) {
            if (invoice.preapproval_id !== op.providerSubscriptionId) throw new Error("V2_CONTRACT_BINDING_MISMATCH");
            const result = await reconcileMpV2Invoice(invoice, limited);
            if (result?.status === "CONFIRMED") metrics.confirmed++;
            else if (result?.status === "REJECTED") metrics.rejected++;
            else if (result?.status === "PENDING") metrics.pending++;
            metrics.invoices++; offset++;
            await persist(op, offset, 0, null, null);
          }
          if (!page.results.length || (page.paging && offset >= page.paging.total)) offset = 0;
        } else {
          // Canonical search recovers a lost POST result without issuing another POST.
          await reconcileMpV2Operation(op.businessId, op.id, limited);
        }
        const latest = await prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id: op.id } });
        const due = ["UNKNOWN", "EXECUTING"].includes(latest.status) ? +latest.createdAt : Math.max(+latest.createdAt, +latest.effectiveAt);
        const stale = [...openStatuses, "EXECUTING"].includes(latest.status) && Date.now() - due >= 24 * 3600_000;
        const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: op.subscriptionId }, select: { renewalAt: true, renewalCancellationStatus: true } });
        const overdue = !sub.renewalCancellationStatus && !!sub.renewalAt && Date.now() - +sub.renewalAt >= 6 * 3600_000;
        const alert = stale ? "V2_RECOVERY_STALE_OPERATION" : overdue ? "V2_RECOVERY_RENEWAL_OVERDUE" : null;
        if (alert) { metrics.stale++; metrics.alerts++; }
        await persist(op, offset, 0, null, alert, true);
        metrics.completed++;
      } catch (error) {
        if (budgetError(error)) {
          metrics.exhausted = true;
          if ((error as Error).message === "V2_RECOVERY_FENCED") break;
          await persist(op, offset, failures, progressSchema.safeParse(prior?.summary).data?.lastError ?? null, null);
          break;
        }
        const code = failureCode(error), money = /AMOUNT|CURRENCY|QUOTE/.test(code);
        metrics.failed++; if (money) metrics.monetaryMismatches++;
        const alert = money ? "V2_RECOVERY_MONETARY_MISMATCH" : /MISMATCH|BINDING/.test(code) ? "V2_RECOVERY_IDENTITY_MISMATCH" : failures + 1 >= 3 ? "V2_RECOVERY_REPEATED_FAILURE" : null;
        if (alert) metrics.alerts++;
        await persist(op, offset, failures + 1, code, alert);
      } finally {
        // Local, paid-boundary policy also runs on timeout, delayed webhook or
        // an empty provider page. A retry never starts a fresh grace window.
        await refreshMpV2Dunning(op.businessId);
      }
    }
    await prisma.commercialWorkerState.updateMany({ where: leaseWhere(), data: { summary: metrics, lastSuccessAt: metrics.failed ? undefined : new Date(), lastError: metrics.failed ? "V2_RECOVERY_PARTIAL_FAILURE" : null } });
    return metrics;
  } finally {
    await prisma.commercialWorkerState.updateMany({ where: { key: claim.key, leaseOwner: claim.leaseOwner, fence: claim.fence }, data: { leaseOwner: null, leaseUntil: null } });
  }
}
