import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { effectiveSnapshotAccess, isV2Plan } from "@/server/services/commercial-plan-access";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { hasWebsiteEntitlement, hasWebsitePaidAccess, normalizeHostname, websiteSubdomain } from "@/websites/policy";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { assertCommercialSandbox } from "@/server/services/commercial-internal";
import { mpV2RenewalGraceDeadline } from "@/server/commercial-billing/mercadopago-v2-grace";
import { legacyPlusTerms } from "@/core/legacy-plus";

type WebDb = Pick<Prisma.TransactionClient, "business" | "commercialWebsiteTransition">;
/** Website policy consumes the shared V2 access decision. Legacy add-on terms
 * remain separate and are never inferred for a new V2 contract. */
export async function resolveWebsiteCommercialAccess(businessId: string, now = new Date(), db: WebDb = prisma) {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY");
  const business = await db.business.findUnique({ where: { id: businessId }, select: {
    deletedAt: true, subscription: true, websiteAddon: true, websiteOfferEligibility: true,
    commercialSubscription: true,
  } });
  const sub = business?.commercialSubscription;
  const extension = legacyPlusTerms(sub?.termsSnapshot);
  const legacyOperational = !!business && !business.deletedAt && hasOperationalSubscriptionAccess(business.subscription, now);
  const v2Contract = !extension && (isV2Plan(sub?.planCode) || isV2Plan(business?.subscription?.plan));
  const commercial = sub && isV2Plan(sub.planCode) ? effectiveSnapshotAccess(sub, now) : null;
  const v2Effective = !business?.deletedAt && !!commercial?.commercialAccess && (!extension || legacyOperational);
  const retired = business?.websiteAddon ? await db.commercialWebsiteTransition.findFirst({ where: {
    businessId, addonId: business.websiteAddon.id, status: "INCLUDED", proposal: { status: "APPLIED", effectiveAt: { lte: now } },
  }, select: { id: true } }) : null;
  // An independent, paid contract is not a Plus grant. Keep it until a proven
  // migration retires it. Old promotional trials never elevate a new V2 plan.
  const legacyWeb = !retired && (v2Contract
    ? v2Effective && hasWebsitePaidAccess(business?.websiteAddon, now)
    : legacyOperational && hasWebsiteEntitlement(business?.websiteAddon, now, business?.websiteOfferEligibility));
  const plus = v2Effective && commercial!.capabilities.includes("website.editor") && commercial!.capabilities.includes("website.hosting");
  const plusUntil = plus && sub ? commercial!.status === "TRIALING" ? sub.trialEnd
    : commercial!.status === "PAST_DUE_GRACE" ? mpV2RenewalGraceDeadline(sub, now) ?? sub.gracePeriodEndsAt
    : sub.periodEnd : null;
  const allowed = !!(plus || legacyWeb);
  const historicalBilling = !retired && !!business?.websiteAddon && !!(business.websiteAddon.mpSubscriptionId || business.websiteAddon.paddleSubscriptionId || business.websiteAddon.validUntil);
  return { shadow: false as const, changesEffectiveAccess: true as const,
    source: plus ? "PLUS_INCLUDED" : legacyWeb ? "LEGACY" : "NONE",
    editor: allowed, preview: allowed, publish: allowed, hosting: allowed, domains: allowed, media: allowed,
    validUntil: plus ? plusUntil : legacyWeb ? business?.websiteAddon?.validUntil ?? business?.websiteOfferEligibility?.trialEndsAt ?? null : null,
    legacyBillingReviewRequired: v2Contract && !allowed && historicalBilling,
    legacyBillingCancelAt: historicalBilling ? business?.websiteAddon?.cancelAt ?? null : null,
    legacyBillingCancellable: historicalBilling && business?.websiteAddon?.status !== "CANCELLED" && !!(business?.websiteAddon?.mpSubscriptionId || business?.websiteAddon?.paddleSubscriptionId),
    bookingLink: v2Contract ? v2Effective : legacyOperational, bookingWidget: v2Contract ? v2Effective : legacyOperational,
    standaloneCheckoutAllowed: !v2Contract && !allowed && !retired,
    upgradeRequiredForWebsite: v2Contract && !allowed,
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
