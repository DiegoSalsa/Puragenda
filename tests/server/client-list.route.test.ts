import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  business: vi.fn(),
  permission: vi.fn(),
  listClients: vi.fn(),
}));

vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: mocks.session,
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: mocks.business,
}));

vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: mocks.permission,
}));

vi.mock("@/server/services/client.service", () => ({
  listClients: mocks.listClients,
}));

import { GET } from "@/app/api/dashboard/clients/route";

const emptyList = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

function getRequest(query = "") {
  return new NextRequest(`http://localhost/api/dashboard/clients${query}`);
}

describe("GET /api/dashboard/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "ADMIN",
      isSuperAdmin: false,
      tokenVersion: 1,
      adminAccess: false,
    });
    mocks.business.mockResolvedValue({ id: "business-1", ownerId: "user-1" });
    mocks.permission.mockResolvedValue(true);
    mocks.listClients.mockResolvedValue({
      data: [
        {
          id: "client-1",
          name: "Ana Pérez",
          email: "ana@example.com",
          phone: "912345678",
          rut: null,
          privateNotes: null,
          totalSpent: 1000,
          noShowCount: 0,
          totalAppointments: 2,
          completedAppointments: 1,
          createdAt: "2026-01-15T12:00:00.000Z",
          recurringBookings: [],
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it("returns a normal listing with pagination metadata", async () => {
    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [expect.objectContaining({ id: "client-1", name: "Ana Pérez" })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(mocks.listClients).toHaveBeenCalledWith("business-1", {
      page: 1,
      limit: 20,
      search: "",
    });
  });

  it("forwards search to the listing service", async () => {
    const response = await GET(getRequest("?search=ana"));

    expect(response.status).toBe(200);
    expect(mocks.listClients).toHaveBeenCalledWith("business-1", {
      page: 1,
      limit: 20,
      search: "ana",
    });
  });

  it("forwards pagination parameters", async () => {
    mocks.listClients.mockResolvedValue({
      data: [],
      pagination: { page: 2, limit: 5, total: 12, totalPages: 3 },
    });

    const response = await GET(getRequest("?page=2&limit=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3 });
    expect(mocks.listClients).toHaveBeenCalledWith("business-1", {
      page: 2,
      limit: 5,
      search: "",
    });
  });

  it("returns an empty page with pagination metadata", async () => {
    mocks.listClients.mockResolvedValue({
      data: [],
      pagination: { page: 9, limit: 20, total: 4, totalPages: 1 },
    });

    const response = await GET(getRequest("?page=9"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination).toEqual({ page: 9, limit: 20, total: 4, totalPages: 1 });
  });

  it("rejects invalid page, limit and search parameters", async () => {
    const cases = [
      "?page=0",
      "?page=-1",
      "?page=abc",
      "?limit=0",
      "?limit=101",
      "?limit=foo",
      `?search=${"x".repeat(101)}`,
    ];

    for (const query of cases) {
      mocks.listClients.mockClear();
      const response = await GET(getRequest(query));
      const body = await response.json();

      expect(response.status, query).toBe(400);
      expect(body.error, query).toBe("Parámetros inválidos");
      expect(body.details, query).toEqual(expect.any(Array));
      expect(mocks.listClients, query).not.toHaveBeenCalled();
    }
  });

  it("does not list clients without clients.manage", async () => {
    mocks.permission.mockResolvedValue(false);

    const response = await GET(getRequest());

    expect(response.status).toBe(403);
    expect(mocks.listClients).not.toHaveBeenCalled();
  });

  it("requires an authenticated session", async () => {
    mocks.session.mockResolvedValue(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(mocks.listClients).not.toHaveBeenCalled();
  });
});

describe("GET /api/dashboard/clients empty catalog", () => {
  it("returns an empty listing when the business has no clients", async () => {
    mocks.session.mockResolvedValue({ id: "user-1" });
    mocks.business.mockResolvedValue({ id: "business-1", ownerId: "user-1" });
    mocks.permission.mockResolvedValue(true);
    mocks.listClients.mockResolvedValue(emptyList);

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(emptyList);
  });
});
