import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: vi.fn(),
  getCurrentSessionUser: vi.fn(),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: vi.fn(),
  getStaffAgendaScope: vi.fn(),
}));

vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: vi.fn(),
}));

vi.mock("@/server/services/service-category.service", () => ({
  createServiceCategory: vi.fn(),
  getServiceCategoriesByBusinessId: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    recurringBooking: { findFirst: vi.fn(), update: vi.fn() },
    appointment: { updateMany: vi.fn(), count: vi.fn() },
  },
}));

import { GET as getCategories } from "@/app/api/dashboard/service-categories/route";
import { POST as cancelFutureSessions } from "@/app/api/dashboard/recurring/[id]/cancel-future/route";
import {
  getApiSessionUser,
  getCurrentSessionUser,
} from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { getServiceCategoriesByBusinessId } from "@/server/services/service-category.service";
import { prisma } from "@/server/db/prisma";

const sessionUser = {
  id: "staff-1",
  email: "staff@example.com",
  name: "Staff",
  role: "STAFF" as const,
  isSuperAdmin: false,
  adminAccess: false,
};
const business = { id: "business-1", ownerId: "owner-1" };

describe("dashboard route permission boundaries", () => {
  beforeEach(() => {
    vi.mocked(getApiSessionUser).mockResolvedValue(sessionUser);
    vi.mocked(getCurrentSessionUser).mockResolvedValue(sessionUser);
    vi.mocked(getBusinessForUser).mockResolvedValue(business as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(false);
  });

  it("does not expose service categories without services.manage", async () => {
    const response = await getCategories(
      new NextRequest("http://localhost/api/dashboard/service-categories"),
    );

    expect(response.status).toBe(403);
    expect(getServiceCategoriesByBusinessId).not.toHaveBeenCalled();
  });

  it("does not cancel recurring sessions without recurring.manage", async () => {
    const response = await cancelFutureSessions(
      new Request("http://localhost/api/dashboard/recurring/booking-1/cancel-future", {
        method: "POST",
        body: JSON.stringify({ fromDate: "2026-07-27T00:00:00.000Z" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "booking-1" }) },
    );

    expect(response.status).toBe(403);
    expect(prisma.recurringBooking.findFirst).not.toHaveBeenCalled();
  });
});
