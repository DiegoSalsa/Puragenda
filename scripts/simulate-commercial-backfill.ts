import { readLegacyReport } from "../src/server/services/commercial-backfill.service";
import type { Prisma } from "@prisma/client";
import { writeFileSync } from "node:fs";

// Explicit anonymous fixtures. No environment, provider or database is queried.
const now = new Date("2026-10-22T12:00:00Z");
const future = new Date("2026-11-22T12:00:00Z");
const base = { id: "anonymous-subscription", plan: "EQUIPO", status: "ACTIVE", billingCycle: "MONTHLY", isTrial: false, trialEndsAt: null,
  extraStaffCount: 2, staffLimitOverride: null, paymentMethod: "AUTOMATIC", customMonthlyPriceClp: null,
  pendingDiscountPercentage: null, hasCountedAsPaidReferral: false, freeMonthsRemaining: 0, activePrizeId: null, promoName: null,
  promoFreeMonthsRemaining: 0, promoDiscountPercentage: null, promoDiscountMonthsRemaining: 0, nextBillingOverrideAmount: null,
  billingNotes: null, mpCustomerId: null, mpSubscriptionId: "anonymous-provider-reference", paddleCustomerId: null, paddleSubscriptionId: null,
  currentPeriodEnd: future, gracePeriodEndsAt: null, updatedAt: now };
const fixtures: { name: string; changes: Record<string, unknown>; website?: boolean; currency?: string }[] = [
  { name: "equipo", changes: {} }, { name: "individual", changes: { plan: "INDIVIDUAL", extraStaffCount: 0 } },
  { name: "test", changes: { plan: "TEST", extraStaffCount: 0 } },
  { name: "discount", changes: { pendingDiscountPercentage: 25 } },
  { name: "website", changes: {}, website: true },
  { name: "trial-free-months", changes: { status: "TRIALING", isTrial: true, trialEndsAt: future, freeMonthsRemaining: 2 } },
  { name: "past-due", changes: { status: "PAST_DUE", gracePeriodEndsAt: null } },
  { name: "manual-price", changes: { paymentMethod: "BANK_TRANSFER", customMonthlyPriceClp: 9990, staffLimitOverride: 3 } },
  { name: "incomplete", changes: { currentPeriodEnd: null } },
  { name: "international-unresolved", changes: {}, currency: "USD" },
];
async function main() {
const reports = [];
for (const fixture of fixtures) {
  const db = {
    business: { findUnique: async () => ({ id: fixture.name, currencyCode: fixture.currency ?? "CLP" }) },
    subscription: { findUnique: async () => ({ ...base, ...fixture.changes }) },
    staff: { count: async ({ where }: { where: { isActive?: boolean } }) => where.isActive ? 2 : 4 },
    websiteAddon: { findUnique: async () => fixture.website ? { status: "ACTIVE", provider: "mercadopago", validUntil: future } : null },
    commercialSubscription: { findUnique: async () => null },
  } as unknown as Pick<Prisma.TransactionClient, "business" | "subscription" | "staff" | "websiteAddon" | "commercialSubscription">;
  const report = await readLegacyReport(db, fixture.name, now);
  reports.push({ fixture: fixture.name, legacyAccess: report.legacyAccess, shadowAccess: report.commercialAccess,
    seats: report.snapshotInput.professionalTotal, amountClp: report.snapshotInput.totalPriceClp,
    warnings: report.warnings, differences: report.differences, preservedTerms: report.snapshotInput.termsSnapshot });
}
const json = JSON.stringify({ fixtureOnly: true, now, reports }, null, 2);
const path = process.argv[2];
if (path) writeFileSync(path, json + "\n");
else console.log(json);

}
main().catch(() => { console.error("Fixture simulation failed"); process.exitCode = 1; });
