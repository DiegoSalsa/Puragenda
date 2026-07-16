"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface DashboardOverlayContextValue {
  isChangelogOpen: boolean;
  setChangelogOpen: (open: boolean) => void;
}

const DashboardOverlayContext = createContext<DashboardOverlayContextValue>({
  isChangelogOpen: false,
  setChangelogOpen: () => {},
});

export function DashboardOverlayProvider({
  children,
  initialChangelogOpen,
}: {
  children: React.ReactNode;
  initialChangelogOpen: boolean;
}) {
  const [isChangelogOpen, setChangelogOpen] = useState(initialChangelogOpen);

  const value = useMemo(
    () => ({ isChangelogOpen, setChangelogOpen }),
    [isChangelogOpen]
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
