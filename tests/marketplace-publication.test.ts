import { describe, expect, it } from "vitest";
import {
  MARKETPLACE_QUALITY_GATE,
  canPublishMarketplaceListing,
  locationHasBookableAppointmentService,
  marketplacePublishBlockers,
} from "@/lib/marketplace";

const ready = {
  authorizationConfirmed: true,
  hasActiveCategory: true,
  hasCanonicalLocality: true,
  deleted: false,
  demo: false,
  slug: "soccerbarber",
  plan: "INDIVIDUAL" as const,
  subscriptionActive: true,
  locationActive: true,
  hasBookableService: true,
};

describe("marketplace publish rules", () => {
  it("defaults to not publishable without authorization, category or locality", () => {
    expect(canPublishMarketplaceListing({
      ...ready,
      authorizationConfirmed: false,
      hasActiveCategory: false,
      hasCanonicalLocality: false,
    })).toBe(false);
    expect(marketplacePublishBlockers({
      ...ready,
      authorizationConfirmed: false,
      hasActiveCategory: false,
      hasCanonicalLocality: false,
    })).toEqual(["authorization_required", "category_required", "locality_required"]);
  });

  it("allows a complete curated listing", () => {
    expect(canPublishMarketplaceListing(ready)).toBe(true);
  });

  it("excludes demo, TEST, deleted, inactive location and missing services", () => {
    expect(marketplacePublishBlockers({ ...ready, slug: "purocode-demo" })).toContain("demo_excluded");
    expect(marketplacePublishBlockers({ ...ready, slug: "estetica-bella" })).toContain("demo_excluded");
    expect(marketplacePublishBlockers({ ...ready, plan: "TEST" })).toContain("test_plan_excluded");
    expect(marketplacePublishBlockers({ ...ready, deleted: true })).toContain("business_deleted");
    expect(marketplacePublishBlockers({ ...ready, locationActive: false })).toContain("location_inactive");
    expect(marketplacePublishBlockers({ ...ready, hasBookableService: false })).toContain("bookable_service_required");
    expect(marketplacePublishBlockers({ ...ready, subscriptionActive: false })).toContain("subscription_inactive");
  });

  it("treats unassigned services as available on the location and ignores production-only catalogs", () => {
    expect(locationHasBookableAppointmentService({
      locationId: "loc-1",
      productionOrdersEnabled: false,
      services: [{ bookingMode: "APPOINTMENT", locationIds: [] }],
    })).toBe(true);
    expect(locationHasBookableAppointmentService({
      locationId: "loc-1",
      productionOrdersEnabled: true,
      services: [{ bookingMode: "PRODUCTION", locationIds: [] }],
    })).toBe(false);
    expect(locationHasBookableAppointmentService({
      locationId: "loc-1",
      productionOrdersEnabled: false,
      services: [{ bookingMode: "APPOINTMENT", locationIds: ["loc-2"] }],
    })).toBe(false);
  });

  it("keeps indexing disabled at the SEO-008 floor", () => {
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
    expect(MARKETPLACE_QUALITY_GATE.minPublicBusinesses).toBe(3);
    expect(MARKETPLACE_QUALITY_GATE.minBookableServices).toBe(3);
  });
});
