import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/marketplace.service", () => ({
  listPublicMarketplaceListings: async () => [],
  listSeoMarketplaceListings: async () => [],
  listPublicMarketplaceDirectory: async () => ({
    cards: [],
    categories: [],
    localities: [],
    regions: [],
    query: {},
    total: 0,
    emptyKind: "no_inventory",
  }),
  getMarketplaceQualityGateReport: async () => [],
}));

import { sanitizeTrackingProperties } from "@/lib/analytics/events";
import sitemap from "@/app/sitemap";
import { generateMetadata as negociosMetadata } from "@/app/negocios/page";
import robots from "@/app/robots";
import {
  MARKETPLACE_DIRECTORY_CARD_KEYS,
  MARKETPLACE_DIRECTORY_PATH,
  MARKETPLACE_QUALITY_GATE,
  buildMarketplaceDirectoryResult,
  directoryCardLeaksForbiddenFields,
  filterMarketplaceDirectoryCards,
  foldMarketplaceSearch,
  marketplaceDirectoryEmptyMessage,
  marketplaceDirectoryHref,
  marketplaceDirectoryMetadata,
  parseMarketplaceDirectoryQuery,
  projectPublicMarketplaceDirectoryCard,
  type MarketplaceListingCandidate,
  type PublicMarketplaceDirectoryCard,
} from "@/lib/marketplace";

function card(overrides: Partial<PublicMarketplaceDirectoryCard> = {}): PublicMarketplaceDirectoryCard {
  return {
    name: "Studio Centro",
    bookingPath: "/widget/studio-centro?location=principal",
    categorySlugs: ["manicure"],
    categoryNames: ["Manicure / Nail Studio"],
    citySlug: "concepcion",
    cityName: "Concepción",
    regionName: "Biobío",
    locationName: "Principal",
    logoUrl: "https://res.cloudinary.com/demo/logo.png",
    serviceNames: ["Manicure", "Pedicure"],
    ...overrides,
  };
}

function candidate(): MarketplaceListingCandidate {
  return {
    slug: "studio-centro",
    name: "Studio Centro",
    logoUrl: "https://res.cloudinary.com/demo/logo.png",
    locationSlug: "principal",
    locationName: "Principal",
    categorySlug: "manicure",
    categoryName: "Manicure / Nail Studio",
    citySlug: "concepcion",
    cityName: "Concepción",
    regionName: "Biobío",
    serviceNames: ["Manicure", "Pedicure", "Nail art"],
    status: "ACTIVE",
    deleted: false,
    directoryPublished: true,
    locationActive: true,
    demo: false,
    subscriptionActive: true,
    plan: "INDIVIDUAL",
    hasBookableService: true,
  };
}

describe("public /negocios directory", () => {
  it("serves 200 metadata with noindex follow and its own canonical", async () => {
    const metadata = await negociosMetadata();
    expect(metadata.alternates).toEqual({ canonical: "https://www.puragenda.cl/negocios" });
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
    expect(marketplaceDirectoryMetadata().robots).toMatchObject({ index: false, follow: true });
  });

  it("does not add /negocios to the sitemap or robots disallow", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).not.toContain("https://www.puragenda.cl/negocios");
    const manifest = robots();
    const rules = Array.isArray(manifest.rules) ? manifest.rules : [manifest.rules];
    for (const rule of rules) {
      expect(rule.disallow).not.toContain("/negocios");
    }
  });

  it("does not create manicure or bienestar SEO routes", () => {
    expect(() => readFileSync(join(process.cwd(), "src/app/manicure/page.tsx"), "utf8")).toThrow();
    expect(() => readFileSync(join(process.cwd(), "src/app/bienestar/page.tsx"), "utf8")).toThrow();
    expect(() => readFileSync(join(process.cwd(), "src/app/negocios/[slug]/page.tsx"), "utf8")).toThrow();
  });

  it("projects a whitelist card with a widget booking path and no private fields", () => {
    const projected = projectPublicMarketplaceDirectoryCard(candidate(), {
      categorySlugs: ["manicure"],
      categoryNames: ["Manicure / Nail Studio"],
      cityName: "Concepción",
      regionName: "Biobío",
      locationName: "Principal",
    });
    expect(projected.bookingPath).toBe("/widget/studio-centro?location=principal");
    expect(Object.keys(projected).sort()).toEqual([...MARKETPLACE_DIRECTORY_CARD_KEYS].sort());
    expect(directoryCardLeaksForbiddenFields(projected)).toBe(false);
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain("businessId");
    expect(serialized).not.toContain("locationId");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("phone");
    expect(serialized).not.toContain("rut");
    expect(serialized).not.toContain("mpAccessToken");
    expect(serialized).not.toContain("paddleSubscriptionId");
  });

  it("searches by name, category and commune with accents and case folding", () => {
    const cards = [
      card(),
      card({
        name: "Bienestar Sur",
        bookingPath: "/widget/bienestar-sur?location=principal",
        categorySlugs: ["bienestar"],
        categoryNames: ["Bienestar"],
        citySlug: "graneros",
        cityName: "Graneros",
        regionName: "O'Higgins",
      }),
    ];
    expect(foldMarketplaceSearch("Concepción")).toBe(foldMarketplaceSearch("concepcion"));
    expect(filterMarketplaceDirectoryCards(cards, { q: "CONCEPCION" }).map((item) => item.name)).toEqual([
      "Studio Centro",
    ]);
    expect(filterMarketplaceDirectoryCards(cards, { q: "manicure" }).map((item) => item.name)).toEqual([
      "Studio Centro",
    ]);
    expect(filterMarketplaceDirectoryCards(cards, { q: "graneros" }).map((item) => item.name)).toEqual([
      "Bienestar Sur",
    ]);
    expect(filterMarketplaceDirectoryCards(cards, { categoria: "bienestar" }).map((item) => item.name)).toEqual([
      "Bienestar Sur",
    ]);
    expect(filterMarketplaceDirectoryCards(cards, { comuna: "concepcion" }).map((item) => item.name)).toEqual([
      "Studio Centro",
    ]);
    expect(filterMarketplaceDirectoryCards(cards, { categoria: "manicure", comuna: "graneros" })).toEqual([]);
  });

  it("keeps empty-state copy non-SEO and offers a clean directory href", () => {
    const empty = buildMarketplaceDirectoryResult([], parseMarketplaceDirectoryQuery({ q: "corte" }));
    expect(empty.emptyKind).toBe("no_inventory");
    expect(marketplaceDirectoryEmptyMessage(empty)).toBe(
      "Todavía no hay negocios publicados en el directorio.",
    );
    const filtered = buildMarketplaceDirectoryResult(
      [card()],
      parseMarketplaceDirectoryQuery({ categoria: "veterinaria" }),
    );
    expect(filtered.emptyKind).toBe("no_results");
    expect(marketplaceDirectoryEmptyMessage(filtered)).toBe("No encontramos negocios con esos filtros.");
    expect(marketplaceDirectoryHref({ q: "manicure", comuna: "concepcion" })).toBe(
      `${MARKETPLACE_DIRECTORY_PATH}?q=manicure&comuna=concepcion`,
    );
  });

  it("only exposes categories and localities that have public inventory", () => {
    const result = buildMarketplaceDirectoryResult(
      [
        card(),
        card({
          name: "Barbería Norte",
          bookingPath: "/widget/barberia-norte?location=centro",
          categorySlugs: ["barberias"],
          categoryNames: ["Barberías"],
          citySlug: "osorno",
          cityName: "Osorno",
          regionName: "Los Lagos",
        }),
      ],
      {},
    );
    expect(result.categories.map((item) => item.slug).sort()).toEqual(["barberias", "manicure"]);
    expect(result.localities.map((item) => item.slug).sort()).toEqual(["concepcion", "osorno"]);
    expect(result.categories.some((item) => item.slug === "veterinaria")).toBe(false);
  });

  it("keeps directory analytics free of business names, communes and ids", () => {
    expect(sanitizeTrackingProperties("directory_search", {
      q: "Soccerbarber",
      comuna: "osorno",
      businessId: "biz_1",
      has_query: true,
    })).toEqual({ has_query: true });
    expect(sanitizeTrackingProperties("directory_filter", {
      categoria: "manicure",
      comuna: "concepcion",
      has_category: true,
      has_locality: true,
    })).toEqual({ has_category: true, has_locality: true });
    expect(sanitizeTrackingProperties("directory_booking_clicked", {
      placement: "card",
      name: "Studio Centro",
    })).toEqual({ placement: "card" });
  });

  it("keeps indexing disabled and does not invent business pages", () => {
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
  });

  it("keeps a usable empty inventory state without fake recommendations", () => {
    const none = buildMarketplaceDirectoryResult([], {});
    expect(none.emptyKind).toBe("no_inventory");
    expect(none.categories).toEqual([]);
    expect(none.localities).toEqual([]);
    expect(marketplaceDirectoryEmptyMessage(none)).toBe(
      "Todavía no hay negocios publicados en el directorio.",
    );
  });

  it("reuses the public directory page and widget CTA, not a second booking engine", () => {
    const page = readFileSync(join(process.cwd(), "src/app/negocios/page.tsx"), "utf8");
    const view = readFileSync(join(process.cwd(), "src/components/marketplace/directory-page.tsx"), "utf8");
    expect(page).toContain("listPublicMarketplaceDirectory");
    expect(page).not.toContain("prisma.business.findMany");
    expect(view).toContain('ctaLabel="Ver horas"');
    expect(view).toContain("Limpiar filtros");
    expect(view).toContain("min-[1280px]:grid-cols-3");
    expect(view).not.toContain("uppercase tracking-tighter");
    expect(view).not.toContain("Local principal");
  });
});
