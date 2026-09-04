import { MARKETPLACE_EXCLUDED_SLUGS } from "./visibility";

export type MarketplacePublishReadinessInput = {
  authorizationConfirmed: boolean;
  hasActiveCategory: boolean;
  hasCanonicalLocality: boolean;
  deleted: boolean;
  demo: boolean;
  slug: string;
  plan: "INDIVIDUAL" | "EQUIPO" | "TEST" | string;
  subscriptionActive: boolean;
  locationActive: boolean;
  hasBookableService: boolean;
};

export function marketplacePublishBlockers(
  input: MarketplacePublishReadinessInput,
): string[] {
  const reasons: string[] = [];
  if (!input.authorizationConfirmed) reasons.push("authorization_required");
  if (!input.hasActiveCategory) reasons.push("category_required");
  if (!input.hasCanonicalLocality) reasons.push("locality_required");
  if (input.deleted) reasons.push("business_deleted");
  if (input.demo || MARKETPLACE_EXCLUDED_SLUGS.has(input.slug)) reasons.push("demo_excluded");
  if (input.plan === "TEST") reasons.push("test_plan_excluded");
  if (!input.subscriptionActive) reasons.push("subscription_inactive");
  if (!input.locationActive) reasons.push("location_inactive");
  if (!input.hasBookableService) reasons.push("bookable_service_required");
  return reasons;
}

export function canPublishMarketplaceListing(input: MarketplacePublishReadinessInput): boolean {
  return marketplacePublishBlockers(input).length === 0;
}

export function isMarketplaceSubscriptionActive(status: string | null | undefined): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export function locationHasBookableAppointmentService(input: {
  productionOrdersEnabled: boolean;
  services: Array<{
    bookingMode: string;
    locationIds: readonly string[];
  }>;
  locationId: string;
}): boolean {
  return input.services.some((service) => {
    if (service.bookingMode === "PRODUCTION") return false;
    if (service.bookingMode !== "APPOINTMENT") return false;
    if (service.locationIds.length === 0) return true;
    return service.locationIds.includes(input.locationId);
  });
}

export function bookableServiceNamesForLocation(input: {
  services: Array<{
    name: string;
    bookingMode: string;
    locationIds: readonly string[];
  }>;
  locationId: string;
}): string[] {
  return input.services
    .filter((service) => {
      if (service.bookingMode !== "APPOINTMENT") return false;
      if (service.locationIds.length === 0) return true;
      return service.locationIds.includes(input.locationId);
    })
    .map((service) => service.name);
}
