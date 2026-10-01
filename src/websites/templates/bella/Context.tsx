"use client";
import { createContext, useContext, useMemo } from "react";
import type { BellaView } from "./types";
import { createWebsiteApi } from "../../booking/client";
export { createWebsiteApi } from "../../booking/client";
const Context = createContext<(BellaView & { api: ReturnType<typeof createWebsiteApi> }) | null>(null);
export function BellaProvider({ view, children }: { view: BellaView; children?: React.ReactNode }) {
  const api = useMemo(() => createWebsiteApi(view.catalog, view.preview, view.business.id.startsWith("fixture-")), [view.catalog, view.preview, view.business.id]);
  return <Context.Provider value={{ ...view, api }}>{children}</Context.Provider>;
}
export function useBella() { const context = useContext(Context); if (!context) throw new Error("Bella provider requerido"); return context; }
