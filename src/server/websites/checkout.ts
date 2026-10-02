import { prisma } from "@/server/db/prisma";
import { requireWebsiteManager } from "./service";
import * as paddle from "./billing";
import * as mp from "./mercadopago-billing";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { WebsiteError } from "./errors";
export async function startWebsiteCheckout() {
  mp.requireWebsiteAcquisition();
  const { business } = await requireWebsiteManager(true);
  return business.countryCode === "CL" ? mp.startMercadoPagoWebsiteCheckout() : paddle.startWebsiteCheckout();
}
export async function startWebsiteTrial() {
  mp.requireWebsiteAcquisition();
  const { business } = await requireWebsiteManager(true);
  if (!hasOperationalSubscriptionAccess(await prisma.subscription.findUnique({ where: { businessId: business.id } }))) throw new WebsiteError("Regulariza tu plan Puragenda antes de activar Sitio Web.");
  return paddle.startWebsiteTrial();
}
export async function changeWebsiteBilling(operation: "cancel" | "reactivate", confirmed: boolean) {
  if (operation === "reactivate") mp.requireWebsiteAcquisition();
  const { business } = await requireWebsiteManager(true);
  const addon = await prisma.websiteAddon.findUnique({ where: { businessId: business.id } });
  return addon?.provider === "mercadopago" ? mp.changeMercadoPagoWebsiteBilling(operation, confirmed) : paddle.changeWebsiteBilling(operation, confirmed);
}
export async function recoverWebsitePayment() {
  const { business } = await requireWebsiteManager(true);
  const addon = await prisma.websiteAddon.findUnique({ where: { businessId: business.id } });
  return addon?.provider === "mercadopago" || business.countryCode === "CL" ? mp.recoverMercadoPagoWebsitePayment() : paddle.recoverWebsitePayment();
}
