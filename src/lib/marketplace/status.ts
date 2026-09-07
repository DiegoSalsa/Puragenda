export const MARKETPLACE_LISTING_STATUSES = [
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "EXCLUDED",
] as const;

export type MarketplaceListingStatus = (typeof MARKETPLACE_LISTING_STATUSES)[number];

export const MARKETPLACE_LISTING_STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  PENDING_REVIEW: "Pendiente",
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  EXCLUDED: "Excluido",
};

export function isMarketplaceListingStatus(value: unknown): value is MarketplaceListingStatus {
  return MARKETPLACE_LISTING_STATUSES.includes(value as MarketplaceListingStatus);
}

export function marketplaceListingStatusLabel(status: MarketplaceListingStatus): string {
  return MARKETPLACE_LISTING_STATUS_LABELS[status];
}

export function isMarketplaceOperationallyActive(status: MarketplaceListingStatus): boolean {
  return status === "ACTIVE";
}

/**
 * Pause and exclude always unpublish. Reactivating ACTIVE does not republish.
 * Admin must set published explicitly after a pause.
 */
export function resolveMarketplacePublishedAt(input: {
  status: MarketplaceListingStatus;
  wantPublished: boolean;
  existingPublishedAt: Date | null;
  now: Date;
}): Date | null {
  if (!isMarketplaceOperationallyActive(input.status)) return null;
  if (!input.wantPublished) return null;
  return input.existingPublishedAt ?? input.now;
}
