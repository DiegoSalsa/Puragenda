"use client";

import { useState } from "react";
import { DollarSign, Gift, Loader2, Minus, Percent, Plus, Save, Sparkles, Stamp } from "@/components/icons/hover-icons";
import { LoyaltyCard } from "@/components/loyalty/loyalty-card";
import { loyaltyRewardLabel, type LoyaltyRewardKind } from "@/core/loyalty";
import { adjustClientLoyaltyStampsAction } from "@/server/actions/loyalty.actions";
import { saveLoyaltyConfigAction } from "@/server/actions/dashboard.actions";
import { useLocale, useTranslations } from "next-intl";

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

const rewardOptions: { type: LoyaltyRewardKind; icon: typeof Gift; color: string }[] = [
  { type: "PERCENTAGE", icon: Percent, color: "bg-[#ffb5e8]" },
  { type: "FIXED", icon: DollarSign, color: "bg-[#fff5ba]" },
  { type: "FREE_SERVICE", icon: Stamp, color: "bg-[#bffcc6]" },
  { type: "CUSTOM", icon: Sparkles, color: "bg-[#c4b5fd]" },
];

function ManualAdjustmentRow({ client, required }: { client: Props["clients"][number]; required: number }) {
  const t = useTranslations("loyalty.dashboard");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function adjust(delta: -1 | 1) {
    setBusy(true); setMessage("");
    const result = await adjustClientLoyaltyStampsAction({ clientId: client.id, delta, reason });
    setMessage(result.error ?? t("adjusted")); setBusy(false);
  }
  return <div className="grid gap-3 border-t-2 border-black/10 px-4 py-4 first:border-t-0 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
    <div className="min-w-0"><p className="truncate font-black">{client.name}</p><p className="truncate text-xs font-semibold text-black/50">{client.email} · {client.currentStamps}/{required}</p></div>
    <div><label className="sr-only" htmlFor={`reason-${client.id}`}>{t("adjustmentFor", { name: client.name })}</label><input id={`reason-${client.id}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("adjustmentReason")} maxLength={240} className="h-10 w-full rounded-xl border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-[#c4b5fd]" />{message && <p className="mt-1 text-xs font-bold">{message}</p>}</div>
    <div className="flex gap-2"><button type="button" disabled={busy || client.currentStamps === 0} onClick={() => adjust(-1)} aria-label={t("subtract", { name: client.name })} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#fff5ba] shadow-[2px_2px_0_#000] disabled:opacity-40"><Minus className="h-4 w-4" /></button><button type="button" disabled={busy} onClick={() => adjust(1)} aria-label={t("add", { name: client.name })} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-[#bffcc6] shadow-[2px_2px_0_#000] disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</button></div>
  </div>;
}

export function LoyaltyConfigForm({ initialData, business, services, clients }: Props) {
  const t = useTranslations("loyalty.dashboard");
  const locale = useLocale();
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const selectedService = services.find((service) => service.id === form.rewardServiceId);
  const rewardLabel = loyaltyRewardLabel({ rewardType: form.rewardType, discountValue: form.discountValue, freeServiceName: selectedService?.name, rewardName: form.rewardName, currencyCode: business.currencyCode, locale });

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const result = await saveLoyaltyConfigAction(form);
    setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: t("saved") });
    setSaving(false);
  }

  return <div className="space-y-8">
    <form onSubmit={save} className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
      <div className="space-y-5">
        <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]">
          <div className="flex items-start justify-between gap-4"><div><p className="font-black">{t("program")}</p><p className="mt-1 text-sm font-medium text-black/55">{t("subtitle")}</p></div><button type="button" role="switch" aria-checked={form.isLoyaltyEnabled} onClick={() => setForm((current) => ({ ...current, isLoyaltyEnabled: !current.isLoyaltyEnabled }))} className={`relative h-9 w-16 shrink-0 rounded-full border-3 border-black transition-colors ${form.isLoyaltyEnabled ? "bg-[#bffcc6]" : "bg-black/15"}`}><span className={`absolute top-1 h-5 w-5 rounded-full border-2 border-black bg-white transition-transform ${form.isLoyaltyEnabled ? "translate-x-7" : "translate-x-1"}`} /></button></div>
        </section>

        <fieldset disabled={!form.isLoyaltyEnabled} className="space-y-5 disabled:opacity-50">
          <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><legend className="px-1 text-lg font-black">{t("goal")}</legend><p className="mb-4 text-sm font-semibold text-black/60">{t("goalQuestion")}</p><div className="grid grid-cols-5 gap-2">{[5,8,10,12].map((value) => <button key={value} type="button" onClick={() => setForm((current) => ({ ...current, stampsRequired: value }))} className={`rounded-xl border-2 border-black py-2 font-black ${form.stampsRequired === value ? "bg-[#c4b5fd] shadow-[2px_2px_0_#000]" : "bg-white"}`}>{value}</button>)}<label className="sr-only" htmlFor="custom-stamps">{t("customGoal")}</label><input id="custom-stamps" type="number" min={2} max={30} value={form.stampsRequired} onChange={(event) => setForm((current) => ({ ...current, stampsRequired: Number(event.target.value) }))} className="min-w-0 rounded-xl border-2 border-black px-2 text-center font-black outline-none focus:ring-4 focus:ring-[#c4b5fd]" /></div><p className="mt-3 text-sm font-black">{t("goalSummary", { count: form.stampsRequired })}</p></section>

          <section className="rounded-2xl border-3 border-black bg-[#fff5ba] p-5 shadow-[4px_4px_0_#000]"><h2 className="font-black">{t("stampRuleTitle")}</h2><p className="mt-2 text-sm font-semibold">{t("stampRule")}</p></section>

          <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><h2 className="text-lg font-black">{t("rewardTitle")}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{rewardOptions.map(({ type, icon: Icon, color }) => <button key={type} type="button" onClick={() => setForm((current) => ({ ...current, rewardType: type }))} aria-pressed={form.rewardType === type} className={`${color} flex items-center gap-3 rounded-2xl border-3 border-black p-4 text-left font-black ${form.rewardType === type ? "shadow-[4px_4px_0_#000] -translate-y-0.5" : "opacity-70"}`}><Icon className="h-5 w-5" />{t(`rewardTypes.${type}`)}</button>)}</div>
            <div className="mt-5 space-y-4">
              {(form.rewardType === "PERCENTAGE" || form.rewardType === "FIXED") && <div><label htmlFor="discount-value" className="text-sm font-black">{t(form.rewardType === "PERCENTAGE" ? "percentage" : "amount")}</label><input id="discount-value" type="number" min={1} max={form.rewardType === "PERCENTAGE" ? 100 : undefined} value={form.discountValue} onChange={(event) => setForm((current) => ({ ...current, discountValue: Number(event.target.value) }))} className="mt-1 h-11 w-full rounded-xl border-2 border-black bg-[#fffaf0] px-4 font-black outline-none focus:ring-4 focus:ring-[#ffb5e8]" /></div>}
              {form.rewardType === "FREE_SERVICE" && <div><label htmlFor="reward-service" className="text-sm font-black">{t("freeService")}</label><select id="reward-service" value={form.rewardServiceId ?? ""} onChange={(event) => setForm((current) => ({ ...current, rewardServiceId: event.target.value || null }))} className="mt-1 h-11 w-full rounded-xl border-2 border-black bg-[#fffaf0] px-3 font-bold"><option value="">{t("selectService")}</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><p className="mt-2 text-xs font-semibold text-black/55">{t("freeServiceHint")}</p></div>}
              <div><label htmlFor="reward-name" className="text-sm font-black">{t("rewardName")} {form.rewardType === "CUSTOM" ? "*" : t("optional")}</label><input id="reward-name" value={form.rewardName} onChange={(event) => setForm((current) => ({ ...current, rewardName: event.target.value }))} placeholder={t(form.rewardType === "CUSTOM" ? "customExample" : "rewardExample")} className="mt-1 h-11 w-full rounded-xl border-2 border-black bg-[#fffaf0] px-4 font-bold outline-none focus:ring-4 focus:ring-[#ffb5e8]" /></div>
              {form.rewardType === "CUSTOM" && <p className="rounded-xl border-2 border-black bg-[#c4b5fd]/50 p-3 text-sm font-black">{t("customHint")}</p>}
            </div>
          </section>

          <section className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><h2 className="text-lg font-black">{t("expirationTitle")}</h2><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{v:null,l:t("never")},{v:30,l:t("days", {count:30})},{v:60,l:t("days", {count:60})},{v:90,l:t("days", {count:90})}].map((option) => <button key={option.l} type="button" onClick={() => setForm((current) => ({ ...current, expirationDays: option.v }))} className={`rounded-xl border-2 border-black px-2 py-3 text-xs font-black ${form.expirationDays === option.v ? "bg-[#bffcc6] shadow-[2px_2px_0_#000]" : "bg-white"}`}>{option.l}</button>)}</div></section>

          <details className="rounded-2xl border-3 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><summary className="cursor-pointer font-black">{t("advanced")}</summary><div className="mt-4"><label htmlFor="reward-prefix" className="text-sm font-black">{t("codePrefix")}</label><input id="reward-prefix" maxLength={16} value={form.loyaltyCodePrefix} onChange={(event) => setForm((current) => ({ ...current, loyaltyCodePrefix: event.target.value.toUpperCase() }))} className="mt-1 h-11 w-full rounded-xl border-2 border-black px-4 font-mono font-black uppercase" /><p className="mt-2 text-xs font-semibold text-black/50">{t("codeExample", { prefix: (form.loyaltyCodePrefix || "PREMIO").toUpperCase() })}</p></div></details>
        </fieldset>

        <div className="flex items-center gap-4"><button type="submit" disabled={saving} className="inline-flex h-12 items-center gap-2 rounded-xl border-3 border-black bg-[#bffcc6] px-6 font-black shadow-[4px_4px_0_#000] disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} {t("save")}</button>{message && <p role="status" className={`text-sm font-black ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}</div>
      </div>

      <aside className="xl:sticky xl:top-6"><p className="mb-3 text-sm font-black uppercase tracking-[0.13em]">{t("preview")}</p><LoyaltyCard businessName={business.name} logoUrl={business.logoUrl} currentStamps={Math.min(3, form.stampsRequired - 1)} stampsRequired={form.stampsRequired} rewardLabel={rewardLabel} enabled={form.isLoyaltyEnabled} /></aside>
    </form>

    <section className="overflow-hidden rounded-2xl border-3 border-black bg-white shadow-[5px_5px_0_#000]"><div className="bg-[#c4b5fd] p-5"><h2 className="text-lg font-black">{t("adjustments")}</h2><p className="text-sm font-semibold">{t("adjustmentHint")}</p></div>{clients.length ? clients.map((client) => <ManualAdjustmentRow key={client.id} client={client} required={form.stampsRequired} />) : <p className="p-5 text-sm font-semibold">{t("noClients")}</p>}</section>
  </div>;
}
