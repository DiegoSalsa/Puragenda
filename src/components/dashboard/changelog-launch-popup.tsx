"use client";

import { ArrowRight, CheckCircle2, Gift, Sparkles, X } from "@/components/icons/hover-icons";
import { GiftCardVisual } from "@/components/gift-cards/gift-card-visual";
import { LoyaltyCard } from "@/components/loyalty/loyalty-card";
import type { ChangelogEntry, ChangelogSpotlight } from "@/config/changelog";

type Props = {
  entry: ChangelogEntry;
  onDismiss: () => void;
  onNavigate: (spotlight: ChangelogSpotlight) => void;
  onViewDetails: () => void;
};

function ProductPreview({ spotlight }: { spotlight: ChangelogSpotlight }) {
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
          <header className="relative shrink-0 border-b-4 border-black bg-[#FFF5BA] px-5 py-5 sm:px-8 sm:py-6">
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
            <h2 id="changelog-launch-title" className="mt-4 max-w-3xl pr-10 text-2xl font-black leading-[1.02] tracking-[-0.03em] sm:text-4xl">
              {entry.popupTitle || entry.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-black/65 sm:text-base">
              {entry.popupDescription || entry.description}
            </p>
          </header>

          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="grid gap-5 md:grid-cols-2">
              {(entry.spotlights || []).map((spotlight, index) => (
                <article
                  key={spotlight.id}
                  className={`flex min-w-0 flex-col rounded-[22px] border-[3px] border-black p-4 shadow-[6px_6px_0_#000] animate-in slide-in-from-bottom-3 duration-500 sm:p-5 ${spotlight.preview === "gift_card" ? "bg-[#FFB5E8]" : "bg-[#C4B5FD]"}`}
                  style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_#000]">
                      {spotlight.preview === "gift_card" ? <Gift className="h-5 w-5" strokeWidth={2.7} /> : <Sparkles className="h-5 w-5" strokeWidth={2.7} />}
                    </span>
                    <h3 className="text-xl font-black">{spotlight.title}</h3>
                  </div>

                  <div className="mx-auto w-full max-w-sm"><ProductPreview spotlight={spotlight} /></div>

                  <p className="mt-5 text-base font-black leading-snug">{spotlight.description}</p>
                  <ul className="my-4 space-y-2 text-sm font-bold">
                    {spotlight.bullets.slice(0, 3).map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onNavigate(spotlight)}
                    className="mt-auto inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-black px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
                  >
                    {spotlight.cta} <ArrowRight className="h-4 w-4" strokeWidth={3} />
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 border-t-[3px] border-dashed border-black/25 pt-5 text-center">
              <p className="text-sm font-bold text-black/65">Todo ya está disponible en tu panel.</p>
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
