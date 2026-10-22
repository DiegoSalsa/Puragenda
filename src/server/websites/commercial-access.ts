import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { evaluateCommercialEntitlements } from "@/core/commercial-entitlements";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { hasWebsiteEntitlement, normalizeHostname, websiteSubdomain } from "@/websites/policy";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { assertCommercialSandbox } from "@/server/services/commercial-internal";

type WebDb = Pick<Prisma.TransactionClient, "business" | "commercialWebsiteTransition">;
/** One server policy for editor, publish, hosting, domains and media. Shadow only:
 * existing website actions/host resolution keep their legacy gates until cutover. */
export async function resolveWebsiteCommercialAccess(businessId: string, now = new Date(), db: WebDb = prisma) {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY");
  const business = await db.business.findUnique({ where: { id: businessId }, select: {
    deletedAt: true, subscription: true, websiteAddon: true, websiteOfferEligibility: true,
    commercialSubscription: true,
  } });
  const sub = business?.commercialSubscription;
  const legacyOperational = !!business && !business.deletedAt && hasOperationalSubscriptionAccess(business.subscription, now);
  const commercial = sub ? evaluateCommercialEntitlements({ ...sub, plan: sub.planCode }, now) : null;
  // A catalog label or a persisted ACTIVE entitlement alone is never payment proof.
  const v2Effective = !!sub && !business?.deletedAt && ["PURAGENDA", "PURAGENDA_PLUS"].includes(sub.planCode)
    && ["ACTIVE", "SCHEDULED_CHANGE", "PAST_DUE_GRACE"].includes(sub.status)
    && !!sub.periodStart && sub.periodStart <= now && !!sub.periodEnd
    && sub.lastPaymentStatus === "CONFIRMED" && !!sub.lastPaymentAt && sub.lastPaymentAt <= now && !!sub.lastPaymentEventId
    && !!commercial?.commercialAccess;
  const retired = business?.websiteAddon ? await db.commercialWebsiteTransition.findFirst({ where: {
    businessId, addonId: business.websiteAddon.id, status: "INCLUDED", proposal: { status: "APPLIED", effectiveAt: { lte: now } },
  }, select: { id: true } }) : null;
  const legacyWeb = legacyOperational && !retired && hasWebsiteEntitlement(business?.websiteAddon, now, business?.websiteOfferEligibility);
  const plus = v2Effective && commercial!.capabilities.includes("website.editor") && commercial!.capabilities.includes("website.hosting");
  const allowed = !!(plus || legacyWeb);
  return { shadow: true as const, changesEffectiveAccess: false as const,
    source: plus ? "PLUS_INCLUDED" : legacyWeb ? "LEGACY" : "NONE",
    editor: allowed, preview: allowed, publish: allowed, hosting: allowed, domains: allowed, media: allowed,
    bookingLink: legacyOperational || v2Effective, bookingWidget: legacyOperational || v2Effective,
    standaloneCheckoutAllowed: !v2Effective && !allowed && !retired,
    upgradeRequiredForWebsite: v2Effective && !plus,
    domainPurchaseIncluded: false as const,
    reason: allowed ? null : "WEBSITE_ENTITLEMENT_REQUIRED",
  };
}

export async function assertStandaloneWebsiteCheckoutShadow(businessId: string, now = new Date()) {
  const access = await resolveWebsiteCommercialAccess(businessId, now);
  if (access.source === "PLUS_INCLUDED") throw new Error("WEBSITE_ALREADY_INCLUDED_IN_PLUS");
  if (access.upgradeRequiredForWebsite) throw new Error("UPGRADE_TO_PLUS_REQUIRED");
  if (!access.standaloneCheckoutAllowed) throw new Error("WEBSITE_ALREADY_ENTITLED");
  return access;
}

/** Cutover seam for tests and future gate integration. Production callers retain
 * their legacy decision. An opt-in is accepted only in the isolated local DB. */
export function selectWebsiteGateShadow(legacyAllowed: boolean, shadowAllowed: boolean) {
  if (process.env.COMMERCIAL_V2_WEBSITE_GATES !== "1") return { allowed: legacyAllowed, source: "LEGACY_GATE" as const };
  assertCommercialSandbox();
  return { allowed: shadowAllowed, source: "ISOLATED_V2_GATE" as const };
}

export type WebsiteCommercialAction = "editor" | "preview" | "publish" | "domains" | "media";
export async function evaluateSessionWebsiteAccessShadow(action: WebsiteCommercialAction, locationId?: string) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt) throw new Error("FORBIDDEN");
  const member = business.ownerId === user.id || !!await prisma.staff.findFirst({ where: { businessId: business.id, userId: user.id, isActive: true }, select: { id: true } });
  const permission = member && await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.WEBSITE_MANAGE);
  const locationAllowed = !locationId || !!await prisma.businessLocation.findFirst({ where: { id: locationId, businessId: business.id, isActive: true,
    ...(business.ownerId === user.id ? {} : { staff: { some: { isActive: true, staff: { userId: user.id, businessId: business.id, isActive: true } } } }) }, select: { id: true } });
  const entitlement = await resolveWebsiteCommercialAccess(business.id);
  return { ...entitlement, allowed: !!permission && locationAllowed && entitlement[action] === true };
}

/** Future host resolver returns no draft, domain, business or configuration on
 * suspension. Exact verified hostname ownership is resolved before entitlement. */
export async function resolveWebsiteHostShadow(rawHostname: string, now = new Date()) {
  const hostname = normalizeHostname(rawHostname);
  const subdomain = websiteSubdomain(hostname, process.env.WEBSITE_ROOT_DOMAIN || "puragenda.cl");
  const site = subdomain ? await prisma.businessWebsite.findUnique({ where: { subdomain } })
    : await prisma.businessWebsite.findFirst({ where: { domains: { some: { hostname, status: "ACTIVE", tenantVerifiedAt: { not: null } } } } });
  if (!site) return { state: "NOT_FOUND" as const, site: null };
  const access = await resolveWebsiteCommercialAccess(site.businessId, now);
  if (!access.hosting || site.status !== "PUBLISHED" || !site.publishedConfig) return { state: "SUSPENDED" as const, site: null };
  return { state: "AVAILABLE" as const, site: { id: site.id, businessId: site.businessId, subdomain: site.subdomain, publishedConfig: site.publishedConfig } };
}
