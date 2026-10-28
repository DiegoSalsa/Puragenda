"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Sparkles } from "@/components/icons/hover-icons";
import { COMMERCIAL_ANNUAL_POLICY, COMMERCIAL_MAX_PROFESSIONALS, type CommercialPlanCode } from "@/core/commercial-catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { commercialRegisterUrl } from "@/websites/commercial";
import { track } from "@/lib/analytics/client";
import { formatPublicClp, PUBLIC_PLUS_GROWTH_FEATURES, PUBLIC_TRIAL_NOTE, publicAnnualQuote, publicMonthlyQuote } from "@/lib/public-plans";

const professionalOptions = Array.from({ length: COMMERCIAL_MAX_PROFESSIONALS }, (_, index) => ({
  value: index + 1,
  label: `${index + 1} ${index === 0 ? "profesional" : "profesionales"}`,
}));
const annualFreeMonths = COMMERCIAL_ANNUAL_POLICY.monthsInYear - COMMERCIAL_ANNUAL_POLICY.paidMonths;

const plans: Array<{ code: CommercialPlanCode; description: string; features: string[]; accent: string }> = [
  {
    code: "PURAGENDA",
    description: "Todo lo que necesitas para organizar reservas, clientes y profesionales.",
    features: [
      "Reservas online, agenda y enlace para compartir",
      "Clientes, servicios y profesionales en un solo panel",
      "Puri para consultar agenda, cobros y disponibilidad",
      "Fidelización, gift cards y estadísticas operativas",
    ],
    accent: "bg-[#FFF5BA]",
  },
  {
    code: "PURAGENDA_PLUS",
    description: "Agenda, sitio web y herramientas inteligentes para organizar y hacer crecer tu negocio.",
    features: [
      "Todas las funciones de Puragenda",
      "Sitio web personalizable con reservas integradas",
      "Editor, hosting, SSL y subdominio incluidos",
      "Conexión de dominio propio (compra no incluida)",
      ...PUBLIC_PLUS_GROWTH_FEATURES.map((feature) => feature.label),
    ],
    accent: "bg-[#E9D8FF]",
  },
];

export interface PricingCardsProps {
  mode?: "landing" | "selection";
  websiteAcquisitionEnabled?: boolean;
}

export function PricingCards(_props: PricingCardsProps) {
  void _props;
  const router = useRouter();
  const [professionals, setProfessionals] = useState<Record<CommercialPlanCode, number>>({ PURAGENDA: 1, PURAGENDA_PLUS: 1 });
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  function beginTrial(plan: CommercialPlanCode) {
    const professionalTotal = professionals[plan];
    track("pricing_plan_selected", {
      plan,
      intent: "trial",
      extra_staff: professionalTotal - 1,
      billing_cycle: period,
      website_intent: plan === "PURAGENDA_PLUS",
    });
    // Preserve the existing trial flow. Showing an annual offer does not
    // create an annual checkout or alter a subscription contract.
    router.push(commercialRegisterUrl(plan, period, professionalTotal, false, true));
  }

  return (
    <div className="mx-auto max-w-5xl" data-testid="public-pricing-cards">
      <div className="mb-7 flex justify-center">
        <fieldset>
          <legend className="sr-only">Periodo de pago</legend>
          <div className="flex rounded-full border-2 border-black bg-white p-1 text-black shadow-[3px_3px_0_#000]">
            {([["monthly", "Mensual"], ["annual", "Anual"]] as const).map(([value, label]) => (
              <label key={value} className="relative cursor-pointer">
                <input type="radio" name="public-pricing-period" value={value} checked={period === value} onChange={() => setPeriod(value)} className="peer sr-only" />
                <span className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-black transition hover:bg-[#E9D8FF] peer-checked:bg-[#7C3AED] peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-[#7C3AED]/50 peer-focus-visible:ring-offset-2">{label}{value === "annual" && <span className="rounded-full bg-[#BFFCC6] px-2 py-1 text-[10px] font-black text-black">{annualFreeMonths} meses gratis</span>}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {plans.map((plan) => {
          const total = professionals[plan.code];
          const quote = period === "annual" ? publicAnnualQuote(plan.code, total) : publicMonthlyQuote(plan.code, total);
          const displayedMonthly = quote.billingCycle === "ANNUAL" ? quote.monthlyEquivalent : quote.monthlyTotal;
          return (
            <article key={plan.code} data-plan={plan.code} className={`flex h-full min-w-0 flex-col rounded-[2rem] border-4 border-black p-6 text-black shadow-[6px_6px_0_#000] sm:p-8 ${plan.accent}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6D28D9]">Plan</p>
                  <h2 id={`plan-name-${plan.code}`} className="mt-2 text-4xl font-black tracking-tight">{quote.displayName}</h2>
                </div>
                {plan.code === "PURAGENDA_PLUS" ? <Sparkles className="h-8 w-8 shrink-0 text-[#7C3AED]" aria-hidden="true" /> : null}
              </div>
              <p className="mt-4 text-base font-bold leading-7 lg:min-h-21">{plan.description}</p>
              <div className="mt-6 border-y-3 border-black py-5">
                <label id={`professionals-label-${plan.code}`} htmlFor={`professionals-${plan.code}`} className="mb-2 block text-sm font-black">Profesionales</label>
                <Select
                  items={professionalOptions}
                  value={total}
                  onValueChange={(value) => {
                    if (value !== null) setProfessionals((current) => ({ ...current, [plan.code]: value }));
                  }}
                >
                  <SelectTrigger id={`professionals-${plan.code}`} aria-labelledby={`professionals-label-${plan.code} plan-name-${plan.code}`} className="h-12 w-full rounded-xl border-2 border-black bg-white px-4 text-base font-black shadow-[3px_3px_0_#000] transition hover:bg-[#F3E8FF] focus-visible:border-black focus-visible:ring-4 focus-visible:ring-[#7C3AED]/50 data-[size=default]:h-12 dark:bg-white dark:hover:bg-[#F3E8FF] [&_svg]:text-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    align="start"
                    alignItemWithTrigger={false}
                    sideOffset={6}
                    className="max-h-[min(22rem,var(--available-height))] overflow-hidden rounded-xl border-3 border-black bg-white p-1 text-black shadow-[4px_4px_0_#000] [&_[data-slot=select-scroll-down-button]]:bg-white [&_[data-slot=select-scroll-up-button]]:bg-white"
                    listClassName="max-h-[min(18rem,calc(var(--available-height)-3.5rem))] overflow-y-auto overscroll-contain p-0.5 [scrollbar-width:thin]"
                  >
                    {professionalOptions.map(({ value, label }) => <SelectItem key={value} value={value} className="min-h-11 cursor-pointer rounded-lg px-3 font-bold data-highlighted:bg-[#E9D8FF] data-highlighted:text-black data-selected:bg-[#F3E8FF] focus:bg-[#E9D8FF] focus:text-black">{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div id={`price-${plan.code}`} className="mt-5" aria-live="polite" aria-atomic="true">
                  <p className="text-sm font-black">{quote.billingCycle === "ANNUAL" ? "Equivalente mensual con pago anual" : `Para ${total} ${total === 1 ? "profesional" : "profesionales"}`}</p>
                  <p className="mt-2 text-[clamp(2.5rem,8vw,3rem)] font-black leading-tight tracking-tight" data-testid="monthly-price">{!Number.isInteger(displayedMonthly) && <span className="text-base" aria-label="aproximadamente">≈ </span>}{formatPublicClp(Math.round(displayedMonthly))} <span className="text-base tracking-normal">CLP/mes</span></p>
                  <p className="mt-2 text-sm font-bold" data-testid="billed-total">IVA incluido · Se facturan {formatPublicClp(quote.cycleTotal)} {quote.billingCycle === "ANNUAL" ? "al año" : "cada mes"}.</p>
                  {quote.billingCycle === "ANNUAL" && <p className="mt-2 text-sm font-black text-[#6D28D9]">Ahorras {formatPublicClp(quote.savings)} al año · {quote.freeMonths} meses gratis.</p>}
                </div>
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-black/70">{quote.billingCycle === "ANNUAL" && "Referencia mensual sin descuento. "}Base: {formatPublicClp(quote.baseMonthly)} · Profesionales adicionales: {formatPublicClp(quote.professionalSurchargeMonthly)} CLP/mes.</p>
              <button type="button" onClick={() => beginTrial(plan.code)} aria-label={`Comenzar prueba de ${quote.displayName}`} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-4 border-black bg-[#FFB5E8] px-4 py-3 text-base font-black uppercase shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 active:translate-y-1 active:shadow-none">
                Comenzar prueba <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>
              <ul className="mt-7 space-y-3 border-t-2 border-black/30 pt-6 text-sm font-bold">
                {plan.features.map((feature) => <li key={feature} className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#6D28D9]" strokeWidth={3} aria-hidden="true" /><span>{feature}</span></li>)}
              </ul>
            </article>
          );
        })}
      </div>
      <p className="mx-auto mt-7 max-w-3xl text-center text-sm font-bold leading-6 text-black/70 dark:text-white/70">{PUBLIC_TRIAL_NOTE}</p>
    </div>
  );
}
