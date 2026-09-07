import { cityDisplayName } from "./geo";
import type { MarketplaceListingCandidate } from "./visibility";

export const MARKETPLACE_PUBLIC_CARD_KEYS = [
  "name",
  "bookingPath",
  "categorySlug",
  "citySlug",
  "cityName",
  "logoUrl",
  "serviceNames",
] as const;

export const MARKETPLACE_DIRECTORY_CARD_KEYS = [
  "name",
  "bookingPath",
  "categorySlugs",
  "categoryNames",
  "citySlug",
  "cityName",
  "regionName",
  "locationName",
  "logoUrl",
  "serviceNames",
] as const;

export type PublicMarketplaceCard = {
  name: string;
  bookingPath: string;
  categorySlug: string;
  citySlug: string;
  cityName: string;
  logoUrl: string | null;
  serviceNames: string[];
};

export type PublicMarketplaceDirectoryCard = {
  name: string;
  bookingPath: string;
  categorySlugs: string[];
  categoryNames: string[];
  citySlug: string;
  cityName: string;
  regionName: string;
  locationName: string;
  logoUrl: string | null;
  serviceNames: string[];
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
    categorySlug: candidate.categorySlug,
    citySlug: candidate.citySlug,
    cityName: cityDisplayName(candidate.citySlug),
    logoUrl: publicLogoUrl(candidate.logoUrl),
    serviceNames: publicServiceNames(candidate.serviceNames, MAX_SEO_SERVICE_NAMES),
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
    categorySlugs: extras.categorySlugs,
    categoryNames: extras.categoryNames.map((name) => name.trim()).filter(Boolean),
    citySlug: candidate.citySlug,
    cityName: extras.cityName.trim() || cityDisplayName(candidate.citySlug),
    regionName: extras.regionName.trim(),
    locationName: extras.locationName.trim(),
    logoUrl: publicLogoUrl(candidate.logoUrl),
    serviceNames: publicServiceNames(candidate.serviceNames, MAX_DIRECTORY_SERVICE_NAMES),
  };
}

export function directoryCardLeaksForbiddenFields(card: PublicMarketplaceDirectoryCard): boolean {
  const keys = Object.keys(card);
  return keys.some(
    (key) => !MARKETPLACE_DIRECTORY_CARD_KEYS.includes(key as (typeof MARKETPLACE_DIRECTORY_CARD_KEYS)[number]),
  );
}
