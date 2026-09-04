import {
  loadPublicMarketplaceInventory,
  type MarketplaceListingCandidate,
} from "@/lib/marketplace";

/**
 * Public marketplace inventory boundary.
 *
 * Do not reuse `getBusinessBySlug` / `getBusinessWithServices` here: those
 * return api keys, staff emails, subscription internals and other tenant
 * fields. When Business gains directory publication, platform category and
 * canonical city, this function should query a whitelist `select` only:
 *
 *   where: { deletedAt: null, directoryPublishedAt: { not: null }, ... }
 *   select: { name, slug, logoUrl, ... }
 *
 * SEO-008: those columns do not exist. Fail closed with an empty list.
 * No migration: a query against missing fields is not justified yet.
 */
export async function listPublicMarketplaceListings(): Promise<MarketplaceListingCandidate[]> {
  return loadPublicMarketplaceInventory();
}
