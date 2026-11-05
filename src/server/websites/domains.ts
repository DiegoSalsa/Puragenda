import { WebsiteError } from "@/server/websites/errors";
import type { Prisma, WebsiteDomain } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { normalizeHostname } from "@/websites/policy";
import { requireWebsiteManager, websiteRootDomain } from "./service";
import { websiteDomainProvider, type DomainProvider, type DomainResult } from "./domain-provider";
import { websiteTxtMatches } from "./domain-ownership";
import { resolveWebsiteCommercialAccess } from "./commercial-access";

export interface WebsiteDomainAdapter {
  check(hostname: string, token: string): Promise<{ verified: boolean; active: boolean; message: string }>;
}
// DNS proves ownership; provider activation is a separate, ownership-gated step.
export const pendingDomainAdapter: WebsiteDomainAdapter = {
  async check(hostname, token) {
    const verified = await websiteTxtMatches(hostname, token);
    return { verified, active: false, message: verified ? "Propiedad verificada. Pendiente de conexión y SSL por soporte." : "Publica el TXT para verificar la propiedad." };
  },
};
export function customHostname(raw: string) {
  const hostname = normalizeHostname(raw.trim());
  const root = websiteRootDomain();
  if (!hostname.includes(".") || [root, "puragenda.cl", "vercel.app", "vercel.com", "vercel.pub", "vercel-dns.com"].some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(hostname) || /^[\d.]+$/.test(hostname)) throw new WebsiteError("Usa un dominio propio válido");
  return hostname;
}
type DomainDb = Pick<Prisma.TransactionClient, "websiteDomain">;
async function saveDomainResult(id: string, result: DomainResult, db: DomainDb) {
  return db.websiteDomain.update({ where: { id }, data: { status: result.active && result.verified ? "ACTIVE" : result.verified ? "VERIFIED" : "PENDING", verifiedAt: result.verified ? new Date() : null, activatedAt: result.active && result.verified ? new Date() : null, lastError: result.message, dnsRecords: result.records, checkedAt: new Date(), ...(!(result.active && result.verified) ? { isPrimary: false } : {}) } });
}
function ownershipRecords(hostname: string, token: string) {
  return [{ type: "TXT" as const, name: `_puragenda.${hostname}`, value: token }];
}
async function recordFailure(id: string, error: unknown, db: DomainDb) {
  await db.websiteDomain.update({ where: { id }, data: { status: "FAILED", isPrimary: false, lastError: error instanceof WebsiteError ? error.message : "No pudimos conectar este dominio. Intenta nuevamente.", checkedAt: new Date() } });
}
export async function addWebsiteDomain(raw: string, provider?: DomainProvider) {
  const { business } = await requireWebsiteManager(true, true);
  const site = await prisma.businessWebsite.findUniqueOrThrow({ where: { businessId: business.id } });
  const hostname = customHostname(raw);
  // The provider is intentionally not called until TXT ownership is verified.
  void provider;
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    if (!(await resolveWebsiteCommercialAccess(business.id, new Date(), tx)).domains) throw new WebsiteError("Necesitas acceso vigente al sitio web para conectar dominios");
    if (await tx.websiteDomain.count({ where: { websiteId: site.id } }) >= 5) throw new WebsiteError("Máximo 5 dominios");
    const verificationToken = `puragenda-verify=${randomBytes(24).toString("hex")}`;
    const domain = await tx.websiteDomain.create({ data: { websiteId: site.id, hostname, provider: "pending", verificationToken, dnsRecords: ownershipRecords(hostname, verificationToken) } });
    // Never adopt or reconcile a provider-owned hostname before this tenant has
    // proven control of it with the Puragenda TXT challenge.
    return domain;
  }, { timeout: 30000 });
}
async function managedDomain<T>(id: string, work: (domain: WebsiteDomain, tx: Prisma.TransactionClient) => Promise<T>, requireEntitlement = true) {
  const { business } = await requireWebsiteManager(true, requireEntitlement);
  const outcome = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    if (requireEntitlement && !(await resolveWebsiteCommercialAccess(business.id, new Date(), tx)).domains) throw new WebsiteError("Necesitas acceso vigente al sitio web para conectar dominios");
    const domain = await tx.websiteDomain.findFirst({ where: { id, website: { businessId: business.id } } });
    if (!domain) throw new WebsiteError("Dominio no encontrado");
    try { return { value: await work(domain, tx) }; }
    catch (error) { await recordFailure(id, error, tx); return { error }; }
  }, { timeout: 30000 });
  if ("error" in outcome) throw outcome.error;
  return outcome.value;
}
export async function verifyWebsiteDomain(id: string, adapter?: WebsiteDomainAdapter, suppliedProvider?: DomainProvider) {
  return managedDomain(id, async (domain, tx) => {
    const ownership = await (adapter ?? pendingDomainAdapter).check(domain.hostname, domain.verificationToken);
    if (!ownership.verified) {
      await tx.websiteDomain.update({ where: { id: domain.id }, data: { status: "PENDING", isPrimary: false, tenantVerifiedAt: null, verifiedAt: null, activatedAt: null, dnsRecords: ownershipRecords(domain.hostname, domain.verificationToken), checkedAt: new Date(), lastError: ownership.message } });
      return ownership.message;
    }
    let result: DomainResult;
    let providerKey = domain.provider;
    if (adapter && !suppliedProvider) result = { ...ownership, records: [] };
    else {
      const provider = suppliedProvider ?? websiteDomainProvider();
      providerKey = provider.key;
      // The TXT challenge is checked first. Only then may we add or reconcile
      // a hostname that could already exist in the shared provider project.
      try { await provider.addDomain(domain.hostname); } catch { /* existing provider record is reconciled below */ }
      result = await provider.verifyDomain(domain.hostname);
    }
    await saveDomainResult(domain.id, { ...result, verified: ownership.verified && result.verified, records: [...ownershipRecords(domain.hostname, domain.verificationToken), ...result.records] }, tx);
    await tx.websiteDomain.update({ where: { id: domain.id }, data: { provider: providerKey, tenantVerifiedAt: new Date() } });
    return result.message;
  });
}
export async function refreshWebsiteDomain(id: string) {
  // Refresh follows the same ownership-first flow as the initial connection;
  // it must never become a provider adoption bypass for a pending hostname.
  return verifyWebsiteDomain(id);
}
export async function removeWebsiteDomain(id: string) {
  return managedDomain(id, async (domain, tx) => {
    // A historical timestamp does not authorize deleting somebody else's
    // current provider record after DNS ownership has changed.
    if (domain.provider !== "pending" && domain.tenantVerifiedAt && await websiteTxtMatches(domain.hostname, domain.verificationToken)) await websiteDomainProvider().removeDomain(domain.hostname);
    await tx.websiteDomain.delete({ where: { id } });
  }, false);
}
