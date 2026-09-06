import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  businessFindUnique: vi.fn(),
  businessUpdate: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryFindUnique: vi.fn(),
  localityFindMany: vi.fn(),
  localityFindUnique: vi.fn(),
  listingUpsert: vi.fn(),
  listingFindMany: vi.fn(),
  listingUpdateMany: vi.fn(),
  listingCategoryDeleteMany: vi.fn(),
  listingCategoryCreateMany: vi.fn(),
  businessLocationUpdate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    business: {
      findUnique: (...args: unknown[]) => mocks.businessFindUnique(...args),
      update: (...args: unknown[]) => mocks.businessUpdate(...args),
    },
    marketplaceCategory: {
      findMany: (...args: unknown[]) => mocks.categoryFindMany(...args),
      findUnique: (...args: unknown[]) => mocks.categoryFindUnique(...args),
    },
    marketplaceLocality: {
      findMany: (...args: unknown[]) => mocks.localityFindMany(...args),
      findUnique: (...args: unknown[]) => mocks.localityFindUnique(...args),
    },
    marketplaceListing: {
      findMany: (...args: unknown[]) => mocks.listingFindMany(...args),
      updateMany: (...args: unknown[]) => mocks.listingUpdateMany(...args),
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      marketplaceListing: {
        upsert: (...args: unknown[]) => mocks.listingUpsert(...args),
        updateMany: (...args: unknown[]) => mocks.listingUpdateMany(...args),
      },
      marketplaceListingCategory: {
        deleteMany: (...args: unknown[]) => mocks.listingCategoryDeleteMany(...args),
        createMany: (...args: unknown[]) => mocks.listingCategoryCreateMany(...args),
      },
      businessLocation: {
        update: (...args: unknown[]) => mocks.businessLocationUpdate(...args),
      },
    }),
  },
}));

vi.mock("@/server/lib/audit", () => ({
  createAuditLog: (...args: unknown[]) => mocks.audit(...args),
}));

import {
  acceptExistingBusinessMarketplacePrompt,
  dismissExistingBusinessMarketplacePrompt,
  getExistingBusinessMarketplacePrompt,
} from "@/server/services/marketplace-onboarding.service";

type HistoricalBusinessOverrides = {
  marketplacePromptDismissedAt?: Date | null;
  countryCode?: string;
  address?: string | null;
  marketplaceListings?: Array<Record<string, unknown>>;
};

function historicalBusiness(overrides: HistoricalBusinessOverrides = {}) {
  return {
    id: "business-1",
    name: "Barbería Histórica",
    slug: "barberia-historica",
    countryCode: overrides.countryCode ?? "CL",
    createdAt: new Date("2026-09-01T12:00:00Z"),
    deletedAt: null,
    marketplacePromptDismissedAt: overrides.marketplacePromptDismissedAt ?? null,
    subscription: { plan: "INDIVIDUAL", status: "ACTIVE" },
    locations: [{ id: "location-1", address: overrides.address ?? "", isActive: true }],
    marketplaceListings: overrides.marketplaceListings ?? [],
  };
}

function classifiedListing() {
  return {
    id: "listing-1",
    locationId: "location-1",
    pendingCategoryDescription: null,
    pendingLocalityName: null,
    authorizationConfirmedAt: null,
    authorizationRevokedAt: null,
    locality: { id: "locality-osorno", slug: "osorno", name: "Osorno", isActive: true },
    categories: [{
      category: { id: "category-barberias", slug: "barberias", name: "Barberías", isActive: true },
    }],
  };
}

describe("existing business marketplace prompt service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindMany.mockResolvedValue([
      { slug: "barberias", name: "Barberías" },
      { slug: "manicure", name: "Manicure" },
    ]);
    mocks.localityFindMany.mockResolvedValue([
      { slug: "osorno", name: "Osorno", regionName: "Los Lagos" },
      { slug: "concepcion", name: "Concepción", regionName: "Biobío" },
    ]);
    mocks.categoryFindUnique.mockResolvedValue({ id: "category-barberias", isActive: true });
    mocks.localityFindUnique.mockResolvedValue({ id: "locality-osorno", name: "Osorno", isActive: true });
    mocks.listingUpsert.mockResolvedValue({ id: "listing-1" });
    mocks.listingUpdateMany.mockResolvedValue({ count: 0 });
    mocks.listingCategoryDeleteMany.mockResolvedValue({ count: 0 });
    mocks.listingCategoryCreateMany.mockResolvedValue({ count: 1 });
    mocks.businessUpdate.mockResolvedValue({ id: "business-1" });
    mocks.audit.mockResolvedValue(undefined);
  });

  it("prefills an existing admin classification and asks for no classified field", async () => {
    mocks.businessFindUnique.mockResolvedValue(historicalBusiness({
      marketplaceListings: [classifiedListing()],
    }));

    await expect(getExistingBusinessMarketplacePrompt("business-1")).resolves.toMatchObject({
      categoryLabel: "Barberías",
      localityLabel: "Osorno",
      needsCategory: false,
      needsLocality: false,
    });
  });

  it("asks only for missing classification and safely suggests an exact canonical city", async () => {
    mocks.businessFindUnique.mockResolvedValue(historicalBusiness({ address: "Osorno" }));

    await expect(getExistingBusinessMarketplacePrompt("business-1")).resolves.toMatchObject({
      categoryLabel: null,
      localityLabel: null,
      needsCategory: true,
      needsLocality: true,
      suggestedLocalitySlug: "osorno",
    });
  });

  it("persists Ahora no on the server, audits it and does not offer the prompt next session", async () => {
    mocks.businessFindUnique.mockResolvedValueOnce(historicalBusiness());

    await expect(dismissExistingBusinessMarketplacePrompt("business-1", "user-1"))
      .resolves.toEqual({ ok: true });
    expect(mocks.businessUpdate).toHaveBeenCalledWith({
      where: { id: "business-1" },
      data: { marketplacePromptDismissedAt: expect.any(Date) },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      "MARKETPLACE_PROMPT_DISMISSED",
      { businessId: "business-1" },
      "user-1",
    );

    mocks.businessFindUnique.mockResolvedValueOnce(historicalBusiness({
      marketplacePromptDismissedAt: new Date("2026-09-06T12:00:00Z"),
    }));
    await expect(getExistingBusinessMarketplacePrompt("business-1")).resolves.toBeNull();
  });

  it("authorizes with dashboard_prompt, preserves admin curation and stays unpublished", async () => {
    mocks.businessFindUnique.mockResolvedValue(historicalBusiness({
      marketplaceListings: [classifiedListing()],
    }));

    await expect(acceptExistingBusinessMarketplacePrompt("business-1", "user-1", {}))
      .resolves.toEqual({ ok: true });

    const update = mocks.listingUpsert.mock.calls[0]?.[0]?.update;
    expect(update).toMatchObject({
      authorizationConfirmedAt: expect.any(Date),
      authorizationConfirmedById: "user-1",
      authorizationSource: "dashboard_prompt",
      authorizationTextVersion: "2026-09-06.registration.v1",
      authorizationRevokedAt: null,
      publishedAt: null,
    });
    expect(update).not.toHaveProperty("localityId");
    expect(update).not.toHaveProperty("pendingCategoryDescription");
    expect(mocks.listingCategoryDeleteMany).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledWith(
      "MARKETPLACE_AUTHORIZATION_CONFIRMED",
      expect.objectContaining({ businessId: "business-1", source: "dashboard_prompt" }),
      "user-1",
    );
  });

  it("fills a missing category through the registration classifier without publishing", async () => {
    const listing = classifiedListing();
    listing.categories = [];
    mocks.businessFindUnique.mockResolvedValue(historicalBusiness({
      marketplaceListings: [listing],
    }));

    await expect(acceptExistingBusinessMarketplacePrompt("business-1", "user-1", {
      categorySlug: "barberias",
    })).resolves.toEqual({ ok: true });

    expect(mocks.listingCategoryCreateMany).toHaveBeenCalledWith({
      data: [{ listingId: "listing-1", categoryId: "category-barberias" }],
    });
    expect(mocks.listingUpsert.mock.calls[0]?.[0]?.update).toMatchObject({
      authorizationSource: "dashboard_prompt",
      publishedAt: null,
    });
  });

  it("keeps non-Chilean businesses outside the Chile locality catalog", async () => {
    mocks.businessFindUnique.mockResolvedValue(historicalBusiness({
      countryCode: "AR",
      address: "Córdoba",
    }));

    const prompt = await getExistingBusinessMarketplacePrompt("business-1");
    expect(prompt).toMatchObject({ localityLabel: "Córdoba", needsLocality: false });

    await expect(acceptExistingBusinessMarketplacePrompt("business-1", "user-1", {
      categorySlug: "barberias",
    })).resolves.toEqual({ ok: true });
    expect(mocks.localityFindUnique).not.toHaveBeenCalled();
    expect(mocks.listingUpsert.mock.calls[0]?.[0]?.create).toMatchObject({
      localityId: null,
      pendingLocalityName: "Córdoba",
      publishedAt: null,
    });
  });
});
