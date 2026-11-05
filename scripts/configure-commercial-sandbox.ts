import { configureGrowthBudget } from "../src/server/puri/growth/budgets";
import { configureContactPolicy } from "../src/server/contact-flow/quotas";
import { assertCommercialSandbox } from "../src/server/services/commercial-internal";
import { prisma } from "../src/server/db/prisma";
// Internal test allocations, not advertised production allowances.
async function main() {
  assertCommercialSandbox();
  const businessId = process.argv[2];
  if (!businessId) throw new Error("TEST_BUSINESS_REQUIRED");
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, include: { commercialSubscription: true } });
  if (!business.ownerId || !business.commercialSubscription || business.commercialSubscription.legacySubscriptionId) throw new Error("ISOLATED_NEW_BUSINESS_REQUIRED");
  if (!business.slug.startsWith("growth-") && !(business.commercialSubscription.termsSnapshot as { sandboxFixture?: boolean } | null)?.sandboxFixture) throw new Error("SANDBOX_FIXTURE_REQUIRED");
  await configureGrowthBudget({ businessId: null, category: "ALL", limitMicros: 20_000_000, limitUnits: 10000 });
  for (const [category, limitUnits] of [["ALL", 1000], ["PLUS_INTERACTIVE", 600], ["RECOMMENDATION", 50], ["ANALYSIS_SQL", 120], ["PROACTIVE_SQL", 60]] as const)
    await configureGrowthBudget({ businessId, category, limitMicros: 2_000_000, limitUnits });
  const policy = { dailyLimit: 10, monthlyLimit: 100, contactDays: 7, senderEmail: "commercial-sandbox@example.invalid", killed: true, emailEnabled: false };
  await configureContactPolicy("GLOBAL", { ...policy, dailyLimit: 100, monthlyLimit: 1000 });
  await configureContactPolicy(businessId, policy);
  console.log(JSON.stringify({ configured: true, aiMonthlyUsd: 2, globalAiMonthlyUsd: 20, commercialDeliveryKilled: true, transactionalPreferencesChanged: false }));
}
main().catch(() => { console.error("COMMERCIAL_SANDBOX_CONFIGURATION_FAILED"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
