/**
 * Marketplace quality gate.
 *
 * Fail closed: if we cannot prove a page has enough real public offer,
 * it is not indexable. Thresholds below are provisional — there is no
 * production distribution of directory-listed businesses yet (Business
 * has no platform category, canonical city, or directory publication
 * flag). Do not treat these numbers as measured.
 *
 * Observe before locking:
 * - public, directory-listed businesses per category+city
 * - share with complete public profiles (name, slug, ≥1 bookable service)
 * - share with a canonical locality (not free-text address only)
 * - cities that would pass vs fail the floor
 *
 * `indexingEnabled` stays false until those metrics exist. Tests may
 * pass an override to exercise the rest of the gate.
 */

export type MarketplaceQualityGateConfig = {
  indexingEnabled: boolean;
  minPublicBusinesses: number;
  minBookableServices: number;
  minIndexableCitiesForHub: number;
  listPageSize: number;
};

export const MARKETPLACE_QUALITY_GATE: MarketplaceQualityGateConfig = {
  indexingEnabled: false,
  minPublicBusinesses: 3,
  minBookableServices: 3,
  minIndexableCitiesForHub: 1,
  listPageSize: 24,
};

export type MarketplaceQualityGateInput = {
  categorySupported: boolean;
  localityCanonical: boolean;
  publicBusinessCount: number;
  bookableServiceCount: number;
  indexableCityCount?: number;
};

export type MarketplaceQualityGateResult = {
  indexable: boolean;
  reasons: string[];
};

export function evaluateMarketplaceQualityGate(
  input: MarketplaceQualityGateInput,
  config: MarketplaceQualityGateConfig = MARKETPLACE_QUALITY_GATE,
): MarketplaceQualityGateResult {
  const reasons: string[] = [];

  if (!config.indexingEnabled) reasons.push("indexing_disabled");
  if (!input.categorySupported) reasons.push("category_unsupported");
  if (!input.localityCanonical) reasons.push("locality_not_canonical");
  if (input.publicBusinessCount < config.minPublicBusinesses) {
    reasons.push("insufficient_public_businesses");
  }
  if (input.bookableServiceCount < config.minBookableServices) {
    reasons.push("insufficient_bookable_services");
  }
  if (
    input.indexableCityCount !== undefined &&
    input.indexableCityCount < config.minIndexableCitiesForHub
  ) {
    reasons.push("insufficient_indexable_cities");
  }

  return { indexable: reasons.length === 0, reasons };
}

export function withQualityGateOverrides(
  overrides: Partial<MarketplaceQualityGateConfig>,
): MarketplaceQualityGateConfig {
  return { ...MARKETPLACE_QUALITY_GATE, ...overrides };
}
