import { cityDisplayName } from "./geo";
import type { MarketplaceListingCandidate } from "./visibility";

export const MARKETPLACE_PUBLIC_CARD_KEYS = [
  "name",
  "bookingPath",
  "profilePath",
  "categorySlug",
  "citySlug",
  "cityName",
  "logoUrl",
  "serviceNames",
  "ratingAverage",
  "ratingCount",
] as const;

export const MARKETPLACE_DIRECTORY_CARD_KEYS = [
  "name",
  "bookingPath",
  "profilePath",
  "categorySlugs",
  "categoryNames",
  "citySlug",
  "cityName",
  "regionName",
  "locationName",
  "logoUrl",
  "serviceNames",
  "ratingAverage",
  "ratingCount",
] as const;

export type PublicMarketplaceCard = {
  name: string;
  bookingPath: string;
  profilePath: string;
  categorySlug: string;
  citySlug: string;
  cityName: string;
  logoUrl: string | null;
  serviceNames: string[];
  ratingAverage: number | null;
  ratingCount: number;
};

export type PublicMarketplaceDirectoryCard = {
  name: string;
  bookingPath: string;
  profilePath: string;
  categorySlugs: string[];
  categoryNames: string[];
  citySlug: string;
  cityName: string;
  regionName: string;
  locationName: string;
  logoUrl: string | null;
  serviceNames: string[];
  ratingAverage: number | null;
  ratingCount: number;
};

const MAX_SEO_SERVICE_NAMES = 3;
const MAX_DIRECTORY_SERVICE_NAMES = 4;

/**
 * Whitelist projection for consumer-facing cards. Internal ids, API keys,
 * contacts, billing tokens and client records must never appear here.
 */
export function projectPublicMarketplaceCard(
  candidate: MarketplaceListingCandidate,
): PublicMarketplaceCard {
  return {
    name: candidate.name.trim(),
    bookingPath: bookingPathFor(candidate),
    profilePath: `/negocios/${candidate.slug}`,
    categorySlug: candidate.categorySlug,
    citySlug: candidate.citySlug,
    cityName: cityDisplayName(candidate.citySlug),
    logoUrl: publicLogoUrl(candidate.logoUrl),
    serviceNames: publicServiceNames(candidate.serviceNames, MAX_SEO_SERVICE_NAMES),
    ratingAverage: null,
    ratingCount: 0,
  };
}

export function projectPublicMarketplaceCards(
  candidates: readonly MarketplaceListingCandidate[],
): PublicMarketplaceCard[] {
  return candidates
    .map(projectPublicMarketplaceCard)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function publicCardLeaksForbiddenFields(card: PublicMarketplaceCard): boolean {
  const keys = Object.keys(card);
  return keys.some((key) => !MARKETPLACE_PUBLIC_CARD_KEYS.includes(key as (typeof MARKETPLACE_PUBLIC_CARD_KEYS)[number]));
}

function publicLogoUrl(logoUrl: string | null | undefined): string | null {
  return typeof logoUrl === "string" && logoUrl.startsWith("https://") ? logoUrl : null;
}

function bookingPathFor(candidate: MarketplaceListingCandidate): string {
  return candidate.locationSlug
    ? `/widget/${candidate.slug}?location=${encodeURIComponent(candidate.locationSlug)}`
    : `/widget/${candidate.slug}`;
}

function publicServiceNames(names: readonly string[], max = MAX_SEO_SERVICE_NAMES): string[] {
  return names.map((name) => name.trim()).filter(Boolean).slice(0, max);
}

export function projectPublicMarketplaceDirectoryCard(
  candidate: MarketplaceListingCandidate,
  extras: {
    categorySlugs: string[];
    categoryNames: string[];
    cityName: string;
    regionName: string;
    locationName: string;
  },
): PublicMarketplaceDirectoryCard {
  return {
    name: candidate.name.trim(),
    bookingPath: bookingPathFor(candidate),
    profilePath: `/negocios/${candidate.slug}`,
    categorySlugs: extras.categorySlugs,
    categoryNames: extras.categoryNames.map((name) => name.trim()).filter(Boolean),
    citySlug: candidate.citySlug,
    cityName: extras.cityName.trim() || cityDisplayName(candidate.citySlug),
    regionName: extras.regionName.trim(),
    locationName: extras.locationName.trim(),
    logoUrl: publicLogoUrl(candidate.logoUrl),
    serviceNames: publicServiceNames(candidate.serviceNames, MAX_DIRECTORY_SERVICE_NAMES),
    ratingAverage: null,
    ratingCount: 0,
  };
}

export function withMarketplaceRating<T extends { ratingAverage: number | null; ratingCount: number }>(
  card: T,
  stats: { average: number | null; count: number } | undefined,
): T {
  if (!stats || stats.count <= 0 || stats.average == null) {
    return { ...card, ratingAverage: null, ratingCount: 0 };
  }
  return { ...card, ratingAverage: stats.average, ratingCount: stats.count };
}

export function directoryCardLeaksForbiddenFields(card: PublicMarketplaceDirectoryCard): boolean {
  const keys = Object.keys(card);
  return keys.some(
    (key) => !MARKETPLACE_DIRECTORY_CARD_KEYS.includes(key as (typeof MARKETPLACE_DIRECTORY_CARD_KEYS)[number]),
  );
}
