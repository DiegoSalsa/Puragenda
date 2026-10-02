"use client";
import { useTranslations } from "next-intl";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CHANGELOG_DATA, type ChangelogSpotlight } from "@/config/changelog";
import { WebsiteLaunchPopup } from "./website-launch-popup";
import type { WebsiteLaunchContext } from "@/websites/launch";
import { useDashboardOverlay } from "@/components/dashboard/dashboard-overlay-context";
import { ChangelogLaunchPopup } from "@/components/dashboard/changelog-launch-popup";
import { PuriMascot } from "@/components/brand/puri-mascot";
import { markChangelogSeenAction } from "@/server/actions/dashboard.actions";
import { X, Sparkles, ArrowRight, ShieldCheck } from "@/components/icons/hover-icons";
import { track } from "@/lib/analytics/client";

const POPUP_FEATURE_TITLES = [
  "Preguntas con contexto",
  "Tu día, de un vistazo",
  "Información con permiso",
];

export function ChangelogPopup({ websiteLaunch }: { websiteLaunch?: WebsiteLaunchContext | null }) {
  const legacy = useTranslations("legacy");
  const { isChangelogOpen, setChangelogOpen } = useDashboardOverlay();
  const router = useRouter();
  const latestUpdate = websiteLaunch ? CHANGELOG_DATA[0] : CHANGELOG_DATA[1];
  const LATEST_CHANGELOG_VERSION = latestUpdate.version;
  const viewedLaunch = useRef(false);
  const previousFocus = useRef<HTMLElement | null>(null);

  const handleDismiss = useCallback(async () => {
    setChangelogOpen(false);
    await markChangelogSeenAction(LATEST_CHANGELOG_VERSION);
    router.refresh();
  }, [router, setChangelogOpen, LATEST_CHANGELOG_VERSION]);

  useEffect(() => {
    if (!isChangelogOpen) return;

    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-changelog-close]")?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Esc") void handleDismiss();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [handleDismiss, isChangelogOpen]);

  useEffect(() => {
    if (!isChangelogOpen || latestUpdate.popupVariant !== "launch" || viewedLaunch.current) return;
    viewedLaunch.current = true;
    track("changelog_launch_viewed");
  }, [isChangelogOpen, latestUpdate.popupVariant]);

  if (!isChangelogOpen) return null;

  async function handleViewDetails() {
    if (latestUpdate.popupVariant === "launch") track("changelog_launch_cta_clicked", { feature: "changelog" });
    setChangelogOpen(false);
    await markChangelogSeenAction(LATEST_CHANGELOG_VERSION);
    router.push("/dashboard/changelog");
  }

  async function handleSpotlightNavigation(spotlight: ChangelogSpotlight) {
    track("changelog_launch_cta_clicked", { feature: spotlight.id });
    setChangelogOpen(false);
    await markChangelogSeenAction(LATEST_CHANGELOG_VERSION);
    router.push(spotlight.href);
  }

  if (websiteLaunch) return <WebsiteLaunchPopup context={websiteLaunch} onDismiss={() => void handleDismiss()} onNavigate={() => { void (async () => { setChangelogOpen(false); await markChangelogSeenAction(LATEST_CHANGELOG_VERSION); router.push("/dashboard/website"); router.refresh(); })(); }} />;

  if (latestUpdate.popupVariant === "launch") {
    return (
      <ChangelogLaunchPopup
        entry={latestUpdate}
        onDismiss={() => void handleDismiss()}
        onNavigate={(spotlight) => void handleSpotlightNavigation(spotlight)}
        onViewDetails={() => void handleViewDetails()}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:p-5"
      onClick={() => void handleDismiss()}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-[28px] border-[3px] border-black bg-[#FFFAF0] text-black shadow-[10px_10px_0_#000] animate-in zoom-in-95 duration-300 sm:max-h-[calc(100dvh-2.5rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-popup-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative shrink-0 overflow-hidden border-b-[3px] border-black bg-[#E9D8FF] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border-[20px] border-[#FF5C8A]/60" aria-hidden="true" />
            <div className="pointer-events-none absolute bottom-2 right-1 z-[1] flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-black bg-[#FFF5BA] shadow-[4px_4px_0_#000] sm:bottom-3 sm:right-6 sm:h-36 sm:w-36">
              <PuriMascot variant="greeting" className="h-28 w-28 motion-safe:animate-[puri-bob_3.5s_ease-in-out_infinite] motion-reduce:animate-none sm:h-36 sm:w-36" />
            </div>
            <button
              data-changelog-close
              type="button"
              onClick={() => void handleDismiss()}
              aria-label={legacy("oHTC44S-WJHN")}
              className="absolute right-4 top-4 z-10 rounded-full border-2 border-black bg-white p-2 text-black shadow-[3px_3px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B28DFF]"
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </button>

            <div className="relative inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#FFD84D] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] shadow-[2px_2px_0_#000]">
              <Sparkles className="h-4 w-4" strokeWidth={3} /> Última actualización
            </div>

            <h2
              id="changelog-popup-title"
              className="relative mt-4 max-w-[32rem] pr-20 text-[clamp(2rem,6vw,3.3rem)] font-black leading-[0.98] tracking-[-0.06em] sm:pr-28"
            >
              {latestUpdate.title}
            </h2>
            <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-black/55">
              <span className="rounded-full border-2 border-black bg-white px-2.5 py-1 text-black">{latestUpdate.version}</span>
              <span>Ya disponible en tu panel</span>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7">
            <p className="mb-5 max-w-2xl text-base font-semibold leading-7 text-black/70">
              {latestUpdate.description}
            </p>

            {latestUpdate.notice && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-black bg-[#FFF5BA] p-4 shadow-[3px_3px_0_#000]">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
                <p className="text-sm font-bold leading-6">
                  {latestUpdate.notice}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {latestUpdate.features.slice(0, 3).map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-4 rounded-2xl border-2 border-black p-4 shadow-[3px_3px_0_#000] ${index === 1 ? "bg-[#F2ECFF]" : "bg-white"}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#E9D8FF] text-xs font-black text-[#5B21B6] shadow-[2px_2px_0_#000]">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-5">{POPUP_FEATURE_TITLES[index]}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-black/65">{feature}</p>
                  </div>
                </div>
              ))}
            </div>
            {latestUpdate.features.length > 3 && <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-black/45">Y {latestUpdate.features.length - 3} mejoras más</p>}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t-[3px] border-dashed border-black/20 pt-5 min-[460px]:flex-row min-[460px]:justify-end">
              <button
                type="button"
                onClick={() => void handleDismiss()}
                className="rounded-xl border-[3px] border-black bg-white px-5 py-3 text-sm font-black text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Entendido
              </button>
              <button
                type="button"
                onClick={() => void handleViewDetails()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#B28DFF] px-5 py-3 text-sm font-black text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Ver todas las novedades <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
