import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdminSession = vi.fn();
const saveMarketplaceListing = vi.fn();

vi.mock("@/server/auth/admin-session", () => ({
  requireSuperAdminSession: () => requireSuperAdminSession(),
}));

vi.mock("@/server/services/marketplace-admin.service", () => ({
  saveMarketplaceListing: (...args: unknown[]) => saveMarketplaceListing(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveMarketplaceListingAction } from "@/server/actions/marketplace-admin.actions";

const payload = {
  businessId: "biz-1",
  locationId: "loc-1",
  localityId: "city-1",
  categoryIds: ["cat-barber"],
  status: "PENDING_REVIEW" as const,
  authorizationConfirmed: true,
  published: false,
};

describe("saveMarketplaceListingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMarketplaceListing.mockResolvedValue({ ok: true });
  });

  it("rejects users who are not superadmins", async () => {
    requireSuperAdminSession.mockRejectedValue(new Error("Acceso denegado"));
    await expect(saveMarketplaceListingAction(payload)).rejects.toThrow("Acceso denegado");
    expect(saveMarketplaceListing).not.toHaveBeenCalled();
  });

  it("rejects superadmins without an admin session", async () => {
    requireSuperAdminSession.mockRejectedValue(new Error("Acceso denegado"));
    await expect(saveMarketplaceListingAction(payload)).rejects.toThrow("Acceso denegado");
  });

  it("passes the admin user id to the curated save", async () => {
    requireSuperAdminSession.mockResolvedValue({ id: "admin-1", isSuperAdmin: true, adminAccess: true });
    await expect(saveMarketplaceListingAction(payload)).resolves.toEqual({ ok: true });
    expect(saveMarketplaceListing).toHaveBeenCalledWith("admin-1", payload);
  });
});
