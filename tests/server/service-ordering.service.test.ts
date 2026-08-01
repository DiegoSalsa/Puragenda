import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  serviceFindMany,
  serviceUpdateMany,
  categoryFindMany,
  categoryUpdateMany,
  transaction,
} = vi.hoisted(() => ({
  serviceFindMany: vi.fn(),
  serviceUpdateMany: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    service: {
      findMany: serviceFindMany,
      updateMany: serviceUpdateMany,
    },
    serviceCategory: {
      findMany: categoryFindMany,
      updateMany: categoryUpdateMany,
    },
    $transaction: transaction,
  },
}));

import { reorderServiceCategories } from "@/server/services/service-category.service";
import { reorderServices } from "@/server/services/service.service";

describe("service and category ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceUpdateMany.mockResolvedValue({ count: 1 });
    categoryUpdateMany.mockResolvedValue({ count: 1 });
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations)
    );
  });

  it("persists every service position in the requested order", async () => {
    serviceFindMany.mockResolvedValue([{ id: "service-a" }, { id: "service-b" }]);

    await reorderServices("business-1", ["service-b", "service-a"]);

    expect(serviceUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "service-b", businessId: "business-1" },
      data: { position: 0 },
    });
    expect(serviceUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "service-a", businessId: "business-1" },
      data: { position: 1 },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects incomplete or duplicated service orders", async () => {
    serviceFindMany.mockResolvedValue([{ id: "service-a" }, { id: "service-b" }]);

    await expect(
      reorderServices("business-1", ["service-a", "service-a"])
    ).rejects.toThrow("todos los servicios");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("persists every category position in the requested order", async () => {
    categoryFindMany.mockResolvedValue([{ id: "category-a" }, { id: "category-b" }]);

    await reorderServiceCategories("business-1", ["category-b", "category-a"]);

    expect(categoryUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "category-b", businessId: "business-1" },
      data: { position: 0 },
    });
    expect(categoryUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "category-a", businessId: "business-1" },
      data: { position: 1 },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects category IDs that belong outside the business", async () => {
    categoryFindMany.mockResolvedValue([{ id: "category-a" }]);

    await expect(
      reorderServiceCategories("business-1", ["category-other"])
    ).rejects.toThrow("todas las categorías");
    expect(transaction).not.toHaveBeenCalled();
  });
});
