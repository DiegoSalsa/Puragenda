import { ANNUAL_MULTIPLIER, EXTRA_STAFF_COST, PRICING } from "@/core/constants";
import { WEBSITE_ONBOARDING_OPTION } from "./offers";

export type PublicPlan = "INDIVIDUAL" | "EQUIPO";
export type PublicCycle = "monthly" | "annual";
export const publicWebsiteMonthly = Number(WEBSITE_ONBOARDING_OPTION.amount);
export function commercialQuote(plan: PublicPlan, cycle: PublicCycle, extraStaff = 0, website = false) {
  const extras = plan === "EQUIPO" ? Math.max(0, Math.min(20, Math.floor(Number(extraStaff) || 0))) : 0;
  const baseMonthly = PRICING[plan].monthly + extras * EXTRA_STAFF_COST.EQUIPO;
  const baseCharge = cycle === "annual" ? baseMonthly * ANNUAL_MULTIPLIER : baseMonthly;
  return { baseMonthly, baseCharge, websiteMonthly: website ? publicWebsiteMonthly : 0,
    monthlyTotal: cycle === "monthly" ? baseMonthly + (website ? publicWebsiteMonthly : 0) : null, extras };
}
export function registrationIntent(params: Pick<URLSearchParams, "get">) {
  const plan: PublicPlan | null = params.get("plan") === "EQUIPO" ? "EQUIPO" : params.get("plan") === "INDIVIDUAL" ? "INDIVIDUAL" : null;
  const cycle: PublicCycle = params.get("cycle") === "annual" ? "annual" : "monthly";
  return { plan, cycle, website: params.get("website") === "1" && !!plan, trial: params.get("trial") === "1",
    extraStaff: plan === "EQUIPO" ? commercialQuote(plan, cycle, Number(params.get("extraStaff"))).extras : 0 };
}
export function commercialRegisterUrl(plan: PublicPlan, cycle: PublicCycle, extras: number, website: boolean, trial: boolean) {
  const params = new URLSearchParams({ plan, cycle });
  if (plan === "EQUIPO" && extras) params.set("extraStaff", String(extras));
  if (website) params.set("website", "1");
  if (trial) params.set("trial", "1");
  return `/register?${params}`;
}
export function hasPaidBase(subscription: { status: string; isTrial: boolean; currentPeriodEnd?: Date | string | null } | null, now = new Date()) {
  return !!subscription && subscription.status === "ACTIVE" && !subscription.isTrial &&
    !!subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() > now.getTime();
}
