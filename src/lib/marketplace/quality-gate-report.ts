import {
  evaluateMarketplaceQualityGate,
  MARKETPLACE_QUALITY_GATE,
} from "./quality-gate";
import { eligibleMarketplaceListings, type MarketplaceListingCandidate } from "./visibility";

export type MarketplaceQualityGateReportRow = {
  categorySlug: string;
  citySlug: string;
  publishedListings: number;
  distinctBusinesses: number;
  bookableServices: number;
  meetsInventoryFloor: boolean;
  wouldPassCurrentGate: boolean;
};

export function buildMarketplaceQualityGateReport(
  candidates: readonly MarketplaceListingCandidate[],
): MarketplaceQualityGateReportRow[] {
  const eligible = eligibleMarketplaceListings(candidates);
  const groups = new Map<string, MarketplaceListingCandidate[]>();

  for (const listing of eligible) {
    const key = `${listing.categorySlug}|${listing.citySlug}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(listing);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .map(([key, listings]) => {
      const [categorySlug, citySlug] = key.split("|");
      const publishedListings = listings.length;
      const distinctBusinesses = new Set(listings.map((listing) => listing.slug)).size;
      const bookableServices = listings.reduce(
        (sum, listing) => sum + listing.serviceNames.filter(Boolean).length,
        0,
      );
      const gate = evaluateMarketplaceQualityGate({
        categorySupported: true,
        localityCanonical: true,
        publicBusinessCount: publishedListings,
        bookableServiceCount: bookableServices,
        indexableCityCount: 1,
      });
      const meetsInventoryFloor =
        publishedListings >= MARKETPLACE_QUALITY_GATE.minPublicBusinesses &&
        bookableServices >= MARKETPLACE_QUALITY_GATE.minBookableServices;

      return {
        categorySlug,
        citySlug,
        publishedListings,
        distinctBusinesses,
        bookableServices,
        meetsInventoryFloor,
        wouldPassCurrentGate: gate.indexable,
      };
    })
    .sort((a, b) => {
      const category = a.categorySlug.localeCompare(b.categorySlug, "es");
      if (category !== 0) return category;
      return a.citySlug.localeCompare(b.citySlug, "es");
    });
}
