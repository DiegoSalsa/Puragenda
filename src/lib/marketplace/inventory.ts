import type { MarketplaceListingCandidate } from "./visibility";

/**
 * Empty fallback used by unit tests that do not hit the database.
 * Production public inventory is loaded in marketplace.service.ts from
 * admin-curated MarketplaceListing rows.
 */
export function loadPublicMarketplaceInventory(): MarketplaceListingCandidate[] {
  return [];
}
