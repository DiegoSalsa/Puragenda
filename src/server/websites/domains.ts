import { WebsiteError } from "@/server/websites/errors";
import { resolveTxt } from "node:dns/promises";
import type { Prisma, WebsiteDomain } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { normalizeHostname } from "@/websites/policy";
import { requireWebsiteManager, websiteRootDomain } from "./service";
import { websiteDomainProvider, type DomainProvider, type DomainResult } from "./domain-provider";

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
  if (!hostname.includes(".") || [root, "puragenda.cl", "vercel.app", "vercel.com", "vercel.pub", "vercel-dns.com"].some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(hostname) || /^[\d.]+$/.test(hostname)) throw new WebsiteError("Usa un dominio propio válido");
  return hostname;
}
type DomainDb = Pick<Prisma.TransactionClient, "websiteDomain">;
async function saveDomainResult(id: string, result: DomainResult, db: DomainDb) {
  return db.websiteDomain.update({ where: { id }, data: { status: result.active && result.verified ? "ACTIVE" : result.verified ? "VERIFIED" : "PENDING", verifiedAt: result.verified ? new Date() : null, activatedAt: result.active && result.verified ? new Date() : null, lastError: result.message, dnsRecords: result.records, checkedAt: new Date(), ...(!result.active ? { isPrimary: false } : {}) } });
}
async function recordFailure(id: string, error: unknown, db: DomainDb) {
  await db.websiteDomain.update({ where: { id }, data: { status: "FAILED", isPrimary: false, lastError: error instanceof WebsiteError ? error.message : "No pudimos conectar este dominio. Intenta nuevamente.", checkedAt: new Date() } });
}
export async function addWebsiteDomain(raw: string, provider?: DomainProvider) {
  const { business } = await requireWebsiteManager(true);
  const site = await prisma.businessWebsite.findUniqueOrThrow({ where: { businessId: business.id } });
  const hostname = customHostname(raw);
  const adapter = provider ?? websiteDomainProvider();
  const outcome = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    if (await tx.websiteDomain.count({ where: { websiteId: site.id } }) >= 5) throw new WebsiteError("Máximo 5 dominios");
    const domain = await tx.websiteDomain.create({ data: { websiteId: site.id, hostname, provider: adapter.key, verificationToken: `puragenda-verify=${randomBytes(24).toString("hex")}` } });
    try { const result = await adapter.addDomain(hostname); return { value: await saveDomainResult(domain.id, result, tx) }; }
    catch (error) { await recordFailure(domain.id, error, tx); return { error }; }
  }, { timeout: 30000 });
  if ("error" in outcome) throw outcome.error;
  return outcome.value;
}
async function managedDomain<T>(id: string, work: (domain: WebsiteDomain, tx: Prisma.TransactionClient) => Promise<T>) {
  const { business } = await requireWebsiteManager(true);
  const outcome = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    const domain = await tx.websiteDomain.findFirst({ where: { id, website: { businessId: business.id } } });
    if (!domain) throw new WebsiteError("Dominio no encontrado");
    try { return { value: await work(domain, tx) }; }
    catch (error) { await recordFailure(id, error, tx); return { error }; }
  }, { timeout: 30000 });
  if ("error" in outcome) throw outcome.error;
  return outcome.value;
}
export async function verifyWebsiteDomain(id: string, adapter?: WebsiteDomainAdapter) {
  return managedDomain(id, async (domain, tx) => {
    const result = adapter ? { ...await adapter.check(domain.hostname, domain.verificationToken), records: [] } : await websiteDomainProvider().verifyDomain(domain.hostname);
    await saveDomainResult(domain.id, result, tx);
    return result.message;
  });
}
export async function refreshWebsiteDomain(id: string) {
  return managedDomain(id, async (domain, tx) => {
    const adapter = websiteDomainProvider();
    const result = domain.status === "FAILED" || domain.provider === "pending" ? await adapter.addDomain(domain.hostname) : await adapter.getDomainStatus(domain.hostname);
    await tx.websiteDomain.update({ where: { id }, data: { provider: adapter.key } });
    return saveDomainResult(id, result, tx);
  });
}
export async function removeWebsiteDomain(id: string) {
  return managedDomain(id, async (domain, tx) => {
    if (domain.provider !== "pending") await websiteDomainProvider().removeDomain(domain.hostname);
    await tx.websiteDomain.delete({ where: { id } });
  });
}
