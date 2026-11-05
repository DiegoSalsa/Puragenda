import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { commercialHash } from "@/server/services/commercial-internal";
import { contactLock } from "./policy";
import { productionResendConfiguration, contactReleaseApprovalBindings } from "./resend-release";

export const RESEND_CAPACITY_STATE = "CONTACT_FLOW_RESEND_CAPACITY";
const counter = z.object({ used: z.number().int().nonnegative(), limit: z.number().int().positive().nullable(), resets_at: z.iso.datetime().nullable() });
const snapshotSchema = z.object({ binding: z.string(), fetchedAt: z.iso.datetime(), emails: z.object({ daily: counter, monthly: counter }) });
export type ResendCapacitySnapshot = z.infer<typeof snapshotSchema>;
export type CapacityReader = { usage(): Promise<unknown>; domain(): Promise<{ name: string; status: string }>; webhook(): Promise<{ endpoint: string; status: string; events: string[] }> };
const bindingOf = (config: ReturnType<typeof productionResendConfiguration>) => commercialHash(contactReleaseApprovalBindings(config));
async function bounded<T>(operation: () => Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([operation(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("RESEND_READ_TIMEOUT")), 3000); })]); }
  finally { clearTimeout(timer); }
}
/** A refresh lease uses the existing worker state. No network call holds a DB lock. */
export async function refreshResendCapacity(now = new Date(), reader?: CapacityReader) {
  const config = productionResendConfiguration(), binding = bindingOf(config), owner = randomUUID();
  const claim = await prisma.$transaction(async tx => {
    await contactLock(tx);
    const at = new Date(Math.max(+now, Date.now()));
    const row = await tx.commercialWorkerState.upsert({ where: { key: RESEND_CAPACITY_STATE }, create: { key: RESEND_CAPACITY_STATE }, update: {} });
    const prior = snapshotSchema.safeParse(row.summary);
    if (!row.lastError && prior.success && prior.data.binding === binding && +at >= Date.parse(prior.data.fetchedAt) && +at - Date.parse(prior.data.fetchedAt) < config.capacityPolicy.pollSeconds * 1000) return null;
    if (row.leaseUntil && row.leaseUntil > at) return null;
    return tx.commercialWorkerState.update({ where: { key: row.key }, data: { leaseOwner: owner, leaseUntil: new Date(+at + 10000), fence: { increment: 1 }, lastStartedAt: at } });
  });
  if (!claim) return { refreshed: false };
  try {
    const client = new Resend(config.readKey);
    const port: CapacityReader = reader ?? {
      usage: async () => { const r = await client.get("/usage"); if (r.error) throw new Error("USAGE_UNAVAILABLE"); return r.data; },
      domain: async () => { const r = await client.domains.get(config.domainId); if (!r.data) throw new Error("DOMAIN_UNAVAILABLE"); return r.data; },
      webhook: async () => { const r = await client.webhooks.get(config.webhookId); if (!r.data || !r.data.events) throw new Error("WEBHOOK_UNAVAILABLE"); return { ...r.data, events: r.data.events }; },
    };
    const [usage, domain, webhook] = await Promise.all([bounded(port.usage), bounded(port.domain), bounded(port.webhook)]);
    const required = ["email.sent", "email.delivered", "email.delivery_delayed", "email.bounced", "email.complained", "email.failed", "email.suppressed"];
    if (domain.name !== config.sender.split("@")[1] || domain.status !== "verified" || webhook.status !== "enabled" || webhook.endpoint !== config.origin + "/api/contact-flow/webhooks/resend" || required.some(event => !webhook.events.includes(event))) throw new Error("PROVIDER_READINESS_CHANGED");
    const emails = z.object({ emails: z.object({ daily: counter, monthly: counter }) }).parse(usage).emails;
    if (emails.monthly.limit === null || config.capacityMode === "shared_free" && emails.daily.limit === null || [emails.daily, emails.monthly].some(c => c.limit !== null && (!c.resets_at || Date.parse(c.resets_at) <= +now))) throw new Error("PROVIDER_CAPACITY_UNCERTAIN");
    const snapshot = { binding, fetchedAt: (claim.lastStartedAt ?? now).toISOString(), emails };
    const applied = await prisma.commercialWorkerState.updateMany({ where: { key: claim.key, leaseOwner: owner, fence: claim.fence }, data: { summary: snapshot, lastSuccessAt: now, lastError: null, leaseOwner: null, leaseUntil: null } });
    return { refreshed: applied.count === 1 };
  } catch {
    await prisma.commercialWorkerState.updateMany({ where: { key: claim.key, leaseOwner: owner, fence: claim.fence }, data: { summary: { unavailable: true }, lastError: "RESEND_CAPACITY_UNAVAILABLE", leaseOwner: null, leaseUntil: null } });
    return { refreshed: false, unavailable: true };
  }
}

/** Called under Contact Flow's quota lock, after reserving its existing ledger. */
export async function resendCapacityReason(tx: Prisma.TransactionClient, now = new Date()) {
  let config: ReturnType<typeof productionResendConfiguration>;
  try { config = productionResendConfiguration(); } catch { return "CONTACT_FLOW_EXTERNAL_DELIVERY_BLOCKED"; }
  const row = await tx.commercialWorkerState.findUnique({ where: { key: RESEND_CAPACITY_STATE } });
  const parsed = snapshotSchema.safeParse(row?.summary);
  if (row?.lastError || !parsed.success || parsed.data.binding !== bindingOf(config) || Date.parse(parsed.data.fetchedAt) > +now || +now - Date.parse(parsed.data.fetchedAt) >= config.capacityPolicy.maxAgeSeconds * 1000) return "RESEND_CAPACITY_UNKNOWN";
  const snapshot = parsed.data;
  // Conservatively include yesterday and three calendar months. This covers
  // rolling provider windows without assuming calendar resets or immediate metering.
  // Existing commitments are deducted even if Resend may already report them.
  const days = [now.toISOString().slice(0,10), new Date(+now-86400000).toISOString().slice(0,10)];
  const months = [0,1,2].map(n => new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-n,1)).toISOString().slice(0,7));
  const buckets = await tx.cfQuotaBucket.findMany({ where: { key: { in: [...days.map(d=>`global:day:${d}`),...months.map(m=>`global:month:${m}`)] } }, select: { kind: true, reserved: true, consumed: true } });
  for (const [kind,c,reserve] of [["GLOBAL_DAY",snapshot.emails.daily,config.capacityPolicy.dailyReserve],["GLOBAL_MONTH",snapshot.emails.monthly,config.capacityPolicy.monthlyReserve]] as const) {
    if (c.limit === null) continue;
    if (!c.resets_at || Date.parse(c.resets_at) <= +now) return "RESEND_CAPACITY_UNKNOWN";
    const committed = buckets.filter(b=>b.kind===kind).reduce((n,b)=>n+b.reserved+b.consumed,0);
    if (c.used + reserve + committed > c.limit) return "TRANSACTIONAL_CAPACITY_RESERVED";
  }
  return null;
}
