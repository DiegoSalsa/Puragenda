import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categoryFindUnique: vi.fn(),
  categoryFindMany: vi.fn(),
  localityFindUnique: vi.fn(),
  localityFindMany: vi.fn(),
  listingFindMany: vi.fn(),
  listingUpdateMany: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    marketplaceCategory: {
      findUnique: (...args: unknown[]) => mocks.categoryFindUnique(...args),
      findMany: (...args: unknown[]) => mocks.categoryFindMany(...args),
    },
    marketplaceLocality: {
      findUnique: (...args: unknown[]) => mocks.localityFindUnique(...args),
      findMany: (...args: unknown[]) => mocks.localityFindMany(...args),
    },
    marketplaceListing: {
      findMany: (...args: unknown[]) => mocks.listingFindMany(...args),
      updateMany: (...args: unknown[]) => mocks.listingUpdateMany(...args),
    },
  },
}));

vi.mock("@/server/lib/audit", () => ({
  createAuditLog: (...args: unknown[]) => mocks.audit(...args),
}));

import {
  createRegistrationMarketplaceListing,
  listRegistrationMarketplaceCatalog,
  resolveRegistrationMarketplaceClassification,
  setBusinessMarketplaceAuthorization,
} from "@/server/services/marketplace-onboarding.service";

describe("marketplace registration onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindUnique.mockResolvedValue({ id: "cat-1", isActive: true });
    mocks.localityFindUnique.mockResolvedValue({ id: "loc-canonical-1", name: "Concepción", isActive: true });
  });

  it("loads every active classification category without filtering by SEO eligibility", async () => {
    mocks.categoryFindMany.mockResolvedValue([{ slug: "tatuajes", name: "Tatuajes" }]);
    mocks.localityFindMany.mockResolvedValue([{ slug: "concepcion", name: "Concepción", regionName: "Biobío" }]);

    await expect(listRegistrationMarketplaceCatalog()).resolves.toEqual({
      categories: [{ slug: "tatuajes", name: "Tatuajes" }],
      localities: [{ slug: "concepcion", name: "Concepción", regionName: "Biobío" }],
    });
    expect(mocks.categoryFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { slug: true, name: true },
    });
    expect(JSON.stringify(mocks.categoryFindMany.mock.calls[0]?.[0])).not.toContain("seoEnabled");
  });

  it("creates a classified, unauthorized and unpublished Chilean listing", async () => {
    const resolved = await resolveRegistrationMarketplaceClassification({
      countryCode: "CL",
      categorySlug: "barberias",
      localitySlug: "concepcion",
      authorized: false,
    });
    expect(resolved).toEqual({
      ok: true,
      classification: {
        categoryIds: ["cat-1"],
        pendingCategoryDescription: null,
        localityId: "loc-canonical-1",
        pendingLocalityName: null,
        locationAddress: "Concepción",
        authorized: false,
      },
    });
    if (!resolved.ok) return;

    const listingCreate = vi.fn().mockResolvedValue({ id: "listing-1" });
    const categoriesCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    await createRegistrationMarketplaceListing({
      marketplaceListing: { create: listingCreate },
      marketplaceListingCategory: { createMany: categoriesCreateMany },
    } as never, {
      businessId: "business-1",
      locationId: "location-1",
      userId: "user-1",
      classification: resolved.classification,
    });

    expect(listingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        localityId: "loc-canonical-1",
        authorizationConfirmedAt: null,
        authorizationConfirmedById: null,
        authorizationSource: null,
        authorizationTextVersion: null,
        publishedAt: null,
      }),
    });
    expect(categoriesCreateMany).toHaveBeenCalledWith({
      data: [{ listingId: "listing-1", categoryId: "cat-1" }],
    });
  });

  it("records registration authorization without publishing the listing", async () => {
    const resolved = await resolveRegistrationMarketplaceClassification({
      countryCode: "CL",
      categorySlug: "manicure",
      localitySlug: "concepcion",
      authorized: true,
    });
    if (!resolved.ok) throw new Error(resolved.error);

    const listingCreate = vi.fn().mockResolvedValue({ id: "listing-2" });
    await createRegistrationMarketplaceListing({
      marketplaceListing: { create: listingCreate },
      marketplaceListingCategory: { createMany: vi.fn() },
    } as never, {
      businessId: "business-2",
      locationId: "location-2",
      userId: "user-2",
      classification: resolved.classification,
    });

    const data = listingCreate.mock.calls[0]?.[0]?.data;
    expect(data.authorizationConfirmedAt).toBeInstanceOf(Date);
    expect(data.authorizationConfirmedById).toBe("user-2");
    expect(data.authorizationSource).toBe("registration");
    expect(data.authorizationTextVersion).toBe("2026-09-06.registration.v1");
    expect(data.publishedAt).toBeNull();
  });

  it("rejects inactive or unknown categories and localities", async () => {
    mocks.categoryFindUnique.mockResolvedValueOnce(null);
    await expect(resolveRegistrationMarketplaceClassification({
      countryCode: "CL",
      categorySlug: "inventada",
      localitySlug: "concepcion",
    })).resolves.toEqual({ ok: false, error: "Selecciona un rubro válido" });

    mocks.categoryFindUnique.mockResolvedValueOnce({ id: "cat-1", isActive: true });
    mocks.localityFindUnique.mockResolvedValueOnce({ id: "loc-1", name: "Inventada", isActive: false });
    await expect(resolveRegistrationMarketplaceClassification({
      countryCode: "CL",
      categorySlug: "barberias",
      localitySlug: "inventada",
    })).resolves.toEqual({ ok: false, error: "Selecciona una ciudad o comuna válida" });
  });

  it("keeps Otro pending instead of inventing a category", async () => {
    const resolved = await resolveRegistrationMarketplaceClassification({
      countryCode: "CL",
      categorySlug: "otro",
      otherDescription: "Estudio de piercing",
      localitySlug: "concepcion",
    });
    expect(resolved).toMatchObject({
      ok: true,
      classification: {
        categoryIds: [],
        pendingCategoryDescription: "Estudio de piercing",
      },
    });
    expect(mocks.categoryFindUnique).not.toHaveBeenCalled();
  });

  it("does not attach a Chilean canonical locality to another country", async () => {
    const resolved = await resolveRegistrationMarketplaceClassification({
      countryCode: "AR",
      categorySlug: "barberias",
      cityName: "Córdoba",
    });
    expect(resolved).toMatchObject({
      ok: true,
      classification: {
        localityId: null,
        pendingLocalityName: "Córdoba",
        locationAddress: "Córdoba",
      },
    });
    expect(mocks.localityFindUnique).not.toHaveBeenCalled();
  });

  it("revokes authorization, unpublishes every listing and preserves classification", async () => {
    mocks.listingFindMany.mockResolvedValue([{
      id: "listing-1",
      authorizationConfirmedAt: new Date("2026-09-06T12:00:00Z"),
      authorizationRevokedAt: null,
    }]);
    mocks.listingUpdateMany.mockResolvedValue({ count: 1 });

    await expect(setBusinessMarketplaceAuthorization("business-1", "user-1", false)).resolves.toEqual({
      ok: true,
      authorized: false,
    });
    expect(mocks.listingUpdateMany).toHaveBeenCalledWith({
      where: { businessId: "business-1" },
      data: {
        authorizationRevokedAt: expect.any(Date),
        publishedAt: null,
      },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      "MARKETPLACE_AUTHORIZATION_REVOKED",
      expect.objectContaining({ businessId: "business-1", source: "settings" }),
      "user-1",
    );
  });
});
