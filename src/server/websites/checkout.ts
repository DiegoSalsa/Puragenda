import { prisma } from "@/server/db/prisma";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { requireWebsiteManager } from "./service";
import * as paddle from "./billing";
import * as mp from "./mercadopago-billing";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { WebsiteError } from "./errors";
import { resolveWebsiteCommercialAccess } from "./commercial-access";
export async function startWebsiteCheckout() {
  mp.requireWebsiteAcquisition();
  const { business } = await requireWebsiteManager(true);
  const access = await resolveWebsiteCommercialAccess(business.id);
  if ((await getCommercialPlanAccess(business.id)).v2 || !access.editor) throw new WebsiteError("El sitio web forma parte de Puragenda+. No requiere una contratación independiente.");
  return business.countryCode === "CL" ? mp.startMercadoPagoWebsiteCheckout() : paddle.startWebsiteCheckout();
}
export async function startWebsiteTrial() {
  mp.requireWebsiteAcquisition();
  const { business } = await requireWebsiteManager(true);
  const access = await resolveWebsiteCommercialAccess(business.id);
  if ((await getCommercialPlanAccess(business.id)).v2 || !access.editor) throw new WebsiteError("El sitio web forma parte de Puragenda+. No requiere una contratación independiente.");
  if (!hasOperationalSubscriptionAccess(await prisma.subscription.findUnique({ where: { businessId: business.id } }))) throw new WebsiteError("Regulariza tu plan Puragenda antes de activar Sitio Web.");
  return paddle.startWebsiteTrial();
}
export async function changeWebsiteBilling(operation: "cancel" | "reactivate", confirmed: boolean) {
  if (operation === "reactivate") mp.requireWebsiteAcquisition();
  const { business } = await requireWebsiteManager(true);
  if (operation === "reactivate" && ((await getCommercialPlanAccess(business.id)).v2 || !(await resolveWebsiteCommercialAccess(business.id)).editor)) throw new WebsiteError("El sitio web forma parte de Puragenda+. No requiere una contratación independiente.");
  const addon = await prisma.websiteAddon.findUnique({ where: { businessId: business.id } });
  return addon?.provider === "mercadopago" ? mp.changeMercadoPagoWebsiteBilling(operation, confirmed) : paddle.changeWebsiteBilling(operation, confirmed);
}
export async function recoverWebsitePayment() {
  const { business } = await requireWebsiteManager(true);
  if ((await getCommercialPlanAccess(business.id)).v2) {
    if ((await resolveWebsiteCommercialAccess(business.id)).legacyBillingReviewRequired) throw new WebsiteError("La regularización del contrato histórico requiere revisión controlada. No creamos otro acuerdo ni cancelamos el vigente.");
    throw new WebsiteError("El sitio web forma parte de Puragenda+. No requiere una contratación independiente.");
  }
  if (!(await resolveWebsiteCommercialAccess(business.id)).editor) throw new WebsiteError("El sitio web forma parte de Puragenda+. No requiere una contratación independiente.");
  const addon = await prisma.websiteAddon.findUnique({ where: { businessId: business.id } });
  return addon?.provider === "mercadopago" || business.countryCode === "CL" ? mp.recoverMercadoPagoWebsitePayment() : paddle.recoverWebsitePayment();
}
