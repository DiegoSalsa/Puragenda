import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import {
  DASHBOARD_PERMISSIONS,
  LEGACY_ROLE_PERMISSIONS,
  normalizeDashboardPermissions,
  type DashboardPermission,
} from "@/core/permissions";

export async function getEffectiveBusinessPermissions(
  user: { id: string; role: string },
  business: { id: string; ownerId: string | null },
  db: Pick<Prisma.TransactionClient, "staff"> = prisma,
): Promise<DashboardPermission[]> {
  if (business.ownerId === user.id || user.role === "SUPERADMIN") {
    return LEGACY_ROLE_PERMISSIONS.ADMIN;
  }

  const staff = await db.staff.findFirst({
    where: { businessId: business.id, userId: user.id, isActive: true },
    select: { accessProfile: { select: { permissions: true } } },
  });

  if (!staff) return [];
  if (staff.accessProfile) {
    return normalizeDashboardPermissions(staff.accessProfile.permissions);
  }

  return LEGACY_ROLE_PERMISSIONS[user.role] ?? [];
}

export async function hasBusinessPermission(
  user: { id: string; role: string },
  business: { id: string; ownerId: string | null },
  permission: DashboardPermission,
  db: Pick<Prisma.TransactionClient, "staff"> = prisma,
) {
  const permissions = await getEffectiveBusinessPermissions(user, business, db);
  return permissions.includes(permission);
}

export async function getBusinessPermissionContext(
  user: { id: string; role: string },
  business: { id: string; ownerId: string | null },
) {
  const permissions = await getEffectiveBusinessPermissions(user, business);
  return {
    permissions,
    canSeeAllAgendas: permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL),
    canSeeBusinessAnalytics: permissions.includes(DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS),
  };
}
