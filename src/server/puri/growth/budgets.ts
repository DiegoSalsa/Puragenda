import { commercialUsageContext, ensureCommercialPuriBudgets } from "@/server/services/commercial-usage-policy";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  commercialHash,
  commercialInteger,
} from "@/server/services/commercial-internal";
import { estimatePuriCostUsd } from "../telemetry";
import { PLUS_VERIFIED_PRICE, verifiedModelMicros } from "./pricing";
import {
  assertGrowthSandbox,
  revalidateGrowthScope,
  type GrowthScope,
} from "./access";

export type BudgetCategory =
  | "STANDARD_INTERACTIVE"
  | "PLUS_INTERACTIVE"
  | "RECOMMENDATION"
  | "ANALYSIS_SQL"
  | "PROACTIVE_SQL";
export class GrowthBudgetError extends Error {}
const usesVerifiedPrice = (model: string) => process.env.PURI_PLUS_VERIFIED_PRICING_ENABLED === "1" && model === PLUS_VERIFIED_PRICE.model;
export function budgetKeys(
  businessId: string,
  category: BudgetCategory,
  now = new Date(),
) {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const month = periodStart.toISOString().slice(0, 7);
  return {
    periodStart,
    keys: [
      `global:ALL:${month}`,
      `${businessId}:ALL:${month}`,
      `${businessId}:${category}:${month}`,
    ],
  };
}
async function lock(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(726841901)::text`;
}
// Explicit local configuration. No commercial allocation is inferred from the plan price.
export async function configureGrowthBudget(input: {
  businessId: string | null;
  category: BudgetCategory | "ALL";
  limitMicros: number;
  limitUnits: number;
  now?: Date;
}) {
  assertGrowthSandbox();
  commercialInteger(input.limitMicros);
  commercialInteger(input.limitUnits);
  const { periodStart } = budgetKeys(
    input.businessId ?? "global",
    "ANALYSIS_SQL",
    input.now,
  );
  const key = `${input.businessId ?? "global"}:${input.category}:${periodStart.toISOString().slice(0, 7)}`;
  return prisma.$transaction(async (tx) => {
    await lock(tx);
    const existing = await tx.puriBudgetBucket.findUnique({ where: { key } });
    if (
      existing &&
      (input.limitMicros < existing.spentMicros + existing.reservedMicros ||
        input.limitUnits < existing.spentUnits + existing.reservedUnits)
    )
      throw new GrowthBudgetError("LIMIT_BELOW_COMMITTED");
    return tx.puriBudgetBucket.upsert({
      where: { key },
      create: {
        key,
        businessId: input.businessId,
        category: input.category,
        periodStart,
        limitMicros: input.limitMicros,
        limitUnits: input.limitUnits,
      },
      update: { limitMicros: input.limitMicros, limitUnits: input.limitUnits },
    });
  });
}
export async function reserveGrowthUsage(input: {
  businessId: string;
  category: BudgetCategory;
  key: string;
  inputHash: string;
  micros: number;
  units?: number;
  now?: Date;
}) {
  assertGrowthSandbox();
  commercialInteger(input.micros);
  const units = commercialInteger(input.units ?? 1, 1);
  const now = input.now ?? new Date();
  const { keys } = await ensureCommercialPuriBudgets(input.businessId, input.category, now) ?? budgetKeys(input.businessId, input.category, now);
  return prisma
    .$transaction(async (tx) => {
      await lock(tx);
      const prior = await tx.puriUsageReservation.findUnique({
        where: { idempotencyKey: input.key },
      });
      if (prior) {
        if (
          prior.businessId !== input.businessId ||
          prior.inputHash !== input.inputHash ||
          prior.category !== input.category
        )
          throw new GrowthBudgetError("IDEMPOTENCY_CONFLICT");
        return { reservation: prior, duplicate: true };
      }
      const buckets = await tx.puriBudgetBucket.findMany({
        where: { key: { in: keys } },
      });
      if (buckets.length !== 3)
        throw new GrowthBudgetError("BUDGET_NOT_CONFIGURED");
      for (const b of buckets) {
        if (input.micros > 0 && b.unknownCost && b.businessId)
          throw new GrowthBudgetError("UNKNOWN_COST_UNRECONCILED");
        if (
          b.spentMicros + b.reservedMicros + input.micros > b.limitMicros ||
          b.spentUnits + b.reservedUnits + units > b.limitUnits
        )
          throw new GrowthBudgetError("BUDGET_EXHAUSTED");
      }
      for (const b of buckets) {
        const ratio = Math.max(
          b.limitUnits
            ? (b.spentUnits + b.reservedUnits + units) / b.limitUnits
            : 1,
          b.limitMicros
            ? (b.spentMicros + b.reservedMicros + input.micros) / b.limitMicros
            : 0,
        );
        const level =
          ratio >= 1 ? 100 : ratio >= 0.8 ? 80 : ratio >= 0.5 ? 50 : 0;
        await tx.puriBudgetBucket.update({
          where: { key: b.key },
          data: {
            reservedMicros: { increment: input.micros },
            reservedUnits: { increment: units },
            alertLevel: Math.max(b.alertLevel, level),
          },
        });
        for (const threshold of [50, 80, 100].filter(
          (n) => n > b.alertLevel && n <= level,
        ))
          await tx.puriGrowthAudit.create({
            data: {
              businessId: input.businessId,
              scopeKey: "BUDGET",
              event: `BUDGET_${threshold}`,
              dedupeKey: commercialHash({ key: b.key, threshold }),
              details: { category: b.category, threshold },
            },
          });
      }
      const reservation = await tx.puriUsageReservation.create({
        data: {
          businessId: input.businessId,
          idempotencyKey: input.key,
          inputHash: input.inputHash,
          category: input.category,
          bucketKeys: keys,
          reservedMicros: input.micros,
          reservedUnits: units,
          createdAt: input.now,
        },
      });
      return { reservation, duplicate: false };
    })
    .catch(async (error) => {
      if (error instanceof GrowthBudgetError)
        await prisma.puriGrowthAudit.upsert({
          where: {
            dedupeKey: commercialHash({
              budgetDenied: input.key,
              businessId: input.businessId,
            }),
          },
          update: {},
          create: {
            businessId: input.businessId,
            scopeKey: "BUDGET",
            event: "BUDGET_DENIED",
            dedupeKey: commercialHash({
              budgetDenied: input.key,
              businessId: input.businessId,
            }),
            details: { category: input.category, code: error.message },
          },
        });
      throw error;
    });
}
export type ModelUsage = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
};
export function knownModelMicros(
  model: string,
  usage: ModelUsage | undefined,
): number | null {
  const i = usage?.input_tokens,
    o = usage?.output_tokens,
    c = usage?.input_tokens_details?.cached_tokens;
  if (
    typeof i !== "number" ||
    typeof o !== "number" ||
    typeof c !== "number" ||
    !Number.isSafeInteger(i) ||
    !Number.isSafeInteger(o) ||
    !Number.isSafeInteger(c) ||
    i < 0 ||
    o < 0 ||
    c < 0 ||
    c > i
  )
    return null;
  if (usesVerifiedPrice(model)) {
    const writes = usage?.input_tokens_details?.cache_write_tokens;
    return verifiedModelMicros(model, i, o, c, writes);
  }
  const usd = estimatePuriCostUsd({
    model,
    promptTokens: i!,
    completionTokens: o!,
    cachedTokens: c,
  });
  return usd === null ? null : Math.ceil(usd * 1_000_000);
}
export function maximumModelMicros(
  model: string,
  requestBytes: number,
  outputTokens = 1200,
) {
  // One input token per UTF-8 byte is a deliberately conservative bound, including tool definitions/history.
  const value = knownModelMicros(model, {
    input_tokens: requestBytes + 1024,
    output_tokens: outputTokens,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: usesVerifiedPrice(model) ? requestBytes + 1024 : 0 },
  });
  return value === null ? null : commercialInteger(Math.max(1, value), 1);
}
export async function settleGrowthUsage(
  id: string,
  input: {
    actualMicros: number | null;
    model?: string;
    usage?: ModelUsage;
    errorCode?: string;
  },
) {
  assertGrowthSandbox();
  if (input.actualMicros !== null) commercialInteger(input.actualMicros);
  return prisma.$transaction(async (tx) => {
    await lock(tx);
    const r = await tx.puriUsageReservation.findUniqueOrThrow({
      where: { id },
    });
    if (r.state !== "RESERVED") return r;
    // Unknown network outcomes retain the complete reservation as committed spend.
    // A returned cost above the bound fences further AI spending instead of pretending it was free.
    const unknown =
      input.actualMicros === null || input.actualMicros > r.reservedMicros;
    const spent = unknown
      ? Math.max(r.reservedMicros, input.actualMicros ?? 0)
      : input.actualMicros!;
    for (const key of r.bucketKeys)
      await tx.puriBudgetBucket.update({
        where: { key },
        data: {
          reservedMicros: { decrement: r.reservedMicros },
          reservedUnits: { decrement: r.reservedUnits },
          spentMicros: { increment: spent },
          spentUnits: { increment: r.reservedUnits },
          ...(unknown && r.reservedMicros > 0 ? { unknownCost: true } : {}),
        },
      });
    return tx.puriUsageReservation.update({
      where: { id },
      data: {
        state: unknown ? "UNKNOWN" : "SETTLED",
        actualMicros: input.actualMicros,
        model: input.model,
        inputTokens: input.usage?.input_tokens,
        outputTokens: input.usage?.output_tokens,
        cachedTokens: input.usage?.input_tokens_details?.cached_tokens,
        cacheWriteTokens: input.usage?.input_tokens_details?.cache_write_tokens,
        errorCode: input.errorCode,
        settledAt: new Date(),
      },
    });
  });
}
export async function growthBudgetSnapshot(scope: GrowthScope) {
  await revalidateGrowthScope(scope);
  if (!scope.owner && (scope.staffId || !scope.canMoney)) return [];
  const periodStart = (await commercialUsageContext(scope.businessId))?.periodStart ?? budgetKeys(scope.businessId, "ANALYSIS_SQL").periodStart;
  return prisma.puriBudgetBucket.findMany({
    where: { businessId: scope.businessId, periodStart },
    select: {
      category: true,
      limitMicros: true,
      limitUnits: true,
      reservedMicros: true,
      spentMicros: true,
      reservedUnits: true,
      spentUnits: true,
      unknownCost: true,
      alertLevel: true,
    },
  });
}
export async function growthUsageSummary(scope: GrowthScope) {
  await revalidateGrowthScope(scope);
  if (!scope.owner && (scope.staffId || !scope.canMoney)) return null;
  const periodStart = (await commercialUsageContext(scope.businessId))?.periodStart ?? budgetKeys(scope.businessId, "ANALYSIS_SQL").periodStart,
    where = { businessId: scope.businessId, createdAt: { gte: periodStart } };
  const [usage, unknown, analysis] = await Promise.all([
    prisma.puriUsageReservation.aggregate({
      where,
      _sum: { inputTokens: true, outputTokens: true, cachedTokens: true },
      _count: true,
    }),
    prisma.puriUsageReservation.count({
      where: { ...where, state: "UNKNOWN" },
    }),
    prisma.puriGrowthRun.aggregate({
      where,
      _sum: { cacheHits: true },
      _count: true,
    }),
  ]);
  return {
    inputTokens: usage._sum.inputTokens,
    outputTokens: usage._sum.outputTokens,
    cachedTokens: usage._sum.cachedTokens,
    unknownCalls: unknown,
    analyses: analysis._count,
    cacheHits: analysis._sum.cacheHits ?? 0,
  };
}
export async function recoverAbandonedGrowthUsage(
  limit = 25,
  now = new Date(),
) {
  assertGrowthSandbox();
  const abandoned = await prisma.puriUsageReservation.findMany({
    where: { state: "RESERVED", createdAt: { lt: new Date(+now - 120000) } },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(25, limit)),
  });
  for (const r of abandoned)
    await settleGrowthUsage(r.id, {
      actualMicros: r.category.endsWith("_SQL") ? 0 : null,
      errorCode: "WORKER_OUTCOME_UNKNOWN",
    });
  return { recovered: abandoned.length };
}

// A reported invoice/request cost is reconciled by an operator, never by Puri.
// SQL and other businesses cannot use this method to release ambiguous spend.
export async function reconcileGrowthUsage(input: {
  reservationId: string; actorId: string; actualMicros: number; evidenceHash: string;
}) {
  assertGrowthSandbox();
  commercialInteger(input.actualMicros);
  if (!/^[a-f0-9]{64}$/.test(input.evidenceHash)) throw new GrowthBudgetError("COST_EVIDENCE_REQUIRED");
  return prisma.$transaction(async tx => {
    await lock(tx);
    const actor = await tx.user.findUnique({ where: { id: input.actorId }, select: { isSuperAdmin: true, deletedAt: true } });
    if (!actor?.isSuperAdmin || actor.deletedAt) throw new GrowthBudgetError("SUPERADMIN_REQUIRED");
    const r = await tx.puriUsageReservation.findUniqueOrThrow({ where: { id: input.reservationId } });
    const dedupeKey = commercialHash({ costReconciliation: r.id });
    const previous = await tx.puriGrowthAudit.findUnique({ where: { dedupeKey } });
    if (previous) {
      const details = previous.details as { evidenceHash: string; actualMicros: number };
      if (details.evidenceHash !== input.evidenceHash || details.actualMicros !== input.actualMicros) throw new GrowthBudgetError("COST_RECONCILIATION_CONFLICT");
      return { reconciled: true, duplicate: true };
    }
    if (r.state !== "UNKNOWN") throw new GrowthBudgetError("UNKNOWN_USAGE_REQUIRED");
    const committed = Math.max(r.reservedMicros, r.actualMicros ?? 0);
    await tx.puriUsageReservation.update({ where: { id: r.id }, data: { state: "SETTLED", actualMicros: input.actualMicros, errorCode: null, settledAt: new Date() } });
    for (const key of r.bucketKeys) {
      const unresolved = await tx.puriUsageReservation.count({ where: { state: "UNKNOWN", bucketKeys: { has: key } } });
      await tx.puriBudgetBucket.update({ where: { key }, data: { spentMicros: { increment: input.actualMicros - committed }, unknownCost: unresolved > 0 } });
    }
    await tx.puriGrowthAudit.create({ data: {
      businessId: r.businessId, actorId: input.actorId, scopeKey: "BUDGET", event: "COST_RECONCILED", dedupeKey,
      details: { reservationId: r.id, actualMicros: input.actualMicros, evidenceHash: input.evidenceHash },
    } });
    return { reconciled: true, duplicate: false };
  });
}
