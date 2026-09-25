import { beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";

const mocks = vi.hoisted(() => ({ business: vi.fn(), scope: vi.fn(), permissions: vi.fn(), locations: vi.fn() }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: mocks.business, getStaffAgendaScope: mocks.scope }));
vi.mock("@/server/services/permissions.service", () => ({ getEffectiveBusinessPermissions: mocks.permissions }));
vi.mock("@/server/db/prisma", () => ({ prisma: { businessLocation: { findMany: mocks.locations } } }));

import { appointmentScope, createPuriContext } from "@/server/puri/context";

describe("Puri authenticated context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.business.mockResolvedValue({ id: "business-1", ownerId: "owner-1", timezone: "America/Santiago", currencyCode: "CLP" });
    mocks.scope.mockResolvedValue({ ownStaffId: "staff-1" });
    mocks.permissions.mockResolvedValue([P.APPOINTMENTS_VIEW_OWN, P.ANALYTICS_VIEW_OWN]);
    mocks.locations.mockResolvedValue([{ id: "location-1", slug: "main", name: "Main", timezone: "America/Santiago", isPrimary: true }]);
  });

  it("resolves the business from the session and restricts staff to their agenda", async () => {
    const context = await createPuriContext({ id: "staff-user", role: "STAFF" }, { pathname: "/dashboard/agenda", locale: "es", agenda: "all" });
    expect(mocks.business).toHaveBeenCalledWith("staff-user");
    expect(context.ownAgenda).toBe(true);
    expect(appointmentScope(context)).toEqual({ staffId: "staff-1" });
  });

  it("allows an owner to see the business agenda when permitted", async () => {
    mocks.permissions.mockResolvedValue([P.APPOINTMENTS_VIEW_ALL, P.ANALYTICS_VIEW_BUSINESS]);
    const context = await createPuriContext({ id: "owner-1", role: "ADMIN" }, { pathname: "/dashboard", locale: "es", agenda: "all" });
    expect(context.ownAgenda).toBe(false);
    expect(appointmentScope(context)).toEqual({});
  });

  it("rejects a location outside the business", async () => {
    await expect(createPuriContext({ id: "staff-user", role: "STAFF" }, { pathname: "/dashboard", locale: "es", locationSlug: "other" })).rejects.toThrow("LOCATION_FORBIDDEN");
  });
});
