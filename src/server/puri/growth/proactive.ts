import { prisma } from "@/server/db/prisma";
import { assertGrowthSandbox, createGrowthScope } from "./access";
import { analyzeGrowth } from "./analysis";
import { growthRulesSchema } from "./contracts";
import type { PuriContext } from "../types";
import { recoverAbandonedGrowthUsage } from "./budgets";

// Intentionally not wired into vercel.json, cron routes, or production workers.
// The cursor is a stable business/location tuple, including partial-business batches.
export async function runGrowthScheduler(
  input: { after?: string; limit?: number; maxDurationMs?: number } = {},
) {
  assertGrowthSandbox();
  if (process.env.PURI_PLUS_PROACTIVE_ENABLED !== "1")
    throw new Error("PROACTIVE_DISABLED");
  if (
    (input.limit !== undefined &&
      (!Number.isSafeInteger(input.limit) || input.limit < 1)) ||
    (input.maxDurationMs !== undefined &&
      (!Number.isFinite(input.maxDurationMs) || input.maxDurationMs < 100))
  )
    throw new Error("INVALID_SCHEDULER_LIMIT");
  await recoverAbandonedGrowthUsage();
  const limit = Math.max(1, Math.min(10, input.limit ?? 5)),
    deadline =
      performance.now() +
      Math.max(100, Math.min(30000, input.maxDurationMs ?? 25000));
  const cursor = input.after ?? "",
    businessCursor = cursor.split(":")[0];
  const policies = await prisma.puriGrowthPolicy.findMany({
    where: {
      proactiveEnabled: true,
      ...(businessCursor ? { businessId: { gte: businessCursor } } : {}),
    },
    orderBy: { businessId: "asc" },
    take: 11,
    select: {
      businessId: true,
      everyHours: true,
      rules: true,
      business: {
        select: {
          ownerId: true,
          locations: {
            where: { isActive: true },
            orderBy: { id: "asc" },
            select: { id: true },
            take: 11,
          },
        },
      },
    },
  });
  const result = {
    processed: 0,
    cached: 0,
    skipped: 0,
    failed: 0,
    nextCursor: cursor,
    more: false,
  };
  outer: for (const policy of policies.slice(0, 10)) {
    if (
      result.processed + result.skipped + result.failed >= limit ||
      performance.now() > deadline
    ) {
      result.more = true;
      break;
    }
    if (policy.business.locations.length > 10) {
      result.failed++;
      result.nextCursor = `${policy.businessId}:~`;
      continue;
    }
    for (const location of policy.business.locations.length
      ? policy.business.locations
      : [{ id: "~" }]) {
      const key = `${policy.businessId}:${location.id}`;
      if (key <= cursor) continue;
      if (
        result.processed + result.skipped + result.failed >= limit ||
        performance.now() > deadline
      ) {
        result.more = true;
        break outer;
      }
      try {
        if (!policy.business.ownerId) throw new Error("OWNER_REQUIRED");
        const context = {
          user: { id: policy.business.ownerId },
          business: { id: policy.businessId },
          location: location.id === "~" ? null : { id: location.id },
          ownAgenda: false,
        } as PuriContext;
        const scope = await createGrowthScope(context, location.id === "~");
        const since = new Date(Date.now() - policy.everyHours * 3600000);
        const recent = await prisma.puriGrowthRun.findFirst({
          where: {
            businessId: policy.businessId,
            scopeKey: scope.scopeKey,
            status: "COMPLETE",
            OR: [
              { kind: "PROACTIVE", completedAt: { gt: since } },
              { proactiveCheckedAt: { gt: since } },
            ],
          },
          select: { id: true },
        });
        if (recent) result.skipped++;
        else {
          const run = await analyzeGrowth(scope, {
            rules: growthRulesSchema.parse(policy.rules),
            kind: "PROACTIVE",
          });
          result.processed++;
          if (run.cached) result.cached++;
        }
      } catch {
        result.failed++;
      }
      result.nextCursor = key;
    }
  }
  result.more ||= policies.length > 10;
  return result;
}
