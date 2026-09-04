import { describe, expect, it } from "vitest";
import {
  getCanonicalCity,
  isCanonicalCitySlug,
  isSupportedMarketplaceCategory,
  marketplaceAliasRedirects,
  normalizeGeoSlug,
  resolveCanonicalCity,
  resolveMarketplaceCategorySlug,
} from "@/lib/marketplace";

describe("marketplace geo slugs", () => {
  it("normalizes Spanish diacritics in the URL but keeps display names", () => {
    expect(normalizeGeoSlug("Concepción")).toBe("concepcion");
    expect(normalizeGeoSlug("concepción")).toBe("concepcion");
    expect(normalizeGeoSlug("Ñuñoa")).toBe("nunoa");
    expect(normalizeGeoSlug("Viña del Mar")).toBe("vina-del-mar");
    expect(getCanonicalCity("concepcion")?.name).toBe("Concepción");
    expect(getCanonicalCity("vina-del-mar")?.name).toBe("Viña del Mar");
  });

  it("collapses city aliases to a single canonical slug", () => {
    expect(resolveCanonicalCity("concepción")?.slug).toBe("concepcion");
    expect(resolveCanonicalCity("concepcion-chile")?.slug).toBe("concepcion");
    expect(resolveCanonicalCity("concepcion-biobio")?.slug).toBe("concepcion");
    expect(resolveCanonicalCity("santiago-de-chile")?.slug).toBe("santiago");
    expect(isCanonicalCitySlug("concepcion")).toBe(true);
    expect(isCanonicalCitySlug("concepcion-chile")).toBe(false);
    expect(isCanonicalCitySlug("springfield")).toBe(false);
  });

  it("does not treat unknown strings as cities", () => {
    expect(resolveCanonicalCity("")).toBeNull();
    expect(resolveCanonicalCity("barberias")).toBeNull();
    expect(resolveCanonicalCity("concepcion-chile-biobio-inventado")).toBeNull();
  });
});

describe("marketplace category taxonomy", () => {
  it("only allowlists canonical category slugs", () => {
    expect(isSupportedMarketplaceCategory("barberias")).toBe(true);
    expect(isSupportedMarketplaceCategory("peluquerias")).toBe(true);
    expect(isSupportedMarketplaceCategory("barberia")).toBe(false);
    expect(isSupportedMarketplaceCategory("barbershop")).toBe(false);
    expect(isSupportedMarketplaceCategory("estetica")).toBe(false);
    expect(resolveMarketplaceCategorySlug("barberia")).toBe("barberias");
    expect(resolveMarketplaceCategorySlug("hair-salon")).toBe("peluquerias");
  });

  it("redirects duplicate category aliases instead of indexing them", () => {
    const redirects = marketplaceAliasRedirects();
    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/barberia", destination: "/barberias", permanent: true },
        { source: "/barberia/:city", destination: "/barberias/:city", permanent: true },
        { source: "/peluqueria", destination: "/peluquerias", permanent: true },
      ]),
    );
    expect(redirects.some((entry) => entry.destination === "/para/barberias")).toBe(false);
    expect(redirects.some((entry) => entry.destination === "/software-agenda-barberias")).toBe(false);
  });
});
