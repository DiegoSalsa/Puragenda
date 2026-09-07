import { describe, expect, it } from "vitest";
import {
  canPublishMarketplaceListing,
  isMarketplaceEligibleListing,
  isMarketplacePubliclyVisible,
  marketplacePublishBlockers,
  resolveMarketplacePublishedAt,
  type MarketplaceListingCandidate,
} from "@/lib/marketplace";

function candidate(
  overrides: Partial<MarketplaceListingCandidate> = {},
): MarketplaceListingCandidate {
  return {
    slug: "local-publico",
    name: "Local público",
    logoUrl: null,
    locationSlug: "principal",
    categorySlug: "barberias",
    citySlug: "concepcion",
    serviceNames: ["Corte"],
    status: "ACTIVE",
    deleted: false,
    directoryPublished: true,
    locationActive: true,
    demo: false,
    subscriptionActive: true,
    plan: "INDIVIDUAL",
    hasBookableService: true,
    ...overrides,
  };
}

const ready = {
  status: "ACTIVE" as const,
  authorizationConfirmed: true,
  hasActiveCategory: true,
  hasCanonicalLocality: true,
  deleted: false,
  demo: false,
  slug: "local-publico",
  plan: "INDIVIDUAL" as const,
  locationActive: true,
  hasBookableService: true,
};

describe("marketplace operational status", () => {
  it("A. PENDING_REVIEW is not public", () => {
    expect(isMarketplacePubliclyVisible(candidate({ status: "PENDING_REVIEW" }))).toBe(false);
    expect(isMarketplaceEligibleListing(candidate({ status: "PENDING_REVIEW" }))).toBe(false);
  });

  it("B. ACTIVE + authorized + unpublished is not public", () => {
    expect(isMarketplacePubliclyVisible(candidate({ directoryPublished: false }))).toBe(false);
  });

  it("C. ACTIVE + unauthorized + published accidental is not public at the service layer", () => {
    expect(marketplacePublishBlockers({ ...ready, authorizationConfirmed: false })).toContain(
      "authorization_required",
    );
    expect(canPublishMarketplaceListing({ ...ready, authorizationConfirmed: false })).toBe(false);
  });

  it("D. ACTIVE + authorized + published + service is public", () => {
    expect(isMarketplacePubliclyVisible(candidate())).toBe(true);
    expect(isMarketplaceEligibleListing(candidate())).toBe(true);
    expect(canPublishMarketplaceListing(ready)).toBe(true);
  });

  it("E. PAUSED with residual publishedAt is not public", () => {
    expect(isMarketplacePubliclyVisible(candidate({
      status: "PAUSED",
      directoryPublished: true,
    }))).toBe(false);
  });

  it("F. EXCLUDED is not public", () => {
    expect(isMarketplacePubliclyVisible(candidate({ status: "EXCLUDED" }))).toBe(false);
  });

  it("G. inactive location is not public", () => {
    expect(isMarketplacePubliclyVisible(candidate({ locationActive: false }))).toBe(false);
  });

  it("H. demo/TEST is not public", () => {
    expect(isMarketplacePubliclyVisible(candidate({ slug: "purocode-demo" }))).toBe(false);
    expect(isMarketplacePubliclyVisible(candidate({ demo: true }))).toBe(false);
    expect(isMarketplacePubliclyVisible(candidate({ plan: "TEST" }))).toBe(false);
  });

  it("I. missing bookable service is not public", () => {
    expect(isMarketplacePubliclyVisible(candidate({ hasBookableService: false }))).toBe(false);
  });

  it("J. pausing unpublishes", () => {
    const now = new Date("2026-09-07T12:00:00.000Z");
    expect(resolveMarketplacePublishedAt({
      status: "PAUSED",
      wantPublished: true,
      existingPublishedAt: now,
      now,
    })).toBeNull();
    expect(resolveMarketplacePublishedAt({
      status: "EXCLUDED",
      wantPublished: true,
      existingPublishedAt: now,
      now,
    })).toBeNull();
  });

  it("K. reactivating does not republish automatically", () => {
    const now = new Date("2026-09-07T12:00:00.000Z");
    expect(resolveMarketplacePublishedAt({
      status: "ACTIVE",
      wantPublished: false,
      existingPublishedAt: now,
      now,
    })).toBeNull();
    expect(resolveMarketplacePublishedAt({
      status: "ACTIVE",
      wantPublished: true,
      existingPublishedAt: null,
      now,
    })).toEqual(now);
  });

  it("does not treat subscription inactivity as marketplace operational status", () => {
    expect(isMarketplacePubliclyVisible(candidate({ subscriptionActive: false }))).toBe(true);
    expect(marketplacePublishBlockers(ready)).not.toContain("subscription_inactive");
  });
});
