import { WebsiteError } from "@/server/websites/errors";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { normalizeHostname, validSubdomain, websiteIsVisible, websiteSubdomain } from "@/websites/policy";
import { websiteTemplate } from "@/websites/template-snapshots";
import { resolveTemplate } from "@/websites/registry";
import { loadBookingContext, toBookingCatalog } from "@/server/booking/read.service";
import { websiteCatalog } from "@/websites/catalog";
import type { WebsiteView } from "@/websites/types";
import type { Prisma } from "@prisma/client";

export const websiteRootDomain = () => normalizeHostname(process.env.WEBSITE_ROOT_DOMAIN || "puragenda.cl");
export async function requireWebsiteManager(ownerOnly = false) {
  const user = await getCurrentSessionUser();
  if (!user) throw new WebsiteError("No autenticado");
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt || (ownerOnly ? business.ownerId !== user.id : !await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.WEBSITE_MANAGE))) throw new WebsiteError("No autorizado");
  return { user, business };
}
export async function getManagedWebsite() {
  const { business } = await requireWebsiteManager();
  return prisma.businessWebsite.findUnique({ where: { businessId: business.id }, include: { domains: true, domainRequests: true } });
}
export async function ensureWebsite(businessId: string, slug: string) {
  const existing = await prisma.businessWebsite.findUnique({ where: { businessId } });
  if (existing) return existing;
  const subdomain = validSubdomain(slug) ? slug : `sitio-${randomUUID().slice(0, 8)}`;
  return prisma.businessWebsite.upsert({ where: { businessId }, create: { businessId, subdomain, draftConfig: resolveTemplate("bella", 1).defaultConfig() }, update: {} });
}
const includeBusiness = { business: { include: { subscription: true, websiteAddon: true, websiteOfferEligibility: true } }, domains: { where: { status: "ACTIVE" as const, tenantVerifiedAt: { not: null } } } } satisfies Prisma.BusinessWebsiteInclude;
export async function resolveWebsiteHost(raw: string) {
  const hostname = normalizeHostname(raw);
  const slug = websiteSubdomain(hostname, websiteRootDomain());
  const site = slug
    ? await prisma.businessWebsite.findUnique({ where: { subdomain: slug }, include: includeBusiness })
    : await prisma.businessWebsite.findFirst({ where: { domains: { some: { hostname, status: "ACTIVE", tenantVerifiedAt: { not: null } } } }, include: includeBusiness });
  if (!site || !websiteIsVisible(site, site.business.websiteAddon, site.business.subscription, site.business.deletedAt, new Date(), site.business.websiteOfferEligibility)) return null;
  const identity = websiteTemplate(site, false);
  resolveTemplate(identity.key, identity.version);
  return site;
}
export type PublicWebsite = NonNullable<Awaited<ReturnType<typeof resolveWebsiteHost>>>;
export async function websiteView(site: { businessId: string; templateKey: string; templateVersion: number; draftConfig: unknown; publishedConfig: unknown; publishedTemplateKey?: string | null; publishedTemplateVersion?: number | null }, preview: boolean): Promise<WebsiteView<ReturnType<ReturnType<typeof resolveTemplate>["readConfig"]>>> {
  const identity = websiteTemplate(site, preview);
  const template = resolveTemplate(identity.key, identity.version);
  const config = template.readConfig(preview ? site.draftConfig : site.publishedConfig);
  const [business, context] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: site.businessId }, select: { id: true, name: true, logoUrl: true, address: true, mapsUrl: true } }),
    loadBookingContext(site.businessId),
  ]);
  const primaryLocation = context.locations.find(location => location.isPrimary) ?? context.locations[0];
  return { config, catalog: websiteCatalog(toBookingCatalog(context), preview), business: { id: business.id, name: business.name, logo: business.logoUrl, address: business.address || primaryLocation?.address || null, mapsUrl: business.mapsUrl || primaryLocation?.mapsUrl || null, hours: (primaryLocation?.hours.length ? primaryLocation.hours : context.businessHours).map(({ dayOfWeek, startTime, endTime, isOpen }) => ({ dayOfWeek, startTime, endTime, isOpen })) }, preview };
}
export function canonicalWebsiteUrl(site: PublicWebsite) {
  const primary = site.domains.find(domain => domain.isPrimary);
  return `https://${primary?.hostname || `${site.subdomain}.${websiteRootDomain()}`}`;
}
