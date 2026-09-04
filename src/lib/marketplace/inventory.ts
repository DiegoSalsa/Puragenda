import type { MarketplaceListingCandidate } from "./visibility";

/**
 * Production inventory source for SEO-008.
 *
 * Business has no platform category, no canonical city/comuna, and no
 * directory publication flag. Inferring those from free-text `address` or
 * from per-tenant `ServiceCategory.name` would invent taxonomy and leak
 * private shops into a public SERP.
 *
 * Fail closed: no listings until those fields exist and are populated.
 */
export function loadPublicMarketplaceInventory(): MarketplaceListingCandidate[] {
  return [];
}
