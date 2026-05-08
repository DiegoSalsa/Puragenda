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
  {
    key: "TEST",
    name: "Test",
    description: "Plan de prueba para pagos ($1.000).",
    highlighted: false,
    badge: "Solo pruebas",
    icon: Zap,
    staffLabel: `1 profesional incluido`,
    items: [
      "Plan de pruebas",
      "Pago real de $1.000",
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
    if (key === "EQUIPO" && isTrial) {
      window.location.href = "/register?plan=EQUIPO&trial=1";
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
              className={`relative rounded-3xl p-[1px] transition-all duration-500 flex flex-col h-full ${
                plan.highlighted
                  ? "shadow-2xl shadow-[#7C3AED]/30 hover:shadow-[#7C3AED]/50 z-10 ring-2 ring-[#7C3AED]"
                  : "bg-border/40 hover:bg-border/80 shadow-lg hover:shadow-xl dark:shadow-none"
              }`}
            >
              <div className={`relative flex h-full flex-col rounded-[23px] bg-card p-6 sm:p-8 ${plan.highlighted ? "bg-card/95 backdrop-blur-2xl" : "bg-card/70 backdrop-blur-xl"}`}>
                {/* Badges */}
                {plan.highlighted && (
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-[#7C3AED]/30 border border-white/20">
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
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.highlighted ? "bg-[#7C3AED]/20" : "bg-muted"}`}>
                      <PlanIcon className={`h-5 w-5 ${plan.highlighted ? "text-[#A78BFA]" : "text-muted-foreground"}`} />
                    </div>
                    <p className="text-2xl font-bold">{plan.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>

                  {/* Staff count */}
                  <div className="flex items-center gap-2 rounded-xl border border-[#7C3AED]/15 bg-[#7C3AED]/5 px-3 py-2">
                    <Users className="h-4 w-4 text-[#A78BFA]" />
                    <span className="text-sm font-medium text-[#A78BFA]">{plan.staffLabel}</span>
                  </div>

                  {/* Price display */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold tracking-tight">
                        {formatCLP(totalPrice)}
                      </p>
                      <span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold pb-1">
                      IVA incluido
                    </p>

                    {cycle === "annual" && (
                      <div className="space-y-0.5 animate-fade-in">
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCLP(monthlyFull + (plan.key === "EQUIPO" ? EXTRA_STAFF_COST.EQUIPO * extras.EQUIPO : 0))}/mes
                        </p>
                        <p className="text-xs text-emerald-400 font-medium">
                          {formatCLP(getAnnualTotal(monthlyFull) + (plan.key === "EQUIPO" ? EXTRA_STAFF_COST.EQUIPO * extras.EQUIPO * ANNUAL_MULTIPLIER : 0))}/año · Ahorras {formatCLP((monthlyFull + (plan.key === "EQUIPO" ? EXTRA_STAFF_COST.EQUIPO * extras.EQUIPO : 0)) * 2)}
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
                  {cycle === "annual" && (
                    <li className="flex items-start gap-2.5 text-sm text-emerald-400 animate-fade-in">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      Paga 10 meses, obtén 12
                    </li>
                  )}
                </ul>

                {/* Extra Staff Selector — Equipo only */}
                {plan.key === "EQUIPO" && (
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
                          onClick={() => handleExtraChange("EQUIPO", -1)}
                          disabled={extras.EQUIPO === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-all hover:border-[#7C3AED]/30 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Quitar profesional extra"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">
                          {extras.EQUIPO}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExtraChange("EQUIPO", 1)}
                          disabled={extras.EQUIPO >= 20}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-all hover:border-[#7C3AED]/30 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Añadir profesional extra"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {extras.EQUIPO > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground animate-fade-in">
                        +{formatCLP(
                          cycle === "annual"
                            ? Math.round((EXTRA_STAFF_COST.EQUIPO * ANNUAL_MULTIPLIER) / 12)
                            : EXTRA_STAFF_COST.EQUIPO
                        )}/mes por profesional ·{" "}
                        <span className="text-[#A78BFA] font-medium">
                          {formatCLP(totalPrice - basePrice)}/mes total extras
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-auto pt-8 space-y-2.5">
                  {plan.key === "EQUIPO" && (
                    <>
                      <button
                        onClick={() => handlePlanAction("EQUIPO", true)}
                        disabled={loading === "EQUIPO"}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loading === "EQUIPO" ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Iniciar Prueba Gratis de {TRIAL_DURATION_DAYS} Días</>
                        )}
                      </button>
                      <button
                        onClick={() => handlePlanAction("EQUIPO", false)}
                        disabled={loading === "EQUIPO"}
                        className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loading === "EQUIPO" ? (
                          <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…</span>
                        ) : (
                          "Suscribirse"
                        )}
                      </button>
                    </>
                  )}

                  {plan.key === "INDIVIDUAL" && (
                    <button
                      onClick={() => handlePlanAction("INDIVIDUAL", false)}
                      disabled={loading === "INDIVIDUAL"}
                      className="w-full rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Suscribirse
                    </button>
                  )}

                  {plan.key === "TEST" && (
                    <button
                      onClick={() => handlePlanAction("TEST", false)}
                      disabled={loading === "TEST"}
                      className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading === "TEST" ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…</span>
                      ) : (
                        "Probar Pago Real ($1.000)"
                      )}
                    </button>
                  )}

                  {/* Error message */}
                  {error && (
                    <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400 animate-fade-in">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
