export type MarketplaceAdminListListing = {
  published: boolean;
  authorized: boolean;
  revoked?: boolean;
  locality: string;
  categories: string[];
};

export function marketplaceAdminListSummary(listings: readonly MarketplaceAdminListListing[]) {
  const categories = [...new Set(listings.flatMap((listing) => listing.categories).filter(Boolean))];
  const localities = [...new Set(listings.map((listing) => listing.locality).filter(Boolean))];
  const authorized = listings.some((listing) => listing.authorized);
  const revoked = listings.some((listing) => listing.revoked);
  return {
    categoriesLabel: categories.join(", ") || "—",
    localityLabel: localities.join(", ") || "—",
    published: listings.some((listing) => listing.published),
    authorized,
    authorizationLabel: revoked ? "Revocada" : authorized ? "Sí" : "No",
  };
}
