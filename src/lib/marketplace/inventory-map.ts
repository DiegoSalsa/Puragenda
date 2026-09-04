import { MARKETPLACE_EXCLUDED_SLUGS, type MarketplaceListingCandidate } from "./visibility";
import {
  bookableServiceNamesForLocation,
  isMarketplaceSubscriptionActive,
  locationHasBookableAppointmentService,
} from "./publication";

export type PublishedListingRecord = {
  publishedAt: Date | null;
  locality: { slug: string };
  location: { id: string; slug: string; isActive: boolean };
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
  categories: Array<{ category: { slug: string; isActive: boolean; seoEnabled: boolean } }>;
};

export function mapPublishedListingToCandidates(
  record: PublishedListingRecord,
): MarketplaceListingCandidate[] {
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

  const base = {
    slug: record.business.slug,
    name: record.business.name,
    logoUrl: record.business.logoUrl,
    locationSlug: record.location.slug,
    citySlug: record.locality.slug,
    serviceNames,
    deleted: record.business.deletedAt !== null,
    directoryPublished: record.publishedAt !== null,
    demo: MARKETPLACE_EXCLUDED_SLUGS.has(record.business.slug),
    subscriptionActive: isMarketplaceSubscriptionActive(record.business.subscription?.status),
    plan,
    hasBookableService,
  };

  return record.categories
    .filter((entry) => entry.category.seoEnabled)
    .map((entry) => ({
      ...base,
      categorySlug: entry.category.slug,
    }));
}
