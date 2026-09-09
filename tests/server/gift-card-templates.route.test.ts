import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  service: { findMany: vi.fn() },
  giftCardTemplate: { create: vi.fn(), findMany: vi.fn() },
}));
vi.mock("@/server/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: vi.fn() }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn() }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: vi.fn() }));

import { POST } from "@/app/api/dashboard/gift-cards/templates/route";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const session = vi.mocked(getApiSessionUser);
const businessForUser = vi.mocked(getBusinessForUser);
const permitted = vi.mocked(hasBusinessPermission);

const base = {
  name: "Gift Card", description: "Regala bienestar", type: "BALANCE", salePrice: 45_000, faceValue: 50_000,
  isActive: true, isPublic: true, designPreset: "classic", backgroundColor: "#FFF5BA", accentColor: "#FF8FAB",
  textColor: "#111111", imageUrl: "", shortMessage: "", services: [],
};

function request(body: object) {
  return new NextRequest("http://localhost/api/dashboard/gift-cards/templates", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("Gift Card template dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.mockResolvedValue({ id: "user-1" } as never);
    businessForUser.mockResolvedValue({ id: "business-1", currencyCode: "CLP" } as never);
    permitted.mockResolvedValue(true);
    db.service.findMany.mockResolvedValue([]);
    db.giftCardTemplate.create.mockImplementation(async ({ data }) => ({ id: "template-1", ...data }));
  });

  it("creates a BALANCE template with distinct sale and face values", async () => {
    const response = await POST(request(base));
    expect(response.status).toBe(201);
    expect(db.giftCardTemplate.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ businessId: "business-1", salePrice: 45_000, faceValue: 50_000, currencyCode: "CLP" }) }));
  });

  it("creates a SERVICE template with progressive quantities", async () => {
    db.service.findMany.mockResolvedValue([{ id: "service-1" }]);
    const response = await POST(request({ ...base, type: "SERVICE", faceValue: null, services: [{ serviceId: "service-1", quantity: 3 }] }));
    expect(response.status).toBe(201);
    expect(db.giftCardTemplate.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ faceValue: null, services: { create: [{ serviceId: "service-1", quantity: 3 }] } }) }));
  });

  it("rejects a service that does not belong to the business", async () => {
    db.service.findMany.mockResolvedValue([]);
    const response = await POST(request({ ...base, type: "SERVICE", faceValue: null, services: [{ serviceId: "foreign-service", quantity: 1 }] }));
    expect(response.status).toBe(400);
    expect(db.giftCardTemplate.create).not.toHaveBeenCalled();
  });

  it("rejects a user without the Gift Card permission", async () => {
    permitted.mockResolvedValue(false);
    const response = await POST(request(base));
    expect(response.status).toBe(403);
    expect(db.giftCardTemplate.create).not.toHaveBeenCalled();
  });
});
