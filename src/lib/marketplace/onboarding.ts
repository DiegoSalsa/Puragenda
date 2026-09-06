import { MARKETPLACE_OTHER_CATEGORY_SLUG } from "./authorization";

export const MARKETPLACE_LOCALITY_NOT_FOUND = "__not_found__";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type RegistrationMarketplaceInput = {
  countryCode: string;
  categorySlug: string;
  otherDescription?: string | null;
  localitySlug?: string | null;
  localityNotFound?: boolean;
  cityName?: string | null;
  authorized?: boolean;
};

export type ResolvedRegistrationMarketplace = {
  categoryIds: string[];
  pendingCategoryDescription: string | null;
  localityId: string | null;
  pendingLocalityName: string | null;
  locationAddress: string | null;
  authorized: boolean;
};

export function isMarketplaceOtherCategory(slug: string): boolean {
  return slug.trim().toLowerCase() === MARKETPLACE_OTHER_CATEGORY_SLUG;
}

export function isMarketplaceSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function registrationMarketplaceShapeErrors(input: RegistrationMarketplaceInput): string[] {
  const errors: string[] = [];
  const categorySlug = input.categorySlug.trim().toLowerCase();
  const countryCode = input.countryCode.trim().toUpperCase();
  const otherDescription = normalizeOptionalText(input.otherDescription, 200);
  const cityName = normalizeOptionalText(input.cityName, 100);
  const localitySlug = input.localitySlug?.trim().toLowerCase() || null;

  if (!categorySlug) {
    errors.push("Selecciona el rubro del negocio");
  } else if (!isMarketplaceOtherCategory(categorySlug) && !isMarketplaceSlug(categorySlug)) {
    errors.push("Selecciona un rubro válido");
  }

  if (isMarketplaceOtherCategory(categorySlug) && (!otherDescription || otherDescription.length < 2)) {
    errors.push("Describe a qué se dedica tu negocio");
  }

  if (countryCode === "CL") {
    if (input.localityNotFound || localitySlug === MARKETPLACE_LOCALITY_NOT_FOUND) {
      if (!cityName || cityName.length < 2) {
        errors.push("Indica la ciudad o comuna de tu negocio");
      }
    } else if (!localitySlug) {
      errors.push("Selecciona tu ciudad o comuna");
    } else if (!isMarketplaceSlug(localitySlug)) {
      errors.push("Selecciona una ciudad o comuna válida");
    }
  } else {
    if (localitySlug) {
      errors.push("La localidad del directorio solo aplica en Chile");
    }
    if (!cityName || cityName.length < 2) {
      errors.push("Indica la ciudad o localidad de tu negocio");
    }
  }

  return errors;
}

export function groupLocalitiesByRegion<T extends { regionName: string }>(
  localities: readonly T[],
): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const locality of localities) {
    const bucket = groups.get(locality.regionName) ?? [];
    bucket.push(locality);
    groups.set(locality.regionName, bucket);
  }
  return [...groups.entries()];
}
