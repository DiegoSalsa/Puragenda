import type { OperationalSubscription } from "@/core/subscription-access";

export type WebsitePriceTier = "BETA_FOUNDER" | "STANDARD";
// Commercial amounts live here only. Provider prices must match this catalog.
export const WEBSITE_CATALOG = {
  BETA_FOUNDER: { amount: "5990", currency: "CLP", interval: "month" },
  STANDARD: { amount: "9990", currency: "CLP", interval: "month" },
} as const;
export const WEBSITE_TRIAL_MS = 15 * 24 * 60 * 60 * 1000;
export type WebsiteOffer = {
  offerCode: string;
  eligibleAt?: Date | string;
  trialStartedAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
  trialConsumedAt?: Date | string | null;
};
export function websitePriceTier(offer: WebsiteOffer | null | undefined): WebsitePriceTier {
  return offer?.offerCode === "BETA_FOUNDER" ? "BETA_FOUNDER" : "STANDARD";
}
export function hasWebsiteTrial(offer: WebsiteOffer | null | undefined, now = new Date()) {
  if (websitePriceTier(offer) !== "BETA_FOUNDER" || !offer?.trialConsumedAt || !offer.trialStartedAt || !offer.trialEndsAt) return false;
  const start = new Date(offer.trialStartedAt).getTime();
  const end = new Date(offer.trialEndsAt).getTime();
  return Number.isFinite(start) && end - start === WEBSITE_TRIAL_MS && start <= now.getTime() && now.getTime() < end;
}
export function websiteTrialState(offer: WebsiteOffer | null | undefined, now = new Date()) {
  if (websitePriceTier(offer) !== "BETA_FOUNDER") return "UNAVAILABLE";
  if (!offer?.trialConsumedAt) return "AVAILABLE";
  return hasWebsiteTrial(offer, now) ? "TRIALING" : "EXPIRED";
}
export function websiteTrialDaysRemaining(offer: WebsiteOffer | null | undefined, now = new Date()) {
  return hasWebsiteTrial(offer, now) ? Math.ceil((new Date(offer!.trialEndsAt!).getTime() - now.getTime()) / 86400000) : 0;
}
export function formatWebsitePrice(tier: WebsitePriceTier) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: WEBSITE_CATALOG[tier].currency, maximumFractionDigits: 0 }).format(Number(WEBSITE_CATALOG[tier].amount));
}
// Future onboarding opts in explicitly; a new business always starts STANDARD.
export const WEBSITE_ONBOARDING_OPTION = {
  code: "website", selectedByDefault: false, priceTier: "STANDARD",
  ...WEBSITE_CATALOG.STANDARD,
  benefits: ["Sitio profesional", "Templates y constructor", "Hosting y SSL", "Subdominio", "Reservas integradas", "Dominio propio compatible"],
  domainPurchaseIncluded: false,
} as const;

export type FounderSubscription = OperationalSubscription & { currentPeriodEnd?: Date | string | null; createdAt?: Date | string };
// ACTIVE includes cancellations scheduled at period end (the base model keeps
// ACTIVE until the provider's terminal event). Grace-only debt is not a paid period.
export function isWebsiteFounderCandidate(business: { deletedAt?: Date | string | null; createdAt: Date | string; subscription: FounderSubscription | null }, launchAt: Date) {
  const sub = business.subscription;
  return !business.deletedAt && new Date(business.createdAt).getTime() <= launchAt.getTime()
    && !!sub && sub.isTrial === false && sub.status === "ACTIVE"
    && (!sub.createdAt || new Date(sub.createdAt).getTime() <= launchAt.getTime())
    && !!sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() > launchAt.getTime();
}
