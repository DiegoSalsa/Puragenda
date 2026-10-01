import { getCurrentAdminSessionUser } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { hasWebsiteEntitlement } from "@/websites/policy";
export const dynamic = "force-dynamic";
export default async function WebsitesAdmin() {
  if (!await getCurrentAdminSessionUser()) notFound();
  const sites = await prisma.businessWebsite.findMany({ take: 100, orderBy: { updatedAt: "desc" }, select: { id: true, status: true, subdomain: true, templateKey: true, templateVersion: true, publishedAt: true, business: { select: { name: true, websiteAddon: { select: { status: true, validUntil: true, cancelAt: true } } } }, domains: { select: { hostname: true, status: true, lastError: true } }, domainRequests: { select: { hostname: true, status: true } } } });
  return <div className="space-y-5"><h1 className="text-3xl font-bold">Sitios web</h1><p>Diagnóstico de los 100 sitios actualizados más recientemente.</p>{sites.map(site => <article key={site.id} className="rounded-xl border p-5"><h2 className="text-xl font-semibold">{site.business.name}</h2><p>{site.status} · {site.templateKey} v{site.templateVersion} · {site.subdomain}</p><p>Entitlement: {hasWebsiteEntitlement(site.business.websiteAddon) ? "activo" : "inactivo"} · Última publicación: {site.publishedAt?.toLocaleString("es-CL", { timeZone: "America/Santiago" }) ?? "sin publicar"}</p>{site.domains.map(domain => <p key={domain.hostname}>{domain.hostname}: {domain.status} · {domain.lastError}</p>)}{site.domainRequests.map(request => <p key={request.hostname}>Solicitud: {request.hostname} · {request.status}</p>)}</article>)}</div>;
}
