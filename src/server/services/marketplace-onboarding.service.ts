import { Prisma } from "@prisma/client";
import {
  MARKETPLACE_AUTHORIZATION_SOURCE_REGISTRATION,
  MARKETPLACE_AUTHORIZATION_SOURCE_SETTINGS,
  MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
  MARKETPLACE_OTHER_CATEGORY_SLUG,
  isMarketplaceListingAuthorized,
} from "@/lib/marketplace/authorization";
import {
  MARKETPLACE_LOCALITY_NOT_FOUND,
  isMarketplaceOtherCategory,
  normalizeOptionalText,
  registrationMarketplaceShapeErrors,
  type RegistrationMarketplaceInput,
  type ResolvedRegistrationMarketplace,
} from "@/lib/marketplace/onboarding";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/lib/audit";

export type RegistrationMarketplaceCatalog = {
  categories: Array<{ slug: string; name: string }>;
  localities: Array<{ slug: string; name: string; regionName: string }>;
};

function isMissingMarketplaceSchema(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    && (error.code === "P2021" || error.code === "P2022");
}

export async function listRegistrationMarketplaceCatalog(): Promise<RegistrationMarketplaceCatalog> {
  try {
    const [categories, localities] = await Promise.all([
      prisma.marketplaceCategory.findMany({
        where: { isActive: true },
        orderBy: { position: "asc" },
        select: { slug: true, name: true },
      }),
      prisma.marketplaceLocality.findMany({
        where: { isActive: true },
        orderBy: { position: "asc" },
        select: { slug: true, name: true, regionName: true },
      }),
    ]);
    return { categories, localities };
  } catch (error) {
    if (isMissingMarketplaceSchema(error)) return { categories: [], localities: [] };
    throw error;
  }
}

export async function resolveRegistrationMarketplaceClassification(
  input: RegistrationMarketplaceInput,
): Promise<{ ok: true; classification: ResolvedRegistrationMarketplace } | { ok: false; error: string }> {
  const shapeErrors = registrationMarketplaceShapeErrors(input);
  if (shapeErrors.length > 0) {
    return { ok: false, error: shapeErrors[0] ?? "Datos de directorio inválidos" };
  }

  const categorySlug = input.categorySlug.trim().toLowerCase();
  const countryCode = input.countryCode.trim().toUpperCase();
  const authorized = Boolean(input.authorized);
  const otherDescription = normalizeOptionalText(input.otherDescription, 200);
  const cityName = normalizeOptionalText(input.cityName, 100);
  const localitySlug = input.localitySlug?.trim().toLowerCase() || null;
  const localityNotFound = Boolean(input.localityNotFound) || localitySlug === MARKETPLACE_LOCALITY_NOT_FOUND;

  let categoryIds: string[] = [];
  let pendingCategoryDescription: string | null = null;

  if (isMarketplaceOtherCategory(categorySlug)) {
    pendingCategoryDescription = otherDescription;
  } else {
    const category = await prisma.marketplaceCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true, isActive: true },
    });
    if (!category || !category.isActive) {
      return { ok: false, error: "Selecciona un rubro válido" };
    }
    categoryIds = [category.id];
  }

  let localityId: string | null = null;
  let pendingLocalityName: string | null = null;
  let locationAddress: string | null = null;

  if (countryCode !== "CL") {
    pendingLocalityName = cityName;
    locationAddress = cityName;
  } else if (localityNotFound) {
    pendingLocalityName = cityName;
    locationAddress = cityName;
  } else {
    const locality = await prisma.marketplaceLocality.findUnique({
      where: { slug: localitySlug ?? "" },
      select: { id: true, name: true, isActive: true },
    });
    if (!locality || !locality.isActive) {
      return { ok: false, error: "Selecciona una ciudad o comuna válida" };
    }
    localityId = locality.id;
    locationAddress = locality.name;
  }

  return {
    ok: true,
    classification: {
      categoryIds,
      pendingCategoryDescription,
      localityId,
      pendingLocalityName,
      locationAddress,
      authorized,
    },
  };
}

export async function createRegistrationMarketplaceListing(
  tx: Prisma.TransactionClient,
  input: {
    businessId: string;
    locationId: string;
    userId: string;
    classification: ResolvedRegistrationMarketplace;
  },
) {
  const now = new Date();
  const listing = await tx.marketplaceListing.create({
    data: {
      businessId: input.businessId,
      locationId: input.locationId,
      localityId: input.classification.localityId,
      pendingCategoryDescription: input.classification.pendingCategoryDescription,
      pendingLocalityName: input.classification.pendingLocalityName,
      authorizationConfirmedAt: input.classification.authorized ? now : null,
      authorizationConfirmedById: input.classification.authorized ? input.userId : null,
      authorizationSource: input.classification.authorized ? MARKETPLACE_AUTHORIZATION_SOURCE_REGISTRATION : null,
      authorizationTextVersion: input.classification.authorized ? MARKETPLACE_AUTHORIZATION_TEXT_VERSION : null,
      authorizationRevokedAt: null,
      publishedAt: null,
    },
  });

  if (input.classification.categoryIds.length > 0) {
    await tx.marketplaceListingCategory.createMany({
      data: input.classification.categoryIds.map((categoryId) => ({
        listingId: listing.id,
        categoryId,
      })),
    });
  }

  return listing;
}

export async function getPrimaryMarketplaceListingForBusiness(businessId: string) {
  return prisma.marketplaceListing.findFirst({
    where: { businessId, location: { isPrimary: true } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorizationConfirmedAt: true,
      authorizationRevokedAt: true,
      authorizationSource: true,
      authorizationTextVersion: true,
      publishedAt: true,
      pendingCategoryDescription: true,
      pendingLocalityName: true,
      locality: { select: { name: true } },
      categories: { select: { category: { select: { name: true } } } },
    },
  });
}

export async function setBusinessMarketplaceAuthorization(
  businessId: string,
  userId: string,
  authorized: boolean,
): Promise<{ ok: true; authorized: boolean } | { ok: false; error: string }> {
  const listings = await prisma.marketplaceListing.findMany({
    where: { businessId },
    select: {
      id: true,
      authorizationConfirmedAt: true,
      authorizationRevokedAt: true,
    },
  });

  if (listings.length === 0) {
    return { ok: false, error: "Este negocio todavía no tiene ficha de directorio" };
  }

  const now = new Date();

  if (authorized) {
    await prisma.marketplaceListing.updateMany({
      where: { businessId },
      data: {
        authorizationConfirmedAt: now,
        authorizationConfirmedById: userId,
        authorizationSource: MARKETPLACE_AUTHORIZATION_SOURCE_SETTINGS,
        authorizationTextVersion: MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
        authorizationRevokedAt: null,
        publishedAt: null,
      },
    });
  } else {
    await prisma.marketplaceListing.updateMany({
      where: { businessId },
      data: {
        authorizationRevokedAt: now,
        publishedAt: null,
      },
    });
  }

  await createAuditLog(
    authorized ? "MARKETPLACE_AUTHORIZATION_CONFIRMED" : "MARKETPLACE_AUTHORIZATION_REVOKED",
    {
      businessId,
      source: MARKETPLACE_AUTHORIZATION_SOURCE_SETTINGS,
      textVersion: MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
    },
    userId,
  );

  return { ok: true, authorized };
}

export function listingAuthorizationState(listing: {
  authorizationConfirmedAt: Date | null;
  authorizationRevokedAt: Date | null;
}) {
  return {
    authorized: isMarketplaceListingAuthorized(listing),
    revoked: listing.authorizationRevokedAt != null,
  };
}

export const REGISTRATION_OTHER_CATEGORY = MARKETPLACE_OTHER_CATEGORY_SLUG;
