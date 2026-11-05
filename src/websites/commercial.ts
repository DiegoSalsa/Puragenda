import { ANNUAL_MULTIPLIER, EXTRA_STAFF_COST, PRICING } from "@/core/constants";
import { COMMERCIAL_CATALOG_VERSION, COMMERCIAL_MAX_PROFESSIONALS, quoteCommercialContract } from "@/core/commercial-catalog";
import { WEBSITE_ONBOARDING_OPTION } from "./offers";

export type PublicPlan = "INDIVIDUAL" | "EQUIPO" | "PURAGENDA" | "PURAGENDA_PLUS";
export type PublicCycle = "monthly" | "annual";
export const publicWebsiteMonthly = Number(WEBSITE_ONBOARDING_OPTION.amount);
export function commercialQuote(plan: PublicPlan, cycle: PublicCycle, extraStaff = 0, website = false) {
  if (plan === "PURAGENDA" || plan === "PURAGENDA_PLUS") {
    const quote = quoteCommercialContract({
      catalogVersion: COMMERCIAL_CATALOG_VERSION,
      plan,
      professionalTotal: Math.max(1, Math.min(COMMERCIAL_MAX_PROFESSIONALS, Math.floor(Number(extraStaff) || 1))),
      billingCycle: cycle === "annual" ? "ANNUAL" : "MONTHLY",
    });
    return {
      baseMonthly: quote.baseMonthly,
      baseCharge: quote.cycleTotal,
      websiteMonthly: 0,
      monthlyTotal: quote.monthlyTotal,
      extras: Math.max(0, quote.professionalTotal - 1),
      professionalTotal: quote.professionalTotal,
      commercialPlan: plan,
    };
  }
  const extras = plan === "EQUIPO" ? Math.max(0, Math.min(20, Math.floor(Number(extraStaff) || 0))) : 0;
  const baseMonthly = PRICING[plan].monthly + extras * EXTRA_STAFF_COST.EQUIPO;
  const baseCharge = cycle === "annual" ? baseMonthly * ANNUAL_MULTIPLIER : baseMonthly;
  return { baseMonthly, baseCharge, websiteMonthly: website ? publicWebsiteMonthly : 0,
    monthlyTotal: cycle === "monthly" ? baseMonthly + (website ? publicWebsiteMonthly : 0) : null, extras, professionalTotal: 1 + extras };
}
export function registrationIntent(params: Pick<URLSearchParams, "get">) {
  const requestedCommercialPlan = params.get("commercialPlan");
  const commercialPlan = requestedCommercialPlan === "PURAGENDA" || requestedCommercialPlan === "PURAGENDA_PLUS"
    ? requestedCommercialPlan
    : params.get("plan") === "PURAGENDA" || params.get("plan") === "PURAGENDA_PLUS"
      ? params.get("plan") as "PURAGENDA" | "PURAGENDA_PLUS"
      : null;
  const plan: PublicPlan | null = commercialPlan
    ? commercialPlan
    : params.get("plan") === "EQUIPO" ? "EQUIPO" : params.get("plan") === "INDIVIDUAL" ? "INDIVIDUAL" : null;
  const cycle: PublicCycle = params.get("cycle") === "annual" ? "annual" : "monthly";
  const professionalTotal = commercialPlan
    ? Math.max(1, Math.min(COMMERCIAL_MAX_PROFESSIONALS, Math.floor(Number(params.get("professionalTotal")) || 1)))
    : 1;
  const extraStaff = plan === "EQUIPO" ? commercialQuote(plan, cycle, Number(params.get("extraStaff"))).extras : 0;
  if (!commercialPlan) return { plan, cycle, website: params.get("website") === "1" && !!plan, trial: params.get("trial") === "1", extraStaff };
  return { plan, commercialPlan, cycle, website: false, trial: params.get("trial") === "1", professionalTotal, extraStaff };
}
export function commercialRegisterUrl(plan: PublicPlan, cycle: PublicCycle, extras: number, website: boolean, trial: boolean) {
  const isCommercialPlan = plan === "PURAGENDA" || plan === "PURAGENDA_PLUS";
  const params = new URLSearchParams({
    plan,
    cycle,
    source: "public-pricing",
  });
  if (isCommercialPlan) {
    params.set("commercialPlan", plan);
    params.set("professionalTotal", String(Math.max(1, Math.min(COMMERCIAL_MAX_PROFESSIONALS, Math.floor(Number(extras) || 1)))));
  }
  if (plan === "EQUIPO" && extras) params.set("extraStaff", String(extras));
  if (website && !isCommercialPlan) params.set("website", "1");
  if (trial) params.set("trial", "1");
  return `/register?${params}`;
}
export function hasPaidBase(subscription: { status: string; isTrial: boolean; currentPeriodEnd?: Date | string | null } | null, now = new Date()) {
  return !!subscription && subscription.status === "ACTIVE" && !subscription.isTrial &&
    !!subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() > now.getTime();
}
