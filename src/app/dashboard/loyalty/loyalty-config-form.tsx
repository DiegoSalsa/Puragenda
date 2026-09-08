"use client";

import { useState } from "react";
import { DollarSign, Gift, Loader2, Minus, Percent, Plus, Save, Sparkles, Stamp } from "@/components/icons/hover-icons";
import { LoyaltyCard } from "@/components/loyalty/loyalty-card";
import { loyaltyRewardLabel, type LoyaltyRewardKind } from "@/core/loyalty";
import { adjustClientLoyaltyStampsAction } from "@/server/actions/loyalty.actions";
import { saveLoyaltyConfigAction } from "@/server/actions/dashboard.actions";

type Props = {
  initialData: {
    isLoyaltyEnabled: boolean; stampsRequired: number; rewardName: string;
    rewardType: LoyaltyRewardKind; discountValue: number; rewardServiceId: string | null;
    expirationDays: number | null; loyaltyCodePrefix: string;
  };
  business: { name: string; logoUrl: string | null; currencyCode: string };
  services: { id: string; name: string; price: number }[];
  clients: { id: string; name: string; email: string; currentStamps: number }[];
};

const rewardOptions: { type: LoyaltyRewardKind; label: string; icon: typeof Gift; color: string }[] = [
  { type: "PERCENTAGE", label: "% Descuento", icon: Percent, color: "bg-[#ffb5e8]" },
  { type: "FIXED", label: "$ Descuento", icon: DollarSign, color: "bg-[#fff5ba]" },
  { type: "FREE_SERVICE", label: "Servicio gratis", icon: Stamp, color: "bg-[#bffcc6]" },
  { type: "CUSTOM", label: "Premio personalizado", icon: Sparkles, color: "bg-[#c4b5fd]" },
];

function ManualAdjustmentRow({ client, required }: { client: Props["clients"][number]; required: number }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function adjust(delta: -1 | 1) {
    setBusy(true); setMessage("");
    const result = await adjustClientLoyaltyStampsAction({ clientId: client.id, delta, reason });
    setMessage(result.error ?? "Ajuste registrado"); setBusy(false);
  }
  return <div className="grid gap-3 border-t-2 border-black/10 px-4 py-4 first:border-t-0 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
    <div className="min-w-0"><p className="truncate font-black">{client.name}</p><p className="truncate text-xs font-semibold text-black/50">{client.email} · {client.currentStamps}/{required}</p></div>
    <div><label className="sr-only" htmlFor={`reason-${client.id}`}>Motivo del ajuste para {client.name}</label><input id={`reason-${client.id}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obligatorio" maxLength={240} className="h-10 w-full rounded-xl border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#c4b5fd]" />{message && <p className="mt-1 text-xs font-bold">{message}</p>}</div>
    <div className="flex gap-2"><button type="button" disabled={busy || client.currentStamps === 0} onClick={() => adjust(-1)} aria-label={`Restar un timbre a ${client.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#fff5ba] shadow-[2px_2px_0_#000] disabled:opacity-40"><Minus className="h-4 w-4" /></button><button type="button" disabled={busy} onClick={() => adjust(1)} aria-label={`Sumar un timbre a ${client.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#bffcc6] shadow-[2px_2px_0_#000] disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</button></div>
  </div>;
}

export function LoyaltyConfigForm({ initialData, business, services, clients }: Props) {
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const selectedService = services.find((service) => service.id === form.rewardServiceId);
  const rewardLabel = loyaltyRewardLabel({ rewardType: form.rewardType, discountValue: form.discountValue, freeServiceName: selectedService?.name, rewardName: form.rewardName, currencyCode: business.currencyCode });

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const result = await saveLoyaltyConfigAction(form);
    setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "Programa guardado" });
    setSaving(false);
  }

  return <div className="space-y-8">
    <form onSubmit={save} className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
      <div className="space-y-5">
        <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]">
          <div className="flex items-start justify-between gap-4"><div><p className="font-black">Programa de fidelización</p><p className="mt-1 text-sm font-medium text-black/55">Premia automáticamente a tus clientes cuando completan sus visitas.</p></div><button type="button" role="switch" aria-checked={form.isLoyaltyEnabled} onClick={() => setForm((current) => ({ ...current, isLoyaltyEnabled: !current.isLoyaltyEnabled }))} className={`relative h-9 w-16 shrink-0 rounded-full border-3 border-black transition-colors ${form.isLoyaltyEnabled ? "bg-[#bffcc6]" : "bg-black/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full border-2 border-black bg-white transition-transform ${form.isLoyaltyEnabled ? "translate-x-7" : "translate-x-1"}`} /></button></div>
        </section>

        <fieldset disabled={!form.isLoyaltyEnabled} className="space-y-5 disabled:opacity-50">
          <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><legend className="px-1 text-lg font-black">1. Meta</legend><p className="mb-4 text-sm font-semibold text-black/60">¿Cada cuántas visitas quieres premiar a tus clientes?</p><div className="grid grid-cols-5 gap-2">{[5,8,10,12].map((value) => <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, stampsRequired: value }))} className={`rounded-xl border-2 border-black py-2 font-black ${form.stampsRequired === value ? "bg-[#c4b5fd] shadow-[2px_2px_0_#000]" : "bg-white"}`}>{value}</button>)}<label className="sr-only" htmlFor="custom-stamps">Meta personalizada</label><input id="custom-stamps" type="number" min={2} max={30} value={form.stampsRequired} onChange={(event) => setForm((current) => ({ ...current, stampsRequired: Number(event.target.value) }))} className="min-w-0 rounded-xl border-2 border-black px-2 text-center font-black outline-none focus:ring-4 focus:ring-[#c4b5fd]" /></div><p className="mt-3 text-sm font-black">Premia al cliente cada {form.stampsRequired} visitas.</p></section>

          <section className="rounded-2xl border-3 border-black bg-[#fff5ba] p-5 shadow-[4px_4px_0_#000]"><h2 className="font-black">2. Cómo se obtiene un timbre</h2><p className="mt-2 text-sm font-semibold">Cada cita completada entrega 1 timbre. Una llegada o cita en atención todavía no cuenta.</p></section>

          <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><h2 className="text-lg font-black">3. Premio</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{rewardOptions.map(({ type, label, icon: Icon, color }) => <button key={type} type="button" onClick={() => setForm((current) => ({ ...current, rewardType: type }))} aria-pressed={form.rewardType === type} className={`${color} flex items-center gap-3 rounded-2xl border-3 border-black p-4 text-left font-black ${form.rewardType === type ? "shadow-[4px_4px_0_#000] -translate-y-0.5" : "opacity-70"}`}><Icon className="h-5 w-5" />{label}</button>)}</div>
            <div className="mt-5 space-y-4">
              {(form.rewardType === "PERCENTAGE" || form.rewardType === "FIXED") && <div><label htmlFor="discount-value" className="text-sm font-black">{form.rewardType === "PERCENTAGE" ? "Porcentaje" : "Monto"}</label><input id="discount-value" type="number" min={1} max={form.rewardType === "PERCENTAGE" ? 100 : undefined} value={form.discountValue} onChange={(event) => setForm((current) => ({ ...current, discountValue: Number(event.target.value) }))} className="mt-1 h-11 w-full rounded-xl border-2 border-black bg-[#fffaf0] px-4 font-black outline-none focus:ring-4 focus:ring-[#ffb5e8]" /></div>}
              {form.rewardType === "FREE_SERVICE" && <div><label htmlFor="reward-service" className="text-sm font-black">Servicio gratuito</label><select id="reward-service" value={form.rewardServiceId ?? ""} onChange={(event) => setForm((current) => ({ ...current, rewardServiceId: event.target.value || null }))} className="mt-1 h-11 w-full rounded-xl border-2 border-black bg-[#fffaf0] px-3 font-bold"><option value="">Selecciona un servicio</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><p className="mt-2 text-xs font-semibold text-black/55">Cubre el precio base del servicio. Opciones y adicionales se cobran normalmente.</p></div>}
              <div><label htmlFor="reward-name" className="text-sm font-black">Nombre del premio {form.rewardType === "CUSTOM" ? "*" : "(opcional)"}</label><input id="reward-name" value={form.rewardName} onChange={(event) => setForm((current) => ({ ...current, rewardName: event.target.value }))} placeholder={form.rewardType === "CUSTOM" ? "Ej: Masaje capilar de regalo" : "Ej: Tu premio especial"} className="mt-1 h-11 w-full rounded-xl border-2 border-black bg-[#fffaf0] px-4 font-bold outline-none focus:ring-4 focus:ring-[#ffb5e8]" /></div>
              {form.rewardType === "CUSTOM" && <p className="rounded-xl border-2 border-black bg-[#c4b5fd]/50 p-3 text-sm font-black">Beneficio a coordinar con el negocio. No modifica el precio automáticamente.</p>}
            </div>
          </section>

          <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><h2 className="text-lg font-black">4. Vigencia</h2><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{v:null,l:"Sin vencimiento"},{v:30,l:"30 días"},{v:60,l:"60 días"},{v:90,l:"90 días"}].map((option) => <button key={option.l} type="button" onClick={() => setForm((current) => ({ ...current, expirationDays: option.v }))} className={`rounded-xl border-2 border-black px-2 py-3 text-xs font-black ${form.expirationDays === option.v ? "bg-[#bffcc6] shadow-[2px_2px_0_#000]" : "bg-white"}`}>{option.l}</button>)}</div></section>

          <details className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><summary className="cursor-pointer font-black">Opciones avanzadas</summary><div className="mt-4"><label htmlFor="reward-prefix" className="text-sm font-black">Prefijo del código</label><input id="reward-prefix" maxLength={16} value={form.loyaltyCodePrefix} onChange={(event) => setForm((current) => ({ ...current, loyaltyCodePrefix: event.target.value.toUpperCase() }))} className="mt-1 h-11 w-full rounded-xl border-2 border-black px-4 font-mono font-black uppercase" /><p className="mt-2 text-xs font-semibold text-black/50">Ejemplo: {(form.loyaltyCodePrefix || "PREMIO").toUpperCase()}-A1B2C3</p></div></details>
        </fieldset>

        <div className="flex items-center gap-4"><button type="submit" disabled={saving} className="inline-flex h-12 items-center gap-2 rounded-xl border-3 border-black bg-[#bffcc6] px-6 font-black shadow-[4px_4px_0_#000] disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Guardar programa</button>{message && <p role="status" className={`text-sm font-black ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}</div>
      </div>

      <aside className="xl:sticky xl:top-6"><p className="mb-3 text-sm font-black uppercase tracking-[0.13em]">Así lo verán tus clientes</p><LoyaltyCard businessName={business.name} logoUrl={business.logoUrl} currentStamps={Math.min(3, form.stampsRequired - 1)} stampsRequired={form.stampsRequired} rewardLabel={rewardLabel} enabled={form.isLoyaltyEnabled} /></aside>
    </form>

    <section className="overflow-hidden rounded-2xl border-3 border-black bg-white shadow-[5px_5px_0_#000]"><div className="bg-[#c4b5fd] p-5"><h2 className="text-lg font-black">Ajustes manuales</h2><p className="text-sm font-semibold">Todo ajuste exige un motivo y queda registrado en el historial.</p></div>{clients.length ? clients.map((client) => <ManualAdjustmentRow key={client.id} client={client} required={form.stampsRequired} />) : <p className="p-5 text-sm font-semibold">Todavía no hay clientes.</p>}</section>
  </div>;
}
