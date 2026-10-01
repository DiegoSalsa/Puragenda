import { requireWebsiteManager, ensureWebsite, websiteRootDomain } from "@/server/websites/service";
import { prisma } from "@/server/db/prisma";
import { bellaConfigSchema } from "@/websites/config";
import WebsiteEditor from "./website-editor";
import { websitePrice } from "@/server/websites/billing";
export default async function WebsitePage() {
  const { business } = await requireWebsiteManager();
  const site = await ensureWebsite(business.id, business.slug);
  const [addon, domains, requests, price] = await Promise.all([
    prisma.websiteAddon.findUnique({ where: { businessId: business.id } }),
    prisma.websiteDomain.findMany({ where: { websiteId: site.id } }),
    prisma.domainRequest.findMany({ where: { websiteId: site.id }, orderBy: { createdAt: "desc" } }),
    websitePrice().catch(() => null),
  ]);
  return <WebsiteEditor initial={bellaConfigSchema.parse(site.draftConfig)} revision={site.revision} subdomain={site.subdomain} rootDomain={websiteRootDomain()} status={site.status} addon={addon ? { status: addon.status, cancelAt: addon.cancelAt?.toISOString() ?? null, validUntil: addon.validUntil?.toISOString() ?? null } : null} price={price} domains={domains.map(item => ({ id: item.id, hostname: item.hostname, status: item.status, token: item.verificationToken, primary: item.isPrimary }))} requests={requests.map(item => ({ id: item.id, hostname: item.hostname, status: item.status }))} />;
}
