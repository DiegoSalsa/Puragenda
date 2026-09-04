import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  MARKETPLACE_CATEGORY_SLUGS,
  MARKETPLACE_QUALITY_GATE,
  getIndexableMarketplacePaths,
  isSupportedMarketplaceCategory,
  resolveMarketplaceCategoryPage,
} from "@/lib/marketplace";

describe("marketplace classification vs SEO taxonomy", () => {
  it("keeps SEO routes limited to barberias and peluquerias", () => {
    expect([...MARKETPLACE_CATEGORY_SLUGS]).toEqual(["barberias", "peluquerias"]);
    expect(isSupportedMarketplaceCategory("barberias")).toBe(true);
    expect(isSupportedMarketplaceCategory("peluquerias")).toBe(true);
    expect(isSupportedMarketplaceCategory("manicure")).toBe(false);
    expect(isSupportedMarketplaceCategory("bienestar")).toBe(false);
    expect(isSupportedMarketplaceCategory("psicologia")).toBe(false);
  });

  it("does not create indexable URLs for manicure or bienestar", () => {
    expect(resolveMarketplaceCategoryPage("manicure")).toEqual({ kind: "not_found" });
    expect(resolveMarketplaceCategoryPage("bienestar")).toEqual({ kind: "not_found" });
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);

    const urls = sitemap().map((entry) => entry.url);
    expect(urls).not.toContain("https://www.puragenda.cl/manicure");
    expect(urls).not.toContain("https://www.puragenda.cl/bienestar");
    expect(urls).not.toContain("https://www.puragenda.cl/barberias");
    expect(urls).not.toContain("https://www.puragenda.cl/peluquerias");
    expect(getIndexableMarketplacePaths()).toEqual([]);
    expect(existsSync(join(process.cwd(), "src/app/manicure"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/app/bienestar"))).toBe(false);
  });
});
