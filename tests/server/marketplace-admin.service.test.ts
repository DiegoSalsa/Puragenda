import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = {
  businessFindUnique: vi.fn(),
  locationFindFirst: vi.fn(),
  localityFindUnique: vi.fn(),
  categoryFindMany: vi.fn(),
  listingFindUnique: vi.fn(),
  transaction: vi.fn(),
  audit: vi.fn(),
};

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    business: { findUnique: (...args: unknown[]) => mocks.businessFindUnique(...args) },
    businessLocation: { findFirst: (...args: unknown[]) => mocks.locationFindFirst(...args) },
    marketplaceLocality: { findUnique: (...args: unknown[]) => mocks.localityFindUnique(...args) },
    marketplaceCategory: { findMany: (...args: unknown[]) => mocks.categoryFindMany(...args) },
    marketplaceListing: { findUnique: (...args: unknown[]) => mocks.listingFindUnique(...args) },
    $transaction: (...args: unknown[]) => mocks.transaction(...args),
  },
}));

vi.mock("@/server/lib/audit", () => ({
  createAuditLog: (...args: unknown[]) => mocks.audit(...args),
}));

import { saveMarketplaceListing } from "@/server/services/marketplace-admin.service";

const validBusiness = {
  id: "biz-1",
  slug: "soccerbarber",
  deletedAt: null,
  productionOrdersEnabled: false,
  subscription: { plan: "INDIVIDUAL", status: "ACTIVE" },
  services: [{ name: "Corte", bookingMode: "APPOINTMENT", locations: [] }],
};

function mockHappyPath() {
  mocks.businessFindUnique.mockResolvedValue(validBusiness);
  mocks.locationFindFirst.mockResolvedValue({ id: "loc-1", isActive: true });
  mocks.localityFindUnique.mockResolvedValue({ id: "city-1", isActive: true });
  mocks.categoryFindMany.mockResolvedValue([{ id: "cat-barber", isActive: true }]);
  mocks.listingFindUnique.mockResolvedValue(null);
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    await fn({
      marketplaceListing: {
        upsert: vi.fn().mockResolvedValue({ id: "listing-1" }),
      },
      marketplaceListingCategory: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    });
  });
}

describe("saveMarketplaceListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHappyPath();
  });

  it("saves an unpublished listing by default", async () => {
    const result = await saveMarketplaceListing("admin-1", {
      businessId: "biz-1",
      locationId: "loc-1",
      localityId: "city-1",
      categoryIds: ["cat-barber"],
      authorizationConfirmed: true,
      published: false,
    });
    expect(result).toEqual({ ok: true });
    expect(mocks.transaction).toHaveBeenCalled();
  });

  it("persists locality and categories even without authorization or publication", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "listing-1" });
    const createMany = vi.fn();
    mocks.transaction.mockImplementation(async (fn: (tx: {
      marketplaceListing: { upsert: typeof upsert };
      marketplaceListingCategory: { deleteMany: ReturnType<typeof vi.fn>; createMany: typeof createMany };
    }) => Promise<unknown>) => {
      await fn({
        marketplaceListing: { upsert },
        marketplaceListingCategory: { deleteMany: vi.fn(), createMany },
      });
    });

    const result = await saveMarketplaceListing("admin-1", {
      businessId: "biz-1",
      locationId: "loc-1",
      localityId: "city-1",
      categoryIds: ["cat-barber"],
      authorizationConfirmed: false,
      published: false,
    });

    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        localityId: "city-1",
        publishedAt: null,
        authorizationConfirmedAt: null,
      }),
      update: expect.objectContaining({
        localityId: "city-1",
        publishedAt: null,
        authorizationConfirmedAt: null,
      }),
    }));
    expect(createMany).toHaveBeenCalledWith({
      data: [{ listingId: "listing-1", categoryId: "cat-barber" }],
    });
  });

  it("refuses to publish without authorization", async () => {
    const result = await saveMarketplaceListing("admin-1", {
      businessId: "biz-1",
      locationId: "loc-1",
      localityId: "city-1",
      categoryIds: ["cat-barber"],
      authorizationConfirmed: false,
      published: true,
    });
    expect(result).toMatchObject({ ok: false, blockers: ["authorization_required"] });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("refuses to publish a TEST or demo business", async () => {
    mocks.businessFindUnique.mockResolvedValue({
      ...validBusiness,
      slug: "purocode-demo",
      subscription: { plan: "TEST", status: "ACTIVE" },
    });
    const result = await saveMarketplaceListing("admin-1", {
      businessId: "biz-1",
      locationId: "loc-1",
      localityId: "city-1",
      categoryIds: ["cat-barber"],
      authorizationConfirmed: true,
      published: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blockers).toEqual(expect.arrayContaining(["demo_excluded", "test_plan_excluded"]));
  });

  it("refuses to publish when the location is inactive or has no bookable service", async () => {
    mocks.locationFindFirst.mockResolvedValue({ id: "loc-1", isActive: false });
    mocks.businessFindUnique.mockResolvedValue({
      ...validBusiness,
      services: [{ name: "Encargo", bookingMode: "PRODUCTION", locations: [] }],
    });
    const result = await saveMarketplaceListing("admin-1", {
      businessId: "biz-1",
      locationId: "loc-1",
      localityId: "city-1",
      categoryIds: ["cat-barber"],
      authorizationConfirmed: true,
      published: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blockers).toEqual(expect.arrayContaining(["location_inactive", "bookable_service_required"]));
  });

  it("allows assigning manicure and bienestar without publishing or enabling SEO", async () => {
    mocks.categoryFindMany.mockResolvedValue([
      { id: "cat-manicure", isActive: true, seoEnabled: false },
      { id: "cat-bienestar", isActive: true, seoEnabled: false },
    ]);
    const upsert = vi.fn().mockResolvedValue({ id: "listing-1" });
    const createMany = vi.fn();
    mocks.transaction.mockImplementation(async (fn: (tx: {
      marketplaceListing: { upsert: typeof upsert };
      marketplaceListingCategory: { deleteMany: ReturnType<typeof vi.fn>; createMany: typeof createMany };
    }) => Promise<unknown>) => {
      await fn({
        marketplaceListing: { upsert },
        marketplaceListingCategory: { deleteMany: vi.fn(), createMany },
      });
    });

    const result = await saveMarketplaceListing("admin-1", {
      businessId: "biz-1",
      locationId: "loc-1",
      localityId: "city-1",
      categoryIds: ["cat-manicure", "cat-bienestar"],
      authorizationConfirmed: false,
      published: false,
    });

    expect(result).toEqual({ ok: true });
    expect(upsert.mock.calls[0]?.[0]?.create.publishedAt).toBeNull();
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { listingId: "listing-1", categoryId: "cat-manicure" },
        { listingId: "listing-1", categoryId: "cat-bienestar" },
      ],
    });
  });

  it("rejects a location from another business", async () => {
    mocks.locationFindFirst.mockResolvedValue(null);
    const result = await saveMarketplaceListing("admin-1", {
      businessId: "biz-1",
      locationId: "loc-other",
      localityId: "city-1",
      categoryIds: ["cat-barber"],
      authorizationConfirmed: true,
      published: false,
    });
    expect(result).toMatchObject({ ok: false, error: "La sucursal no pertenece a este negocio" });
  });
});
