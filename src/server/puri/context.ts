import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { PuriAccessError, type PuriContext } from "./types";

export async function createPuriContext(
  user: { id: string; role: string },
  input: { pathname: string; locationSlug?: string; agenda?: string; period?: "week" | "month"; locale: string },
): Promise<PuriContext> {
  const business = await getBusinessForUser(user.id);
  if (!business) throw new PuriAccessError("BUSINESS_NOT_FOUND");
  const [permissions, scope, locations] = await Promise.all([
    getEffectiveBusinessPermissions(user, business),
    getStaffAgendaScope(user, business),
    prisma.businessLocation.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, slug: true, name: true, timezone: true, isPrimary: true },
      orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    }),
  ]);
  if (permissions.length === 0) throw new PuriAccessError("FORBIDDEN");
  const requested = input.locationSlug
    ? locations.find((location) => location.slug === input.locationSlug)
    : null;
  if (input.locationSlug && !requested) throw new PuriAccessError("LOCATION_FORBIDDEN");
  const location = requested ?? locations[0] ?? null;
  const canSeeAllAgendas = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL);
  return {
    user,
    business,
    permissions,
    staffId: scope.ownStaffId,
    canSeeAllAgendas,
    ownAgenda: !canSeeAllAgendas || (input.agenda === "mine" && !!scope.ownStaffId),
    location,
    locationCount: locations.length,
    locale: input.locale,
    pathname: input.pathname.startsWith("/dashboard") ? input.pathname.slice(0, 100) : "/dashboard",
    selectedPeriod: input.period ?? "week",
  };
}

export function hasPermission(context: PuriContext, permission: string) {
  return context.permissions.some((value) => value === permission);
}

export function requirePermission(context: PuriContext, permission: string) {
  if (!hasPermission(context, permission)) throw new PuriAccessError("FORBIDDEN");
}

export function requireAgenda(context: PuriContext) {
  if (!context.canSeeAllAgendas && (!hasPermission(context, DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN) || !context.staffId)) {
    throw new PuriAccessError("FORBIDDEN");
  }
}

export function appointmentScope(context: PuriContext) {
  return context.ownAgenda ? { staffId: context.staffId ?? "__no_staff_access__" } : {};
}
