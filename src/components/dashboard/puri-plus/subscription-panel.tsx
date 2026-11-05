"use client";
import { useEffect, useState } from "react";
import { commercialStatusLabel } from "@/core/commercial-display";
type Data = { totalPriceClp: number | null; billingCycle: string; professionalTotal: number; status: string; paymentStatus: string | null; periodEnd: string | null; revision: string;
  cancellationStatus: string | null; renewalCancelled: boolean; operationStatus: string | null; configured: boolean; canCheckout: boolean; canCancel: boolean;
  result?: { checkoutUrl?: string | null; status?: string } };
export function CommercialSubscriptionPanel() {
  const [data, setData] = useState<Data | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dashboard/puri-plus/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "LOAD" }), signal: controller.signal })
      .then(async r => { if (r.ok) setData(await r.json()); }).catch(() => {});
    return () => controller.abort();
  }, []);
  async function act(action: "CHECKOUT" | "CANCEL_RENEWAL" | "RECONCILE_CANCELLATION" | "LOAD") {
    if (!data || busy) return;
    if (action === "CHECKOUT" && !window.confirm(`Puragenda+: $${data.totalPriceClp?.toLocaleString("es-CL")} CLP por período ${data.billingCycle === "ANNUAL" ? "anual" : "mensual"}, IVA incluido, ${data.professionalTotal} profesional(es). Continuarás a Mercado Pago sandbox. El acceso pagado requiere un pago confirmado. ¿Continuar?`)) return;
    if (action === "CANCEL_RENEWAL" && !window.confirm("¿Cancelar la renovación de esta suscripción de prueba en Mercado Pago? Conservarás acceso hasta el final del período pagado confirmado.")) return;
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/dashboard/puri-plus/billing", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, explicit: true, revision: data.revision }) });
      if (!r.ok) throw new Error("No se pudo completar la operación. Actualiza el estado antes de intentarlo de nuevo.");
      const next: Data = await r.json(); setData(next);
      if (next.result?.checkoutUrl) { window.location.assign(next.result.checkoutUrl); return; }
      if (next.result?.status === "UNKNOWN" || next.result?.status === "EXECUTING") setMessage("El resultado está pendiente de conciliación. Actualiza el estado; no se creará otra suscripción.");
      else if (action === "CANCEL_RENEWAL" || action === "RECONCILE_CANCELLATION") setMessage(next.renewalCancelled ? "Renovación cancelada. Tu período pagado se conserva." : "Cancelación pendiente de confirmación.");
      else if (action === "CHECKOUT") setMessage("Checkout preparado. Esperando confirmación del pago.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operación no disponible."); }
    finally { setBusy(false); }
  }
  if (!data) return null;
  return <section aria-label="Gestión de suscripción" className="space-y-3 rounded-2xl border-2 border-black bg-white p-5 text-sm text-black">
    <h2 className="font-black">Tu suscripción Puragenda+</h2>
    <p>Estado: {commercialStatusLabel(data.status)} · Pago: {commercialStatusLabel(data.paymentStatus)}.</p>
    {data.renewalCancelled && <p>Renovación cancelada. Acceso hasta {data.periodEnd ? new Date(data.periodEnd).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "el final del período confirmado"}.</p>}
    {!data.configured && <p>La contratación de prueba aún no está disponible para este negocio.</p>}
    {data.cancellationStatus && !data.renewalCancelled && <p>Cancelación pendiente de conciliación.</p>}
    <div className="flex flex-wrap gap-3">
      {data.canCheckout && <button disabled={busy || !data.configured} onClick={() => act("CHECKOUT")} className="rounded-xl border-2 border-black bg-[#c7f36b] px-4 py-2 font-bold disabled:opacity-50">Contratar por ${data.totalPriceClp?.toLocaleString("es-CL")} CLP / {data.billingCycle === "ANNUAL" ? "año" : "mes"}</button>}
      {data.canCancel && !data.cancellationStatus && <button disabled={busy || !data.configured} onClick={() => act("CANCEL_RENEWAL")} className="rounded-xl border-2 border-black px-4 py-2 font-bold disabled:opacity-50">Cancelar renovación de prueba</button>}
      {data.cancellationStatus && !data.renewalCancelled && <button disabled={busy || !data.configured} onClick={() => act("RECONCILE_CANCELLATION")} className="rounded-xl border-2 border-black px-4 py-2 font-bold disabled:opacity-50">Consultar cancelación</button>}
      <button disabled={busy} onClick={() => act("LOAD")} className="rounded-xl border-2 border-black px-4 py-2 font-bold disabled:opacity-50">Actualizar suscripción</button>
    </div>
    <p role="status" aria-live="polite">{busy ? "Consultando…" : message}</p>
  </section>;
}
