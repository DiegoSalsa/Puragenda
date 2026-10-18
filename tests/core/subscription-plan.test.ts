import { describe, expect, it } from "vitest";
import { getStaffLimit, usesBusinessScheduleOnly } from "@/core/subscription-plan";
import { MARKETING_LIMITS, PRICING } from "@/core/constants";

describe("subscription staff capacity", () => {
  it("keeps the standard plans and extras", () => {
    expect(getStaffLimit({ plan: "EQUIPO" })).toBe(5);
    expect(getStaffLimit({ plan: "EQUIPO", extraStaffCount: 2 })).toBe(7);
    expect(getStaffLimit({ plan: "INDIVIDUAL", extraStaffCount: 2 })).toBe(1);
    expect(getStaffLimit({ plan: "TEST" })).toBe(1);
    expect(getStaffLimit(null)).toBe(1);
    expect(PRICING.EQUIPO.monthly).toBe(29990);
    expect(PRICING.INDIVIDUAL.monthly).toBe(12990);
  });

  it("uses the commercial cap as an absolute limit without downgrading Equipo", () => {
    const subscription = { plan: "EQUIPO" as const, staffLimitOverride: 2, extraStaffCount: 10 };
    expect(getStaffLimit(subscription)).toBe(2);
    expect(usesBusinessScheduleOnly(subscription.plan)).toBe(false);
    expect(MARKETING_LIMITS[subscription.plan].maxEmails).toBe(100);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid overrides: %s", (staffLimitOverride) => {
    expect(() => getStaffLimit({ plan: "EQUIPO", staffLimitOverride })).toThrow("entero positivo");
  });
});
