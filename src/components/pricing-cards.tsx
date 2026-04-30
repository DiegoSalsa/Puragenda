"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, Sparkles, Users } from "lucide-react";
import {
  PRICING,
  EXTRA_STAFF_COST,
  STAFF_LIMITS,
  TRIAL_DURATION_DAYS,
  ANNUAL_MULTIPLIER,
} from "@/core/constants";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

type PlanKey = "INDIVIDUAL" | "BASIC" | "PRO";
type BillingCycle = "monthly" | "annual";

interface PricingCardsProps {
  /** "landing" = buttons link to /register; "selection" = buttons trigger plan activation (ready for checkout) */
  mode?: "landing" | "selection";
}

// ═══════════════════════════════════════════
// PLAN DATA
// ═══════════════════════════════════════════

const plans: {
  key: PlanKey;
  name: string;
  description: string;
  highlighted: boolean;
  badge?: string;
  items: string[];
}[] = [
  {
    key: "INDIVIDUAL",
    name: "Individual",
    description: "Para emprendedores que trabajan solos.",
    highlighted: false,
    items: [
      "Citas ilimitadas",
      `${STAFF_LIMITS.INDIVIDUAL} profesional incluido`,
      "Widget embebible",
      "Detección de colisiones",
      "Soporte por email",
    ],
  },
  {
    key: "BASIC",
    name: "Base",
    description: "Para equipos que necesitan crecer con multi-staff.",
    highlighted: false,
    badge: `${TRIAL_DURATION_DAYS} días gratis`,
    items: [
      "Todo de Individual",
      `${STAFF_LIMITS.BASIC} profesionales incluidos`,
      "Horarios configurables",
      "Panel completo",
      "Marca blanca",
      "Soporte prioritario",
    ],
  },
  {
    key: "PRO",
    name: "Pro",
    description: "La solución completa para negocios profesionales.",
    highlighted: true,
    items: [
      "Todo de Base",
      `${STAFF_LIMITS.PRO} profesionales incluidos`,
      "CORS + API Key dedicada",
      "Calendario semanal pro",
      "Soporte dedicado",
    ],
  },
];

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function formatCLP(amount: number): string {
  return "$" + amount.toLocaleString("es-CL");
}

function getExtraCost(key: PlanKey): number {
  if (key === "BASIC") return EXTRA_STAFF_COST.BASIC;
  if (key === "PRO") return EXTRA_STAFF_COST.PRO;
  return 0;
}

function canAddExtras(key: PlanKey): boolean {
  return key === "BASIC" || key === "PRO";
}

/** Monthly price for display depending on billing cycle */
function getDisplayMonthlyPrice(monthlyBase: number, cycle: BillingCycle): number {
  if (cycle === "annual") {
    // Pay 10 months for 12 → monthly equivalent = (monthly × 10) / 12
    return Math.round((monthlyBase * ANNUAL_MULTIPLIER) / 12);
  }
  return monthlyBase;
}

/** Total annual price */
function getAnnualTotal(monthlyBase: number): number {
  return monthlyBase * ANNUAL_MULTIPLIER;
}

/** Savings percentage for annual vs monthly */
function getSavingsPercent(): number {
  return Math.round(((12 - ANNUAL_MULTIPLIER) / 12) * 100);
}

// ═══════════════════════════════════════════
// BILLING TOGGLE
// ═══════════════════════════════════════════

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <div className="flex items-center rounded-full border border-border bg-muted p-1">
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
            cycle === "monthly"
              ? "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => onChange("annual")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
            cycle === "annual"
              ? "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Anual
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            -{getSavingsPercent()}%
          </span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

export function PricingCards({ mode = "landing" }: PricingCardsProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [extras, setExtras] = useState<Record<PlanKey, number>>({
    INDIVIDUAL: 0,
    BASIC: 0,
    PRO: 0,
  });

  function handleExtraChange(key: PlanKey, delta: number) {
    setExtras((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(20, prev[key] + delta)),
    }));
  }

  function getTotalPrice(key: PlanKey): number {
    const monthlyBase = PRICING[key].monthly;
    const displayMonthly = getDisplayMonthlyPrice(monthlyBase, cycle);
    const extraCostPerUnit = getExtraCost(key);
    // Extra cost also follows billing cycle discount
    const displayExtraCost = cycle === "annual"
      ? Math.round((extraCostPerUnit * ANNUAL_MULTIPLIER) / 12)
      : extraCostPerUnit;
    return displayMonthly + displayExtraCost * extras[key];
  }

  function getBasePriceDisplay(key: PlanKey): number {
    return getDisplayMonthlyPrice(PRICING[key].monthly, cycle);
  }

  function handlePlanAction(key: PlanKey, isTrial: boolean) {
    const data = {
      plan: key,
      billingCycle: cycle,
      extraStaff: extras[key],
      totalMonthly: getTotalPrice(key),
      totalAnnual: cycle === "annual" ? getTotalPrice(key) * 12 : undefined,
      isTrial,
    };
    // Prepared for checkout integration — log for now
    console.log("[Puragenda] Plan selected:", data);
    alert(
      `Plan ${PRICING[key].name} seleccionado.\n` +
      `Ciclo: ${cycle === "monthly" ? "Mensual" : "Anual"}\n` +
      `Profesionales extra: ${extras[key]}\n` +
      `${cycle === "monthly" ? `Total: ${formatCLP(data.totalMonthly)}/mes` : `Total: ${formatCLP(data.totalMonthly)}/mes (${formatCLP(data.totalMonthly * 12)}/año)`}\n` +
      `${isTrial ? `Prueba gratis de ${TRIAL_DURATION_DAYS} días` : "Suscripción directa"}\n\n` +
      `(Checkout próximamente)`
    );
  }

  return (
    <div className="space-y-8">
      {/* Billing Cycle Toggle */}
      <BillingToggle cycle={cycle} onChange={setCycle} />

      {/* Plan Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const totalPrice = getTotalPrice(plan.key);
          const basePrice = getBasePriceDisplay(plan.key);
          const hasExtras = extras[plan.key] > 0;
          const monthlyFull = PRICING[plan.key].monthly;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-6 sm:p-8 transition-all duration-300 ${
                plan.highlighted
                  ? "border-[#7C3AED]/30 bg-gradient-to-b from-[#7C3AED]/5 to-transparent shadow-2xl shadow-[#7C3AED]/10"
                  : "border-border bg-card"
              }`}
            >
              {/* Badges */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-6 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-[#7C3AED]/25">
                  Más popular
                </div>
              )}
              {plan.badge && !plan.highlighted && (
                <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] px-3 py-1 text-xs font-semibold text-white">
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>

                {/* Price display */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold tracking-tight">
                      {formatCLP(totalPrice)}
                    </p>
                    <span className="text-sm font-normal text-muted-foreground">/mes</span>
                  </div>

                  {/* Annual info line */}
                  {cycle === "annual" && (
                    <div className="space-y-0.5 animate-fade-in">
                      <p className="text-xs text-muted-foreground line-through">
                        {formatCLP(monthlyFull + getExtraCost(plan.key) * extras[plan.key])}/mes
                      </p>
                      <p className="text-xs text-emerald-400 font-medium">
                        {formatCLP(getAnnualTotal(monthlyFull) + getExtraCost(plan.key) * extras[plan.key] * ANNUAL_MULTIPLIER)}/año · Ahorras {formatCLP((monthlyFull + getExtraCost(plan.key) * extras[plan.key]) * 2)}
                      </p>
                    </div>
                  )}

                  {hasExtras && (
                    <p className="text-xs text-[#A78BFA] animate-fade-in">
                      {formatCLP(basePrice)} base + {formatCLP(totalPrice - basePrice)} extras
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7C3AED]" />
                    {item}
                  </li>
                ))}
                {/* Show annual benefit inline */}
                {cycle === "annual" && (
                  <li className="flex items-start gap-2.5 text-sm text-emerald-400 animate-fade-in">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Paga 10 meses, obtén 12
                  </li>
                )}
              </ul>

              {/* Extra Staff Selector */}
              {canAddExtras(plan.key) && (
                <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#7C3AED]" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Profesionales extra
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExtraChange(plan.key, -1)}
                        disabled={extras[plan.key] === 0}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-all hover:border-[#7C3AED]/30 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Quitar profesional extra"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold tabular-nums">
                        {extras[plan.key]}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExtraChange(plan.key, 1)}
                        disabled={extras[plan.key] >= 20}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-all hover:border-[#7C3AED]/30 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Añadir profesional extra"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {extras[plan.key] > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground animate-fade-in">
                      +{formatCLP(
                        cycle === "annual"
                          ? Math.round((getExtraCost(plan.key) * ANNUAL_MULTIPLIER) / 12)
                          : getExtraCost(plan.key)
                      )}/mes por profesional ·{" "}
                      <span className="text-[#A78BFA] font-medium">
                        {formatCLP(totalPrice - basePrice)}/mes total extras
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 space-y-2.5">
                {plan.key === "BASIC" && (
                  <>
                    {/* Primary: Free Trial */}
                    {mode === "landing" ? (
                      <Link href="/register" className="block">
                        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35">
                          <Sparkles className="h-4 w-4" />
                          Iniciar Prueba Gratis de {TRIAL_DURATION_DAYS} Días
                        </button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handlePlanAction("BASIC", true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35"
                      >
                        <Sparkles className="h-4 w-4" />
                        Iniciar Prueba Gratis de {TRIAL_DURATION_DAYS} Días
                      </button>
                    )}
                    {/* Secondary: Subscribe */}
                    {mode === "landing" ? (
                      <Link href="/register" className="block">
                        <button className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground">
                          Suscribirse
                        </button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handlePlanAction("BASIC", false)}
                        className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground"
                      >
                        Suscribirse
                      </button>
                    )}
                  </>
                )}

                {plan.key === "INDIVIDUAL" && (
                  <>
                    {mode === "landing" ? (
                      <Link href="/register" className="block">
                        <button className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground">
                          Suscribirse
                        </button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handlePlanAction("INDIVIDUAL", false)}
                        className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground"
                      >
                        Suscribirse
                      </button>
                    )}
                  </>
                )}

                {plan.key === "PRO" && (
                  <>
                    {mode === "landing" ? (
                      <Link href="/register" className="block">
                        <button className="w-full rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35">
                          Suscribirse
                        </button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handlePlanAction("PRO", false)}
                        className="w-full rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35"
                      >
                        Suscribirse
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
