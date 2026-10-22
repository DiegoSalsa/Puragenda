import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { commercialHash } from "@/server/services/commercial-internal";
import { revalidateGrowthScope, type GrowthScope } from "./access";
import {
  GROWTH_RULE_VERSION,
  growthRulesSchema,
  growthWindow,
  DEFAULT_GROWTH_RULES,
  type GrowthRules,
} from "./contracts";
import { collectGrowthEvidence, detectGrowthSignals } from "./evidence";
import { reserveGrowthUsage, settleGrowthUsage } from "./budgets";

export async function lockGrowthScope(
  tx: Prisma.TransactionClient,
  scope: GrowthScope,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope.businessId + ":" + scope.scopeKey},0))::text`;
}
export async function analyzeGrowth(
  scope: GrowthScope,
  options: {
    rules?: GrowthRules;
    kind?: "INTERACTIVE" | "PROACTIVE";
    now?: Date;
    fresh?: boolean;
  } = {},
) {
  const now = options.now ?? new Date();
  await revalidateGrowthScope(scope, now);
  const rules = growthRulesSchema.parse(options.rules ?? DEFAULT_GROWTH_RULES),
    window = growthWindow(scope.timezone, rules, now);
  const analysisKey = commercialHash({
    business: scope.businessId,
    scope: scope.scopeKey,
    rules,
    period: window.end,
    version: GROWTH_RULE_VERSION,
    hour: Math.floor(+now / 3600000),
  });
  const leaseToken = randomUUID();
  const claim = await prisma.$transaction(async (tx) => {
    await lockGrowthScope(tx, scope);
    const prior = await tx.puriGrowthRun.findUnique({ where: { analysisKey } });
    if (prior?.status === "COMPLETE" && !options.fresh) {
      const run = await tx.puriGrowthRun.update({
        where: { id: prior.id },
        data: {
          cacheHits: { increment: 1 },
          ...(options.kind === "PROACTIVE" ? { proactiveCheckedAt: now } : {}),
        },
      });
      return { run, claimed: false, cached: true };
    }
    if (prior?.status === "RUNNING" && prior.leaseUntil > now)
      return { run: prior, claimed: false, cached: false };
    if (prior && prior.attempts >= 3 && !options.fresh)
      throw new Error("ANALYSIS_RETRY_LIMIT");
    const data = {
      leaseToken,
      leaseUntil: new Date(+now + 60000),
      status: "RUNNING",
      errorCode: null,
      completedAt: null,
    };
    const run = prior
      ? await tx.puriGrowthRun.update({
          where: { id: prior.id },
          data: { ...data, attempts: { increment: 1 } },
        })
      : await tx.puriGrowthRun.create({
          data: {
            ...data,
            businessId: scope.businessId,
            scopeKey: scope.scopeKey,
            locationId: scope.locationId,
            staffId: scope.staffId,
            analysisKey,
            kind: options.kind ?? "INTERACTIVE",
            ruleVersion: GROWTH_RULE_VERSION,
            periodStart: window.start,
            periodEnd: window.end,
            expiresAt: new Date(+now + 7 * 86400000),
          },
        });
    return { run, claimed: true, cached: false };
  });
  if (!claim.claimed)
    return { ...claim, signals: await listGrowthSignals(scope, now) };
  const started = performance.now();
  let reservationId: string | undefined;
  try {
    const reserved = await reserveGrowthUsage({
      businessId: scope.businessId,
      category: options.kind === "PROACTIVE" ? "PROACTIVE_SQL" : "ANALYSIS_SQL",
      key: `analysis:${claim.run.id}:${claim.run.attempts}`,
      inputHash: analysisKey,
      micros: 0,
      now,
    });
    if (reserved.duplicate)
      throw new Error("ANALYSIS_ATTEMPT_ALREADY_RESERVED");
    reservationId = reserved.reservation.id;
    const { evidence, hash } = await collectGrowthEvidence(scope, rules, now);
    await revalidateGrowthScope(scope, now);
    const run = await prisma.$transaction(async (tx) => {
      await lockGrowthScope(tx, scope);
      const current = await tx.puriGrowthRun.findUniqueOrThrow({
        where: { id: claim.run.id },
      });
      if (
        current.leaseToken !== leaseToken ||
        current.status !== "RUNNING" ||
        current.leaseUntil <= new Date()
      )
        throw new Error("ANALYSIS_LEASE_LOST");
      for (const s of detectGrowthSignals(evidence)) {
        const materialHash = commercialHash(s.material),
          dedupeKey = commercialHash({
            business: scope.businessId,
            scope: scope.scopeKey,
            kind: s.kind,
            hash,
            version: GROWTH_RULE_VERSION,
          });
        const suppressed = await tx.puriGrowthSignal.findFirst({
          where: {
            businessId: scope.businessId,
            scopeKey: scope.scopeKey,
            kind: s.kind,
            materialHash,
            OR: [
              { suppressedUntil: { gt: now } },
              {
                createdAt: {
                  gte: new Date(+now - rules.suppressionDays * 86400000),
                },
              },
            ],
          },
        });
        if (suppressed) continue;
        await tx.puriGrowthSignal.upsert({
          where: { dedupeKey },
          update: {},
          create: {
            businessId: scope.businessId,
            scopeKey: scope.scopeKey,
            runId: current.id,
            kind: s.kind,
            ruleVersion: GROWTH_RULE_VERSION,
            evidenceHash: hash,
            materialHash,
            dedupeKey,
            evidence: s.evidence as Prisma.InputJsonValue,
            confidence: s.confidence,
            priority: s.priority,
            expiresAt: current.expiresAt,
          },
        });
      }
      return tx.puriGrowthRun.update({
        where: { id: current.id },
        data: {
          status: "COMPLETE",
          evidence: evidence as unknown as Prisma.InputJsonValue,
          evidenceHash: hash,
          completedAt: now,
          durationMs: Math.round(performance.now() - started),
          ...(options.kind === "PROACTIVE" ? { proactiveCheckedAt: now } : {}),
        },
      });
    });
    await settleGrowthUsage(reservationId, { actualMicros: 0 });
    return {
      run,
      claimed: true,
      cached: false,
      signals: await listGrowthSignals(scope, now),
    };
  } catch (error) {
    if (reservationId)
      await settleGrowthUsage(reservationId, {
        actualMicros: 0,
        errorCode: "SQL_ANALYSIS_FAILED",
      });
    await prisma.puriGrowthRun.updateMany({
      where: { id: claim.run.id, leaseToken, status: "RUNNING" },
      data: {
        status: "FAILED",
        errorCode:
          error instanceof Error && /^[A-Z_]+$/.test(error.message)
            ? error.message
            : "ANALYSIS_FAILED",
        durationMs: Math.round(performance.now() - started),
      },
    });
    throw error;
  }
}
export async function listGrowthSignals(scope: GrowthScope, now = new Date()) {
  await revalidateGrowthScope(scope, now);
  return prisma.puriGrowthSignal.findMany({
    where: {
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
      status: "DETECTED",
      expiresAt: { gt: now },
      OR: [{ suppressedUntil: null }, { suppressedUntil: { lte: now } }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
}
export async function expireGrowthRecords(
  scope: GrowthScope,
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  return prisma.$transaction(async (tx) => {
    await lockGrowthScope(tx, scope);
    const where = {
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
      expiresAt: { lte: now },
    };
    const signals = await tx.puriGrowthSignal.updateMany({
      where: { ...where, status: "DETECTED" },
      data: { status: "EXPIRED" },
    });
    const recommendations = await tx.puriGrowthRecommendation.updateMany({
      where: {
        ...where,
        status: { in: ["DRAFT", "PROPOSED", "REVIEWED", "APPROVED"] },
      },
      data: { status: "EXPIRED" },
    });
    return { signals: signals.count, recommendations: recommendations.count };
  });
}
