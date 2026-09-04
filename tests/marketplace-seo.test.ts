import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { GET as llmsGet } from "@/app/llms.txt/route";
import { generateMetadata as barberiasMetadata } from "@/app/barberias/page";
import { generateMetadata as barberiasCityMetadata } from "@/app/barberias/[city]/page";
import { generateMetadata as peluqueriasMetadata } from "@/app/peluquerias/page";
import { barbershopSoftwareMetadata } from "@/lib/data/barbershop-software-landing";
import { industriesData } from "@/lib/data/industries";
import { salonSoftwareMetadata } from "@/lib/data/salon-software-landing";
import {
  MARKETPLACE_PUBLIC_CARD_KEYS,
  MARKETPLACE_QUALITY_GATE,
  eligibleMarketplaceListings,
  evaluateMarketplaceQualityGate,
  getIndexableMarketplacePaths,
  isMarketplaceEligibleListing,
  marketplaceCategoryJsonLd,
  marketplaceCityJsonLd,
  marketplacePageMetadata,
  projectPublicMarketplaceCard,
  publicCardLeaksForbiddenFields,
  resolveMarketplaceCategoryPage,
  resolveMarketplaceCityPage,
  withQualityGateOverrides,
  type MarketplaceListingCandidate,
} from "@/lib/marketplace";
import { assertNoInventedReviewFields } from "@/lib/json-ld";

const openGate = withQualityGateOverrides({ indexingEnabled: true });

function listing(
  overrides: Partial<MarketplaceListingCandidate> & Pick<MarketplaceListingCandidate, "slug">,
): MarketplaceListingCandidate {
  return {
    name: "Local público",
    logoUrl: null,
    categorySlug: "barberias",
    citySlug: "concepcion",
    serviceNames: ["Corte"],
    deleted: false,
    directoryPublished: true,
    demo: false,
    subscriptionActive: true,
    plan: "INDIVIDUAL",
    hasBookableService: true,
    ...overrides,
  };
}

function concepcionInventory(count = 3): MarketplaceListingCandidate[] {
  return Array.from({ length: count }, (_, index) =>
    listing({
      slug: `barberia-publica-${index + 1}`,
      name: `Barbería pública ${index + 1}`,
      serviceNames: ["Corte", "Barba"],
    }),
  );
}

describe("SEO-008 marketplace quality gate", () => {
  it("fails closed in production until inventory and distribution exist", () => {
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
    const production = resolveMarketplaceCategoryPage("barberias");
    expect(production.kind).toBe("category");
    if (production.kind !== "category") return;
    expect(production.indexable).toBe(false);
    expect(production.cities).toEqual([]);
    expect(production.listings).toEqual([]);
    expect(production.qualityGate.reasons).toContain("indexing_disabled");
    expect(production.qualityGate.reasons).toContain("insufficient_public_businesses");
  });

  it("does not index a known city without enough public offer", () => {
    const page = resolveMarketplaceCityPage("barberias", "concepcion", {
      inventory: concepcionInventory(1),
      gate: openGate,
    });
    expect(page.kind).toBe("city");
    if (page.kind !== "city") return;
    expect(page.indexable).toBe(false);
    expect(page.qualityGate.reasons).toContain("insufficient_public_businesses");
    expect(page.path).toBe("/barberias/concepcion");
  });

  it("indexes a city only with real eligible inventory above the floor", () => {
    const page = resolveMarketplaceCityPage("barberias", "concepcion", {
      inventory: concepcionInventory(3),
      gate: openGate,
    });
    expect(page.kind).toBe("city");
    if (page.kind !== "city") return;
    expect(page.indexable).toBe(true);
    expect(page.listings).toHaveLength(3);
    expect(page.h1).toBe("Barberías en Concepción");
    expect(page.title).toBe("Barberías en Concepción");
  });
});

describe("SEO-008 marketplace visibility and projection", () => {
  it("excludes private, deleted, demo, inactive and TEST businesses", () => {
    const candidates = [
      listing({ slug: "privado", directoryPublished: false }),
      listing({ slug: "borrado", deleted: true }),
      listing({ slug: "purocode-demo" }),
      listing({ slug: "demo-flag", demo: true }),
      listing({ slug: "test-plan", plan: "TEST" }),
      listing({ slug: "inactivo", subscriptionActive: false }),
      listing({ slug: "sin-reserva", hasBookableService: false }),
      listing({ slug: "ok", name: "Visible" }),
    ];

    const visible = eligibleMarketplaceListings(candidates);
    expect(visible.map((item) => item.slug)).toEqual(["ok"]);
    expect(isMarketplaceEligibleListing(candidates[0])).toBe(false);
  });

  it("projects only public consumer fields and never leaks internals", () => {
    const card = projectPublicMarketplaceCard(
      listing({
        slug: "visible",
        name: "Barbería Centro",
        logoUrl: "https://res.cloudinary.com/demo/logo.png",
        serviceNames: ["Corte", "Barba", "Cejas", "Extra"],
      }),
    );

    expect(card).toEqual({
      name: "Barbería Centro",
      bookingPath: "/widget/visible",
      categorySlug: "barberias",
      citySlug: "concepcion",
      cityName: "Concepción",
      logoUrl: "https://res.cloudinary.com/demo/logo.png",
      serviceNames: ["Corte", "Barba", "Cejas"],
    });
    expect(publicCardLeaksForbiddenFields(card)).toBe(false);
    expect(Object.keys(card).sort()).toEqual([...MARKETPLACE_PUBLIC_CARD_KEYS].sort());
    expect("id" in card).toBe(false);
    expect("apiKey" in card).toBe(false);
    expect("ownerId" in card).toBe(false);
    expect("email" in card).toBe(false);
    expect("phone" in card).toBe(false);
    const serialized = JSON.stringify(card);
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("ownerId");
    expect(serialized).not.toContain("mpAccessToken");
  });
});

describe("SEO-008 marketplace routes", () => {
  it("404s unknown categories and cities instead of indexing them", () => {
    expect(resolveMarketplaceCategoryPage("spa")).toEqual({ kind: "not_found" });
    expect(resolveMarketplaceCityPage("barberias", "springfield")).toEqual({ kind: "not_found" });
    expect(resolveMarketplaceCityPage("barbershop", "concepcion")).toEqual({ kind: "not_found" });
  });

  it("redirects accented and alias city slugs to the canonical URL", () => {
    expect(resolveMarketplaceCityPage("barberias", "concepción")).toEqual({
      kind: "redirect",
      to: "/barberias/concepcion",
    });
    expect(resolveMarketplaceCityPage("barberias", "concepcion-chile")).toEqual({
      kind: "redirect",
      to: "/barberias/concepcion",
    });
  });

  it("keeps B2C titles and canonicals distinct from B2B software and spoke pages", () => {
    const page = resolveMarketplaceCityPage("barberias", "concepcion", {
      inventory: concepcionInventory(3),
      gate: openGate,
    });
    expect(page.kind).toBe("city");
    if (page.kind !== "city") return;

    const spoke = industriesData.find((industry) => industry.slug === "barberias");
    expect(page.title).not.toBe(barbershopSoftwareMetadata.title);
    expect(page.title).not.toBe(spoke?.title);
    expect(page.h1).not.toBe("Software de agenda para barberías");
    expect(page.h1).not.toBe(spoke?.heroHeadline);
    expect(page.path).toBe("/barberias/concepcion");

    const metadata = marketplacePageMetadata(page);
    expect(metadata.alternates).toEqual({
      canonical: "https://www.puragenda.cl/barberias/concepcion",
    });
    expect(metadata.alternates).not.toEqual({
      canonical: "https://www.puragenda.cl/software-agenda-barberias",
    });
    expect(metadata.alternates).not.toEqual({
      canonical: "https://www.puragenda.cl/para/barberias",
    });
  });

  it("keeps peluquerías B2C copy distinct from the salon software landing", () => {
    const page = resolveMarketplaceCategoryPage("peluquerias");
    expect(page.kind).toBe("category");
    if (page.kind !== "category") return;
    expect(page.title).not.toBe(salonSoftwareMetadata.title);
    expect(page.h1).not.toBe("Software de agenda para peluquerías y salones");
    expect(page.category.b2bSoftwarePath).toBe("/software-agenda-peluquerias");
  });
});

describe("SEO-008 marketplace indexation metadata", () => {
  it("serves category hubs as self-canonical noindex while the gate fails", async () => {
    const metadata = await barberiasMetadata();
    expect(metadata.alternates).toEqual({ canonical: "https://www.puragenda.cl/barberias" });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.title).toBe("Barberías");

    const peluquerias = await peluqueriasMetadata();
    expect(peluquerias.alternates).toEqual({ canonical: "https://www.puragenda.cl/peluquerias" });
    expect(peluquerias.robots).toMatchObject({ index: false, follow: false });
  });

  it("noindexes a known city without inventory and 404s an invalid slug", async () => {
    const concepcion = await barberiasCityMetadata({
      params: Promise.resolve({ city: "concepcion" }),
    });
    expect(concepcion.alternates).toEqual({
      canonical: "https://www.puragenda.cl/barberias/concepcion",
    });
    expect(concepcion.robots).toMatchObject({ index: false, follow: false });

    const invalid = await barberiasCityMetadata({
      params: Promise.resolve({ city: "springfield" }),
    });
    expect(invalid.robots).toMatchObject({ index: false, follow: false });
    expect(invalid.alternates).toEqual({ canonical: null });
  });
});

describe("SEO-008 marketplace sitemap and discovery", () => {
  it("does not expand category × city into the sitemap without inventory", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).not.toContain("https://www.puragenda.cl/barberias");
    expect(urls).not.toContain("https://www.puragenda.cl/peluquerias");
    expect(urls.some((url) => url.includes("/barberias/"))).toBe(false);
    expect(urls.some((url) => url.includes("/peluquerias/"))).toBe(false);
    expect(getIndexableMarketplacePaths()).toEqual([]);
  });

  it("adds only self-canonical indexable marketplace URLs from inventory", () => {
    const paths = getIndexableMarketplacePaths({
      inventory: concepcionInventory(3),
      gate: openGate,
    });
    expect(paths).toEqual(["/barberias", "/barberias/concepcion"]);
  });

  it("does not advertise empty marketplace URLs in llms.txt", async () => {
    const body = await (await llmsGet()).text();
    expect(body).not.toContain("/barberias/concepcion");
    expect(body).not.toContain("## Directorio");
  });
});

describe("SEO-008 marketplace structured data", () => {
  it("does not mark aggregator pages as LocalBusiness or invent reviews", () => {
    const city = resolveMarketplaceCityPage("barberias", "concepcion", {
      inventory: concepcionInventory(3),
      gate: openGate,
    });
    expect(city.kind).toBe("city");
    if (city.kind !== "city") return;
    const data = marketplaceCityJsonLd(city);
    const types = data["@graph"].map((node) => node["@type"]);
    expect(types).toContain("CollectionPage");
    expect(types).toContain("ItemList");
    expect(types).toContain("BreadcrumbList");
    expect(types).not.toContain("LocalBusiness");
    expect(types).not.toContain("SoftwareApplication");
    expect(assertNoInventedReviewFields(data)).toEqual({
      hasAggregateRating: false,
      hasReviewRating: false,
      hasRatingValue: false,
    });
  });

  it("omits ItemList and CollectionPage when the page is not indexable", () => {
    const city = resolveMarketplaceCityPage("barberias", "concepcion");
    expect(city.kind).toBe("city");
    if (city.kind !== "city") return;
    const data = marketplaceCityJsonLd(city);
    const types = data["@graph"].map((node) => node["@type"]);
    expect(types).toEqual(["BreadcrumbList"]);
    const hub = resolveMarketplaceCategoryPage("barberias");
    expect(hub.kind).toBe("category");
    if (hub.kind !== "category") return;
    expect(marketplaceCategoryJsonLd(hub)["@graph"].map((node) => node["@type"])).toEqual([
      "BreadcrumbList",
    ]);
  });
});

describe("SEO-008 marketplace page contracts", () => {
  it("links B2C pages to the B2B software landing without swapping intent", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/marketplace/marketplace-pages.tsx"),
      "utf8",
    );
    expect(source).toContain("b2bSoftwarePath");
    expect(source).toContain('cta="b2b_software"');
    expect(source).toContain("Reservar");
    expect(source).not.toContain("SoftwareApplication");
    expect(source).not.toContain("aggregateRating");
  });

  it("does not treat a missing threshold as indexable", () => {
    const result = evaluateMarketplaceQualityGate({
      categorySupported: true,
      localityCanonical: true,
      publicBusinessCount: 0,
      bookableServiceCount: 0,
    });
    expect(result.indexable).toBe(false);
  });
});
