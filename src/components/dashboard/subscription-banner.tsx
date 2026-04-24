import { prisma } from "@/server/db/prisma";
import { differenceInDays } from "date-fns";
import { ArrowUpRight, Crown, Sparkles, Clock } from "lucide-react";
import Link from "next/link";

export async function SubscriptionBanner({ businessId }: { businessId: string }) {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
  });

  if (!subscription) return null;

  const { plan, status, isTrial, trialEndsAt } = subscription;
  const daysLeft = trialEndsAt
    ? Math.max(0, differenceInDays(new Date(trialEndsAt), new Date()))
    : 0;

  // BASIC + TRIALING: Show both plan options
  if (plan === "BASIC" && status === "TRIALING" && isTrial) {
    return (
      <div className="rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-r from-[#7C3AED]/10 via-[#5B21B6]/5 to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#A78BFA]" />
              <p className="text-sm font-semibold text-[#A78BFA]">Periodo de Prueba</p>
            </div>
            <p className="max-w-md text-sm text-white/50">
              Te quedan <span className="font-bold text-white">{daysLeft} días</span> de prueba gratuita.
              Elige un plan para continuar sin interrupciones.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Clock className="h-3 w-3" />
              {daysLeft <= 5
                ? "¡Tu trial expira pronto!"
                : `Trial activo · ${daysLeft} días restantes`}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/settings#plan">
              <button className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:border-white/20 hover:text-white">
                Plan Base · $24.990/mes
              </button>
            </Link>
            <Link href="/dashboard/settings#plan">
              <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20 transition-all hover:shadow-[#7C3AED]/30">
                <Crown className="h-3.5 w-3.5" />
                Plan Pro · $39.990/mes
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // BASIC + ACTIVE (paid): Show Pro upsell
  if (plan === "BASIC" && status === "ACTIVE" && !isTrial) {
    return (
      <div className="rounded-2xl border border-[#7C3AED]/15 bg-[#7C3AED]/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-[#A78BFA]" />
              ¿Necesitas multi-staff y marca blanca?
            </p>
            <p className="text-sm text-white/40">
              Sube a Pro por solo $15.000 más al mes y desbloquea todo.
            </p>
          </div>
          <Link href="/dashboard/settings#plan">
            <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20 transition-all hover:shadow-[#7C3AED]/30">
              <Crown className="h-3.5 w-3.5" />
              Mejorar a Pro
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // PRO: Show active badge
  if (plan === "PRO" && status === "ACTIVE") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-4 py-2.5">
        <Crown className="h-4 w-4 text-[#A78BFA]" />
        <p className="text-sm text-[#A78BFA]">
          Plan <span className="font-bold">Pro</span> activo
        </p>
      </div>
    );
  }

  return null;
}
