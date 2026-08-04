import { prisma } from "@/server/db/prisma";
import { differenceInDays, differenceInHours } from "date-fns";
import { ArrowUpRight, Crown, Sparkles, Clock, Zap, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ActivatePlanButton } from "./activate-plan-button";
import { PRICING, STAFF_LIMITS } from "@/core/constants";
import { DunningActions } from "./dunning-actions";

export async function SubscriptionBanner({
  businessId,
  timezone,
  countryCode,
}: {
  businessId: string;
  timezone: string;
  countryCode: string;
}) {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) return null;

  const { plan, status, isTrial, trialEndsAt } = subscription;
  const daysLeft = trialEndsAt ? Math.max(0, differenceInDays(new Date(trialEndsAt), new Date())) : 0;
  const isUrgent = daysLeft <= 5;
  const planLabel = plan === "INDIVIDUAL" ? "Individual" : "Equipo";

  if (status === "PAST_DUE") {
    const graceEndsAt = subscription.gracePeriodEndsAt;
    const hoursLeft = graceEndsAt
      ? Math.max(0, differenceInHours(graceEndsAt, new Date()))
      : 0;
    const graceLabel = graceEndsAt
      ? graceEndsAt.toLocaleString("es-CL", {
          timeZone: timezone,
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "muy pronto";
    const nextAttemptLabel = subscription.nextPaymentAttemptAt
      ? subscription.nextPaymentAttemptAt.toLocaleString("es-CL", {
          timeZone: timezone,
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              No pudimos cobrar tu suscripción
            </p>
            <p className="max-w-2xl text-sm text-foreground">
              Sigues teniendo acceso durante el periodo de gracia. Regulariza
              el pago antes del <strong>{graceLabel}</strong>
              {hoursLeft > 0 ? ` (${hoursLeft} horas restantes)` : ""}.
            </p>
            <p className="text-xs text-muted-foreground">
              {nextAttemptLabel
                ? `Mercado Pago tiene otro intento previsto para el ${nextAttemptLabel}.`
                : "Puedes reautorizar la tarjeta guardada sin crear una suscripción nueva."}
              {subscription.paymentRetryCount > 0
                ? ` Intentos informados: ${subscription.paymentRetryCount}.`
                : ""}
            </p>
          </div>
          <DunningActions compact />
        </div>
      </div>
    );
  }

  // TRIALING: show trial info + contextual CTAs
  if (status === "TRIALING" && isTrial) {
    if (countryCode !== "CL") {
      return (
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-[#7C3AED]/5 to-transparent p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-sky-400">Acceso internacional habilitado · Plan {planLabel}</p>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Activa tu suscripción con Paddle. El precio base es en USD y el Checkout mostrará la moneda y los impuestos aplicables para tu país.
              </p>
              <div className="pt-2">
                <ActivatePlanButton plan={plan} />
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={`rounded-2xl border p-5 ${isUrgent ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent" : "border-[#7C3AED]/20 bg-gradient-to-r from-[#7C3AED]/10 via-[#5B21B6]/5 to-transparent"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isUrgent ? (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              ) : (
                <Sparkles className="h-4 w-4 text-[#A78BFA]" />
              )}
              <p className={`text-sm font-semibold ${isUrgent ? "text-amber-400" : "text-[#A78BFA]"}`}>
                Periodo de Prueba · Plan {planLabel}
              </p>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Te quedan <span className={`font-bold ${isUrgent ? "text-amber-400" : "text-foreground"}`}>{daysLeft} días</span> de prueba gratuita.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              {isUrgent ? "¡Tu trial expira pronto! Activa tu plan para no perder acceso." : `${daysLeft} días restantes`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Primary CTA: Activate current plan */}
            <ActivatePlanButton plan={plan} />

            {/* Secondary CTA: Upgrade if on Individual */}
            {plan === "INDIVIDUAL" && (
              <Link href="/dashboard/settings#plan">
                <button className="flex items-center gap-1.5 rounded-xl border border-[#7C3AED]/30 px-4 py-2.5 text-sm font-semibold text-[#A78BFA] transition-all hover:border-[#7C3AED] hover:bg-[#7C3AED]/10">
                  <Crown className="h-3.5 w-3.5" /> Subir a Equipo <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // INDIVIDUAL paid: upsell to Equipo
  if (plan === "INDIVIDUAL" && status === "ACTIVE" && !isTrial) {
    return (
      <div className="rounded-2xl border border-[#7C3AED]/15 bg-[#7C3AED]/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-[#A78BFA]" />Plan Individual · ¿Listo para crecer?</p>
            <p className="text-sm text-muted-foreground">
              Sube a Equipo (${PRICING.EQUIPO.monthly.toLocaleString("es-CL")} CLP/mes) para hasta {STAFF_LIMITS.EQUIPO} profesionales incluidos y extras desde el sexto.
            </p>
          </div>
          <Link href="/dashboard/settings#plan">
            <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20">
              <Crown className="h-3.5 w-3.5" /> Ver planes <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // EQUIPO active badge
  if (plan === "EQUIPO" && status === "ACTIVE") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-4 py-2.5">
        <Crown className="h-4 w-4 text-[#A78BFA]" />
        <p className="text-sm text-[#A78BFA]">Plan <span className="font-bold">Equipo</span> activo</p>
      </div>
    );
  }

  return null;
}
