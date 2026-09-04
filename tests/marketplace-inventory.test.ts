import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  MARKETPLACE_QUALITY_GATE,
  buildMarketplaceQualityGateReport,
  getIndexableMarketplacePaths,
  mapPublishedListingToCandidates,
  projectPublicMarketplaceCard,
  type PublishedListingRecord,
} from "@/lib/marketplace";

function record(overrides: Partial<PublishedListingRecord> = {}): PublishedListingRecord {
  return {
    publishedAt: new Date("2026-09-03T12:00:00.000Z"),
    locality: { slug: "concepcion" },
    location: { id: "loc-1", slug: "principal", isActive: true },
    business: {
      name: "Soccerbarber",
      slug: "soccerbarber",
      logoUrl: "https://res.cloudinary.com/demo/logo.png",
      deletedAt: null,
      productionOrdersEnabled: false,
      subscription: { plan: "INDIVIDUAL", status: "ACTIVE" },
      services: [
        { name: "Corte", bookingMode: "APPOINTMENT", locations: [] },
        { name: "Barba", bookingMode: "APPOINTMENT", locations: [] },
      ],
    },
    categories: [
      { category: { slug: "barberias", isActive: true, seoEnabled: true } },
      { category: { slug: "estetica", isActive: false, seoEnabled: false } },
    ],
    ...overrides,
  };
}

describe("marketplace inventory mapping", () => {
  it("expands only SEO-enabled categories and drops classification-only verticals", () => {
    const candidates = mapPublishedListingToCandidates(record({
      categories: [
        { category: { slug: "barberias", isActive: true, seoEnabled: true } },
        { category: { slug: "manicure", isActive: true, seoEnabled: false } },
        { category: { slug: "bienestar", isActive: true, seoEnabled: false } },
      ],
    }));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.categorySlug).toBe("barberias");
    expect(candidates[0]?.locationSlug).toBe("principal");
    expect(candidates[0]?.directoryPublished).toBe(true);
  });

  it("projects a booking path with the public location slug and no internal ids", () => {
    const [candidate] = mapPublishedListingToCandidates(record());
    const card = projectPublicMarketplaceCard(candidate);
    expect(card.bookingPath).toBe("/widget/soccerbarber?location=principal");
    expect(JSON.stringify(card)).not.toContain("loc-1");
    expect(JSON.stringify(card)).not.toContain("businessId");
    expect(JSON.stringify(card)).not.toContain("apiKey");
  });

  it("marks demo and unpublished rows so the public filter can drop them", () => {
    const demo = mapPublishedListingToCandidates(record({
      business: { ...record().business, slug: "purocode-demo" },
    }));
    expect(demo[0]?.demo).toBe(true);
    const unpublished = mapPublishedListingToCandidates(record({ publishedAt: null }));
    expect(unpublished[0]?.directoryPublished).toBe(false);
  });
});

describe("marketplace quality gate report", () => {
  it("reports floors without turning indexing on", () => {
    const candidates = Array.from({ length: 2 }, (_, index) => ({
      slug: `barber-${index}`,
      name: `Barber ${index}`,
      logoUrl: null,
      categorySlug: "barberias",
      citySlug: "concepcion",
      serviceNames: ["Corte", "Barba", "Cejas", "Fade"],
      deleted: false,
      directoryPublished: true,
      demo: false,
      subscriptionActive: true,
      plan: "INDIVIDUAL" as const,
      hasBookableService: true,
    }));
    const [row] = buildMarketplaceQualityGateReport(candidates);
    expect(row).toMatchObject({
      categorySlug: "barberias",
      citySlug: "concepcion",
      publishedListings: 2,
      distinctBusinesses: 2,
      bookableServices: 8,
      meetsInventoryFloor: false,
      wouldPassCurrentGate: false,
    });
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
  });
});

describe("marketplace sitemap stays closed", () => {
  it("does not advertise curated inventory while indexing is disabled", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).not.toContain("https://www.puragenda.cl/barberias");
    expect(urls.some((url) => url.endsWith("/barberias/concepcion"))).toBe(false);
    expect(getIndexableMarketplacePaths()).toEqual([]);
  });
});
