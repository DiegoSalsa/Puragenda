export type MarketplaceAdminListListing = {
  published: boolean;
  locality: string;
  categories: string[];
};

export function marketplaceAdminListSummary(listings: readonly MarketplaceAdminListListing[]) {
  const categories = [...new Set(listings.flatMap((listing) => listing.categories).filter(Boolean))];
  const localities = [...new Set(listings.map((listing) => listing.locality).filter(Boolean))];
  return {
    categoriesLabel: categories.join(", ") || "—",
    localityLabel: localities.join(", ") || "—",
    published: listings.some((listing) => listing.published),
  };
}
