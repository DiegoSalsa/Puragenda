import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { Stamp, Gift, Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Gradient header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/30 via-[#5B21B6]/20 to-transparent" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#7C3AED]/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#A78BFA]/10 blur-3xl" />

        <div className="relative max-w-lg mx-auto px-6 pt-12 pb-8">
          {/* Business logo / name */}
          <div className="flex items-center gap-3 mb-8">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/20 ring-2 ring-[#7C3AED]/30">
                <Sparkles className="h-5 w-5 text-[#7C3AED]" />
              </div>
            )}
            <span className="text-sm font-medium text-white/70">{business.name}</span>
          </div>

          {/* Greeting */}
          <h1 className="text-3xl font-bold tracking-tight animate-fade-up">
            Hola, <span className="text-[#A78BFA]">{client.name.split(" ")[0]}</span>
          </h1>
          <p className="mt-2 text-white/50 text-sm animate-fade-up" style={{ animationDelay: "80ms" }}>
            Tu progreso en el programa de fidelización
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 pb-16 space-y-6">
        {/* Stamp Progress Card */}
        <div
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-6 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Stamp className="h-5 w-5 text-[#7C3AED]" />
            <h2 className="text-sm font-semibold">Tu Tarjeta de Timbres</h2>
          </div>

          <StampProgress
            currentStamps={client.currentStamps}
            stampsRequired={business.stampsRequired}
          />

          <div className="mt-4 flex items-center justify-between text-xs text-white/40">
            <span>{client.currentStamps} de {business.stampsRequired} timbres</span>
            <span>{business.stampsRequired - client.currentStamps} para tu premio</span>
          </div>

          {/* Reward description */}
          {business.rewardName && (
            <div className="mt-4 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-4 py-3">
              <p className="text-xs text-[#A78BFA] font-medium">🎁 Premio al completar:</p>
              <p className="text-sm text-white mt-0.5">
                {business.rewardName}
                {business.discountType && business.discountValue && (
                  <span className="text-white/50">
                    {" — "}
                    {business.discountType === "PERCENTAGE"
                      ? `${business.discountValue}% de descuento`
                      : `$${business.discountValue.toLocaleString()} de descuento`}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Available Rewards */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-[#7C3AED]" />
            <h2 className="text-sm font-semibold">Tus Premios Disponibles</h2>
            {availableRewards.length > 0 && (
              <span className="ml-auto rounded-full bg-[#7C3AED]/20 px-2.5 py-0.5 text-xs font-semibold text-[#A78BFA]">
                {availableRewards.length}
              </span>
            )}
          </div>

          {availableRewards.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                <Gift className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-sm text-white/40">Aún no tienes premios disponibles</p>
              <p className="text-xs text-white/25 mt-1">Sigue acumulando timbres con tus visitas</p>
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

        {/* Footer */}
        <p className="text-center text-[10px] text-white/20 pt-4">
          Potenciado por <span className="text-[#7C3AED]/50">Puragenda</span>
        </p>
      </div>
    </div>
  );
}
