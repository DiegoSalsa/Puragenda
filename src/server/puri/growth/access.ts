import { prisma } from "@/server/db/prisma";
import {
  assertCommercialSandbox,
  commercialHash,
} from "@/server/services/commercial-internal";
import { evaluateCommercialEntitlements } from "@/core/commercial-entitlements";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";
import { PuriAccessError, type PuriContext } from "../types";

export function assertGrowthSandbox() {
  assertCommercialSandbox();
  if (process.env.PURI_PLUS_INTERNAL_ENABLED !== "1")
    throw new PuriAccessError("PURI_PLUS_DISABLED");
}
export function growthSandboxEnabled() {
  try {
    assertGrowthSandbox();
    return true;
  } catch {
    return false;
  }
}
export type GrowthScope = {
  businessId: string;
  actorId: string;
  locationId: string | null;
  staffId: string | null;
  scopeKey: string;
  timezone: string;
  currencyCode: string;
  owner: boolean;
  canMoney: boolean;
  canClients: boolean;
  canPrepare: boolean;
  includeLegacyNullLocation: boolean;
};
export async function createGrowthScope(
  context: PuriContext,
  allLocations = false,
  now = new Date(),
): Promise<GrowthScope> {
  assertGrowthSandbox();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: context.business.id },
    select: {
      id: true,
      ownerId: true,
      deletedAt: true,
      timezone: true,
      currencyCode: true,
      commercialSubscription: {
        select: {
          planCode: true,
          status: true,
          professionalTotal: true,
          periodStart: true,
          periodEnd: true,
          trialEnd: true,
          gracePeriodEndsAt: true,
          lastPaymentStatus: true,
          lastPaymentAt: true,
          lastPaymentEventId: true,
        },
      },
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: context.user.id },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!user || user.deletedAt || business.deletedAt)
    throw new PuriAccessError("FORBIDDEN");
  const owner = business.ownerId === user.id;
  const member = await prisma.staff.findFirst({
    where: { businessId: business.id, userId: user.id, isActive: true },
    select: { id: true },
  });
  if (!owner && !member) throw new PuriAccessError("FORBIDDEN");
  const permissions = await getEffectiveBusinessPermissions(user, business);
  const allAgendas = permissions.includes(P.APPOINTMENTS_VIEW_ALL);
  if (
    !allAgendas &&
    (!permissions.includes(P.APPOINTMENTS_VIEW_OWN) || !member)
  )
    throw new PuriAccessError("FORBIDDEN");
  if (allLocations && !owner) throw new PuriAccessError("LOCATION_FORBIDDEN");
  const location =
    allLocations || !context.location
      ? null
      : await prisma.businessLocation.findFirst({
          where: {
            id: context.location.id,
            businessId: business.id,
            isActive: true,
            ...(!owner
              ? { staff: { some: { staffId: member!.id, isActive: true } } }
              : {}),
          },
          select: { id: true, timezone: true, isPrimary: true },
        });
  if (context.location && !allLocations && !location)
    throw new PuriAccessError("LOCATION_FORBIDDEN");
  if (!location && !owner) throw new PuriAccessError("LOCATION_REQUIRED");
  const subscription = business.commercialSubscription;
  const entitlements =
    subscription &&
    evaluateCommercialEntitlements(
      { ...subscription, plan: subscription.planCode },
      now,
    );
  if (
    !subscription ||
    subscription.planCode !== "PURAGENDA_PLUS" ||
    !["ACTIVE", "SCHEDULED_CHANGE", "PAST_DUE_GRACE"].includes(
      subscription.status,
    ) ||
    !subscription.periodStart ||
    subscription.periodStart > now ||
    !subscription.periodEnd ||
    subscription.lastPaymentStatus !== "CONFIRMED" ||
    !subscription.lastPaymentAt ||
    subscription.lastPaymentAt > now ||
    !subscription.lastPaymentEventId ||
    !entitlements?.commercialAccess ||
    !entitlements.capabilities.includes("puri.plus")
  )
    throw new PuriAccessError("PLUS_ENTITLEMENT_REQUIRED");
  // Grace cannot extend premium capability beyond an actually paid period.
  if (subscription.periodEnd <= now)
    throw new PuriAccessError("PLUS_ENTITLEMENT_REQUIRED");
  const staffId =
    !allAgendas || context.ownAgenda ? (member?.id ?? null) : null;
  if ((!allAgendas || context.ownAgenda) && !staffId)
    throw new PuriAccessError("STAFF_FORBIDDEN");
  const canMoney =
    permissions.includes(P.ANALYTICS_VIEW_BUSINESS) ||
    (!!staffId && permissions.includes(P.ANALYTICS_VIEW_OWN));
  const canClients = permissions.includes(P.CLIENTS_MANAGE);
  const canPrepare = owner || permissions.includes(P.MARKETING_MANAGE);
  const identity = {
    businessId: business.id,
    locationId: location?.id ?? null,
    staffId,
    canMoney,
    canClients,
    canPrepare,
  };
  return {
    ...identity,
    actorId: user.id,
    owner,
    scopeKey: commercialHash(identity),
    timezone: location?.timezone || business.timezone,
    currencyCode: business.currencyCode,
    includeLegacyNullLocation: !!location?.isPrimary,
  };
}
export async function revalidateGrowthScope(
  scope: GrowthScope,
  now = new Date(),
) {
  const context = {
    user: { id: scope.actorId },
    business: { id: scope.businessId },
    location: scope.locationId ? { id: scope.locationId } : null,
    ownAgenda: !!scope.staffId,
  } as PuriContext;
  const current = await createGrowthScope(context, !scope.locationId, now);
  if (commercialHash(current) !== commercialHash(scope))
    throw new PuriAccessError("SCOPE_CHANGED");
  return current;
}
