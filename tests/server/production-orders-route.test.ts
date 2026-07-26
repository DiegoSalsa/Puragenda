import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: vi.fn(),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: vi.fn(),
}));

vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    productionOrder: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { PATCH } from "@/app/api/dashboard/production-orders/[id]/route";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const getSession = vi.mocked(getApiSessionUser);
const getBusiness = vi.mocked(getBusinessForUser);
const hasPermission = vi.mocked(hasBusinessPermission);
const findOrder = vi.mocked(prisma.productionOrder.findFirst);

function patchRequest() {
  return new NextRequest("http://localhost/api/dashboard/production-orders/order-1", {
    method: "PATCH",
    body: JSON.stringify({ status: "QUEUED" }),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/dashboard/production-orders/:id", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      id: "staff-1",
      email: "staff@example.com",
      name: "Staff",
      role: "STAFF",
      isSuperAdmin: false,
      adminAccess: false,
    });
    getBusiness.mockResolvedValue({ id: "business-1", ownerId: "owner-1" } as never);
  });

  it("returns 403 before reading an order when the user lacks services.manage", async () => {
    hasPermission.mockResolvedValue(false);

    const response = await PATCH(patchRequest(), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(403);
    expect(findOrder).not.toHaveBeenCalled();
  });

  it("keeps the order lookup scoped to the current business", async () => {
    hasPermission.mockResolvedValue(true);
    findOrder.mockResolvedValue(null);

    const response = await PATCH(patchRequest(), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(404);
    expect(findOrder).toHaveBeenCalledWith({
      where: { id: "order-1", businessId: "business-1" },
    });
  });
});
