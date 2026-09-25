import { describe, expect, it } from "vitest";
import { getDashboardPaymentWallReason } from "@/lib/dashboard/subscription-gate";
import { shouldShowWidgetSubscriptionUnavailable } from "@/lib/widget/subscription-gate";
import { operationalSubscriptionDeniedResponse } from "@/server/http/subscription-access";
import { isMarketplaceSubscriptionActive } from "@/lib/marketplace/publication";

const now = new Date("2026-09-14T12:00:00.000Z");
const expiredTrial = {
  status: "TRIALING",
  isTrial: true,
  trialEndsAt: new Date("2026-09-14T11:59:59.999Z"),
};

describe("subscription gates on operational surfaces", () => {
  it("shows the dashboard payment wall for an expired trial", () => {
    expect(getDashboardPaymentWallReason(expiredTrial, now)).toBe("pending");
  });

  it("keeps the public demo account inside the dashboard even when its trial lapsed", () => {
    expect(getDashboardPaymentWallReason(expiredTrial, now, { demoAccount: true })).toBeNull();
    expect(getDashboardPaymentWallReason({ status: "TRIALING", isTrial: false, trialEndsAt: expiredTrial.trialEndsAt }, now, { demoAccount: true })).toBeNull();
  });

  it("blocks the public widget but permits its simulation-only preview", () => {
    expect(shouldShowWidgetSubscriptionUnavailable(expiredTrial, false, now)).toBe(true);
    expect(shouldShowWidgetSubscriptionUnavailable(expiredTrial, true, now)).toBe(false);
  });

  it("returns a stable 403 contract for public write APIs", async () => {
    const response = operationalSubscriptionDeniedResponse(expiredTrial, now);
    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({
      error: "Las reservas online de este negocio no están disponibles temporalmente.",
      code: "SUBSCRIPTION_INACTIVE",
    });
  });

  it("does not reject an active trial", () => {
    expect(operationalSubscriptionDeniedResponse({
      status: "TRIALING",
      isTrial: true,
      trialEndsAt: new Date("2026-09-14T12:00:00.001Z"),
    }, now)).toBeNull();
  });

  it("restores all operational gates immediately after payment activates the same subscription", () => {
    const reactivated = { ...expiredTrial, status: "ACTIVE", isTrial: false };

    expect(getDashboardPaymentWallReason(reactivated, now)).toBeNull();
    expect(shouldShowWidgetSubscriptionUnavailable(reactivated, false, now)).toBe(false);
    expect(operationalSubscriptionDeniedResponse(reactivated, now)).toBeNull();
    expect(isMarketplaceSubscriptionActive(reactivated, now)).toBe(true);
  });
});
