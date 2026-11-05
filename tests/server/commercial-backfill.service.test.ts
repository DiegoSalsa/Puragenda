import { describe, expect, it } from "vitest";
import { readLegacyReport } from "@/server/services/commercial-backfill.service";

const now = new Date("2026-10-21T12:00:00.000Z");

function fixtureDb(overrides: Record<string, unknown> = {}) {
  const subscription = {
    id: "legacy-subscription",
    plan: "EQUIPO",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
    isTrial: false,
    trialEndsAt: null,
    extraStaffCount: 2,
    staffLimitOverride: null,
    paymentMethod: "AUTOMATIC",
    customMonthlyPriceClp: null,
    pendingDiscountPercentage: null,
    hasCountedAsPaidReferral: false,
    freeMonthsRemaining: 0,
    activePrizeId: null,
    promoName: null,
    promoFreeMonthsRemaining: 0,
    promoDiscountPercentage: null,
    promoDiscountMonthsRemaining: 0,
    nextBillingOverrideAmount: null,
    billingNotes: null,
    mpCustomerId: "payer-reference",
    mpSubscriptionId: "subscription-reference",
    paddleCustomerId: null,
    paddleSubscriptionId: null,
    currentPeriodEnd: new Date("2026-11-21T12:00:00.000Z"),
    gracePeriodEndsAt: null,
    ...overrides,
  };
  return {
    business: { findUnique: async () => ({ id: "business", currencyCode: "CLP" }) },
    subscription: { findUnique: async () => subscription },
    staff: {
      count: async ({ where }: { where: { isActive?: boolean } }) => where.isActive === true ? 3 : 4,
    },
    websiteAddon: {
      findUnique: async () => ({ status: "ACTIVE", provider: "paddle", validUntil: null }),
    },
    commercialSubscription: {
      findUnique: async () => null,
    },
  } as never;
}

describe("legacy commercial backfill report", () => {
  it("preserves legacy capacity, provider references and active website add-on as warnings", async () => {
    const report = await readLegacyReport(fixtureDb(), "business", now);
    expect(report.snapshotInput).toMatchObject({
      businessId: "business",
      plan: "EQUIPO",
      catalogVersion: "legacy-current",
      professionalTotal: 7,
      legacyExtraStaffCount: 2,
      externalSubscriptionId: "subscription-reference",
    });
    expect(report.warnings).toContain("ACTIVE_WEBSITE_ADDON_PRESERVED_AS_LEGACY_ITEM");
    expect(report.snapshotInput.legacyAddon).toMatchObject({ code: "legacy.website_addon", amountClp: null });
    expect(report.legacyAccess).toBe(true);
    expect(report.commercialAccess).toBe(true);
    expect(report.alreadyBackfilled).toBe(false);
  });

  it("does not invent access or dates for expired trial and past due legacy records", async () => {
    const trial = await readLegacyReport(fixtureDb({
      plan: "INDIVIDUAL",
      status: "TRIALING",
      isTrial: true,
      trialEndsAt: new Date("2026-10-20T12:00:00.000Z"),
      extraStaffCount: 0,
      currentPeriodEnd: null,
    }), "business", now);
    expect(trial.commercialAccess).toBe(false);
    expect(trial.warnings).toContain("TRIAL_DATE_INCONSISTENT");

    const pastDue = await readLegacyReport(fixtureDb({
      plan: "INDIVIDUAL",
      status: "PAST_DUE",
      gracePeriodEndsAt: new Date("2026-10-20T12:00:00.000Z"),
      extraStaffCount: 0,
    }), "business", now);
    expect(pastDue.commercialAccess).toBe(false);
    expect(pastDue.warnings).toContain("PAST_DUE_REQUIRES_PROVIDER_RECONCILIATION");
  });

  it("keeps a manual price and its terms visible for explicit review", async () => {
    const report = await readLegacyReport(fixtureDb({
      plan: "INDIVIDUAL",
      customMonthlyPriceClp: 9990,
      paymentMethod: "BANK_TRANSFER",
      extraStaffCount: 0,
      staffLimitOverride: 1,
    }), "business", now);
    expect(report.snapshotInput.totalPriceClp).toBe(9990);
    expect(report.warnings).toContain("MANUAL_PRICE_PRESERVED");
    expect(report.differences).toContain("CUSTOM_PRICE_REQUIRES_EXPLICIT_TERMS_REVIEW");
    expect(report.snapshotInput.termsSnapshot).toMatchObject({ customMonthlyPriceClp: 9990 });
  });
});
