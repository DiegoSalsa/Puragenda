import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { revalidateGrowthScope, type GrowthScope } from "./access";
import { expireGrowthRecords, lockGrowthScope } from "./analysis";
export const growthRetentionSchema = z
  .object({
    aggregateDays: z.number().int().min(30).max(365),
    approvedDays: z.number().int().min(365).max(1460),
    batchSize: z.number().int().min(1).max(100),
  })
  .strict();
// Explicit local maintenance only; no production or automatic retention policy is activated.
// Usage/accounting and global budget audit remain outside this purge pending retention approval.
export async function purgeExpiredGrowthHistory(
  scope: GrowthScope,
  policy: z.infer<typeof growthRetentionSchema>,
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  if (!scope.owner) throw new Error("OWNER_REQUIRED");
  const rules = growthRetentionSchema.parse(policy);
  await expireGrowthRecords(scope, now);
  const cutoff = new Date(+now - rules.aggregateDays * 86400000),
    approvedCutoff = new Date(+now - rules.approvedDays * 86400000);
  return prisma.$transaction(async (tx) => {
    await lockGrowthScope(tx, scope);
    const tenant = { businessId: scope.businessId, scopeKey: scope.scopeKey };
    const recs = await tx.puriGrowthRecommendation.findMany({
      where: {
        ...tenant,
        contactFlowCampaigns: { none: {} },
        expiresAt: { lt: cutoff },
        OR: [{ approvedAt: null }, { approvedAt: { lt: approvedCutoff } }],
      },
      select: { id: true },
      orderBy: { expiresAt: "asc" },
      take: rules.batchSize,
    });
    // Cascade removes only audits for proposals whose full retention has elapsed.
    const recommendations = await tx.puriGrowthRecommendation.deleteMany({
      where: { ...tenant, id: { in: recs.map((r) => r.id) } },
    });
    const signals = await tx.puriGrowthSignal.findMany({
      where: {
        ...tenant,
        expiresAt: { lt: cutoff },
        recommendations: { none: {} },
      },
      select: { id: true },
      take: rules.batchSize,
    });
    await tx.puriGrowthSignal.deleteMany({
      where: { ...tenant, id: { in: signals.map((s) => s.id) } },
    });
    const runs = await tx.puriGrowthRun.findMany({
      where: { ...tenant, expiresAt: { lt: cutoff }, signals: { none: {} } },
      select: { id: true },
      take: rules.batchSize,
    });
    await tx.puriGrowthRun.deleteMany({
      where: { ...tenant, id: { in: runs.map((r) => r.id) } },
    });
    return {
      recommendations: recommendations.count,
      signals: signals.length,
      runs: runs.length,
      accountingPurged: false,
    };
  });
}
