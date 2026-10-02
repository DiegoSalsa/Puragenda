import { getCurrentAdminSessionUser } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { websiteSupportReasons } from "@/websites/diagnostics";
import { formatWebsitePrice, websitePriceTier, websiteTrialState } from "@/websites/offers";
export const dynamic = "force-dynamic";
export default async function WebsitesAdmin() {
  if (!await getCurrentAdminSessionUser()) notFound();
  const sites = await prisma.businessWebsite.findMany({ take: 100, orderBy: { updatedAt: "desc" }, include: { business: { include: { subscription: true, websiteAddon: { include: { checkoutOperations: { take: 3, orderBy: { createdAt: "desc" } } } }, websiteOfferEligibility: true } }, domains: true, domainRequests: true } });
  return <div className="space-y-5"><h1 className="text-3xl font-bold">Sitios web</h1><p>Diagnóstico de los 100 sitios actualizados más recientemente.</p>{sites.map(site => {
    const offer = site.business.websiteOfferEligibility, addon = site.business.websiteAddon;
    const reasons = websiteSupportReasons(site, addon, offer, site.business.subscription, site.domains);
    for (const op of addon?.checkoutOperations ?? []) {
      if (["CREATING", "UNKNOWN", "PENDING"].includes(op.state)) reasons.push(`CHECKOUT_${op.state}: website:${op.id} · ${op.amount} ${op.currency}`);
    }
    return <article key={site.id} className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{site.business.name}</h2><p>{site.status} · borrador {site.templateKey} v{site.templateVersion} · publicado {site.publishedTemplateKey ?? "—"} v{site.publishedTemplateVersion ?? "—"} · {site.subdomain}</p><p>Business: {site.businessId} · Última publicación: {site.publishedAt?.toLocaleString("es-CL", { timeZone: "America/Santiago" }) ?? "sin publicar"}</p><p>Diagnóstico: {reasons.join(" · ") || "OK"}</p><dl className="text-sm"><dt>Oferta / precio permanente</dt><dd>{websitePriceTier(offer)} · {formatWebsitePrice(websitePriceTier(offer))}/mes · elegible {offer?.eligibleAt.toLocaleString("es-CL") ?? "—"}</dd><dt>Trial</dt><dd>{websiteTrialState(offer)} · {offer?.trialStartedAt?.toLocaleString("es-CL") ?? "—"} → {offer?.trialEndsAt?.toLocaleString("es-CL") ?? "—"} · consumido {offer?.trialConsumedAt?.toLocaleString("es-CL") ?? "—"}</dd><dt>Billing Website</dt><dd>{addon?.status ?? "INACTIVE"} · proveedor {addon?.provider ?? "—"} · suscripción {addon?.mpSubscriptionId ?? addon?.paddleSubscriptionId ?? "—"} · período {addon?.validUntil?.toLocaleString("es-CL") ?? "—"} · cancelación {addon?.cancelAt?.toLocaleString("es-CL") ?? "—"}</dd><dt>Último evento verificado</dt><dd>{addon?.lastEventId ?? "—"} · {addon?.lastEventAt?.toLocaleString("es-CL") ?? "—"}</dd></dl>{site.domains.map(domain => <p key={domain.id}>{domain.hostname}: {domain.status} · {domain.lastError}</p>)}{site.domainRequests.map(request => <p key={request.id}>Solicitud: {request.hostname} · {request.status}</p>)}</article>;
  })}</div>;
}
