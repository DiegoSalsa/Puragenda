import { prisma } from "@/server/db/prisma";
import { differenceInDays } from "date-fns";
import { ArrowUpRight, Crown, Sparkles, Clock, Zap } from "lucide-react";
import Link from "next/link";

export async function SubscriptionBanner({ businessId }: { businessId: string }) {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) return null;

  const { plan, status, isTrial, trialEndsAt } = subscription;
  const daysLeft = trialEndsAt ? Math.max(0, differenceInDays(new Date(trialEndsAt), new Date())) : 0;

  // TRIALING: show trial info + upgrade CTAs
  if (status === "TRIALING" && isTrial) {
    return (
      <div className="rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-r from-[#7C3AED]/10 via-[#5B21B6]/5 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#A78BFA]" />
              <p className="text-sm font-semibold text-[#A78BFA]">Periodo de Prueba · Plan {plan === "INDIVIDUAL" ? "Individual" : "Equipo"}</p>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Te quedan <span className="font-bold text-foreground">{daysLeft} días</span> de prueba gratuita.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              {daysLeft <= 5 ? "¡Tu trial expira pronto!" : `${daysLeft} días restantes`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {plan === "INDIVIDUAL" && (
              <Link href="/dashboard/settings#plan">
                <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20">
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
            <p className="text-sm text-muted-foreground">Sube a Equipo ($24.990/mes) para multi-staff y profesionales adicionales.</p>
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
