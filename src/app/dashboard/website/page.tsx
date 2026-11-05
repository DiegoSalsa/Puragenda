import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { resolveWebsiteCommercialAccess } from "@/server/websites/commercial-access";
import LegacyWebsiteContractNotice from "./legacy-contract-notice";
import { hasWebsitePaidAccess } from "@/websites/policy";
import { WebsiteTrialWelcome } from "@/components/dashboard/website-trial-welcome";
import { requireWebsiteManager, ensureWebsite, websiteRootDomain, websiteView, canonicalWebsiteUrl } from "@/server/websites/service";
import { resolveWebsiteDomains } from "@/server/websites/domain-ownership";
import Link from "next/link";
import { hasPaidBase } from "@/websites/commercial";
import { publicWebsiteAcquisitionEnabled } from "@/server/websites/public-acquisition";
import { hasExistingWebsiteBillingLifecycle } from "@/websites/billing-lifecycle";
import { prisma } from "@/server/db/prisma";
import { resolveTemplate } from "@/websites/registry";

import { websitePrice } from "@/server/websites/billing";
import { headers } from "next/headers";
import { z } from "zod";
import { WEBSITE_CATALOG, websitePriceTier, websiteTrialState } from "@/websites/offers";
const dnsRecords = z.array(z.object({ type: z.enum(["A", "CNAME", "TXT"]), name: z.string(), value: z.string() }));
export default async function WebsitePage() {
  const { business, user } = await requireWebsiteManager(false, false);
  const commercialAccess = await getCommercialPlanAccess(business.id);
  const websiteAccess = await resolveWebsiteCommercialAccess(business.id);
  const included = websiteAccess.source === "PLUS_INCLUDED";
  if (commercialAccess.v2 && !websiteAccess.editor && websiteAccess.legacyBillingReviewRequired) return <section className="space-y-3"><h1 className="text-2xl font-black">Contrato histórico de Sitio Web</h1><LegacyWebsiteContractNotice included={false} cancelAt={websiteAccess.legacyBillingCancelAt?.toISOString() ?? null} canCancel={business.ownerId === user.id && websiteAccess.legacyBillingCancellable} /></section>;
  if (commercialAccess.v2 && !websiteAccess.editor) return <section className="space-y-3 rounded-2xl border-2 border-black bg-white p-6 text-black"><h1 className="text-2xl font-black">Sitio web incluido en Puragenda+</h1><p>Para crear, editar y publicar tu sitio necesitas acceso vigente a Puragenda+. Tu contenido existente se conserva.</p><Link href="/dashboard/settings#plan" className="font-bold underline">Revisar mi plan</Link></section>;
  if (!websiteAccess.editor) return <section className="space-y-4 rounded-2xl border-2 border-black bg-white p-6 text-black"><h1 className="text-2xl font-black">Sitio web incluido en Puragenda+</h1><p>El sitio web personalizable, su editor y hosting se habilitan con Puragenda+. Tu contenido existente se conserva.</p><Link href="/puragenda-plus" className="font-bold underline">Conocer Puragenda+</Link></section>;
  const site = await ensureWebsite(business.id, business.slug);
  const [addon, offer, domains, requests] = await Promise.all([
    prisma.websiteAddon.findUnique({ where: { businessId: business.id }, include: { checkoutOperations: { orderBy: { createdAt: "desc" }, take: 1, select: { state: true, mpSubscriptionId: true } } } }),
    // Older dev processes can retain a Prisma singleton generated before the launch-offer model existed.
    // Treat the optional eligibility row as absent until that process is restarted/migrated.
    Promise.resolve(prisma.websiteOfferEligibility?.findUnique?.({ where: { businessId: business.id } }) ?? null).catch(() => null),
    prisma.websiteDomain.findMany({ where: { websiteId: site.id } }),
    prisma.domainRequest.findMany({ where: { websiteId: site.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const tier = websitePriceTier(offer);
  const intent = await prisma.websitePurchaseIntent.findUnique({ where: { businessId: business.id } });
  const bundleAllowed = !intent || tier === "BETA_FOUNDER" || hasExistingWebsiteBillingLifecycle(addon) || (publicWebsiteAcquisitionEnabled() && hasPaidBase(await prisma.subscription.findUnique({ where: { businessId: business.id } })));
  // Expiry is enforced at every entitlement check; this once-only audit event
  // is observed on the next managed visit and does not require a scheduler.
  if (offer && websiteTrialState(offer) === "EXPIRED") {
    await prisma.websiteCommercialEvent.upsert({ where: { key: `trial-expired:${business.id}` }, create: { key: `trial-expired:${business.id}`, businessId: business.id, event: "website_trial_expired", priceTier: tier }, update: {} });
  }
  const price = included ? null : business.countryCode === "CL" ? { id: "mercadopago", ...WEBSITE_CATALOG[tier], provider: "mercadopago" as const, enabled: process.env.WEBSITE_CHECKOUT_ENABLED === "1" && bundleAllowed } : await websitePrice(tier).catch(() => null);
  const root = websiteRootDomain();
  const local = root === "localhost";
  const host = (await headers()).get("host") ?? "localhost:3005";
  const port = local && /^localhost:\d+$/.test(host) ? `:${host.split(":")[1]}` : "";
  const domainAccess = await resolveWebsiteDomains(domains);
  const template = resolveTemplate(site.templateKey, site.templateVersion);
  const WebsiteEditor = await template.loadEditor();
  const subdomainUrl = local ? `http://${site.subdomain}.localhost${port}` : `https://${site.subdomain}.${root}`;
  const publicUrl = local ? subdomainUrl : canonicalWebsiteUrl({ subdomain: site.subdomain, domains: domainAccess.active });
  return <>{domainAccess.review.length > 0 && <section role="status" className="mb-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><p>Revisa la titularidad de {domainAccess.review.map(domain => domain.hostname).join(", ")}. No pudimos confirmar el registro TXT de propiedad. El dominio se conserva y necesita una nueva verificación.</p>{site.status === "PUBLISHED" && websiteAccess.hosting && site.publishedConfig ? <a href={subdomainUrl} target="_blank" rel="noreferrer" className="font-bold underline">Abrir el sitio con la dirección de Puragenda</a> : <p>Tu contenido se conserva. La dirección de Puragenda estará disponible cuando publiques con acceso vigente.</p>}</section>}{included && business.ownerId === user.id && addon && (addon.mpSubscriptionId || addon.paddleSubscriptionId) && hasExistingWebsiteBillingLifecycle(addon) ? <LegacyWebsiteContractNotice cancelAt={addon.cancelAt?.toISOString() ?? null} /> : null}{intent && business.ownerId === user.id && <Link href="/onboarding/website" className="mb-6 block rounded-xl border-2 border-black bg-[#FFF5BA] p-4 font-bold text-black underline">Ver pasos de contratación Puragenda + Sitio Web</Link>}{business.ownerId === user.id && websiteTrialState(offer) === "TRIALING" && !hasWebsitePaidAccess(addon) && <WebsiteTrialWelcome businessName={business.name} published={site.status === "PUBLISHED"} publicUrl={publicUrl} trialEndsAt={offer?.trialEndsAt?.toISOString() ?? null} ready={!template.publicationError(template.readConfig(site.draftConfig))} />}<WebsiteEditor key={`${site.templateKey}:${site.revision}`} templateKey={site.templateKey} templateVersion={site.templateVersion} initial={resolveTemplate(site.templateKey, site.templateVersion).readConfig(site.draftConfig)} view={await websiteView(site, true)} revision={site.revision} publishedRevision={site.publishedRevision} subdomain={site.subdomain} rootDomain={root} publicUrl={publicUrl} status={site.status} canManageDomains={business.ownerId === user.id} offer={offer ? { offerCode: offer.offerCode, eligibleAt: offer.eligibleAt, trialStartedAt: offer.trialStartedAt, trialEndsAt: offer.trialEndsAt, trialConsumedAt: offer.trialConsumedAt } : null} addon={included ? { status: "ACTIVE", provider: "included", agreementStatus: null, cancelAt: null, validUntil: websiteAccess.validUntil?.toISOString() ?? null } : addon ? { status: addon.status, provider: addon.provider, agreementStatus: addon.mpSubscriptionId ? (await prisma.websiteCheckoutOperation.findUnique({ where: { mpSubscriptionId: addon.mpSubscriptionId }, select: { providerStatus: true } }))?.providerStatus : null, cancelAt: addon.cancelAt?.toISOString() ?? null, validUntil: addon.validUntil?.toISOString() ?? null } : null} price={included ? null : price} domains={domains.map(item => ({ id: item.id, hostname: item.hostname, status: domainAccess.review.some(domain => domain.id === item.id) ? "OWNERSHIP_REVIEW" : item.status, provider: item.provider, records: dnsRecords.parse(item.dnsRecords), message: domainAccess.review.some(domain => domain.id === item.id) ? "Revisa el registro TXT de propiedad y vuelve a verificar la conexión." : item.lastError, primary: item.isPrimary }))} requests={requests.map(item => ({ id: item.id, hostname: item.hostname, status: item.status }))} /></>;
}
