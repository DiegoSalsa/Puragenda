"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type HelpSurface = "assistant" | "learning" | "tour";

interface DashboardOverlayContextValue {
  isChangelogOpen: boolean;
  setChangelogOpen: (open: boolean) => void;
  setupPriority: boolean;
  activeHelp: HelpSurface | null;
  openHelp: (surface: HelpSurface) => void;
  closeHelp: (surface: HelpSurface) => void;
}

const DashboardOverlayContext = createContext<DashboardOverlayContextValue>({
  isChangelogOpen: false,
  setChangelogOpen: () => {},
  setupPriority: false, activeHelp: null, openHelp: () => {}, closeHelp: () => {},
});

export function DashboardOverlayProvider({
  children,
  initialChangelogOpen,
  setupPriority = false,
}: {
  children: React.ReactNode;
  initialChangelogOpen: boolean;
  setupPriority?: boolean;
}) {
  const [isChangelogOpen, setChangelogOpen] = useState(initialChangelogOpen);
  const [activeHelp, setActiveHelp] = useState<HelpSurface | null>(null);
  const openHelp = useCallback((surface: HelpSurface) => { setChangelogOpen(false); setActiveHelp(surface); }, []);
  const closeHelp = useCallback((surface: HelpSurface) => { setActiveHelp(value => value === surface ? null : value); }, []);

  const value = useMemo(
    () => ({ isChangelogOpen, setChangelogOpen, setupPriority, activeHelp, openHelp, closeHelp }),
    [isChangelogOpen, setupPriority, activeHelp, openHelp, closeHelp]
  );

  return (
    <DashboardOverlayContext.Provider value={value}>
      {children}
    </DashboardOverlayContext.Provider>
  );
}

export function useDashboardOverlay() {
  return useContext(DashboardOverlayContext);
}
