"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMERCIAL_CATALOG_VERSION, COMMERCIAL_MAX_PROFESSIONALS, quoteCommercialContract, type CommercialPlanCode, type CommercialBillingCycle } from "@/core/commercial-catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const seats = Array.from({ length: COMMERCIAL_MAX_PROFESSIONALS }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i ? "profesionales" : "profesional"}` }));
export function CommercialTrialPanel(props: { plan: CommercialPlanCode; professionalTotal: number; billingCycle: CommercialBillingCycle; trialEnd: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState(props.plan), [count, setCount] = useState(props.professionalTotal), [cycle, setCycle] = useState(props.billingCycle);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const quote = quoteCommercialContract({ plan, professionalTotal: count, billingCycle: cycle, catalogVersion: COMMERCIAL_CATALOG_VERSION });
  const changed = plan !== props.plan || count !== props.professionalTotal || cycle !== props.billingCycle;
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/dashboard/subscription/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, professionalTotal: count, billingCycle: cycle, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error === "ACTIVE_PROFESSIONALS_EXCEED_SELECTION" ? "Desactiva los profesionales que superan el nuevo cupo antes de reducirlo." : "No se pudo cambiar la selección. Comprueba que la prueba siga vigente."); return; }
      setMessage("Selección actualizada. La fecha de vencimiento de tu prueba se mantiene."); router.refresh();
    } catch { setMessage("No se pudo confirmar el cambio. Actualiza la página antes de volver a intentarlo."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 border-t border-black/10 pt-4 text-sm">
    <p className="font-bold">Tu prueba termina el {new Date(props.trialEnd).toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}. Puedes ajustar tu selección durante la prueba.</p>
    <div className="flex flex-wrap gap-3">
      <Select value={plan} onValueChange={value => value && setPlan(value)} items={[{ value: "PURAGENDA", label: "Puragenda" }, { value: "PURAGENDA_PLUS", label: "Puragenda+" }]}><SelectTrigger aria-label="Plan de la prueba" disabled={busy} className="w-44 rounded-xl border-2 border-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PURAGENDA">Puragenda</SelectItem><SelectItem value="PURAGENDA_PLUS">Puragenda+</SelectItem></SelectContent></Select>
      <Select value={count} onValueChange={value => value && setCount(value)} items={seats}><SelectTrigger aria-label="Profesionales de la prueba" disabled={busy} className="w-48 rounded-xl border-2 border-black"><SelectValue /></SelectTrigger><SelectContent className="max-h-64">{seats.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
      <Select value={cycle} onValueChange={value => value && setCycle(value)} items={[{ value: "MONTHLY", label: "Mensual" }, { value: "ANNUAL", label: "Anual · 2 meses gratis" }]}><SelectTrigger aria-label="Período elegido" disabled={busy} className="w-56 rounded-xl border-2 border-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MONTHLY">Mensual</SelectItem><SelectItem value="ANNUAL">Anual · 2 meses gratis</SelectItem></SelectContent></Select>
    </div>
    <p>Al contratar: ${quote.cycleTotal.toLocaleString("es-CL")} CLP/{cycle === "ANNUAL" ? "año" : "mes"}, IVA incluido. La prueba es gratuita y no activa cobros automáticos.</p>
    <button disabled={busy || !changed} onClick={save} className="rounded-xl border-2 border-black bg-[#E9D8FF] px-4 py-2 font-bold disabled:opacity-50">{busy ? "Guardando…" : "Actualizar selección de prueba"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
