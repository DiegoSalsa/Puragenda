"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COMMERCIAL_CATALOG_VERSION, COMMERCIAL_MAX_PROFESSIONALS, quoteCommercialContract, type CommercialPlanCode, type CommercialBillingCycle } from "@/core/commercial-catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { expansionAmount } from "@/core/commercial-billing-policy";

type State = { enabled: boolean; contractHash: string; plan: CommercialPlanCode; professionalTotal: number; billingCycle: CommercialBillingCycle; total: number;
  status: string; trialEnd: string | null; periodEnd: string | null; periodStart: string | null; renewalAt: string | null;
  hasProvider: boolean; cancellationStatus: string | null; operation: { id: string; status: string; kind: string; effectiveAt: string } | null;
  reconcileOperationId: string | null; paymentStatus: string | null };
const money = (total: number) => `$${total.toLocaleString("es-CL")} CLP`;
const date = (value: string) => new Date(value).toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
const options = Array.from({ length: COMMERCIAL_MAX_PROFESSIONALS }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i ? "profesionales" : "profesional"}` }));
const paymentLabels: Record<string, string> = { CONFIRMED: "Aprobado", PENDING: "Pendiente", REJECTED: "Rechazado. Revisa el medio de pago en Mercado Pago.", REFUNDED: "Reembolsado", CHARGEBACK: "Pago desconocido" };
const operationLabels: Record<string, string> = { PREPARED: "Contratación preparada", EXECUTING: "Confirmando con Mercado Pago", UNKNOWN: "Estamos verificando el resultado con Mercado Pago. No inicies otra contratación.", AWAITING_PAYMENT: "Autorización o pago pendiente en Mercado Pago", SCHEDULED: "Cambio programado para la siguiente renovación", CANCELLED: "Cancelado", APPLIED: "Confirmado" };
export function CommercialSubscriptionPanel() {
  const router = useRouter(), returned = useRef(false), key = useRef<string | null>(null);
  const [state, setState] = useState<State | null>(null), [plan, setPlan] = useState<CommercialPlanCode>("PURAGENDA"), [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [accepted, setAccepted] = useState(false), [cancelling, setCancelling] = useState(false);
  async function load() {
    const response = await fetch("/api/dashboard/subscription/billing", { cache: "no-store" });
    if (!response.ok) throw new Error("load");
    const value: State = await response.json(); setState(value); setPlan(value.plan); setCount(value.professionalTotal); return value;
  }
  useEffect(() => { let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/dashboard/subscription/billing", { cache: "no-store" });
        if (!response.ok || !active) return;
        const value: State = await response.json(); setState(value); setPlan(value.plan); setCount(value.professionalTotal);
        if (!returned.current && new URLSearchParams(window.location.search).has("billing_return") && value.enabled && value.reconcileOperationId) {
          returned.current = true;
          await fetch("/api/dashboard/subscription/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "RECONCILE", operationId: value.reconcileOperationId }) });
          if (active) { await load(); router.refresh(); }
        }
      } catch { if (active) setMessage("No se pudo consultar la suscripción. Vuelve a cargar la página."); }
    })(); return () => { active = false; };
  }, [router]);
  if (!state) return <p className="mt-4 text-sm" role="status">{message || "Consultando tu suscripción…"}</p>;
  const changed = plan !== state.plan || count !== state.professionalTotal;
  const quote = quoteCommercialContract({ plan, professionalTotal: count, billingCycle: state.billingCycle, catalogVersion: COMMERCIAL_CATALOG_VERSION });
  const current = quoteCommercialContract({ plan: state.plan, professionalTotal: state.professionalTotal, billingCycle: state.billingCycle, catalogVersion: COMMERCIAL_CATALOG_VERSION });
  const paid = !!state.periodEnd && new Date(state.periodEnd) > new Date() && state.status === "ACTIVE";
  const expansion = changed && count >= state.professionalTotal && (plan === state.plan || plan === "PURAGENDA_PLUS");
  const instant = paid && expansion && state.periodStart && state.periodEnd ? expansionAmount({ plan: state.plan, professionalTotal: state.professionalTotal, billingCycle: state.billingCycle }, { plan, professionalTotal: count, billingCycle: state.billingCycle }, new Date(state.periodStart), new Date(state.periodEnd), new Date()) : 0;
  const trial = state.trialEnd && new Date(state.trialEnd) > new Date() && state.status === "TRIALING";
  async function run(action: "SUBSCRIBE" | "CHANGE" | "RECONCILE" | "CANCEL", openCheckout = false) {
    if (busy) return; setBusy(true); setMessage("");
    key.current ??= crypto.randomUUID();
    try {
      const body = action === "CANCEL" ? { action, accepted: true } : action === "RECONCILE" ? { action, operationId: state!.reconcileOperationId } : {
        action, idempotencyKey: key.current, accepted: true, expectedContractHash: state!.contractHash, ...(action === "CHANGE" ? { selection: { plan, professionalTotal: count, billingCycle: state!.billingCycle } } : {}),
      };
      const response = await fetch(action === "SUBSCRIBE" ? "/api/billing/subscribe" : "/api/dashboard/subscription/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error === "ACTIVE_PROFESSIONALS_EXCEED_SELECTION" ? "Desactiva los profesionales que superan el nuevo cupo antes de reducirlo." : result.error === "V2_OPERATION_ALREADY_OPEN" ? "Hay una operación pendiente. Comprueba su estado antes de continuar." : "No se pudo confirmar la operación. Comprueba el estado antes de volver a intentarlo."); await load(); return; }
      if (openCheckout && result.checkoutUrl) {
        const url = new URL(result.checkoutUrl);
        if (url.protocol !== "https:" || !["www.mercadopago.cl", "sandbox.mercadopago.cl"].includes(url.hostname)) throw new Error("url");
        window.location.assign(url.href); return;
      }
      setMessage(operationLabels[result.status] ?? "Estado actualizado."); key.current = null; setAccepted(false); setCancelling(false); await load(); router.refresh();
    } catch { setMessage("No se pudo confirmar el resultado. Usa «Comprobar estado» antes de volver a contratar."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3 border-t border-black/10 pt-4 text-sm">
    <p>{state.professionalTotal} {state.professionalTotal === 1 ? "profesional" : "profesionales"} · {state.billingCycle === "ANNUAL" ? "Anual · 12 meses pagando 10" : "Mensual"} · {money(state.total)}, IVA incluido.</p>
    {trial && <p>Prueba gratuita hasta el {date(state.trialEnd!)}. Si autorizas ahora, el primer cobro se programa al terminar tu prueba.</p>}
    {state.renewalAt && !state.cancellationStatus && <p>Próxima renovación: {date(state.renewalAt)}.</p>}
    {state.cancellationStatus && <p>Renovación {state.cancellationStatus === "CANCELLED_VERIFIED" ? "cancelada" : state.cancellationStatus === "PAUSED" ? "pausada" : "en proceso de cancelación"}.{paid && ` Acceso pagado hasta el ${date(state.periodEnd!)}.`}</p>}
    {state.paymentStatus && <p role="status">Último pago: {paymentLabels[state.paymentStatus] ?? "En revisión"}.</p>}
    {state.operation && <p role="status">{operationLabels[state.operation.status] ?? "Operación pendiente"}{state.operation.status === "SCHEDULED" && ` · ${date(state.operation.effectiveAt)}`}.</p>}
    {!state.enabled && <p>La contratación con Mercado Pago aún no está habilitada en este entorno.</p>}
    {paid && !state.operation && !state.cancellationStatus && <>
      <div className="flex flex-wrap gap-3">
        <Select value={plan} items={[{ value: "PURAGENDA", label: "Puragenda" }, { value: "PURAGENDA_PLUS", label: "Puragenda+" }]} onValueChange={value => { if (value) setPlan(value); setAccepted(false); key.current = null; }}><SelectTrigger aria-label="Cambiar plan" disabled={busy} className="w-44 rounded-xl border-2 border-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PURAGENDA">Puragenda</SelectItem><SelectItem value="PURAGENDA_PLUS">Puragenda+</SelectItem></SelectContent></Select>
        <Select value={count} items={options} onValueChange={value => { if (value) setCount(value); setAccepted(false); key.current = null; }}><SelectTrigger aria-label="Profesionales del plan" disabled={busy} className="w-48 rounded-xl border-2 border-black"><SelectValue /></SelectTrigger><SelectContent className="max-h-64">{options.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
      </div>
      {changed && <p>{expansion ? `Ampliación al confirmar el pago: aproximadamente ${money(instant)} por el tiempo restante hasta el ${date(state.periodEnd!)}. El importe exacto queda fijado al continuar.` : `Cambio desde el ${date(state.periodEnd!)}; mantienes tu plan actual hasta esa fecha.`} Próximas renovaciones: {money(quote.cycleTotal)}/{state.billingCycle === "ANNUAL" ? "año" : "mes"}, IVA incluido.</p>}
    </>}
    {!state.operation && ((!paid && (!state.hasProvider || state.cancellationStatus === "CANCELLED_VERIFIED")) || changed) && <>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1 accent-[#7C3AED]" checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy || !state.enabled} />
        <span>Autorizo {changed ? "el cambio y sus cobros indicados" : `el cobro ${state.billingCycle === "ANNUAL" ? "anual" : "mensual"} de ${money(current.cycleTotal)}${trial ? ` desde el ${date(state.trialEnd!)}` : " al completar el checkout"}`} y las renovaciones automáticas. Puedo cancelar la renovación desde aquí.</span></label>
      <button disabled={busy || !state.enabled || !accepted} onClick={() => run(changed ? "CHANGE" : "SUBSCRIBE", true)} className="rounded-xl border-2 border-black bg-[#E9D8FF] px-4 py-2 font-bold disabled:opacity-50">{busy ? "Confirmando…" : changed ? "Confirmar cambio" : "Contratar con Mercado Pago"}</button>
    </>}
    <div className="flex flex-wrap gap-3">
      {state.reconcileOperationId && <button disabled={busy || !state.enabled} onClick={() => run("RECONCILE", state.operation?.status === "AWAITING_PAYMENT" || state.operation?.status === "PREPARED" || state.paymentStatus === "REJECTED")} className="rounded-xl border-2 border-black px-4 py-2 font-bold disabled:opacity-50">{state.operation?.status === "AWAITING_PAYMENT" || state.operation?.status === "PREPARED" ? "Continuar en Mercado Pago" : state.paymentStatus === "REJECTED" ? "Revisar pago en Mercado Pago" : "Comprobar estado"}</button>}
      {state.hasProvider && state.cancellationStatus !== "CANCELLED_VERIFIED" && <button disabled={busy || !state.enabled} onClick={() => setCancelling(true)} className="rounded-xl border border-black/30 px-4 py-2 disabled:opacity-50">Cancelar renovación</button>}
    </div>
    {cancelling && <div className="space-y-2 rounded-xl border-2 border-black p-3"><p>Detendremos los próximos cobros. {paid ? `Conservas acceso hasta el ${date(state.periodEnd!)}.` : "La prueba conserva su fecha original."} Al terminar, se suspenden las funciones de pago. Cancelar no elimina tus datos; se aplica la <a href="/politica-de-privacidad" className="underline">política de privacidad y retención</a>.</p><button disabled={busy} onClick={() => run("CANCEL")} className="rounded-lg border-2 border-black px-3 py-2 font-bold">Confirmar cancelación</button> <button disabled={busy} onClick={() => setCancelling(false)} className="px-3 py-2 underline">Volver</button></div>}
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
