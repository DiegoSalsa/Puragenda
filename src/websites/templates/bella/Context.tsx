"use client";
import { createContext, useContext, useMemo } from "react";
import type { WebsiteView } from "../../types";
import type { Availability, AvailabilityQuery, BookingRequest, BookingResult, Catalog } from "./_lib/puragenda/types";
import { BookingError } from "./_lib/puragenda/errors";
import { demoAvailability } from "../../fixtures/catalog";
const Context = createContext<(WebsiteView & { api: ReturnType<typeof createWebsiteApi> }) | null>(null);
export function createWebsiteApi(catalog: Catalog, preview: boolean, demonstration = false) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try { response = await fetch(`/api/website/${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(20000) }); }
    catch (error) { if (init?.method !== "POST" && error instanceof Error && error.name === "AbortError") throw error; throw new BookingError(init?.method === "POST" ? "UNCERTAIN" : "NETWORK", "No pudimos verificar la respuesta. Consulta al negocio antes de reenviar una reserva."); }
    let body;
    try { body = await response.json(); } catch { throw new BookingError(init?.method === "POST" ? "UNCERTAIN" : "UPSTREAM", "Respuesta sin resultado verificable."); }
    if (!response.ok) throw new BookingError(response.status === 409 ? "CONFLICT" : response.status >= 500 && init?.method === "POST" ? "UNCERTAIN" : "UPSTREAM", body.error ?? "No pudimos consultar la agenda.", response.status);
    return body as T;
  }
  return {
    catalog: async () => catalog,
    availability: async (query: AvailabilityQuery, signal?: AbortSignal): Promise<Availability> => {
      // Synthetic slots exist only for explicitly identified demonstration data.
      if (preview && demonstration) return demoAvailability(query, new Date(), catalog);
      const params = new URLSearchParams({ ...query, optionIds: query.optionIds.join(",") });
      if (preview) params.set("preview", "1");
      return request<Availability>(`availability?${params}`, { signal });
    },
    book: (input: BookingRequest, key: string) => preview ? Promise.reject(new BookingError("VALIDATION", "La vista previa no crea reservas")) : request<BookingResult>("book", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(input) }),
  };
}
export function BellaProvider({ view, children }: { view: WebsiteView; children: React.ReactNode }) {
  const api = useMemo(() => createWebsiteApi(view.catalog, view.preview, view.business.id.startsWith("fixture-")), [view.catalog, view.preview, view.business.id]);
  return <Context.Provider value={{ ...view, api }}>{children}</Context.Provider>;
}
export function useBella() { const context = useContext(Context); if (!context) throw new Error("Bella provider requerido"); return context; }
