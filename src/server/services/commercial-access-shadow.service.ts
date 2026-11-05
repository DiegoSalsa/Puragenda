import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "./business.service";
import { getEffectiveBusinessPermissions } from "./permissions.service";
import { prisma } from "@/server/db/prisma";
import { getCommercialEntitlementShadow } from "./commercial-entitlements.service";
import { requestCommercialSeatChange, type SeatChangeRequestInput } from "./commercial-capacity.service";
import type { CommercialEntitlementCapability } from "@/core/commercial-entitlements";
import { DASHBOARD_PERMISSIONS, type DashboardPermission } from "@/core/permissions";

/** Session-derived tenant. No businessId or commercial state is accepted from UI. */
async function sessionBusiness() {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt) throw new Error("FORBIDDEN");
  return { user, business };
}
export async function requestOwnedCommercialSeatChange(input: Omit<SeatChangeRequestInput, "businessId">) {
  const { user, business } = await sessionBusiness();
  if (business.ownerId !== user.id) throw new Error("OWNER_REQUIRED");
  // Explicit allowlist prevents mass assignment of businessId/state/provider/evidence.
  const result = await requestCommercialSeatChange({ businessId: business.id, idempotencyKey: input.idempotencyKey,
    requestedProfessionalTotal: input.requestedProfessionalTotal, effectiveAt: input.effectiveAt });
  return { id: result.id, status: result.status, requestedProfessionalTotal: result.requestedProfessionalTotal,
    quotedAmountClp: result.quotedAmountClp, currencyCode: result.currencyCode, effectiveAt: result.effectiveAt,
    conflictReason: result.conflictReason, alreadyExists: result.alreadyExists };
}
export function combineCommercialAuthorization(commercial: boolean, permissions: readonly string[], required: string, locationAllowed: boolean) {
  return commercial && permissions.includes(required) && locationAllowed;
}
const CAPABILITY_PERMISSIONS: Partial<Record<CommercialEntitlementCapability, DashboardPermission>> = {
  "analytics.commercial": DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS,
  "puri.plus": DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS,
  "puri.standard": DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN,
  "website.editor": DASHBOARD_PERMISSIONS.WEBSITE_MANAGE,
  "website.hosting": DASHBOARD_PERMISSIONS.WEBSITE_MANAGE,
  "professional.seats": DASHBOARD_PERMISSIONS.STAFF_MANAGE,
  "staff.operations": DASHBOARD_PERMISSIONS.STAFF_MANAGE,
  "agenda.operations": DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN,
};
export async function evaluateSessionCommercialAccessShadow(capability: CommercialEntitlementCapability, locationId?: string) {
  const { user, business } = await sessionBusiness();
  const requiredPermission = CAPABILITY_PERMISSIONS[capability];
  if (!requiredPermission) return { shadow: true as const, changesEffectiveAccess: false as const, allowed: false };
  const [shadow, permissions] = await Promise.all([
    getCommercialEntitlementShadow(business.id), getEffectiveBusinessPermissions(user, business),
  ]);
  let locationAllowed = true;
  if (locationId) {
    locationAllowed = Boolean(await prisma.businessLocation.findFirst({ where: { id: locationId, businessId: business.id, isActive: true,
      ...(business.ownerId === user.id ? {} : { staff: { some: { isActive: true, staff: { userId: user.id, isActive: true, businessId: business.id } } } }) } }));
  }
  return { shadow: true as const, changesEffectiveAccess: false as const,
    allowed: combineCommercialAuthorization(shadow.commercialAccess && shadow.capabilities.includes(capability), permissions, requiredPermission, locationAllowed) };
}
