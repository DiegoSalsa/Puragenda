import { websiteTrialState, websitePriceTier, type WebsiteOffer } from "./offers";
import { hasWebsitePaidAccess, type WebsiteAccess } from "./policy";
export function websiteLaunchMessage(offer?: WebsiteOffer | null, addon?: WebsiteAccess | null, now = new Date()) {
  const founder = websitePriceTier(offer) === "BETA_FOUNDER";
  const trial = websiteTrialState(offer, now);
  const paid = hasWebsitePaidAccess(addon, now);
  return { founder, trial, paid, showFounderOffer: founder && trial === "AVAILABLE" && !paid,
    cta: paid || trial === "TRIALING" ? "Editar mi web" : trial === "AVAILABLE" ? "PROBAR MI WEB GRATIS" : founder ? "Activar por $5.990" : "Crear mi sitio web",
    price: founder ? "$5.990 / mes para siempre" : "$9.990 / mes" };
}
export type WebsiteLaunchContext = { offer: WebsiteOffer | null; addon: WebsiteAccess | null; canManage: boolean };
