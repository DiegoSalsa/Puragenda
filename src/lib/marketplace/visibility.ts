import { isSupportedMarketplaceCategory } from "./taxonomy";
import { isCanonicalCitySlug } from "./geo";
import { isMarketplaceOperationallyActive, type MarketplaceListingStatus } from "./status";

export const MARKETPLACE_EXCLUDED_SLUGS = new Set(["purocode-demo", "estetica-bella"]);

export const MARKETPLACE_FORBIDDEN_PUBLIC_FIELDS = [
  "id",
  "businessId",
  "locationId",
  "apiKey",
  "email",
  "phone",
  "ownerId",
  "mpAccessToken",
  "mpRefreshToken",
  "mpUserId",
  "mpTokenExpiresAt",
  "paddleCustomerId",
  "paddleSubscriptionId",
  "password",
  "registrationIp",
  "rut",
  "clients",
  "appointments",
  "internalNotes",
  "authorizationConfirmedAt",
  "authorizationRevokedAt",
  "authorizationSource",
] as const;

/**
 * Internal candidate. Never send this object to the client or to analytics.
 * Directory publication is explicit: missing/false means unpublished.
 * Subscription/plan is not a substitute for operational marketplace status.
 */
export type MarketplaceListingCandidate = {
  slug: string;
  name: string;
  logoUrl: string | null;
  locationSlug?: string;
  locationName?: string;
  categorySlug: string;
  categoryName?: string;
  citySlug: string;
  cityName?: string;
  regionName?: string;
  serviceNames: readonly string[];
  status: MarketplaceListingStatus;
  deleted: boolean;
  directoryPublished: boolean;
  locationActive: boolean;
  demo: boolean;
  subscriptionActive: boolean;
  plan: "INDIVIDUAL" | "EQUIPO" | "TEST";
  hasBookableService: boolean;
};

export function isMarketplacePubliclyVisible(candidate: MarketplaceListingCandidate): boolean {
  if (!isMarketplaceOperationallyActive(candidate.status)) return false;
  if (candidate.deleted) return false;
  if (!candidate.directoryPublished) return false;
  if (!candidate.locationActive) return false;
  if (candidate.demo) return false;
  if (MARKETPLACE_EXCLUDED_SLUGS.has(candidate.slug)) return false;
  if (candidate.plan === "TEST") return false;
  if (!candidate.hasBookableService) return false;
  if (!candidate.name.trim()) return false;
  if (!candidate.slug.trim()) return false;
  if (!candidate.categorySlug.trim()) return false;
  if (!candidate.citySlug.trim()) return false;
  return true;
}

export function isMarketplaceEligibleListing(candidate: MarketplaceListingCandidate): boolean {
  if (!isMarketplacePubliclyVisible(candidate)) return false;
  if (!isSupportedMarketplaceCategory(candidate.categorySlug)) return false;
  if (!isCanonicalCitySlug(candidate.citySlug)) return false;
  return true;
}

export function eligibleMarketplaceListings(
  candidates: readonly MarketplaceListingCandidate[],
): MarketplaceListingCandidate[] {
  return candidates.filter(isMarketplaceEligibleListing);
}
