import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { WebsiteError } from "./errors";
import { hasPaidBase } from "@/websites/commercial";
import { publicWebsiteAcquisitionEnabled } from "@/server/websites/public-acquisition";
import { hasWebsitePaidAccess } from "@/websites/policy";

export async function rememberWebsiteIntent(business: { id: string; ownerId: string | null; countryCode: string }, userId: string) {
  if (business.ownerId !== userId) throw new WebsiteError("Solo el propietario puede contratar el sitio.");
  if (business.countryCode !== "CL") throw new WebsiteError("Esta oferta pública está disponible para negocios en Chile.");
  return prisma.websitePurchaseIntent.upsert({ where: { businessId: business.id }, create: { businessId: business.id }, update: {} });
}

// Claim is durable before contacting MP. An ambiguous remote result never causes
// a second agreement on retry. Website uses its own existing operation ledger.
export async function claimBundleBaseCheckout(businessId: string, provider: { get: (input: { id: string }) => Promise<{ status?: string; init_point?: string }> }) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${businessId} FOR UPDATE`;
    const intent = await tx.websitePurchaseIntent.findUnique({ where: { businessId } });
    if (!intent) return null;
    const base = await tx.subscription.findUnique({ where: { businessId } });
    if (hasPaidBase(base)) throw new WebsiteError("Puragenda ya está activo. Continúa con Sitio Web.");
    if (base?.status === "PAST_DUE") throw new WebsiteError("Regulariza Puragenda antes de continuar con Sitio Web.");
    if (intent.baseState === "CREATING" || intent.baseState === "UNKNOWN") throw new WebsiteError("Estamos confirmando el checkout Puragenda. No se creará otro cobro; vuelve a comprobar su estado.");
    const providerId = intent.baseProviderId ?? base?.mpSubscriptionId;
    if (providerId) {
      const remote = await provider.get({ id: providerId });
      if (remote.status !== "cancelled") {
        const url = remote.init_point ?? intent.baseCheckoutUrl;
        if (!url) throw new WebsiteError("Estamos confirmando tu suscripción Puragenda.");
        return { reused: true as const, url, key: intent.baseOperationKey };
      }
    }
    const key = randomUUID();
    await tx.websitePurchaseIntent.update({ where: { businessId }, data: { baseOperationKey: key, baseState: "CREATING", baseCheckoutUrl: null, baseProviderId: null } });
    return { reused: false as const, key };
  }, { timeout: 15000 });
}
export async function finishBundleBaseCheckout(businessId: string, key: string, id: string, url: string) {
  await prisma.websitePurchaseIntent.updateMany({ where: { businessId, baseOperationKey: key, baseState: "CREATING" }, data: { baseState: "PENDING", baseProviderId: id, baseCheckoutUrl: url } });
}
export async function markBundleBaseUnknown(businessId: string, key: string) {
  await prisma.websitePurchaseIntent.updateMany({ where: { businessId, baseOperationKey: key, baseState: "CREATING" }, data: { baseState: "UNKNOWN" } });
}
export async function requireBundlePaidBase(businessId: string, db: Pick<typeof prisma, "websitePurchaseIntent" | "subscription" | "websiteAddon" | "websiteOfferEligibility"> = prisma) {
  const intent = await db.websitePurchaseIntent.findUnique({ where: { businessId } });
  if (!intent) return;
  const [base, addon, offer] = await Promise.all([
    db.subscription.findUnique({ where: { businessId } }),
    db.websiteAddon.findUnique({ where: { businessId } }),
    db.websiteOfferEligibility.findUnique({ where: { businessId } }),
  ]);
  // Existing paid add-ons and Founder terms retain their established lifecycle.
  if (offer?.offerCode === "BETA_FOUNDER" || hasWebsitePaidAccess(addon)) return;
  if (!publicWebsiteAcquisitionEnabled()) throw new WebsiteError("La contratación pública del sitio todavía no está habilitada.");
  if (!hasPaidBase(base)) throw new WebsiteError("Confirma el pago de Puragenda antes de contratar Sitio Web.");
}
