import { prisma } from "@/server/db/prisma";
import { getCommercialPlanAccess } from "./commercial-plan-access";
import { commercialUsageContext, commercialUsagePolicy } from "./commercial-usage-policy";
import type { CommercialUsageItem, CommercialUsageSummary } from "@/core/commercial-usage";
import { dateKeyInTimezone } from "@/lib/date";
import { startOfLocalDay } from "@/lib/zoned-appointment-time";

/** Read-only commercial projection. Internal money, tokens and global limits never leave this service. */
export async function getCommercialUsageSummary(businessId: string, now = new Date()): Promise<CommercialUsageSummary | null> {
  const access = await getCommercialPlanAccess(businessId, now);
  if (!access.v2 || !access.snapshot) return null;
  const trial = access.snapshot.status === "TRIALING", plus = access.snapshot.planCode === "PURAGENDA_PLUS";
  const reset = trial && access.snapshot.trialEnd ? access.snapshot.trialEnd : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  let context = null;
  let policy = null;
  if (access.allowed) {
    try { context = await commercialUsageContext(businessId, now); policy = commercialUsagePolicy(); } catch { /* Unconfigured remains closed. */ }
  }
  const month = now.toISOString().slice(0, 7);
  const buckets = context ? await prisma.puriBudgetBucket.findMany({ where: { OR: [{ businessId, periodStart: context.periodStart }, { key: `global:ALL:${month}` }] } }) : [];
  const all = buckets.find(b => b.businessId === businessId && b.category === "ALL"), global = buckets.find(b => !b.businessId);
  const allocation = context?.allocation;
  const definitions = [
    ["STANDARD_INTERACTIVE", "Puri estándar", true], ["PLUS_INTERACTIVE", "Puri avanzado", plus],
    ["RECOMMENDATION", "Recomendaciones de Puri", plus], ["ANALYSIS_SQL", "Análisis del negocio", plus],
    ["PROACTIVE_SQL", "Detección de oportunidades", plus],
  ] as const;
  const items: CommercialUsageItem[] = definitions.map(([key, title, included]) => {
    const allowance = allocation?.puri?.[key];
    const bucket = buckets.find(b => b.businessId === businessId && b.category === key);
    const limit = allowance?.limitUnits ?? 0, used = bucket?.spentUnits ?? 0, reserved = bucket?.reservedUnits ?? 0;
    const configured = !!allowance && !!allocation?.puri?.ALL && !!policy?.global.puri;
    const requiresModel = !key.endsWith("_SQL");
    const remaining = Math.max(0, Math.min(limit - used - reserved, allocation?.puri?.ALL ? allocation.puri.ALL.limitUnits - (all?.spentUnits ?? 0) - (all?.reservedUnits ?? 0) : 0));
    const paused = requiresModel && (!!bucket?.unknownCost || !!all?.unknownCost) || !!global && (global.spentUnits + global.reservedUnits >= global.limitUnits || requiresModel && global.spentMicros + global.reservedMicros >= global.limitMicros);
    const moneyExhausted = requiresModel && (!!allowance && ((bucket?.spentMicros ?? 0) + (bucket?.reservedMicros ?? 0) >= allowance.limitMicros) || !!allocation?.puri?.ALL && (all?.spentMicros ?? 0) + (all?.reservedMicros ?? 0) >= allocation.puri.ALL.limitMicros);
    const state: CommercialUsageItem["state"] = !included ? "EXCLUSIVE" : !access.allowed ? "INACTIVE" : !configured ? "UNCONFIGURED" : paused ? "PAUSED" : !remaining || moneyExhausted ? "EXHAUSTED" : (used + reserved) / Math.max(1, limit) >= .8 ? "NEAR_LIMIT" : "AVAILABLE";
    return { key: String(key), title: String(title), included: Boolean(included), configured, limit, used, reserved, remaining: ["AVAILABLE", "NEAR_LIMIT"].includes(state) ? remaining : 0, state };
  });
  const contact = allocation?.contactFlow;
  const business = context && plus ? await prisma.business.findUnique({ where: { id: businessId }, select: { timezone: true } }) : null;
  const timezone = business?.timezone ?? "UTC", contactMonth = dateKeyInTimezone(now, timezone).slice(0, 7);
  const nextMonth = new Date(`${contactMonth}-01T12:00:00Z`); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const contactReset = trial ? reset : startOfLocalDay(nextMonth.toISOString().slice(0, 10), timezone);
  const contactBuckets = context && plus ? await prisma.cfQuotaBucket.findMany({ where: { businessId, OR: [{ kind: "BUSINESS_MONTH", period: contactMonth }, { kind: "BUSINESS_TRIAL", period: context.period }, { kind: "BUSINESS_CAMPAIGNS", period: context.period }] } }) : [];
  const cb = contactBuckets.find(b => b.kind === (trial ? "BUSINESS_TRIAL" : "BUSINESS_MONTH"));
  const monthlyBucket = contactBuckets.find(b => b.kind === "BUSINESS_MONTH");
  const limit = (trial ? contact?.trialLimit : contact?.monthlyLimit) ?? 0, used = cb?.consumed ?? 0, reserved = cb?.reserved ?? 0, remaining = Math.max(0, Math.min(limit - used - reserved, (contact?.monthlyLimit ?? 0) - (monthlyBucket?.consumed ?? 0) - (monthlyBucket?.reserved ?? 0)));
  const configured = !!contact && !!policy?.global.contactFlow && (!trial || contact.trialLimit !== undefined);
  const contactState: CommercialUsageItem["state"] = !plus ? "EXCLUSIVE" : !access.allowed ? "INACTIVE" : !configured ? "UNCONFIGURED" : !remaining ? "EXHAUSTED" : (used + reserved) / Math.max(1, limit) >= .8 ? "NEAR_LIMIT" : "AVAILABLE";
  items.push({ key: "CONTACT_FLOW", title: "Correos de Contact Flow", included: plus, configured, limit, used, reserved, remaining: ["AVAILABLE", "NEAR_LIMIT"].includes(contactState) ? remaining : 0, state: contactState, resetsAt: contactReset.toISOString() });
  return { plan: plus ? "PURAGENDA_PLUS" : "PURAGENDA", active: access.allowed, trial, resetsAt: reset.toISOString(), periodLabel: trial ? "Prueba de 30 días" : "Mes calendario", items };
}
