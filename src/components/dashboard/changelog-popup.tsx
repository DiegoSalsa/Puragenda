"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CHANGELOG_DATA, LATEST_CHANGELOG_VERSION } from "@/config/changelog";
import { useDashboardOverlay } from "@/components/dashboard/dashboard-overlay-context";
import { markChangelogSeenAction } from "@/server/actions/dashboard.actions";
import { X, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

interface Props {
  seenVersion?: string | null;
}

export function ChangelogPopup({ seenVersion }: Props) {
  const [open, setOpen] = useState(
    seenVersion !== LATEST_CHANGELOG_VERSION
  );
  const { setChangelogOpen } = useDashboardOverlay();
  const router = useRouter();

  const latestUpdate = CHANGELOG_DATA[0];

  useEffect(() => {
    setChangelogOpen(open);
  }, [open, setChangelogOpen]);

  if (!open) return null;

  async function handleDismiss() {
    setOpen(false);
    await markChangelogSeenAction(LATEST_CHANGELOG_VERSION);
    router.refresh();
  }

  async function handleViewDetails() {
    await handleDismiss();
    router.push("/dashboard/changelog");
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:p-4"
      onClick={handleDismiss}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="relative flex max-h-[calc(111.111dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border-4 border-black bg-white shadow-[8px_8px_0_#000] animate-in zoom-in-95 duration-300 dark:border-white dark:bg-black dark:shadow-[8px_8px_0_#FFF] sm:max-h-[calc(111.111dvh-2rem)]"
          style={{ zoom: 0.9 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-popup-title"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header Section */}
          <div className="relative shrink-0 border-b-4 border-black bg-[#85E3FF] p-5 pt-8 dark:border-white sm:p-6 sm:pt-9 [@media(max-height:620px)]:p-4 [@media(max-height:620px)]:pt-5">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              aria-label="Cerrar novedades"
              className="absolute right-4 top-4 z-10 rounded-full border-2 border-black bg-white p-1.5 text-black shadow-[2px_2px_0_#000] transition-colors hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-gray-100 hover:shadow-none [@media(max-height:620px)]:right-3 [@media(max-height:620px)]:top-3"
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </button>

            {/* Badge */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#FFB5E8] px-3 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] [@media(max-height:620px)]:mb-2 [@media(max-height:620px)]:py-0.5">
              <Sparkles className="h-4 w-4" strokeWidth={3} />
              <span>Nueva version - {latestUpdate.version}</span>
            </div>

            {/* Title */}
            <h2
              id="changelog-popup-title"
              className="pr-8 text-2xl font-black uppercase leading-none tracking-tight text-black sm:text-3xl [@media(max-height:620px)]:text-2xl"
            >
              {latestUpdate.title}
            </h2>
          </div>

          {/* Content Section */}
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 [@media(max-height:620px)]:p-3">
            <p className="mb-4 border-b-4 border-dashed border-black/20 pb-4 text-sm font-bold leading-relaxed text-black/80 dark:text-white/80 [@media(max-height:620px)]:mb-3 [@media(max-height:620px)]:pb-3 [@media(max-height:620px)]:leading-snug">
              {latestUpdate.description}
            </p>

            <div className="mb-4 space-y-2.5 [@media(max-height:620px)]:mb-3 [@media(max-height:620px)]:space-y-2">
              {latestUpdate.features.slice(0, 3).map((feature, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border-2 border-black bg-[#BFFCC6] p-2.5 shadow-[2px_2px_0_#000] [@media(max-height:620px)]:p-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-black" strokeWidth={3} />
                  <span className="text-sm font-bold leading-snug text-black [@media(max-height:620px)]:text-[13px] [@media(max-height:620px)]:leading-[1.25]">{feature}</span>
                </div>
              ))}
              {latestUpdate.features.length > 3 && (
                <p className="pl-2 text-xs font-black uppercase text-black/50 dark:text-white/50">
                  y {latestUpdate.features.length - 3} mejoras mas...
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-col-reverse gap-3 border-t-4 border-black pt-3 dark:border-white min-[460px]:flex-row min-[460px]:justify-end">
              <button
                onClick={handleDismiss}
                className="rounded-xl border-4 border-black bg-white px-5 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none dark:bg-gray-800 dark:text-white"
              >
                Entendido
              </button>
              <button
                onClick={handleViewDetails}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-4 border-black bg-[#B28DFF] px-5 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              >
                Ver todos los cambios <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
