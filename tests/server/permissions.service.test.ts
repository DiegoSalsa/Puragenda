import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    staff: {
      findFirst: vi.fn(),
    },
  },
}));

import { DASHBOARD_PERMISSIONS, LEGACY_ROLE_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import {
  getEffectiveBusinessPermissions,
  hasBusinessPermission,
} from "@/server/services/permissions.service";

const findStaff = vi.mocked(prisma.staff.findFirst);
const business = { id: "business-1", ownerId: "owner-1" };

describe("business permission resolution", () => {
  beforeEach(() => {
    findStaff.mockReset();
  });

  it("gives the owner the complete permission catalog without a staff lookup", async () => {
    const permissions = await getEffectiveBusinessPermissions(
      { id: "owner-1", role: "STAFF" },
      business,
    );

    expect(permissions).toEqual(LEGACY_ROLE_PERMISSIONS.ADMIN);
    expect(findStaff).not.toHaveBeenCalled();
  });

  it("normalizes stored access-profile permissions before using them", async () => {
    findStaff.mockResolvedValue({
      accessProfile: {
        permissions: [
          DASHBOARD_PERMISSIONS.SERVICES_MANAGE,
          "unknown.permission",
          DASHBOARD_PERMISSIONS.SERVICES_MANAGE,
        ],
      },
    } as never);

    const permissions = await getEffectiveBusinessPermissions(
      { id: "staff-1", role: "STAFF" },
      business,
    );

    expect(permissions).toEqual([DASHBOARD_PERMISSIONS.SERVICES_MANAGE]);
  });

  it("falls back to the legacy role when no access profile is assigned", async () => {
    findStaff.mockResolvedValue({ accessProfile: null } as never);

    await expect(
      hasBusinessPermission(
        { id: "staff-1", role: "STAFF" },
        business,
        DASHBOARD_PERMISSIONS.SERVICES_MANAGE,
      ),
    ).resolves.toBe(false);
  });
});
