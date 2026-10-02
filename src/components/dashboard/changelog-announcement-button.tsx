"use client";

import { useEffect } from "react";
import { Sparkles } from "@/components/icons/hover-icons";
import { useDashboardOverlay } from "./dashboard-overlay-context";

export function ChangelogAnnouncementButton({ openOnLoad = false }: { openOnLoad?: boolean }) {
  const { setChangelogOpen } = useDashboardOverlay();

  useEffect(() => {
    if (openOnLoad) setChangelogOpen(true);
  }, [openOnLoad, setChangelogOpen]);

  return (
    <button
      type="button"
      onClick={() => setChangelogOpen(true)}
      className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD84D] px-5 py-3 text-sm font-black text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B28DFF]"
    >
      <Sparkles className="h-4 w-4" strokeWidth={3} /> Ver anuncio de Sitio Web
    </button>
  );
}
