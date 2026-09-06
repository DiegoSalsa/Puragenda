import { Prisma } from "@prisma/client";
import {
  MARKETPLACE_AUTHORIZATION_SOURCE_REGISTRATION,
  MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT,
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
import { resolveCanonicalCity } from "@/lib/marketplace/geo";
import { shouldShowExistingBusinessMarketplacePrompt } from "@/lib/marketplace/existing-business-prompt";

export type RegistrationMarketplaceCatalog = {
  categories: Array<{ slug: string; name: string }>;
  localities: Array<{ slug: string; name: string; regionName: string }>;
};

export type ExistingBusinessMarketplacePromptInput = {
  categorySlug?: string | null;
  otherDescription?: string | null;
  localitySlug?: string | null;
  localityNotFound?: boolean;
  cityName?: string | null;
};

export type ExistingBusinessMarketplacePrompt = {
  businessName: string;
  countryCode: string;
  categoryLabel: string | null;
  localityLabel: string | null;
  needsCategory: boolean;
  needsLocality: boolean;
  suggestedLocalitySlug: string | null;
  initialCityName: string;
  categories: RegistrationMarketplaceCatalog["categories"];
  localities: RegistrationMarketplaceCatalog["localities"];
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

async function loadExistingBusinessPromptContext(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      countryCode: true,
      createdAt: true,
      deletedAt: true,
      marketplacePromptDismissedAt: true,
      subscription: { select: { plan: true, status: true } },
      locations: {
        where: { isPrimary: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, address: true, isActive: true },
      },
      marketplaceListings: {
        select: {
          id: true,
          locationId: true,
          pendingCategoryDescription: true,
          pendingLocalityName: true,
          authorizationConfirmedAt: true,
          authorizationRevokedAt: true,
          locality: { select: { id: true, slug: true, name: true, isActive: true } },
          categories: {
            select: { category: { select: { id: true, slug: true, name: true, isActive: true } } },
          },
        },
      },
    },
  });
  if (!business) return null;

  const primaryLocation = business.locations[0] ?? null;
  const eligible = shouldShowExistingBusinessMarketplacePrompt({
    createdAt: business.createdAt,
    deletedAt: business.deletedAt,
    slug: business.slug,
    plan: business.subscription?.plan ?? null,
    subscriptionStatus: business.subscription?.status ?? null,
    promptDismissedAt: business.marketplacePromptDismissedAt,
    hasActivePrimaryLocation: Boolean(primaryLocation?.isActive),
    listings: business.marketplaceListings,
  });
  if (!eligible || !primaryLocation) return null;

  const listing = business.marketplaceListings.find((item) => item.locationId === primaryLocation.id) ?? null;
  const activeCategories = listing?.categories
    .map((entry) => entry.category)
    .filter((category) => category.isActive) ?? [];
  const activeLocality = listing?.locality?.isActive ? listing.locality : null;
  const pendingCategoryDescription = normalizeOptionalText(listing?.pendingCategoryDescription, 200);
  const initialCityName = normalizeOptionalText(
    listing?.pendingLocalityName || primaryLocation.address,
    100,
  ) ?? "";

  return {
    business,
    primaryLocation,
    listing,
    activeCategories,
    activeLocality,
    pendingCategoryDescription,
    initialCityName,
  };
}

async function buildExistingBusinessMarketplacePrompt(
  context: NonNullable<Awaited<ReturnType<typeof loadExistingBusinessPromptContext>>>,
): Promise<ExistingBusinessMarketplacePrompt> {
  const catalog = await listRegistrationMarketplaceCatalog();
  const categoryLabel = context.activeCategories.length > 0
    ? context.activeCategories.map((category) => category.name).join(", ")
    : context.pendingCategoryDescription
      ? `Otro: ${context.pendingCategoryDescription}`
      : null;
  const localityLabel = context.activeLocality?.name
    ?? (context.business.countryCode !== "CL" ? context.initialCityName || null : null);
  const safeCanonicalLocality = context.business.countryCode === "CL" && !context.activeLocality
    ? resolveCanonicalCity(context.initialCityName)
    : null;
  const suggestedLocalitySlug = safeCanonicalLocality
    && catalog.localities.some((locality) => locality.slug === safeCanonicalLocality.slug)
    ? safeCanonicalLocality.slug
    : null;

  return {
    businessName: context.business.name,
    countryCode: context.business.countryCode,
    categoryLabel,
    localityLabel,
    needsCategory: categoryLabel == null,
    needsLocality: localityLabel == null,
    suggestedLocalitySlug,
    initialCityName: context.initialCityName,
    categories: catalog.categories,
    localities: catalog.localities,
  };
}

export async function getExistingBusinessMarketplacePrompt(
  businessId: string,
): Promise<ExistingBusinessMarketplacePrompt | null> {
  const context = await loadExistingBusinessPromptContext(businessId);
  if (!context) return null;
  return buildExistingBusinessMarketplacePrompt(context);
}

export async function dismissExistingBusinessMarketplacePrompt(
  businessId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await loadExistingBusinessPromptContext(businessId);
  if (!context) return { ok: false, error: "La invitación ya no está disponible" };

  await prisma.business.update({
    where: { id: businessId },
    data: { marketplacePromptDismissedAt: new Date() },
  });
  await createAuditLog("MARKETPLACE_PROMPT_DISMISSED", { businessId }, userId);
  return { ok: true };
}

export async function acceptExistingBusinessMarketplacePrompt(
  businessId: string,
  userId: string,
  input: ExistingBusinessMarketplacePromptInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await loadExistingBusinessPromptContext(businessId);
  if (!context) return { ok: false, error: "La invitación ya no está disponible" };

  const prompt = await buildExistingBusinessMarketplacePrompt(context);
  const existingCategorySlug = context.activeCategories[0]?.slug
    ?? (context.pendingCategoryDescription ? MARKETPLACE_OTHER_CATEGORY_SLUG : null);
  const existingLocalitySlug = context.activeLocality?.slug ?? null;
  const localityNotFound = context.business.countryCode === "CL"
    && !existingLocalitySlug
    && Boolean(input.localityNotFound);
  const cityName = context.business.countryCode === "CL"
    ? localityNotFound ? input.cityName : null
    : context.initialCityName || input.cityName;

  const resolved = await resolveRegistrationMarketplaceClassification({
    countryCode: context.business.countryCode,
    categorySlug: existingCategorySlug ?? input.categorySlug ?? "",
    otherDescription: context.pendingCategoryDescription ?? input.otherDescription,
    localitySlug: context.business.countryCode === "CL"
      ? existingLocalitySlug ?? input.localitySlug ?? prompt.suggestedLocalitySlug
      : null,
    localityNotFound,
    cityName,
    authorized: true,
  });
  if (!resolved.ok) return resolved;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.upsert({
      where: {
        businessId_locationId: {
          businessId: context.business.id,
          locationId: context.primaryLocation.id,
        },
      },
      create: {
        businessId: context.business.id,
        locationId: context.primaryLocation.id,
        localityId: resolved.classification.localityId,
        pendingCategoryDescription: resolved.classification.pendingCategoryDescription,
        pendingLocalityName: resolved.classification.pendingLocalityName,
        authorizationConfirmedAt: now,
        authorizationConfirmedById: userId,
        authorizationSource: MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT,
        authorizationTextVersion: MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
        authorizationRevokedAt: null,
        publishedAt: null,
      },
      update: {
        ...(!context.activeLocality && context.business.countryCode === "CL"
          ? {
              localityId: resolved.classification.localityId,
              pendingLocalityName: resolved.classification.pendingLocalityName,
            }
          : {}),
        ...(context.business.countryCode !== "CL" && !context.listing?.pendingLocalityName
          ? { pendingLocalityName: resolved.classification.pendingLocalityName }
          : {}),
        ...(!context.activeCategories.length && !context.pendingCategoryDescription
          ? { pendingCategoryDescription: resolved.classification.pendingCategoryDescription }
          : {}),
        authorizationConfirmedAt: now,
        authorizationConfirmedById: userId,
        authorizationSource: MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT,
        authorizationTextVersion: MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
        authorizationRevokedAt: null,
        publishedAt: null,
      },
    });

    if (!context.activeCategories.length && !context.pendingCategoryDescription) {
      await tx.marketplaceListingCategory.deleteMany({ where: { listingId: listing.id } });
      if (resolved.classification.categoryIds.length > 0) {
        await tx.marketplaceListingCategory.createMany({
          data: resolved.classification.categoryIds.map((categoryId) => ({
            listingId: listing.id,
            categoryId,
          })),
        });
      }
    }

    await tx.marketplaceListing.updateMany({
      where: { businessId: context.business.id, id: { not: listing.id } },
      data: {
        authorizationConfirmedAt: now,
        authorizationConfirmedById: userId,
        authorizationSource: MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT,
        authorizationTextVersion: MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
        authorizationRevokedAt: null,
        publishedAt: null,
      },
    });

    if (context.business.countryCode !== "CL" && !context.primaryLocation.address && resolved.classification.locationAddress) {
      await tx.businessLocation.update({
        where: { id: context.primaryLocation.id },
        data: { address: resolved.classification.locationAddress },
      });
    }
  });

  await createAuditLog("MARKETPLACE_AUTHORIZATION_CONFIRMED", {
    businessId,
    source: MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT,
    textVersion: MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
  }, userId);

  return { ok: true };
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
