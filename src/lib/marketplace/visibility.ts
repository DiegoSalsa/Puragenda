import { isSupportedMarketplaceCategory } from "./taxonomy";
import { isCanonicalCitySlug } from "./geo";

export const MARKETPLACE_EXCLUDED_SLUGS = new Set(["purocode-demo"]);

export const MARKETPLACE_FORBIDDEN_PUBLIC_FIELDS = [
  "id",
  "businessId",
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
] as const;

/**
 * Internal candidate. Never send this object to the client or to analytics.
 * Directory publication is explicit: missing/false means unpublished.
 */
export type MarketplaceListingCandidate = {
  slug: string;
  name: string;
  logoUrl: string | null;
  categorySlug: string;
  citySlug: string;
  serviceNames: readonly string[];
  deleted: boolean;
  directoryPublished: boolean;
  demo: boolean;
  subscriptionActive: boolean;
  plan: "INDIVIDUAL" | "EQUIPO" | "TEST";
  hasBookableService: boolean;
};

export function isMarketplaceEligibleListing(candidate: MarketplaceListingCandidate): boolean {
  if (candidate.deleted) return false;
  if (!candidate.directoryPublished) return false;
  if (candidate.demo) return false;
  if (MARKETPLACE_EXCLUDED_SLUGS.has(candidate.slug)) return false;
  if (candidate.plan === "TEST") return false;
  if (!candidate.subscriptionActive) return false;
  if (!candidate.hasBookableService) return false;
  if (!candidate.name.trim()) return false;
  if (!candidate.slug.trim()) return false;
  if (!isSupportedMarketplaceCategory(candidate.categorySlug)) return false;
  if (!isCanonicalCitySlug(candidate.citySlug)) return false;
  return true;
}

export function eligibleMarketplaceListings(
  candidates: readonly MarketplaceListingCandidate[],
): MarketplaceListingCandidate[] {
  return candidates.filter(isMarketplaceEligibleListing);
}
