import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY,
  evaluateCommercialEntitlements,
  hasCommercialCapability,
} from "@/core/commercial-entitlements";

const now = new Date("2026-10-21T12:00:00.000Z");

describe("commercial entitlement evaluation", () => {
  it("derives Puragenda capabilities and seat quantity without role permissions", () => {
    const evaluation = evaluateCommercialEntitlements({
      plan: "PURAGENDA",
      status: "ACTIVE",
      professionalTotal: 8,
    }, now);

    expect(evaluation.commercialAccess).toBe(true);
    expect(evaluation.capabilities).toContain("agenda.operations");
    expect(evaluation.capabilities).toContain("puri.standard");
    expect(evaluation.capabilities).not.toContain("puri.plus");
    expect(evaluation.quantities[COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY]).toBe(8);
    expect(evaluation.capabilities).not.toContain("analytics.commercial");
  });

  it("adds Plus-only commercial capabilities while keeping the same seat quantity", () => {
    const evaluation = evaluateCommercialEntitlements({
      plan: "PURAGENDA_PLUS",
      status: "ACTIVE",
      professionalTotal: 2,
    }, now);

    expect(hasCommercialCapability(evaluation, "puri.plus")).toBe(true);
    expect(hasCommercialCapability(evaluation, "contact_flow")).toBe(true);
    expect(hasCommercialCapability(evaluation, "website.editor")).toBe(true);
    expect(evaluation.quantities[COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY]).toBe(2);
  });

  it.each([
    ["DRAFT", "COMMERCIAL_ACCESS_BLOCKED"],
    ["PENDING_PAYMENT", "COMMERCIAL_ACCESS_BLOCKED"],
    ["PAST_DUE_BLOCKED", "COMMERCIAL_ACCESS_BLOCKED"],
    ["CANCELLED", "COMMERCIAL_ACCESS_BLOCKED"],
    ["UNKNOWN", "COMMERCIAL_ACCESS_BLOCKED"],
  ] as const)("does not grant %s access", (status, reason) => {
    const evaluation = evaluateCommercialEntitlements({ plan: "PURAGENDA_PLUS", status, professionalTotal: 1 }, now);
    expect(evaluation.commercialAccess).toBe(false);
    expect(evaluation.reason).toBe(reason);
    expect(evaluation.capabilities).toEqual([]);
  });

  it("requires unexpired trial and grace evidence", () => {
    expect(evaluateCommercialEntitlements({
      plan: "PURAGENDA",
      status: "TRIALING",
      professionalTotal: 1,
      trialEnd: new Date("2026-10-21T12:00:00.001Z"),
    }, now).commercialAccess).toBe(true);
    expect(evaluateCommercialEntitlements({
      plan: "PURAGENDA",
      status: "TRIALING",
      professionalTotal: 1,
      trialEnd: now,
    }, now).reason).toBe("TRIAL_EXPIRED");
    expect(evaluateCommercialEntitlements({
      plan: "PURAGENDA",
      status: "PAST_DUE_GRACE",
      professionalTotal: 1,
      gracePeriodEndsAt: now,
    }, now).reason).toBe("GRACE_EXPIRED");
  });

  it("keeps scheduled changes accessible until the current period ends", () => {
    const evaluation = evaluateCommercialEntitlements({
      plan: "PURAGENDA_PLUS",
      status: "SCHEDULED_CHANGE",
      professionalTotal: 5,
      periodEnd: new Date("2026-10-22T12:00:00.000Z"),
    }, now);
    expect(evaluation.commercialAccess).toBe(true);
    expect(evaluation.reason).toBeNull();
  });

  it("rejects unsafe capacity inputs and unknown plans without granting access", () => {
    expect(() => evaluateCommercialEntitlements({ plan: "PURAGENDA", status: "ACTIVE", professionalTotal: 0 })).toThrow();
    const unknown = evaluateCommercialEntitlements({ plan: "NOT_A_PLAN", status: "ACTIVE", professionalTotal: 1 }, now);
    expect(unknown.commercialAccess).toBe(false);
    expect(unknown.reason).toBe("UNKNOWN_PLAN");
  });
});


describe("commercial contract validity", () => {
  it("expires a paid period, rejects a future period and preserves explicit grace", () => {
    const base = { plan: "PURAGENDA_PLUS", professionalTotal: 1, status: "ACTIVE" as const };
    expect(evaluateCommercialEntitlements({ ...base, periodEnd: now }, now).reason).toBe("PERIOD_EXPIRED");
    expect(evaluateCommercialEntitlements({ ...base, periodStart: new Date(now.getTime() + 1) }, now).reason).toBe("PERIOD_NOT_STARTED");
    expect(evaluateCommercialEntitlements({ ...base, status: "PAST_DUE_GRACE", periodEnd: now,
      gracePeriodEndsAt: new Date(now.getTime() + 1) }, now).commercialAccess).toBe(true);
  });
  it("rejects object-prototype keys as unknown plans", () => {
    expect(evaluateCommercialEntitlements({ plan: "__proto__", status: "ACTIVE", professionalTotal: 1 }, now).reason).toBe("UNKNOWN_PLAN");
  });
});
