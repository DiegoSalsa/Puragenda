export const MARKETPLACE_AUTHORIZATION_SOURCE_REGISTRATION = "registration";
export const MARKETPLACE_AUTHORIZATION_SOURCE_ADMIN = "admin";
export const MARKETPLACE_AUTHORIZATION_SOURCE_SETTINGS = "settings";
export const MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT = "dashboard_prompt";

export const MARKETPLACE_AUTHORIZATION_TEXT_VERSION = "2026-09-06.registration.v1";

export const MARKETPLACE_AUTHORIZATION_COPY = {
  checkbox: "Quiero que mi negocio pueda aparecer en el directorio público de Puragenda.",
  details:
    "Puragenda podrá mostrar información pública de tu negocio, como nombre, rubro, ciudad y enlace para reservar. Puedes retirar esta autorización posteriormente.",
  disclaimer: "Autorizar la publicación no garantiza que el negocio aparezca inmediatamente en el directorio.",
} as const;

export const MARKETPLACE_PUBLIC_AUTHORIZATION_SCOPE = [
  "businessName",
  "category",
  "locality",
  "logo",
  "publicWidgetServices",
  "bookingLink",
] as const;

export const MARKETPLACE_OTHER_CATEGORY_SLUG = "otro";

export function isMarketplaceListingAuthorized(listing: {
  authorizationConfirmedAt: Date | null;
  authorizationRevokedAt: Date | null;
}): boolean {
  return listing.authorizationConfirmedAt != null && listing.authorizationRevokedAt == null;
}

export type MarketplaceConsentState = "UNANSWERED" | "DISMISSED" | "AUTHORIZED" | "REVOKED";

export function marketplaceConsentState(input: {
  promptDismissedAt: Date | string | null;
  listings: ReadonlyArray<{
    authorizationConfirmedAt: Date | string | null;
    authorizationRevokedAt: Date | string | null;
  }>;
}): MarketplaceConsentState {
  if (input.listings.some((listing) => listing.authorizationRevokedAt != null)) return "REVOKED";
  if (input.listings.some((listing) => isMarketplaceListingAuthorized({
    authorizationConfirmedAt: listing.authorizationConfirmedAt ? new Date(listing.authorizationConfirmedAt) : null,
    authorizationRevokedAt: listing.authorizationRevokedAt ? new Date(listing.authorizationRevokedAt) : null,
  }))) return "AUTHORIZED";
  if (input.promptDismissedAt != null) return "DISMISSED";
  return "UNANSWERED";
}

export function marketplaceConsentStateLabel(state: MarketplaceConsentState): string {
  if (state === "AUTHORIZED") return "Autorizado";
  if (state === "REVOKED") return "Revocado";
  if (state === "DISMISSED") return "Prompt descartado";
  return "No preguntado";
}
