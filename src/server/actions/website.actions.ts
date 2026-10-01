"use server";
import { WebsiteError } from "@/server/websites/errors";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { bellaConfigSchema } from "@/websites/config";
import { hasWebsiteEntitlement, validSubdomain } from "@/websites/policy";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { requireWebsiteManager, ensureWebsite } from "@/server/websites/service";
import { addWebsiteDomain, customHostname, verifyWebsiteDomain, refreshWebsiteDomain, removeWebsiteDomain } from "@/server/websites/domains";
import { startWebsiteCheckout, changeWebsiteBilling, recoverWebsitePayment } from "@/server/websites/billing";
import { resolveTemplate } from "@/websites/registry";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { storeWebsiteImage, deleteWebsiteAsset, validateWebsiteAssets } from "@/server/websites/media";
import { mediaUrls } from "@/websites/editor-utils";
import { websiteAssetSchema } from "@/websites/media";
import { paletteTokens, validatePalette } from "@/websites/palettes";

async function uploadWebsiteImageImpl(formData: FormData) {
  return storeWebsiteImage(formData);
}

async function saveWebsiteDraftImpl(input: unknown, revision: number, subdomain: string) {
  const { business } = await requireWebsiteManager();
  const config = bellaConfigSchema.parse(input);
  if (!Number.isSafeInteger(revision) || revision < 0 || !validSubdomain(subdomain)) throw new WebsiteError("Configuración inválida");
  const site = await ensureWebsite(business.id, business.slug);
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    await validateWebsiteAssets(tx, site.id, config, site.draftConfig);
    return tx.businessWebsite.updateMany({ where: { id: site.id, businessId: business.id, revision }, data: { draftConfig: config, subdomain, revision: { increment: 1 } } });
  });
  if (result.count !== 1) throw new WebsiteError("El borrador cambió en otra sesión. Recarga antes de guardar.");
  return { revision: revision + 1 };
}
async function publishWebsiteImpl(revision: number) {
  const { business } = await requireWebsiteManager();
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    const current = await tx.business.findUniqueOrThrow({ where: { id: business.id }, include: { subscription: true, websiteAddon: true, website: true } });
    if (current.deletedAt || !hasWebsiteEntitlement(current.websiteAddon) || !hasOperationalSubscriptionAccess(current.subscription)) throw new WebsiteError("Activa el add-on y regulariza tu suscripción para publicar");
    const site = current.website;
    if (!site || site.revision !== revision) throw new WebsiteError("Recarga el borrador antes de publicar");
    const template = resolveTemplate(site.templateKey, site.templateVersion);
    const config = template.configSchema.parse(site.draftConfig);
    if (config.paletteMode === "custom" && config.customPalette && !validatePalette(paletteTokens(config.accent, config.customPalette, config.paletteMode)).valid) throw new WebsiteError("La paleta personalizada necesita más contraste antes de publicar");
    await validateWebsiteAssets(tx, site.id, config, site.draftConfig);
    if (!config.heroImage || !config.headline) throw new WebsiteError("Agrega una portada y un titular antes de publicar");
    const published = await tx.businessWebsite.updateMany({ where: { id: site.id, revision }, data: { publishedConfig: config, publishedRevision: revision, publishedAt: new Date(), status: "PUBLISHED" } });
    if (published.count !== 1) throw new WebsiteError("El borrador cambió. Revisa y publica nuevamente.");
  });
  revalidatePath("/dashboard/website");
}
async function suspendWebsiteImpl() {
  const { business } = await requireWebsiteManager();
  await prisma.businessWebsite.updateMany({ where: { businessId: business.id }, data: { status: "SUSPENDED" } });
  revalidatePath("/dashboard/website");
}
async function connectWebsiteDomainImpl(hostname: string) {
  await addWebsiteDomain(hostname); revalidatePath("/dashboard/website");
}
async function checkWebsiteDomainImpl(id: string) {
  const message = await verifyWebsiteDomain(id); revalidatePath("/dashboard/website"); return message;
}
async function requestWebsiteDomainImpl(raw: string, notes: string) {
  const { business } = await requireWebsiteManager(true);
  const site = await prisma.businessWebsite.findUniqueOrThrow({ where: { businessId: business.id } });
  if (notes.length > 1000) throw new WebsiteError("Mensaje demasiado largo");
  if (await prisma.domainRequest.count({ where: { websiteId: site.id, status: { in: ["REQUESTED", "REVIEWING", "QUOTED"] } } }) >= 3) throw new WebsiteError("Ya tienes solicitudes pendientes");
  await prisma.domainRequest.create({ data: { websiteId: site.id, hostname: customHostname(raw), notes: notes.trim() } });
  revalidatePath("/dashboard/website");
}
async function setPrimaryWebsiteDomainImpl(id: string) {
  const { business } = await requireWebsiteManager(true);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    const domain = await tx.websiteDomain.findFirst({ where: { id, status: "ACTIVE", website: { businessId: business.id } } });
    if (!domain) throw new WebsiteError("Dominio no activo");
    await tx.websiteDomain.updateMany({ where: { websiteId: domain.websiteId }, data: { isPrimary: false } });
    await tx.websiteDomain.update({ where: { id: domain.id }, data: { isPrimary: true } });
  });
  revalidatePath("/dashboard/website");
}
async function activateWebsiteAddonImpl() { return startWebsiteCheckout(); }
async function regularizeWebsiteAddonImpl() { return recoverWebsitePayment(); }
async function cancelWebsiteAddonImpl(confirmed: boolean) { await changeWebsiteBilling("cancel", confirmed); revalidatePath("/dashboard/website"); }
async function reactivateWebsiteAddonImpl(confirmed: boolean) { await changeWebsiteBilling("reactivate", confirmed); revalidatePath("/dashboard/website"); }

async function safeAction<T>(operation: () => Promise<T>): Promise<T | { error: string }> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof WebsiteError) return { error: error.message };
    if (error instanceof z.ZodError) return { error: "Revisa los campos: " + error.issues.slice(0, 3).map(issue => issue.path.join(".")).join(", ") };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Ese subdominio o dominio ya está ocupado" };
    return { error: "No pudimos completar el cambio. Intenta nuevamente." };
  }
}
export async function uploadWebsiteImage(formData: FormData) { return safeAction(() => uploadWebsiteImageImpl(formData)); }
export async function saveWebsiteDraft(input: unknown, revision: number, subdomain: string) { return safeAction(() => saveWebsiteDraftImpl(input, revision, subdomain)); }
export async function publishWebsite(revision: number) { return safeAction(() => publishWebsiteImpl(revision)); }
export async function suspendWebsite() { return safeAction(() => suspendWebsiteImpl()); }
export async function connectWebsiteDomain(hostname: string) { return safeAction(() => connectWebsiteDomainImpl(hostname)); }
export async function checkWebsiteDomain(id: string) { return safeAction(() => checkWebsiteDomainImpl(id)); }
export async function requestWebsiteDomain(raw: string, notes: string) { return safeAction(() => requestWebsiteDomainImpl(raw, notes)); }
export async function setPrimaryWebsiteDomain(id: string) { return safeAction(() => setPrimaryWebsiteDomainImpl(id)); }
export async function activateWebsiteAddon() { return safeAction(() => activateWebsiteAddonImpl()); }
export async function regularizeWebsiteAddon() { return safeAction(() => regularizeWebsiteAddonImpl()); }
export async function cancelWebsiteAddon(confirmed: boolean) { return safeAction(() => cancelWebsiteAddonImpl(confirmed)); }
export async function reactivateWebsiteAddon(confirmed: boolean) { return safeAction(() => reactivateWebsiteAddonImpl(confirmed)); }

export async function removeWebsiteImage(id: string) { return safeAction(() => deleteWebsiteAsset(id)); }
export async function listWebsiteImages() {
  return safeAction(async () => {
    const { business } = await requireWebsiteManager();
    const site = await ensureWebsite(business.id, business.slug);
    const assets = await prisma.websiteMedia.findMany({ where: { websiteId: site.id, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 150 });
    const inUse = new Set([site.draftConfig, site.publishedConfig].flatMap(value => { const parsed = bellaConfigSchema.safeParse(value); return parsed.success ? mediaUrls(parsed.data) : []; }));
    return assets.map(asset => ({ ...websiteAssetSchema.parse({ id: asset.id, publicId: asset.publicId, secureUrl: asset.secureUrl, width: asset.width, height: asset.height, format: asset.format, bytes: asset.bytes }), inUse: inUse.has(asset.secureUrl) }));
  });
}
export async function refreshWebsiteDomainStatus(id: string) { return safeAction(async () => { await refreshWebsiteDomain(id); revalidatePath("/dashboard/website"); }); }
export async function disconnectWebsiteDomain(id: string) { return safeAction(async () => { await removeWebsiteDomain(id); revalidatePath("/dashboard/website"); }); }
export async function websiteSubdomainAvailability(value: string) {
  return safeAction(async () => {
    const { business } = await requireWebsiteManager();
    if (!validSubdomain(value)) return { available: false, message: "Usa letras, números y guiones; entre 3 y 63 caracteres." };
    const site = await prisma.businessWebsite.findUnique({ where: { subdomain: value }, select: { businessId: true } });
    return { available: !site || site.businessId === business.id, message: !site || site.businessId === business.id ? "Esta dirección está disponible" : "Esta dirección ya está ocupada" };
  });
}
