import { describe, expect, it } from "vitest";
import { hasWebsiteTrial, isWebsiteFounderCandidate, websitePriceTier, WEBSITE_TRIAL_MS } from "@/websites/offers";

const launch = new Date("2026-10-01T00:00:00Z");
describe("website commercial offer", () => {
  it("uses the immutable business offer and exact fifteen-day boundary", () => {
    const offer = { offerCode: "BETA_FOUNDER", trialConsumedAt: launch, trialStartedAt: launch, trialEndsAt: new Date(launch.getTime() + WEBSITE_TRIAL_MS) } as const;
    expect(websitePriceTier(offer)).toBe("BETA_FOUNDER");
    expect(hasWebsiteTrial(offer, new Date(launch.getTime() + WEBSITE_TRIAL_MS - 1))).toBe(true);
    expect(hasWebsiteTrial(offer, new Date(launch.getTime() + WEBSITE_TRIAL_MS))).toBe(false);
  });
  it.each([
    ["active", false, true], ["scheduled cancellation", false, true], ["base trial", true, false], ["inactive", false, false],
  ])("classifies %s at launch", (_name, isTrial, expected) => {
    expect(isWebsiteFounderCandidate({ createdAt: launch, subscription: { status: expected ? "ACTIVE" : "INACTIVE", isTrial, currentPeriodEnd: new Date("2026-11-01") } }, launch)).toBe(expected);
  });
});
