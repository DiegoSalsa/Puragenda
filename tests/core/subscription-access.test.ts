import { describe, expect, it } from "vitest";
import {
  getSubscriptionAccessState,
  hasOperationalSubscriptionAccess,
  isTrialCurrentlyActive,
} from "@/core/subscription-access";

const now = new Date("2026-09-14T12:00:00.000Z");

describe("operational subscription access", () => {
  it("allows ACTIVE", () => {
    expect(hasOperationalSubscriptionAccess({ status: "ACTIVE" }, now)).toBe(true);
  });

  it("allows only a coherent, unexpired TRIALING trial", () => {
    expect(isTrialCurrentlyActive({ status: "TRIALING", isTrial: true, trialEndsAt: "2026-09-14T12:00:00.001Z" }, now)).toBe(true);
    expect(hasOperationalSubscriptionAccess({ status: "TRIALING", isTrial: false, trialEndsAt: "2026-09-15T12:00:00Z" }, now)).toBe(false);
    expect(hasOperationalSubscriptionAccess({ status: "TRIALING", isTrial: true, trialEndsAt: null }, now)).toBe(false);
  });

  it("blocks at the exact trial expiry instant and afterwards", () => {
    expect(getSubscriptionAccessState({ status: "TRIALING", isTrial: true, trialEndsAt: now }, now)).toBe("TRIAL_EXPIRED");
    expect(hasOperationalSubscriptionAccess({ status: "TRIALING", isTrial: true, trialEndsAt: "2026-09-14T11:59:59.999Z" }, now)).toBe(false);
  });

  it("allows PAST_DUE only before the grace deadline", () => {
    expect(getSubscriptionAccessState({ status: "PAST_DUE", gracePeriodEndsAt: "2026-09-14T12:00:00.001Z" }, now)).toBe("PAST_DUE_GRACE");
    expect(hasOperationalSubscriptionAccess({ status: "PAST_DUE", gracePeriodEndsAt: now }, now)).toBe(false);
    expect(hasOperationalSubscriptionAccess({ status: "PAST_DUE", gracePeriodEndsAt: null }, now)).toBe(false);
  });

  it.each(["INACTIVE", "CANCELLED", "UNKNOWN"])("blocks %s", (status) => {
    expect(hasOperationalSubscriptionAccess({ status }, now)).toBe(false);
  });

  it("blocks a missing subscription", () => {
    expect(getSubscriptionAccessState(null, now)).toBe("UNAVAILABLE");
    expect(hasOperationalSubscriptionAccess(null, now)).toBe(false);
  });
});
