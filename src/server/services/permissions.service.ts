import { prisma } from "@/server/db/prisma";
import {
  DASHBOARD_PERMISSIONS,
  LEGACY_ROLE_PERMISSIONS,
  type DashboardPermission,
} from "@/core/permissions";

export async function getEffectiveBusinessPermissions(
  user: { id: string; role: string },
  business: { id: string; ownerId: string | null },
): Promise<DashboardPermission[]> {
  if (business.ownerId === user.id || user.role === "SUPERADMIN") {
    return LEGACY_ROLE_PERMISSIONS.ADMIN;
  }

  const staff = await prisma.staff.findFirst({
    where: { businessId: business.id, userId: user.id, isActive: true },
    select: { accessProfile: { select: { permissions: true } } },
  });

  if (staff?.accessProfile) {
    return staff.accessProfile.permissions as DashboardPermission[];
  }

  return LEGACY_ROLE_PERMISSIONS[user.role] ?? [];
}

export async function hasBusinessPermission(
  user: { id: string; role: string },
  business: { id: string; ownerId: string | null },
  permission: DashboardPermission,
) {
  const permissions = await getEffectiveBusinessPermissions(user, business);
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
