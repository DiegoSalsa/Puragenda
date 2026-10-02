"use client";

import { ArrowRight, CheckCircle2, Gift, Rocket, Sparkles, TrendingUp, X } from "@/components/icons/hover-icons";
import { GiftCardVisual } from "@/components/gift-cards/gift-card-visual";
import { LoyaltyCard } from "@/components/loyalty/loyalty-card";
import type { ChangelogEntry, ChangelogSpotlight } from "@/config/changelog";
import Image from "next/image";

type Props = {
  entry: ChangelogEntry;
  onDismiss: () => void;
  onNavigate: (spotlight: ChangelogSpotlight) => void;
  onViewDetails: () => void;
};

function ProductPreview({ spotlight }: { spotlight: ChangelogSpotlight }) {
  if (spotlight.preview === "website_recommended") {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border-[3px] border-black bg-white shadow-[4px_4px_0_#000]">
        <Image
          src="/websites/previews/bella.svg"
          alt="Vista previa de la web recomendada para tu negocio"
          fill
          sizes="(max-width: 768px) 90vw, 520px"
          className="object-cover object-top"
        />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-xl border-2 border-black bg-white/95 px-3 py-2 shadow-[3px_3px_0_#000]">
          <span className="text-xs font-black uppercase tracking-[0.08em]">Preconfigurada para ti</span>
          <span className="rounded-full bg-[#FFD84D] px-2 py-1 text-[10px] font-black uppercase">Lista para publicar</span>
        </div>
      </div>
    );
  }

  if (spotlight.preview === "gift_card") {
    return (
      <GiftCardVisual
        compact
        businessName="Tu negocio"
        giftCardName="Un regalo para ti"
        type="BALANCE"
        faceValue={50_000}
        shortMessage="Disfruta un momento especial"
        background="#FFF5BA"
        accent="#FF8FAB"
        text="#111111"
        currencyCode="CLP"
        formatAmount={(amount) => `$${new Intl.NumberFormat("es-CL").format(amount)}`}
      />
    );
  }

  return (
    <LoyaltyCard
      compact
      businessName="Tu negocio"
      currentStamps={3}
      stampsRequired={10}
      rewardLabel="Un servicio gratis"
    />
  );
}

export function ChangelogLaunchPopup({ entry, onDismiss, onNavigate, onViewDetails }: Props) {
  const spotlight = entry.spotlights?.[0];

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/65 p-3 animate-in fade-in duration-300 sm:p-5"
      onClick={onDismiss}
      onKeyDown={(event) => {
        if (event.key !== "Escape" && event.key !== "Esc") return;
        event.stopPropagation();
        onDismiss();
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-launch-title"
          className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-[26px] border-4 border-black bg-[#FFFAF0] text-black shadow-[10px_10px_0_#000] animate-in zoom-in-95 duration-300 sm:max-h-[calc(100dvh-2.5rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="relative shrink-0 overflow-hidden border-b-4 border-black bg-[#FFF5BA] px-5 py-5 sm:px-8 sm:py-7">
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[24px] border-[#FF5C8A]/50" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 right-24 h-28 w-28 rounded-full bg-[#B28DFF]/45" aria-hidden="true" />
            <button
              autoFocus
              data-changelog-close
              type="button"
              onClick={onDismiss}
              aria-label="Cerrar novedades"
              className="absolute right-4 top-4 z-10 rounded-full border-2 border-black bg-white p-2 shadow-[3px_3px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B28DFF] sm:right-6 sm:top-6"
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </button>

            <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#FFB5E8] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] shadow-[2px_2px_0_#000]">
              <Sparkles className="h-4 w-4" strokeWidth={3} /> {entry.popupEyebrow || "Nuevo lanzamiento"}
            </div>
            <h2 id="changelog-launch-title" className="relative mt-4 max-w-3xl pr-10 text-[clamp(2rem,5vw,3.8rem)] font-black leading-[0.96] tracking-[-0.055em]">
              {entry.popupTitle || entry.title}
            </h2>
            <p className="relative mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-black/70 sm:text-base">
              {entry.popupDescription || entry.description}
            </p>
          </header>

          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {spotlight ? (
              <article className="grid gap-6 rounded-[24px] border-[3px] border-black bg-[#DDF8F1] p-4 shadow-[7px_7px_0_#000] animate-in slide-in-from-bottom-3 duration-500 sm:p-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
                <div className="min-w-0">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_#000]">
                      <Rocket className="h-5 w-5" strokeWidth={2.7} />
                    </span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-black/60">La dejamos lista para ti</p>
                      <h3 className="text-2xl font-black tracking-[-0.03em]">{spotlight.title}</h3>
                    </div>
                  </div>

                  <p className="text-lg font-black leading-tight sm:text-xl">{spotlight.description}</p>
                  <ul className="my-5 space-y-3 text-sm font-bold">
                    {spotlight.bullets.slice(0, 3).map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-black bg-[#FFF5BA] p-3 shadow-[3px_3px_0_#000]">
                    <TrendingUp className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.7} />
                    <p className="text-sm font-black leading-5">Una sola reserva adicional puede cubrir el mes. El objetivo es que tu web empiece a pagarse desde las primeras oportunidades que genere.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate(spotlight)}
                    className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-black px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
                  >
                    {spotlight.cta} <ArrowRight className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>

                <div className="mx-auto w-full max-w-xl md:order-first"><ProductPreview spotlight={spotlight} /></div>
              </article>
            ) : null}

            <div className="mt-6 flex flex-col items-center gap-3 border-t-[3px] border-dashed border-black/25 pt-5 text-center">
              <p className="max-w-xl text-sm font-bold leading-6 text-black/65">Tu catálogo ya existe. Nosotros dejamos la estructura lista; tú puedes publicar y compartir una web profesional cuando quieras.</p>
              <button
                type="button"
                onClick={onViewDetails}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B28DFF]"
              >
                Ver todas las novedades <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
