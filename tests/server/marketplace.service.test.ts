import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    marketplaceListing: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

import { listPublicMarketplaceListings } from "@/server/services/marketplace.service";

describe("listPublicMarketplaceListings", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("queries only published, authorized, active public rows with a whitelist select", async () => {
    findMany.mockResolvedValue([]);
    await listPublicMarketplaceListings();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        publishedAt: { not: null },
        authorizationConfirmedAt: { not: null },
        locality: { isActive: true },
        location: { isActive: true },
        business: { deletedAt: null },
        categories: { some: { category: { seoEnabled: true } } },
      }),
    }));
    const select = findMany.mock.calls[0]?.[0]?.select;
    expect(JSON.stringify(select)).not.toContain("apiKey");
    expect(JSON.stringify(select)).not.toContain("email");
    expect(JSON.stringify(select)).not.toContain("mpAccessToken");
    expect(JSON.stringify(select)).not.toContain("ownerId");
  });

  it("fails closed with an empty inventory if the table is missing", async () => {
    findMany.mockRejectedValue({ code: "P2021" });
    await expect(listPublicMarketplaceListings()).resolves.toEqual([]);
  });

  it("fails closed if seoEnabled has not been migrated yet", async () => {
    findMany.mockRejectedValue({ code: "P2022" });
    await expect(listPublicMarketplaceListings()).resolves.toEqual([]);
  });

  it("does not emit unpublished or inactive-category rows as public inventory", async () => {
    findMany.mockResolvedValue([
      {
        publishedAt: new Date(),
        locality: { slug: "concepcion" },
        location: { id: "loc-1", slug: "principal", isActive: true },
        business: {
          name: "Local",
          slug: "local-publico",
          logoUrl: null,
          deletedAt: null,
          productionOrdersEnabled: false,
          subscription: { plan: "INDIVIDUAL", status: "ACTIVE" },
          services: [{ name: "Corte", bookingMode: "APPOINTMENT", locations: [] }],
        },
        categories: [{ category: { slug: "barberias", isActive: true, seoEnabled: true } }],
      },
    ]);
    const listings = await listPublicMarketplaceListings();
    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      slug: "local-publico",
      categorySlug: "barberias",
      citySlug: "concepcion",
      directoryPublished: true,
    });
    expect(listings[0]).not.toHaveProperty("id");
    expect(listings[0]).not.toHaveProperty("businessId");
  });
});
