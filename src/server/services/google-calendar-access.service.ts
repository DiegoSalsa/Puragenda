import type { SessionUser } from "@/core/entities";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import { hasBusinessPermission } from "@/server/services/permissions.service";

type BusinessContext = { id: string; ownerId: string | null };

export async function getGoogleOAuthScopeContext(
  user: SessionUser,
  business: BusinessContext,
  requestedScope: string | null,
  requestedStaffId?: string | null,
) {
  if (requestedScope === "business") {
    const allowed = await hasBusinessPermission(
      user,
      business,
      DASHBOARD_PERMISSIONS.SETTINGS_MANAGE,
    );
    if (!allowed) return null;
    return {
      scope: "BUSINESS" as const,
      scopeKey: "business",
      staffId: null,
    };
  }

  const staff = await prisma.staff.findFirst({
    where: {
      businessId: business.id,
      isActive: true,
      ...(requestedStaffId ? { id: requestedStaffId } : { userId: user.id }),
    },
    select: { id: true, userId: true, email: true },
  });
  if (!staff) return null;
  if (
    staff.userId !== user.id &&
    !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))
  ) {
    return null;
  }
  return {
    scope: "STAFF" as const,
    scopeKey: `staff:${staff.id}`,
    staffId: staff.id,
    loginHint: staff.email,
  };
}

export async function canManageGoogleConnection(
  user: SessionUser,
  business: BusinessContext,
  connection: { businessId: string; scope: string; staffId: string | null; userId: string },
) {
  if (connection.businessId !== business.id) return false;
  if (connection.scope === "STAFF" && connection.userId === user.id) return true;
  return hasBusinessPermission(
    user,
    business,
    DASHBOARD_PERMISSIONS.SETTINGS_MANAGE,
  );
}
