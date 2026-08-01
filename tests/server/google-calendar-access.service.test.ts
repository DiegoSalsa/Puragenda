import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  staffFindFirst: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { staff: { findFirst: mocks.staffFindFirst } },
}));

vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: mocks.hasPermission,
}));

import { getGoogleOAuthScopeContext } from "@/server/services/google-calendar-access.service";

const user = { id: "user-1", email: "owner@example.com" } as never;
const business = { id: "business-1", ownerId: "user-1" };

describe("Google Calendar connection scope access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a worker to connect their own active staff calendar", async () => {
    mocks.staffFindFirst.mockResolvedValue({
      id: "staff-1",
      userId: "user-1",
      email: "worker@example.com",
    });

    await expect(
      getGoogleOAuthScopeContext(user, business, "staff", null),
    ).resolves.toMatchObject({
      scope: "STAFF",
      staffId: "staff-1",
      scopeKey: "staff:staff-1",
    });
    expect(mocks.hasPermission).not.toHaveBeenCalled();
  });

  it("allows a settings manager to connect a calendar for any active worker", async () => {
    mocks.staffFindFirst.mockResolvedValue({
      id: "staff-2",
      userId: null,
      email: "worker2@example.com",
    });
    mocks.hasPermission.mockResolvedValue(true);

    await expect(
      getGoogleOAuthScopeContext(user, business, "staff", "staff-2"),
    ).resolves.toMatchObject({
      scope: "STAFF",
      staffId: "staff-2",
      loginHint: "worker2@example.com",
    });
  });

  it("rejects connecting another worker without settings permission", async () => {
    mocks.staffFindFirst.mockResolvedValue({
      id: "staff-2",
      userId: "user-2",
      email: "worker2@example.com",
    });
    mocks.hasPermission.mockResolvedValue(false);

    await expect(
      getGoogleOAuthScopeContext(user, business, "staff", "staff-2"),
    ).resolves.toBeNull();
  });
});
