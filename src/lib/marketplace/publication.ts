import { isMarketplaceOperationallyActive, type MarketplaceListingStatus } from "./status";
import { MARKETPLACE_EXCLUDED_SLUGS } from "./visibility";

export type MarketplacePublishReadinessInput = {
  status: MarketplaceListingStatus;
  authorizationConfirmed: boolean;
  hasActiveCategory: boolean;
  hasCanonicalLocality: boolean;
  deleted: boolean;
  demo: boolean;
  slug: string;
  plan: "INDIVIDUAL" | "EQUIPO" | "TEST" | string;
  locationActive: boolean;
  hasBookableService: boolean;
};

export const MARKETPLACE_PUBLISH_BLOCKER_LABELS: Record<string, string> = {
  status_not_active: "El estado marketplace no es Activo",
  authorization_required: "Sin autorización vigente",
  category_required: "Sin categoría",
  locality_required: "Sin localidad",
  business_deleted: "Negocio eliminado",
  demo_excluded: "Negocio demo excluido",
  test_plan_excluded: "Plan TEST excluido",
  location_inactive: "Sucursal inactiva",
  bookable_service_required: "Sin servicio reservable",
};

export function marketplacePublishBlockerLabel(code: string): string {
  return MARKETPLACE_PUBLISH_BLOCKER_LABELS[code] ?? code;
}

export function marketplacePublishBlockers(
  input: MarketplacePublishReadinessInput,
): string[] {
  const reasons: string[] = [];
  if (!isMarketplaceOperationallyActive(input.status)) reasons.push("status_not_active");
  if (!input.authorizationConfirmed) reasons.push("authorization_required");
  if (!input.hasActiveCategory) reasons.push("category_required");
  if (!input.hasCanonicalLocality) reasons.push("locality_required");
  if (input.deleted) reasons.push("business_deleted");
  if (input.demo || MARKETPLACE_EXCLUDED_SLUGS.has(input.slug)) reasons.push("demo_excluded");
  if (input.plan === "TEST") reasons.push("test_plan_excluded");
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
