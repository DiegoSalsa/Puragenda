import { marketplaceSearchMatches } from "./search";
import type { PublicMarketplaceDirectoryCard } from "./projection";

export const MARKETPLACE_DIRECTORY_PATH = "/negocios";

export type MarketplaceDirectoryQuery = {
  q?: string;
  categoria?: string;
  comuna?: string;
  region?: string;
};

export type MarketplaceDirectoryFilterOption = {
  slug: string;
  name: string;
  regionName?: string;
};

export type MarketplaceDirectoryResult = {
  cards: PublicMarketplaceDirectoryCard[];
  categories: MarketplaceDirectoryFilterOption[];
  localities: MarketplaceDirectoryFilterOption[];
  regions: string[];
  query: MarketplaceDirectoryQuery;
  total: number;
  emptyKind: "none" | "no_inventory" | "no_results";
};

function uniqueOptions(
  items: Array<{ slug: string; name: string; regionName?: string }>,
): MarketplaceDirectoryFilterOption[] {
  const seen = new Set<string>();
  const options: MarketplaceDirectoryFilterOption[] = [];
  for (const item of items) {
    if (!item.slug || seen.has(item.slug)) continue;
    seen.add(item.slug);
    options.push(item);
  }
  return options.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function parseMarketplaceDirectoryQuery(
  searchParams: Record<string, string | string[] | undefined> | MarketplaceDirectoryQuery,
): MarketplaceDirectoryQuery {
  const read = (key: keyof MarketplaceDirectoryQuery) => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0]?.trim() || undefined;
    return value?.trim() || undefined;
  };
  return {
    q: read("q"),
    categoria: read("categoria"),
    comuna: read("comuna"),
    region: read("region"),
  };
}

export function marketplaceDirectoryHasFilters(query: MarketplaceDirectoryQuery): boolean {
  return Boolean(query.q || query.categoria || query.comuna || query.region);
}

export function marketplaceDirectoryEmptyMessage(result: MarketplaceDirectoryResult): string {
  if (result.emptyKind === "no_inventory") {
    return "Todavía no hay negocios publicados en el directorio.";
  }
  return "No encontramos negocios con esos filtros.";
}

export function filterMarketplaceDirectoryCards(
  cards: readonly PublicMarketplaceDirectoryCard[],
  query: MarketplaceDirectoryQuery,
): PublicMarketplaceDirectoryCard[] {
  const q = query.q?.trim() ?? "";
  const categoria = query.categoria?.trim() ?? "";
  const comuna = query.comuna?.trim() ?? "";
  const region = query.region?.trim() ?? "";

  return cards.filter((card) => {
    if (categoria && !card.categorySlugs.includes(categoria)) return false;
    if (comuna && card.citySlug !== comuna) return false;
    if (region && card.regionName !== region) return false;
    if (!q) return true;
    const haystack = [
      card.name,
      card.locationName,
      ...card.categoryNames,
      ...card.categorySlugs,
      card.cityName,
      card.citySlug,
    ].join(" ");
    return marketplaceSearchMatches(haystack, q);
  });
}

export function buildMarketplaceDirectoryResult(
  cards: readonly PublicMarketplaceDirectoryCard[],
  query: MarketplaceDirectoryQuery,
): MarketplaceDirectoryResult {
  const filtered = filterMarketplaceDirectoryCards(cards, query);
  const categories = uniqueOptions(
    cards.flatMap((card) =>
      card.categorySlugs.map((slug, index) => ({
        slug,
        name: card.categoryNames[index] ?? slug,
      })),
    ),
  );
  const localities = uniqueOptions(
    cards.map((card) => ({
      slug: card.citySlug,
      name: card.cityName,
      regionName: card.regionName,
    })),
  );
  const regions = [...new Set(cards.map((card) => card.regionName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));

  let emptyKind: MarketplaceDirectoryResult["emptyKind"] = "none";
  if (cards.length === 0) emptyKind = "no_inventory";
  else if (filtered.length === 0) emptyKind = "no_results";

  return {
    cards: filtered,
    categories,
    localities,
    regions,
    query,
    total: filtered.length,
    emptyKind,
  };
}

export function marketplaceDirectoryHref(query: MarketplaceDirectoryQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categoria) params.set("categoria", query.categoria);
  if (query.comuna) params.set("comuna", query.comuna);
  if (query.region) params.set("region", query.region);
  const encoded = params.toString();
  return encoded ? `${MARKETPLACE_DIRECTORY_PATH}?${encoded}` : MARKETPLACE_DIRECTORY_PATH;
}
