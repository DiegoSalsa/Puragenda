import { resolveCanonicalCity, type CanonicalCity } from "./geo";
import {
  evaluateMarketplaceQualityGate,
  MARKETPLACE_QUALITY_GATE,
  type MarketplaceQualityGateConfig,
  type MarketplaceQualityGateResult,
} from "./quality-gate";
import { projectPublicMarketplaceCards, type PublicMarketplaceCard } from "./projection";
import {
  getMarketplaceCategory,
  isSupportedMarketplaceCategory,
  marketplaceCategoryPath,
  marketplaceCityPath,
  type MarketplaceCategory,
  type MarketplaceCategorySlug,
} from "./taxonomy";
import {
  eligibleMarketplaceListings,
  type MarketplaceListingCandidate,
} from "./visibility";

export type MarketplaceResolveOptions = {
  inventory?: readonly MarketplaceListingCandidate[];
  gate?: MarketplaceQualityGateConfig;
};

export type MarketplaceCategoryPageModel = {
  kind: "category";
  indexable: boolean;
  path: string;
  title: string;
  description: string;
  keywords: readonly string[];
  h1: string;
  lead: string;
  emptyMessage: string;
  category: MarketplaceCategory;
  cities: Array<{ slug: string; name: string; path: string }>;
  listings: PublicMarketplaceCard[];
  qualityGate: MarketplaceQualityGateResult;
};

export type MarketplaceCityPageModel = {
  kind: "city";
  indexable: boolean;
  path: string;
  title: string;
  description: string;
  keywords: readonly string[];
  h1: string;
  lead: string;
  emptyMessage: string;
  category: MarketplaceCategory;
  city: CanonicalCity;
  listings: PublicMarketplaceCard[];
  qualityGate: MarketplaceQualityGateResult;
  parentPath: string;
};

export type MarketplaceRedirect = {
  kind: "redirect";
  to: string;
};

export type MarketplaceNotFound = { kind: "not_found" };

export type ResolvedMarketplaceCategoryPage = MarketplaceCategoryPageModel | MarketplaceNotFound;
export type ResolvedMarketplaceCityPage =
  | MarketplaceCityPageModel
  | MarketplaceRedirect
  | MarketplaceNotFound;

function gateConfig(options?: MarketplaceResolveOptions): MarketplaceQualityGateConfig {
  return options?.gate ?? MARKETPLACE_QUALITY_GATE;
}

function visibleForCategory(
  inventory: readonly MarketplaceListingCandidate[],
  categorySlug: MarketplaceCategorySlug,
): MarketplaceListingCandidate[] {
  return eligibleMarketplaceListings(inventory).filter(
    (listing) => listing.categorySlug === categorySlug,
  );
}

function paginateCards(
  cards: PublicMarketplaceCard[],
  pageSize: number,
): PublicMarketplaceCard[] {
  return cards.slice(0, pageSize);
}

function bookableServiceCount(listings: readonly MarketplaceListingCandidate[]): number {
  return listings.reduce((sum, listing) => sum + listing.serviceNames.filter(Boolean).length, 0);
}

export function resolveMarketplaceCategoryPage(
  categorySlug: string,
  options: MarketplaceResolveOptions = {},
): ResolvedMarketplaceCategoryPage {
  if (!isSupportedMarketplaceCategory(categorySlug)) {
    return { kind: "not_found" };
  }

  const category = getMarketplaceCategory(categorySlug);
  if (!category) return { kind: "not_found" };

  const config = gateConfig(options);
  const visible = visibleForCategory(options.inventory ?? [], categorySlug);
  const cities = indexableMarketplaceCities(categorySlug, options);

  const qualityGate = evaluateMarketplaceQualityGate(
    {
      categorySupported: true,
      localityCanonical: true,
      publicBusinessCount: visible.length,
      bookableServiceCount: bookableServiceCount(visible),
      indexableCityCount: cities.length,
    },
    config,
  );

  const listings = qualityGate.indexable
    ? paginateCards(projectPublicMarketplaceCards(visible), config.listPageSize)
    : [];

  return {
    kind: "category",
    indexable: qualityGate.indexable,
    path: marketplaceCategoryPath(categorySlug),
    title: category.titleNational,
    description: category.descriptionNational,
    keywords: category.keywordsNational,
    h1: category.h1National,
    lead: category.leadNational,
    emptyMessage: category.emptyNational,
    category,
    cities,
    listings,
    qualityGate,
  };
}

export function resolveMarketplaceCityPage(
  categorySlug: string,
  cityParam: string,
  options: MarketplaceResolveOptions = {},
): ResolvedMarketplaceCityPage {
  if (!isSupportedMarketplaceCategory(categorySlug)) {
    return { kind: "not_found" };
  }

  const category = getMarketplaceCategory(categorySlug);
  if (!category) return { kind: "not_found" };

  const city = resolveCanonicalCity(cityParam);
  if (!city) return { kind: "not_found" };

  if (cityParam !== city.slug) {
    return { kind: "redirect", to: marketplaceCityPath(categorySlug, city.slug) };
  }

  const config = gateConfig(options);
  const visible = visibleForCategory(options.inventory ?? [], categorySlug).filter(
    (listing) => listing.citySlug === city.slug,
  );
  const qualityGate = evaluateMarketplaceQualityGate(
    {
      categorySupported: true,
      localityCanonical: true,
      publicBusinessCount: visible.length,
      bookableServiceCount: bookableServiceCount(visible),
    },
    config,
  );

  const listings = paginateCards(projectPublicMarketplaceCards(visible), config.listPageSize);

  return {
    kind: "city",
    indexable: qualityGate.indexable,
    path: marketplaceCityPath(categorySlug, city.slug),
    title: category.cityTitle(city.name),
    description: category.cityDescription(city.name),
    keywords: category.cityKeywords(city.name),
    h1: category.cityH1(city.name),
    lead: category.cityLead(city.name),
    emptyMessage: category.cityEmpty(city.name),
    category,
    city,
    listings,
    qualityGate,
    parentPath: marketplaceCategoryPath(categorySlug),
  };
}

export function indexableMarketplaceCities(
  categorySlug: MarketplaceCategorySlug,
  options: MarketplaceResolveOptions = {},
): Array<{ slug: string; name: string; path: string }> {
  const visible = visibleForCategory(options.inventory ?? [], categorySlug);
  const byCity = new Map<string, MarketplaceListingCandidate[]>();
  for (const listing of visible) {
    const bucket = byCity.get(listing.citySlug) ?? [];
    bucket.push(listing);
    byCity.set(listing.citySlug, bucket);
  }

  const config = gateConfig(options);
  const cities: Array<{ slug: string; name: string; path: string }> = [];

  for (const [citySlug, listings] of byCity) {
    const city = resolveCanonicalCity(citySlug);
    if (!city) continue;
    const result = evaluateMarketplaceQualityGate(
      {
        categorySupported: true,
        localityCanonical: true,
        publicBusinessCount: listings.length,
        bookableServiceCount: bookableServiceCount(listings),
      },
      config,
    );
    if (!result.indexable) continue;
    cities.push({
      slug: city.slug,
      name: city.name,
      path: marketplaceCityPath(categorySlug, city.slug),
    });
  }

  return cities.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function getIndexableCitySlugs(
  categorySlug: MarketplaceCategorySlug,
  options: MarketplaceResolveOptions = {},
): string[] {
  return indexableMarketplaceCities(categorySlug, options).map((city) => city.slug);
}
