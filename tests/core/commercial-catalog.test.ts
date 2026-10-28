import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_CATALOG_VERSION,
  COMMERCIAL_CURRENCY,
  CommercialCatalogError,
  calculateProfessionalSurcharge,
  getCommercialPlanMetadata,
  quoteCommercialPlan,
  quoteCommercialAnnualPlan,
  quoteLegacyPlan,
} from "@/core/commercial-catalog";

function expectCatalogError(action: () => unknown, code: string) {
  try {
    action();
    throw new Error("Expected CommercialCatalogError");
  } catch (error) {
    expect(error).toBeInstanceOf(CommercialCatalogError);
    expect((error as CommercialCatalogError).code).toBe(code);
  }
}

describe("commercial catalog V2", () => {
  it("matches every approved monthly price", () => {
    const expected = [
      [1, 12_990, 27_990],
      [2, 17_990, 32_990],
      [3, 22_490, 37_490],
      [4, 26_490, 41_490],
      [5, 29_990, 44_990],
      [6, 32_990, 47_990],
      [7, 35_990, 50_990],
      [8, 38_990, 53_990],
      [100, 314_990, 329_990],
    ] as const;

    for (const [professionalTotal, puragenda, plus] of expected) {
      expect(
        quoteCommercialPlan({
          catalogVersion: COMMERCIAL_CATALOG_VERSION,
          plan: "PURAGENDA",
          professionalTotal,
        }).monthlyTotal,
      ).toBe(puragenda);
      expect(
        quoteCommercialPlan({
          catalogVersion: COMMERCIAL_CATALOG_VERSION,
          plan: "PURAGENDA_PLUS",
          professionalTotal,
        }).monthlyTotal,
      ).toBe(plus);
    }
  });

  it("accumulates fixed steps and the sixth-professional tier exactly", () => {
    expect(calculateProfessionalSurcharge(1)).toBe(0);
    expect(calculateProfessionalSurcharge(5)).toBe(17_000);
    expect(calculateProfessionalSurcharge(6)).toBe(20_000);
    expect(calculateProfessionalSurcharge(7)).toBe(23_000);
    expect(calculateProfessionalSurcharge(100)).toBe(302_000);

    const quote = quoteCommercialPlan({
      catalogVersion: COMMERCIAL_CATALOG_VERSION,
      plan: "PURAGENDA",
      professionalTotal: 8,
    });
    expect(quote.surchargeSteps).toEqual([
      { fromProfessional: 2, toProfessional: 2, unitAmount: 5_000, quantity: 1, subtotal: 5_000 },
      { fromProfessional: 3, toProfessional: 3, unitAmount: 4_500, quantity: 1, subtotal: 4_500 },
      { fromProfessional: 4, toProfessional: 4, unitAmount: 4_000, quantity: 1, subtotal: 4_000 },
      { fromProfessional: 5, toProfessional: 5, unitAmount: 3_500, quantity: 1, subtotal: 3_500 },
      { fromProfessional: 6, toProfessional: 8, unitAmount: 3_000, quantity: 3, subtotal: 9_000 },
    ]);
  });

  it("keeps the Plus difference fixed and prices monotonic", () => {
    let previous = 0;
    for (let total = 1; total <= 100; total += 1) {
      const puragenda = quoteCommercialPlan({
        catalogVersion: COMMERCIAL_CATALOG_VERSION,
        plan: "PURAGENDA",
        professionalTotal: total,
      }).monthlyTotal;
      const plus = quoteCommercialPlan({
        catalogVersion: COMMERCIAL_CATALOG_VERSION,
        plan: "PURAGENDA_PLUS",
        professionalTotal: total,
      }).monthlyTotal;
      expect(plus - puragenda).toBe(15_000);
      expect(puragenda).toBeGreaterThanOrEqual(previous);
      previous = puragenda;
    }
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "2", null])(
    "rejects invalid professional total %j",
    (professionalTotal) => {
      expectCatalogError(
        () =>
          quoteCommercialPlan({
            catalogVersion: COMMERCIAL_CATALOG_VERSION,
            plan: "PURAGENDA",
            professionalTotal: professionalTotal as never,
          }),
        "INVALID_PROFESSIONAL_TOTAL",
      );
    },
  );

  it("rejects unsafe monetary overflow", () => {
    expectCatalogError(
      () =>
        quoteCommercialPlan({
          catalogVersion: COMMERCIAL_CATALOG_VERSION,
          plan: "PURAGENDA",
          professionalTotal: Number.MAX_SAFE_INTEGER,
        }),
      "UNSAFE_AMOUNT",
    );
  });

  it("rejects invalid plan, version and annual V2 billing", () => {
    expectCatalogError(
      () =>
        quoteCommercialPlan({
          catalogVersion: COMMERCIAL_CATALOG_VERSION,
          plan: "BASE" as never,
          professionalTotal: 1,
        }),
      "INVALID_PLAN",
    );
    expectCatalogError(
      () =>
        quoteCommercialPlan({
          catalogVersion: "puragenda-next-v0",
          plan: "PURAGENDA",
          professionalTotal: 1,
        }),
      "UNKNOWN_VERSION",
    );
    expectCatalogError(
      () =>
        quoteCommercialPlan({
          catalogVersion: COMMERCIAL_CATALOG_VERSION,
          plan: "PURAGENDA_PLUS",
          professionalTotal: 1,
          billingCycle: "ANNUAL",
        }),
      "UNSUPPORTED_BILLING_CYCLE",
    );
  });

  it("exposes metadata without granting runtime permissions", () => {
    const puragenda = getCommercialPlanMetadata("PURAGENDA");
    const plus = getCommercialPlanMetadata("PURAGENDA_PLUS");
    const legacy = getCommercialPlanMetadata("EQUIPO");

    expect(puragenda).toMatchObject({
      plan: "PURAGENDA",
      displayName: "Puragenda",
      legacy: false,
      baseMonthly: 12_990,
      includedProfessionals: 1,
      annualPolicy: "TWO_MONTHS_FREE",
    });
    expect(plus.capabilities).toContain("puri.plus");
    expect(plus.capabilities).toContain("contact_flow");
    expect(puragenda.capabilities).not.toContain("puri.plus");
    expect(legacy).toMatchObject({
      plan: "EQUIPO",
      legacy: true,
      baseMonthly: 29_990,
      includedProfessionals: 5,
      annualPolicy: "LEGACY_MULTIPLIER_10",
    });
  });

  it.each([
    [1, 129_900, 279_900],
    [2, 179_900, 329_900],
    [3, 224_900, 374_900],
    [5, 299_900, 449_900],
    [6, 329_900, 479_900],
    [20, 749_900, 899_900],
  ])("offers 12 months for the price of 10 with %i professionals", (professionalTotal, baseAnnual, plusAnnual) => {
    for (const [plan, expected] of [["PURAGENDA", baseAnnual], ["PURAGENDA_PLUS", plusAnnual]] as const) {
      const quote = quoteCommercialAnnualPlan({ catalogVersion: COMMERCIAL_CATALOG_VERSION, plan, professionalTotal });
      expect(quote).toMatchObject({ billingCycle: "ANNUAL", cycleTotal: expected, freeMonths: 2, professionalTotal });
      expect(quote.monthlyEquivalent * 12).toBeCloseTo(expected);
      expect(quote.savings).toBe(quote.monthlyTotal * 2);
    }
  });

  it("rejects invalid annual capacity and amounts without changing monthly billing", () => {
    for (const [professionalTotal, error] of [[0, "INVALID_PROFESSIONAL_TOTAL"], [Number.MAX_SAFE_INTEGER, "UNSAFE_AMOUNT"]] as const) {
      expectCatalogError(() => quoteCommercialAnnualPlan({ catalogVersion: COMMERCIAL_CATALOG_VERSION, plan: "PURAGENDA_PLUS", professionalTotal }), error);
    }
    expectCatalogError(() => quoteCommercialPlan({ catalogVersion: COMMERCIAL_CATALOG_VERSION, plan: "PURAGENDA_PLUS", professionalTotal: 1, billingCycle: "ANNUAL" }), "UNSUPPORTED_BILLING_CYCLE");
  });

  it("keeps legacy quotes explicit and isolated", () => {
    expect(quoteLegacyPlan({ plan: "INDIVIDUAL", billingCycle: "MONTHLY", extraStaffCount: 0 })).toMatchObject({
      catalogVersion: "legacy-current",
      total: 12_990,
      currencyCode: COMMERCIAL_CURRENCY,
    });
    expect(quoteLegacyPlan({ plan: "EQUIPO", billingCycle: "MONTHLY", extraStaffCount: 20 })).toMatchObject({
      total: 89_990,
      extraCost: 60_000,
    });
    expect(quoteLegacyPlan({ plan: "EQUIPO", billingCycle: "ANNUAL", extraStaffCount: 0 }).total).toBe(299_900);
    expectCatalogError(
      () => quoteLegacyPlan({ plan: "PURAGENDA", billingCycle: "MONTHLY", extraStaffCount: 0 }),
      "INVALID_PLAN",
    );
    expectCatalogError(
      () => quoteLegacyPlan({ plan: "EQUIPO", billingCycle: "MONTHLY", extraStaffCount: 1.2 }),
      "INVALID_LEGACY_EXTRA_STAFF",
    );
  });

  it("is deterministic and repeats safe integer outputs", () => {
    const input = {
      catalogVersion: COMMERCIAL_CATALOG_VERSION,
      plan: "PURAGENDA_PLUS",
      professionalTotal: 100,
    } as const;
    const first = quoteCommercialPlan(input);
    const second = quoteCommercialPlan(input);
    expect(second).toEqual(first);
    expect(Number.isSafeInteger(first.monthlyTotal)).toBe(true);
    expect(Number.isSafeInteger(first.professionalSurchargeMonthly)).toBe(true);
  });
});
