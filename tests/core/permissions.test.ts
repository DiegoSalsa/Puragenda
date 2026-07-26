import { describe, expect, it } from "vitest";
import {
  DASHBOARD_PERMISSIONS,
  LEGACY_ROLE_PERMISSIONS,
  normalizeDashboardPermissions,
  PERMISSION_CATALOG,
} from "@/core/permissions";

describe("dashboard permissions", () => {
  it("removes duplicated and unknown permission codes", () => {
    expect(
      normalizeDashboardPermissions([
        DASHBOARD_PERMISSIONS.SERVICES_MANAGE,
        "services.delete_everything",
        DASHBOARD_PERMISSIONS.SERVICES_MANAGE,
        DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN,
      ]),
    ).toEqual([
      DASHBOARD_PERMISSIONS.SERVICES_MANAGE,
      DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN,
    ]);
  });

  it("keeps the admin role aligned with the permission catalog", () => {
    expect(new Set(LEGACY_ROLE_PERMISSIONS.ADMIN)).toEqual(
      new Set(PERMISSION_CATALOG.map(({ code }) => code)),
    );
  });

  it("does not grant business-wide capabilities to staff by default", () => {
    expect(LEGACY_ROLE_PERMISSIONS.STAFF).not.toContain(
      DASHBOARD_PERMISSIONS.SERVICES_MANAGE,
    );
    expect(LEGACY_ROLE_PERMISSIONS.STAFF).not.toContain(
      DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS,
    );
  });
});
