"use client";
import { useState } from "react";
import { COMMERCIAL_CONSENT_TEXT, COMMERCIAL_CONSENT_VERSION } from "@/core/commercial-consent";
type Preference = { businessId: string; name: string; state: string };
export function CommercialPreferences({ initial }: { initial: Preference[] }) {
  const [preferences, setPreferences] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function update(businessId: string, accepted: boolean) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/client-portal/commercial-preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, accepted, textVersion: COMMERCIAL_CONSENT_VERSION }) });
      if (!r.ok) throw new Error("No se pudo guardar la preferencia.");
      setPreferences((await r.json()).preferences);
    } catch { setError("No se pudo guardar la preferencia. Intenta nuevamente."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="commercial-preferences" className="rounded-2xl border-2 border-black bg-white p-5 text-black">
    <h2 id="commercial-preferences" className="text-xl font-black">Comunicaciones comerciales</h2>
    <p className="mt-2 text-sm">{COMMERCIAL_CONSENT_TEXT}</p>
    <p className="mt-2 text-xs">Tus recordatorios de reservas conservan sus preferencias propias.</p>
    {preferences.map(p => <div key={p.businessId} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <div><strong>{p.name}</strong><p className="text-xs">{p.state === "GRANTED" ? "Consentimiento registrado" : p.state === "SUPPRESSED" || p.state === "REVOKED" ? "Baja o supresión vigente" : "Sin consentimiento confirmado"}</p></div>
      <div className="flex flex-wrap gap-2">
        {!["SUPPRESSED", "REVOKED", "GRANTED"].includes(p.state) && <button disabled={busy} className="rounded-lg border-2 border-black px-3 py-2 text-sm font-bold" onClick={() => void update(p.businessId, true)}>Acepto recibir correos</button>}
        {["GRANTED", "PENDING_VERIFICATION"].includes(p.state) && <button disabled={busy} className="rounded-lg border-2 border-black px-3 py-2 text-sm font-bold" onClick={() => void update(p.businessId, false)}>Retirar consentimiento</button>}
      </div>
    </div>)}
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
  </section>;
}
