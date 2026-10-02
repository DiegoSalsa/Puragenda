"use client";
import { createContext, useContext, useMemo } from "react";
import type { WebsiteView } from "../../types";
import type { MatchdayConfig } from "./config";
import { createWebsiteApi } from "../../booking/client";
const Context = createContext<(WebsiteView<MatchdayConfig> & { api: ReturnType<typeof createWebsiteApi> }) | null>(null);
export function Provider({ view, children }: { view: WebsiteView<MatchdayConfig>; children: React.ReactNode }) {
  const api = useMemo(() => createWebsiteApi(view.catalog, view.preview, view.business.id.startsWith("fixture-")), [view.catalog, view.preview, view.business.id]);
  return <Context.Provider value={{ ...view, api }}>{children}</Context.Provider>;
}
export function useMatchday() { const value = useContext(Context); if (!value) throw new Error("Matchday provider requerido"); return value; }
