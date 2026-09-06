import {
  MARKETPLACE_AUTHORIZATION_SOURCE_ADMIN,
  MARKETPLACE_AUTHORIZATION_TEXT_VERSION,
  MARKETPLACE_EXCLUDED_SLUGS,
  canPublishMarketplaceListing,
  isMarketplaceSubscriptionActive,
  locationHasBookableAppointmentService,
  marketplacePublishBlockers,
} from "@/lib/marketplace";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/lib/audit";

export type SaveMarketplaceListingInput = {
  businessId: string;
  locationId: string;
  localityId: string | null;
  categoryIds: string[];
  authorizationConfirmed: boolean;
  published: boolean;
};

function listingReadiness(input: {
  slug: string;
  deletedAt: Date | null;
  plan: string | null;
  subscriptionStatus: string | null;
  locationActive: boolean;
  authorizationConfirmed: boolean;
  hasActiveCategory: boolean;
  hasCanonicalLocality: boolean;
  hasBookableService: boolean;
}) {
  return {
    authorizationConfirmed: input.authorizationConfirmed,
    hasActiveCategory: input.hasActiveCategory,
    hasCanonicalLocality: input.hasCanonicalLocality,
    deleted: input.deletedAt !== null,
    demo: MARKETPLACE_EXCLUDED_SLUGS.has(input.slug),
    slug: input.slug,
    plan: input.plan ?? "INDIVIDUAL",
    subscriptionActive: isMarketplaceSubscriptionActive(input.subscriptionStatus),
    locationActive: input.locationActive,
    hasBookableService: input.hasBookableService,
  };
}

export async function listMarketplaceCatalog() {
  const [categories, localities] = await Promise.all([
    prisma.marketplaceCategory.findMany({ orderBy: { position: "asc" } }),
    prisma.marketplaceLocality.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
    }),
  ]);
  return { categories, localities };
}

export async function listMarketplaceAdminRows() {
  return prisma.business.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      deletedAt: true,
      subscription: { select: { plan: true, status: true } },
      marketplaceListings: {
        select: {
          publishedAt: true,
          authorizationConfirmedAt: true,
          authorizationRevokedAt: true,
          authorizationSource: true,
          pendingCategoryDescription: true,
          pendingLocalityName: true,
          locality: { select: { name: true, slug: true } },
          location: { select: { name: true, isActive: true } },
          categories: {
            select: { category: { select: { name: true, slug: true, isActive: true } } },
          },
        },
      },
    },
  });
}

export async function getMarketplaceBusinessEditor(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      deletedAt: true,
      productionOrdersEnabled: true,
      subscription: { select: { plan: true, status: true } },
      locations: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, isActive: true, isPrimary: true },
      },
      services: {
        select: {
          name: true,
          bookingMode: true,
          locations: { select: { locationId: true } },
        },
      },
      marketplaceListings: {
        select: {
          id: true,
          locationId: true,
          localityId: true,
          authorizationConfirmedAt: true,
          authorizationRevokedAt: true,
          authorizationSource: true,
          authorizationTextVersion: true,
          pendingCategoryDescription: true,
          pendingLocalityName: true,
          publishedAt: true,
          categories: { select: { categoryId: true } },
        },
      },
    },
  });

  if (!business) return null;

  const catalog = await listMarketplaceCatalog();
  return { business, ...catalog };
}

export async function saveMarketplaceListing(
  adminUserId: string,
  input: SaveMarketplaceListingInput,
): Promise<{ ok: true } | { ok: false; error: string; blockers: string[] }> {
  const localityId = input.localityId?.trim() || null;

  const [business, location, locality, categories] = await Promise.all([
    prisma.business.findUnique({
      where: { id: input.businessId },
      select: {
        id: true,
        slug: true,
        deletedAt: true,
        productionOrdersEnabled: true,
        subscription: { select: { plan: true, status: true } },
        services: {
          select: {
            name: true,
            bookingMode: true,
            locations: { select: { locationId: true } },
          },
        },
      },
    }),
    prisma.businessLocation.findFirst({
      where: { id: input.locationId, businessId: input.businessId },
      select: { id: true, isActive: true },
    }),
    localityId
      ? prisma.marketplaceLocality.findUnique({
          where: { id: localityId },
          select: { id: true, isActive: true },
        })
      : Promise.resolve(null),
    prisma.marketplaceCategory.findMany({
      where: { id: { in: input.categoryIds } },
      select: { id: true, isActive: true },
    }),
  ]);

  if (!business) return { ok: false, error: "Negocio no encontrado", blockers: [] };
  if (!location) return { ok: false, error: "La sucursal no pertenece a este negocio", blockers: [] };
  if (localityId && (!locality || !locality.isActive)) {
    return { ok: false, error: "Ubicación canónica inválida", blockers: [] };
  }
  if (categories.length !== input.categoryIds.length) {
    return { ok: false, error: "Hay categorías inválidas", blockers: [] };
  }

  const activeCategoryIds = categories.filter((category) => category.isActive).map((category) => category.id);
  const hasBookableService = locationHasBookableAppointmentService({
    locationId: location.id,
    productionOrdersEnabled: business.productionOrdersEnabled,
    services: business.services.map((service) => ({
      bookingMode: service.bookingMode,
      locationIds: service.locations.map((item) => item.locationId),
    })),
  });

  const readiness = listingReadiness({
    slug: business.slug,
    deletedAt: business.deletedAt,
    plan: business.subscription?.plan ?? null,
    subscriptionStatus: business.subscription?.status ?? null,
    locationActive: location.isActive,
    authorizationConfirmed: input.authorizationConfirmed,
    hasActiveCategory: activeCategoryIds.length > 0,
    hasCanonicalLocality: Boolean(locality?.id),
    hasBookableService,
  });

  if (input.published && !canPublishMarketplaceListing(readiness)) {
    return {
      ok: false,
      error: "No se puede publicar: faltan requisitos.",
      blockers: marketplacePublishBlockers(readiness),
    };
  }

  const now = new Date();
  const existing = await prisma.marketplaceListing.findUnique({
    where: { businessId_locationId: { businessId: business.id, locationId: location.id } },
    select: {
      id: true,
      authorizationConfirmedAt: true,
      authorizationConfirmedById: true,
      authorizationSource: true,
      authorizationTextVersion: true,
      authorizationRevokedAt: true,
      pendingCategoryDescription: true,
      pendingLocalityName: true,
      publishedAt: true,
    },
  });

  const currentlyAuthorized =
    existing?.authorizationConfirmedAt != null && existing.authorizationRevokedAt == null;

  let authorizationConfirmedAt = existing?.authorizationConfirmedAt ?? null;
  let authorizationConfirmedById = existing?.authorizationConfirmedById ?? null;
  let authorizationSource = existing?.authorizationSource ?? null;
  let authorizationTextVersion = existing?.authorizationTextVersion ?? null;
  let authorizationRevokedAt = existing?.authorizationRevokedAt ?? null;

  if (input.authorizationConfirmed) {
    authorizationRevokedAt = null;
    if (!currentlyAuthorized) {
      authorizationConfirmedAt = now;
      authorizationConfirmedById = adminUserId;
      authorizationSource = MARKETPLACE_AUTHORIZATION_SOURCE_ADMIN;
      authorizationTextVersion = MARKETPLACE_AUTHORIZATION_TEXT_VERSION;
    }
  } else if (currentlyAuthorized) {
    authorizationRevokedAt = now;
  } else if (!existing?.authorizationConfirmedAt) {
    authorizationConfirmedAt = null;
    authorizationConfirmedById = null;
    authorizationSource = null;
    authorizationTextVersion = null;
    authorizationRevokedAt = null;
  }

  const publishedAt = input.published ? existing?.publishedAt ?? now : null;
  const resolvedLocalityId = locality?.id ?? null;
  const pendingLocalityName = resolvedLocalityId ? null : existing?.pendingLocalityName ?? null;
  const pendingCategoryDescription = activeCategoryIds.length > 0
    ? null
    : existing?.pendingCategoryDescription ?? null;

  await prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.upsert({
      where: { businessId_locationId: { businessId: business.id, locationId: location.id } },
      create: {
        businessId: business.id,
        locationId: location.id,
        localityId: resolvedLocalityId,
        pendingCategoryDescription,
        pendingLocalityName,
        authorizationConfirmedAt,
        authorizationConfirmedById,
        authorizationSource,
        authorizationTextVersion,
        authorizationRevokedAt,
        publishedAt,
      },
      update: {
        localityId: resolvedLocalityId,
        pendingCategoryDescription,
        pendingLocalityName,
        authorizationConfirmedAt,
        authorizationConfirmedById,
        authorizationSource,
        authorizationTextVersion,
        authorizationRevokedAt,
        publishedAt,
      },
    });

    await tx.marketplaceListingCategory.deleteMany({ where: { listingId: listing.id } });
    if (activeCategoryIds.length > 0) {
      await tx.marketplaceListingCategory.createMany({
        data: activeCategoryIds.map((categoryId) => ({ listingId: listing.id, categoryId })),
      });
    }
  });

  await createAuditLog(
    input.published ? "MARKETPLACE_LISTING_PUBLISHED" : "MARKETPLACE_LISTING_SAVED",
    {
      businessSlug: business.slug,
      locationId: location.id,
      published: Boolean(publishedAt),
      authorized: input.authorizationConfirmed,
      categoryCount: activeCategoryIds.length,
    },
    adminUserId,
  );

  return { ok: true };
}
