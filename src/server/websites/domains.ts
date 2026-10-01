import { WebsiteError } from "@/server/websites/errors";
import { resolveTxt } from "node:dns/promises";
import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { normalizeHostname } from "@/websites/policy";
import { requireWebsiteManager, websiteRootDomain } from "./service";

export interface WebsiteDomainAdapter {
  check(hostname: string, token: string): Promise<{ verified: boolean; active: boolean; message: string }>;
}
// DNS proves ownership; provider activation is a separate operation. No automatic
// Vercel mutations. An adapter must verify TLS and target deployment before ACTIVE.
export const pendingDomainAdapter: WebsiteDomainAdapter = {
  async check(hostname, token) {
    let verified = false;
    try { verified = (await resolveTxt(`_puragenda.${hostname}`)).some(record => record.join("") === token); } catch { /* DNS not ready */ }
    return { verified, active: false, message: verified ? "Propiedad verificada. Pendiente de conexión y SSL por soporte." : "Publica el TXT para verificar la propiedad." };
  },
};
export function customHostname(raw: string) {
  const hostname = normalizeHostname(raw.trim());
  const root = websiteRootDomain();
  if (!hostname.includes(".") || hostname === root || hostname.endsWith(`.${root}`) || hostname.endsWith(".localhost") || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(hostname) || /^[\d.]+$/.test(hostname)) throw new WebsiteError("Usa un dominio propio válido");
  return hostname;
}
export async function addWebsiteDomain(raw: string) {
  const { business } = await requireWebsiteManager(true);
  const site = await prisma.businessWebsite.findUniqueOrThrow({ where: { businessId: business.id } });
  const hostname = customHostname(raw);
  if (await prisma.websiteDomain.count({ where: { websiteId: site.id } }) >= 5) throw new WebsiteError("Máximo 5 dominios");
  return prisma.websiteDomain.create({ data: { websiteId: site.id, hostname, verificationToken: `puragenda-verify=${randomBytes(24).toString("hex")}` } });
}
export async function verifyWebsiteDomain(id: string, adapter: WebsiteDomainAdapter = pendingDomainAdapter) {
  const { business } = await requireWebsiteManager(true);
  const domain = await prisma.websiteDomain.findFirst({ where: { id, website: { businessId: business.id } } });
  if (!domain) throw new WebsiteError("Dominio no encontrado");
  const result = await adapter.check(domain.hostname, domain.verificationToken);
  await prisma.websiteDomain.update({ where: { id: domain.id }, data: { status: result.active && result.verified ? "ACTIVE" : result.verified ? "VERIFIED" : "PENDING", verifiedAt: result.verified ? new Date() : null, activatedAt: result.active && result.verified ? new Date() : null, lastError: result.message } });
  return result.message;
}
