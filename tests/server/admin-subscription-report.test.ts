import { describe, expect, it, vi } from "vitest";
vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
import { getAdminSubscriptionReport, getAdminRevenueSummary, readManualPaymentEvidence } from "@/server/services/admin-subscription-report";

const now = new Date("2026-10-17T17:00:00Z");
const chile = { countryCode: "CL", currencyCode: "CLP" };
const normal = { plan: "EQUIPO" as const, status: "ACTIVE" as const, isTrial: false, billingCycle: "MONTHLY" as const, extraStaffCount: 0, mpSubscriptionId: "provider" };
const manual = { ...normal, paymentMethod: "BANK_TRANSFER" as const, customMonthlyPriceClp: 17990, staffLimitOverride: 2, currentPeriodEnd: new Date("2026-11-16T03:00:00Z") };

describe("superadmin billing reports", () => {
  it("shows received payments only when valid audit evidence exists", () => {
    const evidence = { currency: "CLP", amountClp: 17990, reference: "operator-confirmation", paidFrom: "2026-10-17T03:00:00Z", paidThrough: "2026-11-16T03:00:00Z" };
    expect(readManualPaymentEvidence(JSON.stringify(evidence))).toMatchObject({ amountClp: 17990, reference: "operator-confirmation" });
    for (const invalid of [null, "not json", "{}", JSON.stringify({ ...evidence, paidThrough: evidence.paidFrom }), JSON.stringify({ ...evidence, amountClp: -1 })]) expect(readManualPaymentEvidence(invalid)).toBeNull();
  });
  it("reports the manual agreement despite a retained provider reference", () => {
    expect(getAdminSubscriptionReport(manual, chile, now)).toMatchObject({
      method: "BANK_TRANSFER", methodLabel: "Transferencia bancaria", isCourtesy: false,
      baseAmount: 17990, amountDue: 17990, staffLimit: 2, monthlyRevenueClp: 17990,
      nextTransferClp: 17990, nextAutomaticClp: 0, hasCustomPrice: true,
      periodEnd: "2026-11-16T03:00:00.000Z",
    });
  });
  it("does not require a provider reference for paid transfers", () => {
    expect(getAdminSubscriptionReport({ ...manual, mpSubscriptionId: null }, chile, now)).toMatchObject({ isCourtesy: false, monthlyRevenueClp: 17990 });
  });
  it("keeps standard Equipo and Individual prices and capacities", () => {
    expect(getAdminSubscriptionReport(normal, chile, now)).toMatchObject({ staffLimit: 5, baseAmount: 29990, nextAutomaticClp: 29990 });
    expect(getAdminSubscriptionReport({ ...normal, plan: "INDIVIDUAL" }, chile, now)).toMatchObject({ staffLimit: 1, baseAmount: 12990 });
  });
  it("includes extras and monthly normalizes the actual annual price", () => {
    expect(getAdminSubscriptionReport({ ...normal, extraStaffCount: 2, billingCycle: "ANNUAL" }, chile, now)).toMatchObject({ baseAmount: 359900, staffLimit: 7, monthlyRevenueClp: 359900 / 12 });
  });
  it("separates contract value from a promotional next charge", () => {
    expect(getAdminSubscriptionReport({ ...normal, nextBillingOverrideAmount: 1000 }, chile, now)).toMatchObject({ baseAmount: 29990, monthlyRevenueClp: 29990, nextAutomaticClp: 1000 });
  });
  it.each(["INACTIVE", "CANCELLED", "TRIALING", "PAST_DUE"] as const)("excludes %s from expected revenue", status => {
    expect(getAdminSubscriptionReport({ ...manual, status }, chile, now)).toMatchObject({ monthlyRevenueClp: 0, nextTransferClp: 0, nextAutomaticClp: 0 });
  });
  it("does not count trials as paid accounts", () => {
    expect(getAdminSubscriptionReport({ ...normal, isTrial: true }, chile, now).monthlyRevenueClp).toBe(0);
  });
  it("does not project an expired manual period as an active transfer", () => {
    expect(getAdminSubscriptionReport({ ...manual, currentPeriodEnd: now }, chile, now)).toMatchObject({ manualExpired: true, monthlyRevenueClp: 0, nextTransferClp: 0 });
  });
  it("does not label a courtesy or an unconfirmed mode as automatic revenue", () => {
    expect(getAdminSubscriptionReport({ ...normal, mpSubscriptionId: null, currentPeriodEnd: new Date("2099-01-01") }, chile, now)).toMatchObject({ method: "COURTESY", monthlyRevenueClp: 0 });
    expect(getAdminSubscriptionReport({ ...normal, mpSubscriptionId: null }, chile, now)).toMatchObject({ method: "UNCONFIRMED", monthlyRevenueClp: 0 });
  });
  it("does not invent CLP prices for international accounts", () => {
    expect(getAdminSubscriptionReport({ ...normal, paddleSubscriptionId: "international" }, { countryCode: "MX", currencyCode: "MXN" }, now)).toMatchObject({ method: "PADDLE", baseAmount: null, amountDue: null, monthlyRevenueClp: 0, currencyCode: "MXN" });
  });
  it("reconciles totals across mixed agreements", () => {
    const reports = [manual, normal, { ...normal, plan: "INDIVIDUAL" as const, billingCycle: "ANNUAL" as const }].map(s => getAdminSubscriptionReport(s, chile, now));
    expect(getAdminRevenueSummary(reports)).toEqual({ monthlyRevenueClp: 58805, nextTransferClp: 17990, nextAutomaticClp: 159890, internationalCount: 0 });
  });
});
