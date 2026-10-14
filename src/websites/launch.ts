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
export type WebsiteLaunchPreview = {
  businessName: string;
  templateName: string;
  coverImage: string;
  address: string | null;
  ready: boolean;
  servicesReady?: boolean;
  bookingReady?: boolean;
  published?: boolean;
};
export type WebsiteLaunchContext = {
  offer: WebsiteOffer | null;
  addon: WebsiteAccess | null;
  canManage: boolean;
  canActivateTrial?: boolean;
  preview?: WebsiteLaunchPreview;
};

export function websiteDiscoveryStory(preview?: WebsiteLaunchPreview) {
  const design = preview?.templateName.toLowerCase();
  const headline = design === "matchday" ? "Tu próximo corte empieza aquí."
    : design === "y2k" ? "Tus diseños merecen una web así."
    : design === "ritual" ? "La calma empieza antes de la primera sesión."
    : "Tu negocio merece una web así.";
  return {
    headline,
    description: preview?.ready
      ? "Tu estilo, tus servicios y tu agenda. Todo en un enlace que puedes estrenar hoy."
      : "Tu nombre, tus servicios y tu agenda, en una web que puedes hacer tuya. Personalízala y comparte el enlace con tus clientes.",
  };
}

export function websiteDiscoveryProgress(preview?: WebsiteLaunchPreview) {
  return [
    { label: preview?.ready ? "Tu diseño" : "Personaliza tu diseño", complete: !!preview?.ready },
    { label: preview?.servicesReady ? "Tus servicios" : "Agrega tus servicios", complete: !!preview?.servicesReady },
    { label: preview?.bookingReady ? "Agenda conectada" : "Configura tu agenda", complete: !!preview?.bookingReady },
  ];
}
