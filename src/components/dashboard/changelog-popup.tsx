"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CHANGELOG_DATA, LATEST_CHANGELOG_VERSION } from "@/config/changelog";
import { useDashboardOverlay } from "@/components/dashboard/dashboard-overlay-context";
import { X, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export function ChangelogPopup() {
  const { isChangelogOpen, setChangelogOpen } = useDashboardOverlay();
  const router = useRouter();

  const latestUpdate = CHANGELOG_DATA[0];

  useEffect(() => {
    if (!isChangelogOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleDismiss();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!isChangelogOpen) return null;

  function markChangelogSeen() {
    const attributes = [
      `puragenda_changelog_seen=${encodeURIComponent(LATEST_CHANGELOG_VERSION)}`,
      "Path=/",
      `Max-Age=${60 * 60 * 24 * 365}`,
      "SameSite=Lax",
    ];
    if (window.location.protocol === "https:") attributes.push("Secure");
    document.cookie = attributes.join("; ");
  }

  function handleDismiss() {
    markChangelogSeen();
    setChangelogOpen(false);
  }

  function handleViewDetails() {
    markChangelogSeen();
    setChangelogOpen(false);
    router.push("/dashboard/changelog");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-[24px] border-4 border-black dark:border-white bg-white dark:bg-black shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFF] animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
      >
        {/* Header Section */}
        <div className="relative bg-[#85E3FF] border-b-4 border-black dark:border-white p-6 pt-10 sm:p-8 sm:pt-12">
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar novedades"
            className="absolute right-4 top-4 z-10 rounded-full border-2 border-black bg-white p-1.5 text-black hover:bg-gray-100 transition-colors shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>

          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#FFB5E8] px-3 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000]">
            <Sparkles className="h-4 w-4" strokeWidth={3} />
            <span>Nueva version - {latestUpdate.version}</span>
          </div>

          {/* Title */}
          <h2 id="changelog-title" className="text-3xl font-black uppercase tracking-tight text-black leading-none">
            {latestUpdate.title}
          </h2>
        </div>

        {/* Content Section */}
        <div className="p-6 sm:p-8">
          <p className="mb-6 text-sm font-bold text-black/80 dark:text-white/80 leading-relaxed border-b-4 border-dashed border-black/20 pb-6">
            {latestUpdate.description}
          </p>

          <div className="mb-8 space-y-4">
            {latestUpdate.features.slice(0, 3).map((feature, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border-2 border-black bg-[#BFFCC6] p-3 shadow-[2px_2px_0_#000]">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-black" strokeWidth={3} />
                <span className="text-sm font-bold text-black">{feature}</span>
              </div>
            ))}
            {latestUpdate.features.length > 3 && (
              <p className="pl-2 text-xs font-black uppercase text-black/50 dark:text-white/50">
                y {latestUpdate.features.length - 3} mejoras mas...
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-4 pt-4 border-t-4 border-black dark:border-white">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl border-4 border-black bg-white px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all dark:bg-gray-800 dark:text-white"
            >
              Entendido
            </button>
            <button
              type="button"
              onClick={handleViewDetails}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-4 border-black bg-[#B28DFF] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              Ver todos los cambios <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
