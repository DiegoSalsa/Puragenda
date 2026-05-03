import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { Stamp, Gift, Sparkles, Trophy, Calendar, TrendingUp } from "lucide-react";
import { StampProgress } from "./stamp-progress";
import { RewardCard } from "./reward-card";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clientId } = await params;
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { business: { select: { name: true } } },
  });

  if (!client) return { title: "Premios | Puragenda" };

  return {
    title: `Mis Premios — ${client.business.name}`,
    description: `Portal de fidelización de ${client.name} en ${client.business.name}`,
  };
}

/**
 * Builds a motivational copy based on progress.
 */
function getMotivationalCopy(current: number, required: number, rewardName: string | null): string {
  const remaining = required - current;
  const reward = rewardName || "tu premio";

  if (remaining <= 0) return "🎉 ¡Felicitaciones! ¡Completaste tu tarjeta!";
  if (remaining === 1) return `🔥 ¡Solo te falta 1 visita para ${reward}!`;
  if (remaining === 2) return `💪 ¡Casi! Solo 2 visitas más para ${reward}.`;
  if (current === 0) return `✨ ¡Empieza a acumular timbres con tu primera visita!`;
  if (current / required >= 0.5) return `🚀 ¡Vas por la mitad! ${remaining} visitas para ${reward}.`;
  return `⭐ Llevas ${current} timbre${current > 1 ? "s" : ""}. ¡Sigue así!`;
}

export default async function MisPremiosPage({ params }: PageProps) {
  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      business: {
        select: {
          name: true,
          stampsRequired: true,
          rewardName: true,
          discountType: true,
          discountValue: true,
          isLoyaltyEnabled: true,
          primaryColor: true,
          logoUrl: true,
        },
      },
      loyaltyCodes: {
        where: { isUsed: false },
        orderBy: { createdAt: "desc" },
      },
      appointments: {
        where: { status: "COMPLETED" },
        orderBy: { startTime: "desc" },
        take: 5,
        select: {
          id: true,
          startTime: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  if (!client) return notFound();

  const { business } = client;

  if (!business.isLoyaltyEnabled) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center text-white/60">
          <Stamp className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Programa no disponible</p>
          <p className="text-sm mt-1">Este negocio no tiene un programa de fidelización activo.</p>
        </div>
      </div>
    );
  }

  const availableRewards = client.loyaltyCodes;
  const completedVisits = client.appointments || [];
  const percentage = Math.min(100, Math.round((client.currentStamps / business.stampsRequired) * 100));
  const remaining = business.stampsRequired - client.currentStamps;
  const motivationalCopy = getMotivationalCopy(client.currentStamps, business.stampsRequired, business.rewardName);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#7C3AED]/30">
      {/* Shimmer keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      ` }} />

      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/30 via-[#5B21B6]/15 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[#D4AF37]/8 blur-[100px]" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-[120%] bg-[conic-gradient(from_90deg_at_50%_0%,#A78BFA_0%,transparent_50%,#7C3AED_100%)] blur-[80px] opacity-20" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[#A78BFA]/10 blur-[80px]" />

        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7C3AED]/60 to-transparent" />

        <div className="relative max-w-xl mx-auto px-5 pt-10 pb-6 sm:pt-14 sm:pb-8">
          {/* Business logo / name */}
          <div className="flex items-center gap-3 mb-8">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-11 w-11 rounded-xl object-cover ring-2 ring-white/10 shadow-lg"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED]/30 to-[#5B21B6]/20 ring-2 ring-[#7C3AED]/30 shadow-lg">
                <Sparkles className="h-5 w-5 text-[#A78BFA]" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-white/40 font-medium">Programa de fidelización</p>
              <p className="text-sm font-bold text-white">{business.name}</p>
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#D4AF37]">{client.name.split(" ")[0]}</span> 👋
          </h1>
          <p className="mt-3 text-base text-white/50 font-medium leading-relaxed max-w-sm">
            {motivationalCopy}
          </p>
        </div>
      </div>

      {/* ─── Bento Grid ─── */}
      <div className="max-w-xl mx-auto px-5 pb-16 -mt-1">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">

          {/* ── Card 1: Stamp Progress (Full Width) ── */}
          <div className="col-span-2 rounded-3xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-5 sm:p-6 transition-all duration-300 hover:border-white/[0.1]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/20">
                  <Stamp className="h-4.5 w-4.5 text-[#A78BFA]" />
                </div>
                <div>
                  <p className="text-sm font-bold">Tu Tarjeta de Timbres</p>
                  <p className="text-[11px] text-white/35">{client.currentStamps} de {business.stampsRequired} completados</p>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#7C3AED]/10 border border-[#D4AF37]/15">
                <span className="text-sm font-extrabold text-[#D4AF37]">{percentage}%</span>
              </div>
            </div>

            <StampProgress
              currentStamps={client.currentStamps}
              stampsRequired={business.stampsRequired}
            />

            {remaining > 0 && (
              <p className="mt-4 text-center text-sm font-medium text-white/40">
                {remaining === 1
                  ? <span className="text-[#D4AF37]">¡Solo 1 visita más! 🔥</span>
                  : <>{remaining} visitas para tu premio</>
                }
              </p>
            )}
          </div>

          {/* ── Card 2: Stats - Visits (Half) ── */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-4 sm:p-5 transition-all duration-300 hover:border-white/[0.1]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/15 mb-3">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">{completedVisits.length}</p>
            <p className="text-xs text-white/35 mt-0.5">Visitas completadas</p>
          </div>

          {/* ── Card 3: Stats - Rewards (Half) ── */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-4 sm:p-5 transition-all duration-300 hover:border-white/[0.1]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/15 mb-3">
              <Trophy className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">{availableRewards.length}</p>
            <p className="text-xs text-white/35 mt-0.5">Premios disponibles</p>
          </div>

          {/* ── Card 4: Prize Info (Full Width) ── */}
          {business.rewardName && (
            <div className="col-span-2 relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/[0.06] via-white/[0.01] to-[#7C3AED]/[0.04] p-5 transition-all duration-300 hover:border-[#D4AF37]/30">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-[#D4AF37]/8 to-transparent rounded-bl-3xl" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-[#F5E6A3]/10 border border-[#D4AF37]/25">
                  <Gift className="h-5 w-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#D4AF37]/60 font-semibold mb-1">Premio al completar</p>
                  <p className="text-base font-bold text-white">{business.rewardName}</p>
                  {business.discountType && business.discountValue && (
                    <p className="text-sm text-[#D4AF37]/80 font-medium mt-0.5">
                      {business.discountType === "PERCENTAGE"
                        ? `${business.discountValue}% de descuento`
                        : `$${business.discountValue.toLocaleString()} de descuento`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Card 5: Available Rewards (Full Width) ── */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <Gift className="h-4.5 w-4.5 text-[#D4AF37]" />
              <p className="text-sm font-bold">Tus Premios</p>
              {availableRewards.length > 0 && (
                <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37]/20 text-[11px] font-bold text-[#D4AF37]">
                  {availableRewards.length}
                </span>
              )}
            </div>

            {availableRewards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <Gift className="h-7 w-7 text-white/15" />
                </div>
                <p className="text-sm font-medium text-white/35">Aún no tienes premios</p>
                <p className="text-xs text-white/20 mt-1 max-w-[200px] mx-auto">
                  Sigue acumulando timbres con cada visita para ganar tu premio
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    code={reward.code}
                    rewardName={reward.rewardName}
                    discountType={reward.discountType}
                    discountValue={reward.discountValue}
                    createdAt={reward.createdAt.toISOString()}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Card 6: Recent Activity (Full Width) ── */}
          {completedVisits.length > 0 && (
            <div className="col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-5 transition-all duration-300 hover:border-white/[0.1]">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/15">
                  <Calendar className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-sm font-bold">Últimas Visitas</p>
              </div>

              <div className="space-y-2">
                {completedVisits.map((visit, i) => {
                  const date = new Date(visit.startTime);
                  return (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/15">
                          <Stamp className="h-3.5 w-3.5 text-[#D4AF37]/70" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white/80">{visit.service.name}</p>
                          <p className="text-[10px] text-white/30">
                            {date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-400/60 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        +1 timbre
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/15 pt-8">
          Potenciado por <span className="text-[#7C3AED]/40 font-medium">Puragenda</span>
        </p>
      </div>
    </div>
  );
}
