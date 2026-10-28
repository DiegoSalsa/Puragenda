import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { effectiveSnapshotAccess, isV2Plan } from "./commercial-plan-access";

export const usageCategories = ["STANDARD_INTERACTIVE", "PLUS_INTERACTIVE", "RECOMMENDATION", "ANALYSIS_SQL", "PROACTIVE_SQL"] as const;
const budget = z.object({ limitMicros: z.number().int().nonnegative().safe(), limitUnits: z.number().int().nonnegative().safe() }).strict();
const allocation = z.object({
  puri: z.partialRecord(z.enum(["ALL", ...usageCategories]), budget).optional(),
  marketing: z.object({ maxEmails: z.number().int().nonnegative(), maxCampaignsPerMonth: z.number().int().nonnegative() }).strict().optional(),
  contactFlow: z.object({ dailyLimit: z.number().int().nonnegative(), monthlyLimit: z.number().int().nonnegative(), trialLimit: z.number().int().nonnegative().optional(), contactDays: z.number().int().min(1).max(365), senderEmail: z.email(), emailEnabled: z.boolean(), killed: z.boolean() }).strict().optional(),
}).strict();
const plans = z.object({ PURAGENDA: allocation.optional(), PURAGENDA_PLUS: allocation.optional() }).strict();
export const commercialUsagePolicySchema = z.object({ version: z.string().min(1), trial: plans, paid: plans,
  global: z.object({ puri: budget.optional(), contactFlow: allocation.shape.contactFlow.optional() }).strict(),
}).strict();
/** No allocation is inferred from a plan's price. Missing configuration is explicit. */
export function commercialUsagePolicy() {
  const raw = process.env.COMMERCIAL_USAGE_POLICY_JSON;
  if (!raw) return null;
  try { return commercialUsagePolicySchema.parse(JSON.parse(raw)); }
  catch { throw new Error("INVALID_COMMERCIAL_USAGE_POLICY"); }
}
export function planUsageAllocation(plan: string, trial: boolean) {
  if (!isV2Plan(plan)) return null;
  const policy = commercialUsagePolicy();
  return policy?.[trial ? "trial" : "paid"][plan as "PURAGENDA" | "PURAGENDA_PLUS"] ?? null;
}
export async function commercialUsageContext(businessId: string, now = new Date(), db: Pick<Prisma.TransactionClient, "commercialSubscription"> = prisma) {
  const sub = await db.commercialSubscription.findUnique({ where: { businessId } });
  if (!sub || !isV2Plan(sub.planCode)) return null;
  if (!effectiveSnapshotAccess(sub, now).commercialAccess) throw new Error("COMMERCIAL_ACCESS_REQUIRED");
  const trial = sub.status === "TRIALING";
  return { sub, trial, allocation: planUsageAllocation(sub.planCode, trial),
    periodStart: trial ? sub.trialStart! : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    period: trial ? `trial-${sub.trialStart!.toISOString()}` : now.toISOString().slice(0, 7) };
}

/** Upserts never reset spent/reserved counters, including on retry or plan change. */
export async function ensureCommercialPuriBudgets(businessId: string, category: typeof usageCategories[number], now = new Date()) {
  const context = await commercialUsageContext(businessId, now);
  if (!context || (context.sub.termsSnapshot as { origin?: string } | null)?.origin !== "registration_v2") return null;
  const policy = commercialUsagePolicy();
  const allowance = context.allocation?.puri;
  if (!policy?.global.puri || !allowance?.ALL || !allowance[category]) throw new Error("COMMERCIAL_USAGE_LIMITS_UNDEFINED");
  const month = now.toISOString().slice(0, 7);
  const globalStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const keys = [`global:ALL:${month}`, `${businessId}:ALL:${context.period}`, `${businessId}:${category}:${context.period}`];
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(726841901)::text`;
    const rows = [
      { key: keys[0], businessId: null, category: "ALL", periodStart: globalStart, ...policy.global.puri! },
      { key: keys[1], businessId, category: "ALL", periodStart: context.periodStart, ...allowance.ALL! },
      { key: keys[2], businessId, category, periodStart: context.periodStart, ...allowance[category]! },
    ];
    for (const row of rows) await tx.puriBudgetBucket.upsert({ where: { key: row.key }, create: row, update: { limitMicros: row.limitMicros, limitUnits: row.limitUnits } });
  });
  return { keys, periodStart: context.periodStart };
}

export async function ensureCommercialContactPolicy(tx: Prisma.TransactionClient, businessId: string, now: Date) {
  const context = await commercialUsageContext(businessId, now, tx);
  if (!context || (context.sub.termsSnapshot as { origin?: string } | null)?.origin !== "registration_v2") return null;
  if (!effectiveSnapshotAccess(context.sub, now).capabilities.includes("contact_flow")) throw new Error("CONTACT_FLOW_ENTITLEMENT_REQUIRED");
  const policy = commercialUsagePolicy(), allocation = context.allocation?.contactFlow;
  if (!policy?.global.contactFlow || !allocation || (context.trial && allocation.trialLimit === undefined)) throw new Error("COMMERCIAL_USAGE_LIMITS_UNDEFINED");
  for (const [key, p] of [["GLOBAL", policy.global.contactFlow], [businessId, allocation]] as const) {
    const data = { dailyLimit: p.dailyLimit, monthlyLimit: p.monthlyLimit, contactDays: p.contactDays, senderEmail: p.senderEmail, emailEnabled: p.emailEnabled, killed: p.killed };
    await tx.cfPolicy.upsert({ where: { key }, create: { key, businessId: key === "GLOBAL" ? null : businessId, ...data }, update: data });
  }
  return { trial: context.trial, trialLimit: allocation.trialLimit, period: context.period };
}
