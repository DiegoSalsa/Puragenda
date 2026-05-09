"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Minus, Plus, Sparkles, Users, Crown, Zap } from "lucide-react";
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

type PlanKey = "INDIVIDUAL" | "EQUIPO" | "TEST";
type BillingCycle = "monthly" | "annual";

interface PricingCardsProps {
  mode?: "landing" | "selection";
}

// ═══════════════════════════════════════════
// ALL FEATURES — AVAILABLE ON BOTH PLANS
// ═══════════════════════════════════════════

const plans: {
  key: PlanKey;
  name: string;
  description: string;
  highlighted: boolean;
  badge?: string;
  icon: typeof Zap;
  staffLabel: string;
  items: string[];
}[] = [
  {
    key: "INDIVIDUAL",
    name: "Individual",
    description: "Para profesionales independientes que trabajan solos.",
    highlighted: false,
    badge: `${TRIAL_DURATION_DAYS} días gratis`,
    icon: Zap,
    staffLabel: `${STAFF_LIMITS.INDIVIDUAL} profesional incluido`,
    items: [
      "Reservas ilimitadas",
      "Widget para tu web y redes",
      "Fidelización con timbres",
      "CRM y anti-inasistencias",
      "Recordatorios y Win-Back",
      "Programa de Referidos",
    ],
  },
  {
    key: "EQUIPO",
    name: "Equipo",
    description: "Para salones, clínicas y locales con equipo de trabajo.",
    highlighted: true,
    badge: `${TRIAL_DURATION_DAYS} días gratis`,
    icon: Crown,
    staffLabel: `${STAFF_LIMITS.EQUIPO} profesionales incluidos`,
    items: [
      "Todo de Individual",
      `${STAFF_LIMITS.EQUIPO} profesionales incluidos`,
      "Roles: Recepcionista y Staff",
      "Doble capacidad de Marketing",
      "Profesionales extra a $3.000/mes",
    ],
  },
];

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function formatCLP(amount: number): string {
  return "$" + amount.toLocaleString("es-CL");
}

function getDisplayMonthlyPrice(monthlyBase: number, cycle: BillingCycle): number {
  if (cycle === "annual") {
    return Math.round((monthlyBase * ANNUAL_MULTIPLIER) / 12);
  }
  return monthlyBase;
}

function getAnnualTotal(monthlyBase: number): number {
  return monthlyBase * ANNUAL_MULTIPLIER;
}

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
      <div className="flex items-center rounded-2xl border-4 border-black dark:border-white bg-[#FFB5E8] dark:bg-black p-1 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={`rounded-xl px-6 py-3 text-sm font-black uppercase tracking-wider transition-all duration-200 ${
            cycle === "monthly"
              ? "bg-black text-white dark:bg-white dark:text-black border-2 border-transparent"
              : "text-black dark:text-white border-2 border-transparent hover:border-black dark:hover:border-white"
          }`}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => onChange("annual")}
          className={`flex items-center gap-3 rounded-xl px-6 py-3 text-sm font-black uppercase tracking-wider transition-all duration-200 ${
            cycle === "annual"
              ? "bg-black text-white dark:bg-white dark:text-black border-2 border-transparent"
              : "text-black dark:text-white border-2 border-transparent hover:border-black dark:hover:border-white"
          }`}
        >
          Anual
          <span className={`rounded-md border-2 border-black dark:border-white px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#FFF] ${cycle === 'annual' ? 'bg-[#BFFCC6] text-black dark:bg-[#BFFCC6]' : 'bg-[#BFFCC6] text-black'}`}>
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
    EQUIPO: 0,
    TEST: 0,
  });
  const [isLoggedIn, setIsLoggedIn] = useState(mode === "selection");

  // Detect if user is logged in (for landing mode where we don't know server-side)
  useEffect(() => {
    if (mode === "selection") return; // already known
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => { if (res.ok) setIsLoggedIn(true); })
      .catch(() => {});
  }, [mode]);

  function handleExtraChange(key: PlanKey, delta: number) {
    setExtras((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(20, prev[key] + delta)),
    }));
  }

  function getTotalPrice(key: PlanKey): number {
    const monthlyBase = PRICING[key].monthly;
    const displayMonthly = getDisplayMonthlyPrice(monthlyBase, cycle);
    if (key === "EQUIPO" && extras.EQUIPO > 0) {
      const extraCostPerUnit = EXTRA_STAFF_COST.EQUIPO;
      const displayExtraCost = cycle === "annual"
        ? Math.round((extraCostPerUnit * ANNUAL_MULTIPLIER) / 12)
        : extraCostPerUnit;
      return displayMonthly + displayExtraCost * extras.EQUIPO;
    }
    return displayMonthly;
  }

  function getBasePriceDisplay(key: PlanKey): number {
    return getDisplayMonthlyPrice(PRICING[key].monthly, cycle);
  }

  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePlanAction(key: PlanKey, isTrial: boolean) {
    if (isLoggedIn) {
      window.location.href = "/dashboard";
      return;
    }

    // If user is NOT logged in, redirect to register with plan info
    if (isTrial) {
      window.location.href = `/register?plan=${key}&trial=1`;
    } else {
      window.location.href = `/register?plan=${key}`;
    }
  }

  return (
    <div className="space-y-8">
      {/* Billing Cycle Toggle */}
      <BillingToggle cycle={cycle} onChange={setCycle} />



      {/* Plan Cards — 2 columns */}
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
        {plans.map((plan) => {
          const totalPrice = getTotalPrice(plan.key);
          const basePrice = getBasePriceDisplay(plan.key);
          const hasExtras = plan.key === "EQUIPO" && extras.EQUIPO > 0;
          const monthlyFull = PRICING[plan.key].monthly;
          const PlanIcon = plan.icon;

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col h-full rounded-[32px] border-4 border-black dark:border-white p-6 sm:p-10 transition-transform duration-300 ${
                plan.highlighted
                  ? "bg-[#B28DFF] dark:bg-[#111111] shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#B28DFF] -translate-y-2"
                  : "bg-white dark:bg-[#000000] shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFF] hover:-translate-y-1 hover:shadow-[10px_10px_0_#000] dark:hover:shadow-[10px_10px_0_#FFF]"
              }`}
            >
              {/* Badges */}
              {plan.highlighted && (
                <div className="absolute -top-6 left-0 right-0 mx-auto w-fit rounded-full border-4 border-black dark:border-white bg-[#85E3FF] dark:bg-[#7C3AED] px-6 py-2 text-sm font-black uppercase tracking-widest text-black dark:text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF]">
                  Más popular
                </div>
              )}
              {plan.badge && (
                <div className={`absolute rounded-full border-4 border-black dark:border-white bg-[#FFB5E8] px-4 py-1.5 text-xs font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] ${plan.highlighted ? "-top-5 right-4 lg:-right-4" : "-top-5 left-4 lg:-left-4"}`}>
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-4 border-black dark:border-white ${plan.highlighted ? "bg-[#FFF5BA] dark:bg-black" : "bg-[#85E3FF] dark:bg-black"} shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF]`}>
                    <PlanIcon className="h-7 w-7 text-black dark:text-white" />
                  </div>
                  <p className="text-4xl font-black uppercase">{plan.name}</p>
                </div>
                <p className="text-base font-bold opacity-80">{plan.description}</p>

                {/* Staff count */}
                <div className="flex items-center gap-3 rounded-xl border-4 border-black dark:border-white bg-[#BFFCC6] dark:bg-black px-4 py-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF]">
                  <Users className="h-6 w-6 text-black dark:text-[#BFFCC6]" />
                  <span className="text-sm font-black uppercase tracking-wide text-black dark:text-[#BFFCC6]">{plan.staffLabel}</span>
                </div>

                {/* Price display */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-6xl font-black tracking-tighter">
                      {formatCLP(totalPrice)}
                    </p>
                    <span className="text-xl font-bold opacity-70">/mes</span>
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest pb-1 opacity-70">
                    IVA incluido
                  </p>

                  {cycle === "annual" && (
                    <div className="space-y-2 animate-fade-in mt-4 border-t-4 border-black dark:border-white pt-4">
                      <p className="text-sm font-bold line-through opacity-60">
                        {formatCLP(monthlyFull + (plan.key === "EQUIPO" ? EXTRA_STAFF_COST.EQUIPO * extras.EQUIPO : 0))}/mes
                      </p>
                      <p className="text-sm font-black bg-[#BFFCC6] dark:bg-black text-black dark:text-white border-2 border-black dark:border-white rounded-lg px-3 py-1.5 inline-block shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#FFF]">
                        {formatCLP(getAnnualTotal(monthlyFull) + (plan.key === "EQUIPO" ? EXTRA_STAFF_COST.EQUIPO * extras.EQUIPO * ANNUAL_MULTIPLIER : 0))}/año · Ahorras {formatCLP((monthlyFull + (plan.key === "EQUIPO" ? EXTRA_STAFF_COST.EQUIPO * extras.EQUIPO : 0)) * 2)}
                      </p>
                    </div>
                  )}

                  {hasExtras && (
                    <p className="text-sm font-black uppercase mt-2 opacity-80 animate-fade-in">
                      {formatCLP(basePrice)} base + {formatCLP(totalPrice - basePrice)} extras
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="mt-10 space-y-4">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-4 text-base font-bold">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black dark:border-white bg-[#FFF5BA] dark:bg-[#7C3AED]">
                      <Check className="h-4 w-4 text-black dark:text-white" strokeWidth={4} />
                    </div>
                    {item}
                  </li>
                ))}
                {cycle === "annual" && (
                  <li className="flex items-center gap-4 text-base font-black text-black dark:text-[#BFFCC6] animate-fade-in">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black dark:border-white bg-[#FFB5E8] dark:bg-transparent">
                      <Sparkles className="h-4 w-4 text-black dark:text-[#BFFCC6]" />
                    </div>
                    Paga 10 meses, obtén 12
                  </li>
                )}
              </ul>

              {/* Extra Staff Selector — Equipo only */}
              {plan.key === "EQUIPO" && (
                <div className="mt-8 rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black p-5 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFF]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 dark:text-white" />
                      <span className="text-base font-black uppercase dark:text-white">
                        Staff Extra
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleExtraChange("EQUIPO", -1)}
                        disabled={extras.EQUIPO === 0}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-4 border-black dark:border-white bg-[#FFB5E8] dark:bg-black text-black dark:text-white transition-all shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] disabled:opacity-50 disabled:translate-y-1 disabled:shadow-[0px_0px_0_#000] active:translate-y-1 active:shadow-[0px_0px_0_#000]"
                        aria-label="Quitar profesional extra"
                      >
                        <Minus className="h-5 w-5" strokeWidth={4} />
                      </button>
                      <span className="w-8 text-center text-xl font-black tabular-nums dark:text-white">
                        {extras.EQUIPO}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExtraChange("EQUIPO", 1)}
                        disabled={extras.EQUIPO >= 20}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-4 border-black dark:border-white bg-[#85E3FF] dark:bg-black text-black dark:text-white transition-all shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] disabled:opacity-50 disabled:translate-y-1 disabled:shadow-[0px_0px_0_#000] active:translate-y-1 active:shadow-[0px_0px_0_#000]"
                        aria-label="Añadir profesional extra"
                      >
                        <Plus className="h-5 w-5" strokeWidth={4} />
                      </button>
                    </div>
                  </div>
                  {extras.EQUIPO > 0 && (
                    <p className="mt-4 text-sm font-bold opacity-80 animate-fade-in">
                      +{formatCLP(
                        cycle === "annual"
                          ? Math.round((EXTRA_STAFF_COST.EQUIPO * ANNUAL_MULTIPLIER) / 12)
                          : EXTRA_STAFF_COST.EQUIPO
                      )}/mes por profesional ·{" "}
                      <span className="font-black uppercase">
                        {formatCLP(totalPrice - basePrice)} total extras
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-10 space-y-4">
                {plan.key === "EQUIPO" && (
                  <>
                    <button
                      onClick={() => handlePlanAction("EQUIPO", false)}
                      disabled={loading === "EQUIPO"}
                      className="w-full rounded-2xl border-4 border-black dark:border-white bg-[#BFFCC6] dark:bg-[#7C3AED] py-5 text-xl font-black uppercase tracking-wider text-black dark:text-white shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFF] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-[0px_0px_0_#000] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading === "EQUIPO" ? (
                        <span className="flex items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin" /> ...</span>
                      ) : (
                        "Suscribirse"
                      )}
                    </button>
                    <button
                      onClick={() => handlePlanAction("EQUIPO", true)}
                      disabled={loading === "EQUIPO"}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black py-4 text-base font-black uppercase text-black dark:text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-[0px_0px_0_#000] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading === "EQUIPO" ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> ...</>
                      ) : (
                        <><Sparkles className="h-5 w-5" strokeWidth={3} /> {TRIAL_DURATION_DAYS} Días Gratis</>
                      )}
                    </button>
                  </>
                )}

                {plan.key === "INDIVIDUAL" && (
                  <>
                    <button
                      onClick={() => handlePlanAction("INDIVIDUAL", false)}
                      disabled={loading === "INDIVIDUAL"}
                      className="w-full rounded-2xl border-4 border-black dark:border-white bg-[#FFB5E8] dark:bg-[#7C3AED] py-5 text-xl font-black uppercase tracking-wider text-black dark:text-white shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFF] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-[0px_0px_0_#000] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading === "INDIVIDUAL" ? (
                        <span className="flex items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin" /> ...</span>
                      ) : (
                        "Suscribirse"
                      )}
                    </button>
                    <button
                      onClick={() => handlePlanAction("INDIVIDUAL", true)}
                      disabled={loading === "INDIVIDUAL"}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black py-4 text-base font-black uppercase text-black dark:text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-[0px_0px_0_#000] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading === "INDIVIDUAL" ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> ...</>
                      ) : (
                        <><Sparkles className="h-5 w-5" strokeWidth={3} /> {TRIAL_DURATION_DAYS} Días Gratis</>
                      )}
                    </button>
                  </>
                )}

                {plan.key === "TEST" && (
                  <button
                    onClick={() => handlePlanAction("TEST", false)}
                    disabled={loading === "TEST"}
                    className="w-full rounded-2xl border-4 border-black dark:border-white bg-gray-200 dark:bg-gray-800 py-4 text-lg font-black uppercase text-black dark:text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-[0px_0px_0_#000] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading === "TEST" ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> ...</span>
                    ) : (
                      "Probar Pago Real"
                    )}
                  </button>
                )}

                {/* Error message */}
                {error && (
                  <p className="rounded-xl border-4 border-black bg-[#FFB5E8] px-4 py-3 text-center text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] animate-fade-in">
                    {error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
