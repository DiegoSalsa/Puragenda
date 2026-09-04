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

export type PublicMarketplaceCard = {
  name: string;
  bookingPath: string;
  categorySlug: string;
  citySlug: string;
  cityName: string;
  logoUrl: string | null;
  serviceNames: string[];
};

const MAX_SERVICE_NAMES = 3;

/**
 * Whitelist projection for consumer-facing cards. Internal ids, API keys,
 * contacts, billing tokens and client records must never appear here.
 */
export function projectPublicMarketplaceCard(
  candidate: MarketplaceListingCandidate,
): PublicMarketplaceCard {
  const publicLogo =
    typeof candidate.logoUrl === "string" && candidate.logoUrl.startsWith("https://")
      ? candidate.logoUrl
      : null;

  const bookingPath = candidate.locationSlug
    ? `/widget/${candidate.slug}?location=${encodeURIComponent(candidate.locationSlug)}`
    : `/widget/${candidate.slug}`;

  return {
    name: candidate.name.trim(),
    bookingPath,
    categorySlug: candidate.categorySlug,
    citySlug: candidate.citySlug,
    cityName: cityDisplayName(candidate.citySlug),
    logoUrl: publicLogo,
    serviceNames: candidate.serviceNames
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, MAX_SERVICE_NAMES),
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
