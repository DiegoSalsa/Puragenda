import {
  MARKETPLACE_EXCLUDED_SLUGS,
  isMarketplacePubliclyVisible,
  type MarketplaceListingCandidate,
} from "./visibility";
import {
  bookableServiceNamesForLocation,
  isMarketplaceSubscriptionActive,
  locationHasBookableAppointmentService,
} from "./publication";
import type { MarketplaceListingStatus } from "./status";
import { projectPublicMarketplaceDirectoryCard, type PublicMarketplaceDirectoryCard } from "./projection";

export type PublishedListingRecord = {
  status?: MarketplaceListingStatus;
  publishedAt: Date | null;
  locality: { slug: string; name?: string; regionName?: string } | null;
  location: { id: string; slug: string; name?: string; isActive: boolean };
  business: {
    name: string;
    slug: string;
    logoUrl: string | null;
    deletedAt: Date | null;
    productionOrdersEnabled: boolean;
    subscription: { plan: "INDIVIDUAL" | "EQUIPO" | "TEST"; status: string } | null;
    services: Array<{
      name: string;
      bookingMode: string;
      locations: Array<{ locationId: string }>;
    }>;
  };
  categories: Array<{
    category: { slug: string; name?: string; isActive: boolean; seoEnabled: boolean };
  }>;
};

export type MarketplaceCategoryMapMode = "seoEnabled" | "isActive";

function listingBase(record: PublishedListingRecord) {
  const serviceInput = {
    locationId: record.location.id,
    productionOrdersEnabled: record.business.productionOrdersEnabled,
    services: record.business.services.map((service) => ({
      name: service.name,
      bookingMode: service.bookingMode,
      locationIds: service.locations.map((location) => location.locationId),
    })),
  };
  const serviceNames = bookableServiceNamesForLocation(serviceInput);
  const hasBookableService = locationHasBookableAppointmentService(serviceInput);
  const plan = record.business.subscription?.plan ?? "INDIVIDUAL";

  return {
    slug: record.business.slug,
    name: record.business.name,
    logoUrl: record.business.logoUrl,
    locationSlug: record.location.slug,
    locationName: record.location.name,
    citySlug: record.locality?.slug ?? "",
    cityName: record.locality?.name,
    regionName: record.locality?.regionName,
    serviceNames,
    status: record.status ?? "PENDING_REVIEW",
    deleted: record.business.deletedAt !== null,
    directoryPublished: record.publishedAt !== null,
    locationActive: record.location.isActive,
    demo: MARKETPLACE_EXCLUDED_SLUGS.has(record.business.slug),
    subscriptionActive: isMarketplaceSubscriptionActive(record.business.subscription?.status),
    plan,
    hasBookableService,
  };
}

function visibleCategories(
  record: PublishedListingRecord,
  mode: MarketplaceCategoryMapMode,
) {
  return record.categories.filter((entry) => (
    mode === "seoEnabled" ? entry.category.seoEnabled : entry.category.isActive
  ));
}

export function mapPublishedListingToCandidates(
  record: PublishedListingRecord,
  options: { categoryFilter?: MarketplaceCategoryMapMode } = {},
): MarketplaceListingCandidate[] {
  if (!record.locality) return [];
  const mode = options.categoryFilter ?? "seoEnabled";
  const base = listingBase(record);

  return visibleCategories(record, mode).map((entry) => ({
    ...base,
    categorySlug: entry.category.slug,
    categoryName: entry.category.name,
  }));
}

export function mapPublishedListingToDirectoryCard(
  record: PublishedListingRecord,
): PublicMarketplaceDirectoryCard | null {
  if (!record.locality) return null;
  const categories = visibleCategories(record, "isActive");
  if (categories.length === 0) return null;
  const base = listingBase(record);
  const candidate: MarketplaceListingCandidate = {
    ...base,
    categorySlug: categories[0]?.category.slug ?? "",
    categoryName: categories[0]?.category.name,
  };
  if (!isMarketplacePubliclyVisible(candidate)) return null;
  return projectPublicMarketplaceDirectoryCard(candidate, {
    categorySlugs: categories.map((entry) => entry.category.slug),
    categoryNames: categories.map((entry) => entry.category.name ?? entry.category.slug),
    cityName: record.locality.name ?? record.locality.slug,
    regionName: record.locality.regionName ?? "",
    locationName: record.location.name ?? "",
  });
}
