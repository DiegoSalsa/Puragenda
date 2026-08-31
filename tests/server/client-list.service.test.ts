import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    client: {
      findMany: mocks.findMany,
      count: mocks.count,
      aggregate: mocks.aggregate,
    },
    appointment: {
      groupBy: mocks.groupBy,
    },
  },
}));

import {
  InvalidClientListQueryError,
  buildClientListPagination,
  getClientListStats,
  listClients,
} from "@/server/services/client.service";
import { buildClientListPath } from "@/server/validations/pagination";

function clientRow(id: string, name: string, email: string) {
  return {
    id,
    name,
    email,
    phone: "912345678",
    rut: null,
    privateNotes: null,
    totalSpent: 1000,
    noShowCount: 0,
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    _count: { appointments: 1 },
    recurringBookings: [
      {
        id: "rb1",
        status: "ACTIVE",
        durationMonths: 3,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-04-01T00:00:00.000Z"),
        service: { name: "Corte" },
      },
    ],
  };
}

describe("listClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([clientRow("client-1", "Ana Pérez", "ana@example.com")]);
    mocks.count.mockResolvedValue(1);
    mocks.groupBy.mockResolvedValue([{ clientId: "client-1", _count: { _all: 2 } }]);
  });

  it("lists clients for a business with default pagination", async () => {
    const result = await listClients("business-1");

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { businessId: "business-1" },
      include: expect.objectContaining({
        _count: {
          select: {
            appointments: { where: { status: "CHECKED_IN" } },
          },
        },
      }),
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
    expect(mocks.findMany.mock.calls[0][0].include.appointments).toBeUndefined();
    expect(mocks.count).toHaveBeenCalledWith({ where: { businessId: "business-1" } });
    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ["clientId"],
      where: { clientId: { in: ["client-1"] } },
      _count: { _all: true },
    });
    expect(result.data).toEqual([
      expect.objectContaining({
        id: "client-1",
        name: "Ana Pérez",
        email: "ana@example.com",
        totalAppointments: 2,
        completedAppointments: 1,
        createdAt: "2026-01-15T12:00:00.000Z",
      }),
    ]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("searches by name, email and phone", async () => {
    await listClients("business-1", { search: "Ana" });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: "business-1",
          OR: [
            { name: { contains: "Ana", mode: "insensitive" } },
            { email: { contains: "Ana", mode: "insensitive" } },
            { phone: { contains: "Ana", mode: "insensitive" } },
          ],
        },
      }),
    );
    expect(mocks.count).toHaveBeenCalledWith({
      where: {
        businessId: "business-1",
        OR: [
          { name: { contains: "Ana", mode: "insensitive" } },
          { email: { contains: "Ana", mode: "insensitive" } },
          { phone: { contains: "Ana", mode: "insensitive" } },
        ],
      },
    });
  });

  it("paginates with skip and take", async () => {
    mocks.count.mockResolvedValue(45);

    const result = await listClients("business-1", { page: 3, limit: 10 });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
    expect(result.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 45,
      totalPages: 5,
    });
  });

  it("returns an empty page without findMany when the offset is past the last row", async () => {
    mocks.count.mockResolvedValue(8);

    const result = await listClients("business-1", { page: 4, limit: 5 });

    expect(result.data).toEqual([]);
    expect(result.pagination).toEqual({
      page: 4,
      limit: 5,
      total: 8,
      totalPages: 2,
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it("returns zero pages when there are no matching clients", async () => {
    mocks.count.mockResolvedValue(0);

    const result = await listClients("business-1", { search: "no-match" });

    expect(result.data).toEqual([]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it("rejects invalid page and limit from internal callers", async () => {
    await expect(listClients("business-1", { page: 0 })).rejects.toBeInstanceOf(
      InvalidClientListQueryError,
    );
    await expect(listClients("business-1", { limit: 0 })).rejects.toBeInstanceOf(
      InvalidClientListQueryError,
    );
    await expect(listClients("business-1", { limit: 101 })).rejects.toBeInstanceOf(
      InvalidClientListQueryError,
    );
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("buildClientListPagination", () => {
  it("rounds total pages up", () => {
    expect(buildClientListPagination(1, 20, 21)).toEqual({
      page: 1,
      limit: 20,
      total: 21,
      totalPages: 2,
    });
  });
});

describe("buildClientListPath", () => {
  it("omits default page and limit", () => {
    expect(buildClientListPath(1, "", 20)).toBe("/dashboard/clients");
  });

  it("preserves search, page and a custom limit", () => {
    expect(buildClientListPath(3, "ana", 50)).toBe(
      "/dashboard/clients?search=ana&limit=50&page=3",
    );
  });
});

describe("getClientListStats", () => {
  it("aggregates totals independently of the current page", async () => {
    mocks.aggregate.mockResolvedValue({ _count: { _all: 12 }, _sum: { totalSpent: 54000 } });
    mocks.count.mockResolvedValue(3);

    await expect(getClientListStats("business-1")).resolves.toEqual({
      totalClients: 12,
      totalRevenue: 54000,
      flaggedClients: 3,
    });
    expect(mocks.count).toHaveBeenCalledWith({
      where: { businessId: "business-1", noShowCount: { gte: 2 } },
    });
  });
});
