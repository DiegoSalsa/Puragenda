import {
  marketplaceListingStatusLabel,
  type MarketplaceListingStatus,
} from "./status";

export type MarketplaceAdminListListing = {
  published: boolean;
  authorized: boolean;
  revoked?: boolean;
  locality: string;
  categories: string[];
  status?: MarketplaceListingStatus;
};

export function marketplaceAdminListSummary(listings: readonly MarketplaceAdminListListing[]) {
  const categories = [...new Set(listings.flatMap((listing) => listing.categories).filter(Boolean))];
  const localities = [...new Set(listings.map((listing) => listing.locality).filter(Boolean))];
  const authorized = listings.some((listing) => listing.authorized);
  const revoked = listings.some((listing) => listing.revoked);
  const statuses = [...new Set(
    listings
      .map((listing) => listing.status)
      .filter((status): status is MarketplaceListingStatus => Boolean(status)),
  )];
  return {
    categoriesLabel: categories.join(", ") || "—",
    localityLabel: localities.join(", ") || "—",
    published: listings.some((listing) => listing.published),
    authorized,
    authorizationLabel: revoked ? "Revocada" : authorized ? "Autorizado" : "No",
    marketplaceLabel: statuses.length > 0
      ? statuses.map(marketplaceListingStatusLabel).join(" · ")
      : "—",
  };
}
