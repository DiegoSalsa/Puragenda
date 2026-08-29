"use client";

import { useState } from "react";

const REQUEST_TYPES = [
  ["ACCESS", "Acceso a mis datos"],
  ["RECTIFICATION", "Rectificación"],
  ["SUPPRESSION", "Supresión"],
  ["OPPOSITION", "Oposición a un tratamiento"],
  ["PORTABILITY", "Portabilidad"],
  ["BLOCKING", "Bloqueo temporal"],
] as const;

export function PrivacyRequestForm() {
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({ kind: "idle" });
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus({ kind: "idle" });
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/privacy/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          requestType: form.get("requestType"),
          name: form.get("name"),
          email: form.get("email"),
          details: form.get("details"),
          visitorId: window.localStorage.getItem("puragenda_tracking_visitor_id") || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ kind: "error", message: payload.error || "No se pudo enviar la solicitud." });
        return;
      }
      event.currentTarget.reset();
      setStatus({ kind: "success", message: `Solicitud recibida. Guarda esta referencia: ${payload.reference}.` });
    } catch {
      setStatus({ kind: "error", message: "No se pudo conectar con el servicio. Intenta nuevamente." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="requestType" className="text-xs font-black uppercase tracking-wider">Tipo de solicitud</label>
        <select id="requestType" name="requestType" required className="mt-2 w-full border-2 border-black bg-white px-3 py-3 text-sm font-medium">
          {REQUEST_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-xs font-black uppercase tracking-wider">Nombre</label>
          <input id="name" name="name" required minLength={2} maxLength={120} autoComplete="name" className="mt-2 w-full border-2 border-black bg-white px-3 py-3 text-sm" />
        </div>
        <div>
          <label htmlFor="email" className="text-xs font-black uppercase tracking-wider">Correo</label>
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 w-full border-2 border-black bg-white px-3 py-3 text-sm" />
        </div>
      </div>
      <div>
        <label htmlFor="details" className="text-xs font-black uppercase tracking-wider">Detalle</label>
        <textarea id="details" name="details" required minLength={10} maxLength={4000} rows={6} className="mt-2 w-full resize-y border-2 border-black bg-white px-3 py-3 text-sm" placeholder="Indica qué datos o tratamiento quieres consultar o gestionar." />
      </div>
      {status.kind !== "idle" && <p aria-live="polite" className={`border-2 border-black p-3 text-sm font-bold ${status.kind === "success" ? "bg-[#BFFCC6]" : "bg-[#FFB5E8]"}`}>{status.message}</p>}
      <button type="submit" disabled={pending} className="w-full border-4 border-black bg-[#FFF5BA] px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_#000] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
        {pending ? "Enviando…" : "Enviar solicitud"}
      </button>
      <p className="text-xs font-medium leading-5 text-black/60">Consulta la <a href="/politica-de-privacidad" className="font-bold underline">política de privacidad</a> para conocer finalidades, proveedores y periodos de conservación.</p>
    </form>
  );
}
