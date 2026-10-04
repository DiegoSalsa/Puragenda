"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { activateWebsiteAddon } from "@/server/actions/website.actions";
import { track } from "@/lib/analytics/client";

export type PurchaseFlowProps = {
  plan: "INDIVIDUAL" | "EQUIPO"; cycle: "monthly" | "annual"; extras: number;
  basePaid: boolean; basePastDue: boolean; basePending: boolean; basePrice: number;
  websitePrice: number; websiteActive: boolean; websitePending: boolean; websitePastDue: boolean;
  enabled: boolean; intentSaved: boolean;
  baseJustActivated?: boolean;
};
export function PurchaseFlow(props: PurchaseFlowProps) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const activationTracked = useRef(false);
  useEffect(() => {
    if (props.baseJustActivated && !activationTracked.current) {
      activationTracked.current = true;
      track("base_subscription_activated", { plan: props.plan, billing_cycle: props.cycle });
    }
  }, [props.baseJustActivated, props.plan, props.cycle]);
  async function run(action: "base" | "refresh" | "website") {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage("");
    try {
      if (!props.intentSaved && action !== "refresh") {
        const saved = await fetch("/api/websites/purchase-intent", { method: "POST" });
        if (!saved.ok) throw new Error((await saved.json()).error || "No se pudo guardar la selección.");
      }
      if (action === "refresh") {
        const res = await fetch("/api/billing/verify", { method: "POST" });
        if (!res.ok) throw new Error("No se pudo comprobar el pago. Intenta nuevamente.");
        const state = await res.json();
        if (state.status === "ACTIVE") window.location.reload();
        else setMessage("Estamos confirmando tu suscripción Puragenda. Puedes volver a comprobarla.");
      } else if (action === "base") {
        const res = await fetch("/api/billing/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: props.plan, extraStaffCount: props.extras }) });
        const data = await res.json();
        if (!res.ok || !data.init_point) throw new Error(data.error || "No se pudo abrir el checkout Puragenda.");
        if (!data.reused) track("checkout_started", { plan: props.plan, provider: "mercadopago", extra_staff: props.extras, website_intent: true });
        window.location.assign(data.init_point);
      } else {
        track("website_purchase_continued", { plan: props.plan, billing_cycle: props.cycle });
        const result = await activateWebsiteAddon();
        if ("error" in result) throw new Error(result.error);
        if (!("checkoutUrl" in result)) throw new Error("No se pudo abrir el checkout del sitio.");
        window.location.assign(result.checkoutUrl);
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : "Intenta nuevamente."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const money = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
  const button = "rounded-xl border-4 border-black bg-[#BFFCC6] px-4 py-3 font-black text-black shadow-[4px_4px_0_#000] disabled:opacity-50";
  return <div className="space-y-6">
    <h1 className="text-3xl font-black uppercase">Puragenda + Sitio Web</h1>
    <p className="font-bold">Dos suscripciones recurrentes independientes. Contratas cada una por separado y puedes cancelar el sitio sin cancelar la agenda.</p>
    <section className="space-y-4 rounded-2xl border-4 border-black bg-[#FFF5BA] p-5 text-black">
      <h2 className="text-xl font-black">Paso 1 de 2 — Puragenda</h2>
      <p className="font-bold">{props.plan === "EQUIPO" ? "Equipo" : "Individual"}: {money(props.basePrice)}/{props.cycle === "annual" ? "año" : "mes"}{props.extras ? ` · ${props.extras} profesionales extra` : ""}</p>
      {props.basePaid ? <p className="font-black">✓ Suscripción Puragenda confirmada</p> : props.basePastDue ? <><p>Regulariza tu suscripción Puragenda antes de contratar el sitio.</p><Link className="font-black underline" href="/dashboard/settings">Regularizar Puragenda</Link></> : <>
        <p>{props.basePending ? "Estamos confirmando tu suscripción Puragenda." : "Activa Puragenda para continuar. La prueba de 30 días no activa ni cobra Sitio Web."}</p>
        <div className="flex flex-wrap gap-4">
          <button disabled={busy} onClick={() => run("base")} className={button}>{props.basePending ? "Volver al checkout Puragenda" : "Contratar Puragenda"}</button>
          {props.basePending && <button disabled={busy} onClick={() => run("refresh")} className={button}>Comprobar suscripción</button>}
        </div>
      </>}
    </section>
    <section className="space-y-4 rounded-2xl border-4 border-black bg-[#85E3FF] p-5 text-black">
      <h2 className="text-xl font-black">Paso 2 de 2 — Sitio Web</h2>
      <p className="font-bold">{money(props.websitePrice)}/mes. {props.cycle === "annual" && "Tu plan Puragenda se factura anualmente y el sitio web mensualmente."}</p>
      {props.websiteActive ? <><p className="font-black">✓ Sitio Web activo</p><Link className="font-black underline" href="/dashboard/website">Administrar mi sitio</Link></> : props.websitePastDue ? <><p>Regulariza el complemento existente; no se creará otra suscripción.</p><Link href="/dashboard/website" className="font-black underline">Regularizar Sitio Web</Link></> : props.websitePending ? <><p>Estamos confirmando la suscripción del sitio. Volver del proveedor no activa el sitio; el pago verificado debe confirmarse.</p><Link href="/dashboard/website" className="font-black underline">Ver estado del sitio</Link></> : !props.enabled ? <p className="font-bold">Contratación pública del sitio próximamente. Guardamos tu selección; no se cobra ni activa automáticamente.</p> : <>
        <p>{props.basePaid ? "Con tu agenda confirmada, puedes contratar el sitio. El sitio se habilita cuando el proveedor confirma su pago." : "Primero confirma el pago de Puragenda. El sitio no tiene una prueba gratuita Standard."}</p>
        <button disabled={busy || !props.basePaid} onClick={() => run("website")} className={button}>Continuar con Sitio Web</button>
      </>}
    </section>
    {message && <p role="status" className="rounded-xl border-2 border-black bg-white p-3 font-bold text-black">{message}</p>}
    <div className="flex flex-wrap gap-5 font-bold underline"><Link href="/dashboard">Ir a mi agenda</Link><Link href="/dashboard/website">Editar o administrar mi sitio</Link></div>
  </div>;
}
