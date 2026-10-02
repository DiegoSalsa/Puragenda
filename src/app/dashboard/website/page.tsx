import { requireWebsiteManager, ensureWebsite, websiteRootDomain, websiteView } from "@/server/websites/service";
import { prisma } from "@/server/db/prisma";
import { resolveTemplate } from "@/websites/registry";

import { websitePrice } from "@/server/websites/billing";
import { headers } from "next/headers";
import { z } from "zod";
import { WEBSITE_CATALOG, websitePriceTier, websiteTrialState } from "@/websites/offers";
const dnsRecords = z.array(z.object({ type: z.enum(["A", "CNAME", "TXT"]), name: z.string(), value: z.string() }));
export default async function WebsitePage() {
  const { business, user } = await requireWebsiteManager();
  const site = await ensureWebsite(business.id, business.slug);
  const [addon, offer, domains, requests] = await Promise.all([
    prisma.websiteAddon.findUnique({ where: { businessId: business.id } }),
    // Older dev processes can retain a Prisma singleton generated before the launch-offer model existed.
    // Treat the optional eligibility row as absent until that process is restarted/migrated.
    Promise.resolve(prisma.websiteOfferEligibility?.findUnique?.({ where: { businessId: business.id } }) ?? null).catch(() => null),
    prisma.websiteDomain.findMany({ where: { websiteId: site.id } }),
    prisma.domainRequest.findMany({ where: { websiteId: site.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const tier = websitePriceTier(offer);
  // Expiry is enforced at every entitlement check; this once-only audit event
  // is observed on the next managed visit and does not require a scheduler.
  if (offer && websiteTrialState(offer) === "EXPIRED") {
    await prisma.websiteCommercialEvent.upsert({ where: { key: `trial-expired:${business.id}` }, create: { key: `trial-expired:${business.id}`, businessId: business.id, event: "website_trial_expired", priceTier: tier }, update: {} });
  }
  const price = business.countryCode === "CL" ? { id: "mercadopago", ...WEBSITE_CATALOG[tier], provider: "mercadopago" as const, enabled: process.env.WEBSITE_CHECKOUT_ENABLED === "1" } : await websitePrice(tier).catch(() => null);
  const root = websiteRootDomain();
  const local = root === "localhost";
  const host = (await headers()).get("host") ?? "localhost:3005";
  const port = local && /^localhost:\d+$/.test(host) ? `:${host.split(":")[1]}` : "";
  const primary = domains.find(domain => domain.isPrimary && domain.status === "ACTIVE");
  const template = resolveTemplate(site.templateKey, site.templateVersion);
  const WebsiteEditor = await template.loadEditor();
  return <WebsiteEditor key={`${site.templateKey}:${site.revision}`} templateKey={site.templateKey} templateVersion={site.templateVersion} initial={resolveTemplate(site.templateKey, site.templateVersion).readConfig(site.draftConfig)} view={await websiteView(site, true)} revision={site.revision} publishedRevision={site.publishedRevision} subdomain={site.subdomain} rootDomain={root} publicUrl={local ? `http://${site.subdomain}.localhost${port}` : `https://${primary?.hostname || `${site.subdomain}.${root}`}`} status={site.status} canManageDomains={business.ownerId === user.id} offer={offer ? { offerCode: offer.offerCode, eligibleAt: offer.eligibleAt, trialStartedAt: offer.trialStartedAt, trialEndsAt: offer.trialEndsAt, trialConsumedAt: offer.trialConsumedAt } : null} addon={addon ? { status: addon.status, provider: addon.provider, agreementStatus: addon.mpSubscriptionId ? (await prisma.websiteCheckoutOperation.findUnique({ where: { mpSubscriptionId: addon.mpSubscriptionId }, select: { providerStatus: true } }))?.providerStatus : null, cancelAt: addon.cancelAt?.toISOString() ?? null, validUntil: addon.validUntil?.toISOString() ?? null } : null} price={price} domains={domains.map(item => ({ id: item.id, hostname: item.hostname, status: item.status, provider: item.provider, records: dnsRecords.parse(item.dnsRecords), message: item.lastError, primary: item.isPrimary }))} requests={requests.map(item => ({ id: item.id, hostname: item.hostname, status: item.status }))} />;
}
