import type { MetadataRoute } from "next";
import { MARKETPLACE_CATEGORIES, type MarketplaceCategorySlug } from "./taxonomy";
import {
  indexableMarketplaceCities,
  resolveMarketplaceCategoryPage,
  type MarketplaceResolveOptions,
} from "./pages";
import { SITE_URL, absoluteUrl } from "@/lib/site";

export type MarketplaceSitemapPath = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

function sitemapUrl(path: string) {
  return path === "/" ? SITE_URL : absoluteUrl(path);
}

/**
 * Inventory-derived marketplace URLs only. Never category × city expansion.
 * A path is included only when the quality gate says it is indexable.
 */
export function getIndexableMarketplaceSitemapEntries(
  options: MarketplaceResolveOptions = {},
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const category of MARKETPLACE_CATEGORIES) {
    const slug = category.slug as MarketplaceCategorySlug;
    const hub = resolveMarketplaceCategoryPage(slug, options);
    if (hub.kind === "category" && hub.indexable) {
      entries.push({
        url: sitemapUrl(hub.path),
        changeFrequency: "daily",
        priority: 0.7,
      });
    }

    for (const city of indexableMarketplaceCities(slug, options)) {
      entries.push({
        url: sitemapUrl(city.path),
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  }

  return entries;
}

export function getIndexableMarketplacePaths(options: MarketplaceResolveOptions = {}): string[] {
  return getIndexableMarketplaceSitemapEntries(options).map((entry) => {
    const url = new URL(entry.url);
    return url.pathname === "/" ? "/" : url.pathname;
  });
}
