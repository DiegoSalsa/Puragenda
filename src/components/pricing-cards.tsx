"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, Sparkles, Users, Crown, Zap } from "lucide-react";
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

type PlanKey = "INDIVIDUAL" | "EQUIPO";
type BillingCycle = "monthly" | "annual";

interface PricingCardsProps {
  mode?: "landing" | "selection";
}

// ═══════════════════════════════════════════
// ALL FEATURES — AVAILABLE ON BOTH PLANS
// ═══════════════════════════════════════════

const sharedFeatures = [
  "Citas y reservas ilimitadas",
  "Widget de reservas para tu web/redes",
  "App móvil instalable (PWA)",
  "Notificaciones y recordatorios 24h",
  "Cuentas Invisibles (sin contraseñas)",
  "Bloqueos de agenda y descansos",
  "CRM de clientes completo",
  "Escudo Anti-Inasistencias",
  "Tarjetas de timbres y fidelización",
  "Historial completo de reservas",
  "Logo propio en el widget",
  "Soporte por WhatsApp",
];

// ═══════════════════════════════════════════
// PLAN DATA
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
    description: "Ideal para profesionales independientes que trabajan solos.",
    highlighted: false,
    icon: Zap,
    staffLabel: `${STAFF_LIMITS.INDIVIDUAL} profesional incluido`,
    items: [
      ...sharedFeatures,
    ],
  },
  {
    key: "EQUIPO",
    name: "Equipo",
    description: "Perfecto para salones, clínicas y locales con un equipo de trabajo.",
    highlighted: true,
    badge: `${TRIAL_DURATION_DAYS} días gratis`,
    icon: Crown,
    staffLabel: `${STAFF_LIMITS.EQUIPO} profesionales incluidos`,
    items: [
      ...sharedFeatures,
      `${STAFF_LIMITS.EQUIPO} profesionales incluidos`,
      "Gestión de roles (Recepcionista y Staff)",
      "Servicios específicos por profesional",
      "Profesionales extra a $3.000/mes c/u",
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

  function handlePlanAction(key: PlanKey, isTrial: boolean) {
    const data = {
      plan: key,
      billingCycle: cycle,
      extraStaff: extras[key],
      totalMonthly: getTotalPrice(key),
      totalAnnual: cycle === "annual" ? getTotalPrice(key) * 12 : undefined,
      isTrial,
    };
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

      {/* Same Features Banner */}
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-center">
        <p className="text-sm font-medium text-emerald-400">
          ✨ Todas las funcionalidades premium están incluidas en ambos planes
        </p>
        <p className="mt-1 text-xs text-emerald-400/60">
          La única diferencia es la cantidad de profesionales que puedes gestionar
        </p>
      </div>

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
                      {mode === "landing" ? (
                        <Link href="/register" className="block">
                          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35">
                            <Sparkles className="h-4 w-4" />
                            Iniciar Prueba Gratis de {TRIAL_DURATION_DAYS} Días
                          </button>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handlePlanAction("EQUIPO", true)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35"
                        >
                          <Sparkles className="h-4 w-4" />
                          Iniciar Prueba Gratis de {TRIAL_DURATION_DAYS} Días
                        </button>
                      )}
                      {mode === "landing" ? (
                        <Link href="/register" className="block">
                          <button className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground">
                            Suscribirse
                          </button>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handlePlanAction("EQUIPO", false)}
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
                          <button className="w-full rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35">
                            Suscribirse
                          </button>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handlePlanAction("INDIVIDUAL", false)}
                          className="w-full rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35"
                        >
                          Suscribirse
                        </button>
                      )}
                    </>
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
