"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useTransition } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, XCircle, Clock, TrendingUp, RefreshCw, Gift, Percent, Save, Trash2, Zap } from "@/components/icons/hover-icons";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import {
  applySubscriptionBenefitPresetAction,
  clearSubscriptionBenefitAction,
  extendTrialAction,
  syncSubscriptionBillingAction,
  updateSubscriptionBillingRulesAction,
} from "@/server/actions/admin.actions";

type Sub = {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  isTrial: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  freeMonthsRemaining: number;
  pendingDiscountPercentage: number | null;
  promoName: string | null;
  promoFreeMonthsRemaining: number;
  promoDiscountPercentage: number | null;
  promoDiscountMonthsRemaining: number;
  nextBillingOverrideAmount: number | null;
  billingNotes: string | null;
  mpSubscriptionId: string | null;
  lastBillingSyncAt: Date | null;
  lastBillingSyncError: string | null;
  nextBillingPreview: {
    baseAmount: number;
    amountDue: number;
    mpAmount: number;
    discountPercentage: number | null;
    reason: string;
    hasBenefit: boolean;
    usesMercadoPagoMinimum: boolean;
  };
  business: { id: string; name: string; slug: string };
};

type BillingEditState = {
  promoName: string;
  promoFreeMonthsRemaining: string;
  promoDiscountPercentage: string;
  promoDiscountMonthsRemaining: string;
  nextBillingOverrideAmount: string;
  billingNotes: string;
};

// Prices in CLP (whole numbers, not cents). Annual = monthly * 10 (pay 10, get 12).
const PLAN_PRICES: Record<string, Record<string, number>> = {
  INDIVIDUAL: { MONTHLY: 12990, ANNUAL: 129900 },
  EQUIPO: { MONTHLY: 29990, ANNUAL: 299900 },
};

function formatCLP(amount: number) {
  return "$" + amount.toLocaleString("es-CL");
}

export function SubscriptionsClient({
  expiringSoon,
  cancelled,
  active,
  allSubscriptions,
}: {
  expiringSoon: Sub[];
  cancelled: Sub[];
  active: Sub[];
  allSubscriptions: Sub[];
}) {
  const legacy = useTranslations("legacy");
  const [extending, setExtending] = useState<string | null>(null);
  const [billingAction, setBillingAction] = useState<string | null>(null);
  const [expandedBillingId, setExpandedBillingId] = useState<string | null>(null);
  const [billingEdits, setBillingEdits] = useState<Record<string, BillingEditState>>({});
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const now = new Date();

  const trialing = allSubscriptions.filter((s) => s.status === "TRIALING");
  const mrr = active.reduce((acc, s) => {
    const baseAmount = s.nextBillingPreview.baseAmount;
    return acc + (s.billingCycle === "ANNUAL" ? Math.round(baseAmount / 12) : baseAmount);
  }, 0);
  const nextCycleRevenue = active.reduce((acc, s) => acc + s.nextBillingPreview.amountDue, 0);

  function ensureBillingEdit(subscription: Sub) {
    setExpandedBillingId((current) => current === subscription.id ? null : subscription.id);
    setBillingEdits((current) => {
      if (current[subscription.id]) return current;
      return {
        ...current,
        [subscription.id]: {
          promoName: subscription.promoName || "",
          promoFreeMonthsRemaining: String(subscription.promoFreeMonthsRemaining || 0),
          promoDiscountPercentage: subscription.promoDiscountPercentage?.toString() || "",
          promoDiscountMonthsRemaining: String(subscription.promoDiscountMonthsRemaining || 0),
          nextBillingOverrideAmount: subscription.nextBillingOverrideAmount?.toString() || "",
          billingNotes: subscription.billingNotes || "",
        },
      };
    });
  }

  function updateBillingEdit(subscriptionId: string, field: keyof BillingEditState, value: string) {
    setBillingEdits((current) => ({
      ...current,
      [subscriptionId]: {
        ...current[subscriptionId],
        [field]: value,
      },
    }));
  }

  function handleExtend(subscriptionId: string) {
    setExtending(subscriptionId);
    startTransition(async () => {
      await extendTrialAction(subscriptionId, 7);
      setExtending(null);
    });
  }

  function handlePreset(subscriptionId: string, preset: "PRIZE_12" | "PRIZE_6" | "PRIZE_3" | "PARTICIPANT_OFFER") {
    setBillingAction(`${subscriptionId}:${preset}`);
    setBillingMessage(null);
    startTransition(async () => {
      const result = await applySubscriptionBenefitPresetAction(subscriptionId, preset);
      setBillingMessage(result.error || result.warning || "Beneficio aplicado y sincronizado.");
      setBillingAction(null);
    });
  }

  function handleSaveBilling(subscriptionId: string) {
    const edit = billingEdits[subscriptionId];
    if (!edit) return;

    setBillingAction(`${subscriptionId}:save`);
    setBillingMessage(null);
    startTransition(async () => {
      const result = await updateSubscriptionBillingRulesAction(subscriptionId, {
        promoName: edit.promoName,
        promoFreeMonthsRemaining: Number(edit.promoFreeMonthsRemaining || 0),
        promoDiscountPercentage: edit.promoDiscountPercentage ? Number(edit.promoDiscountPercentage) : null,
        promoDiscountMonthsRemaining: Number(edit.promoDiscountMonthsRemaining || 0),
        nextBillingOverrideAmount: edit.nextBillingOverrideAmount ? Number(edit.nextBillingOverrideAmount) : null,
        billingNotes: edit.billingNotes,
      });
      setBillingMessage(result.error || result.warning || "Reglas guardadas y sincronizadas.");
      setBillingAction(null);
    });
  }

  function handleClearBilling(subscriptionId: string) {
    setBillingAction(`${subscriptionId}:clear`);
    setBillingMessage(null);
    startTransition(async () => {
      const result = await clearSubscriptionBenefitAction(subscriptionId);
      setBillingMessage(result.error || result.warning || "Beneficio limpiado.");
      setBillingAction(null);
    });
  }

  function handleSyncBilling(subscriptionId: string) {
    setBillingAction(`${subscriptionId}:sync`);
    setBillingMessage(null);
    startTransition(async () => {
      const result = await syncSubscriptionBillingAction(subscriptionId);
      setBillingMessage(result.error || legacy("L9jrE-02w0wr"));
      setBillingAction(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-black"><LocalizedText id="XrCu9JcLPsJe" /></h1>
        <p className="text-sm font-bold text-black/50">{allSubscriptions.length} <LocalizedText id="TY6m0l48IUB6" /></p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "MRR aprox.", value: formatCLP(mrr), bg: "bg-[#BFFCC6]" },
          { label: "Proximo ciclo", value: formatCLP(nextCycleRevenue), bg: "bg-[#E9D5FF]" },
          { label: "Activas", value: active.length, bg: "bg-[#85E3FF]" },
          { label: "En trial", value: trialing.length, bg: "bg-[#FFF5BA]" },
          { label: "Canceladas", value: cancelled.length, bg: "bg-[#FFB5E8]" },
        ].map((s) => (
          <div key={s.label} className={`border-4 border-black ${s.bg} p-4 shadow-[4px_4px_0_#000]`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/60">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-black text-black tracking-tighter">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Billing control */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Zap className="h-5 w-5 text-black" />
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-black">
            <LocalizedText id="WU36w7S1G3B7" />
          </h2>
          <span className="border-2 border-black bg-[#E9D5FF] px-2 py-0.5 text-xs font-black">
            <LocalizedText id="Xju67jZ8UmMa" />
          </span>
        </div>

        {billingMessage && (
          <div className="mb-3 border-2 border-black bg-[#FFF5BA] px-4 py-2 text-xs font-black text-black shadow-[2px_2px_0_#000]">
            {billingMessage}
          </div>
        )}

        <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b-4 border-black bg-[#E9D5FF] text-left text-xs uppercase font-black text-black">
                <th className="px-5 py-3"><LocalizedText id="B8s6yKMYEqy_" /></th>
                <th className="px-4 py-3"><LocalizedText id="CFBVcrG_9ncY" /></th>
                <th className="px-4 py-3"><LocalizedText id="u-CL4GYIztCu" /></th>
                <th className="px-4 py-3"><LocalizedText id="OHWtjcFBNX8d" /></th>
                <th className="px-4 py-3"><LocalizedText id="gCByBuhF6XGt" /></th>
              </tr>
            </thead>
            <tbody>
              {allSubscriptions.map((s) => {
                const preview = s.nextBillingPreview;
                const edit = billingEdits[s.id];
                const activeBenefit = [
                  !s.mpSubscriptionId && s.currentPeriodEnd && new Date(s.currentPeriodEnd).getTime() > now.getTime()
                    ? `Cortesia hasta ${format(new Date(s.currentPeriodEnd), "dd/MM/yyyy")}`
                    : null,
                  s.freeMonthsRemaining > 0 ? `${s.freeMonthsRemaining} mes(es) gratis premio` : null,
                  s.promoFreeMonthsRemaining > 0 ? `${s.promoFreeMonthsRemaining} mes(es) gratis` : null,
                  s.promoDiscountMonthsRemaining > 0 && s.promoDiscountPercentage
                    ? `${s.promoDiscountMonthsRemaining} mes(es) al ${100 - s.promoDiscountPercentage}%`
                    : null,
                  s.pendingDiscountPercentage ? `${s.pendingDiscountPercentage}% pendiente` : null,
                  s.nextBillingOverrideAmount !== null ? `Override ${formatCLP(s.nextBillingOverrideAmount)}` : null,
                ].filter(Boolean).join(" · ");

                return (
                  <tr key={s.id} className="border-b-2 border-black/10 align-top">
                    <td className="px-5 py-4">
                      <Link href={`${ADMIN_SECRET_PATH}/businesses/${s.business.id}`} className="font-black text-black hover:underline">
                        {s.business.name}
                      </Link>
                      <p className="font-mono text-xs text-black/40">/{s.business.slug}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="border border-black bg-[#85E3FF] px-1.5 py-0.5 text-[10px] font-black">{s.plan}</span>
                        <span className="border border-black bg-white px-1.5 py-0.5 text-[10px] font-black">{s.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-lg font-black text-black">{formatCLP(preview.amountDue)}</p>
                      <p className="text-xs font-bold text-black/50"><LocalizedText id="e0c2Gq0Zu0g6" /> {formatCLP(preview.baseAmount)}</p>
                      <p className="mt-1 text-xs font-bold text-black/60">{preview.reason}</p>
                      {preview.usesMercadoPagoMinimum && (
                        <p className="mt-1 border border-black bg-[#FFF5BA] px-2 py-1 text-[10px] font-black text-black">
                          <LocalizedText id="VH5G-medcI9K" /> {formatCLP(preview.mpAmount)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="max-w-[230px] text-xs font-bold text-black">
                        {activeBenefit || legacy("jOU1S2HsyWeu")}
                      </p>
                      {s.promoName && <p className="mt-1 text-xs font-black text-black/60">{s.promoName}</p>}
                      {s.billingNotes && <p className="mt-1 max-w-[230px] text-[11px] font-bold text-black/40">{s.billingNotes}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`border-2 border-black px-2 py-0.5 text-[10px] font-black ${s.mpSubscriptionId ? "bg-[#BFFCC6]" : "bg-[#FFB5E8]"}`}>
                        {s.mpSubscriptionId ? "Enlazada" : legacy("YC6rvtyt7ihv")}
                      </span>
                      {s.lastBillingSyncAt && (
                        <p className="mt-1 text-[10px] font-bold text-black/40">
                          <LocalizedText id="jSYaNy_eFGHM" /> {format(new Date(s.lastBillingSyncAt), "dd/MM HH:mm")}
                        </p>
                      )}
                      {s.lastBillingSyncError && (
                        <p className="mt-1 max-w-[180px] text-[10px] font-black text-red-700">{s.lastBillingSyncError}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {[
                          ["PRIZE_12", "12M"],
                          ["PRIZE_6", "6M"],
                          ["PRIZE_3", "3M"],
                          ["PARTICIPANT_OFFER", "2+2"],
                        ].map(([preset, label]) => (
                          <button
                            key={preset}
                            disabled={isPending}
                            onClick={() => handlePreset(s.id, preset as "PRIZE_12" | "PRIZE_6" | "PRIZE_3" | "PARTICIPANT_OFFER")}
                            className="inline-flex items-center gap-1 border-2 border-black bg-[#BFFCC6] px-2 py-1 text-[10px] font-black shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-40"
                          >
                            <Gift className="h-3 w-3" />
                            {billingAction === `${s.id}:${preset}` ? "..." : label}
                          </button>
                        ))}
                        <button
                          disabled={isPending}
                          onClick={() => ensureBillingEdit(s)}
                          className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-1 text-[10px] font-black shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-40"
                        >
                          <Percent className="h-3 w-3" />
                          <LocalizedText id="sLn-JP-pYpEl" />
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => handleSyncBilling(s.id)}
                          className="inline-flex items-center gap-1 border-2 border-black bg-[#85E3FF] px-2 py-1 text-[10px] font-black shadow-[2px_2px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-40"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {billingAction === `${s.id}:sync` ? "..." : "Sync"}
                        </button>
                      </div>

                      {expandedBillingId === s.id && edit && (
                        <div className="mt-3 grid gap-2 border-2 border-black bg-[#FFFAEB] p-3 shadow-[2px_2px_0_#000] sm:grid-cols-2">
                          <input
                            value={edit.promoName}
                            onChange={(e) => updateBillingEdit(s.id, "promoName", e.target.value)}
                            placeholder={legacy("JDOhJoKx-48C")}
                            className="border-2 border-black bg-white px-2 py-1.5 text-xs font-bold outline-none"
                          />
                          <input
                            value={edit.nextBillingOverrideAmount}
                            onChange={(e) => updateBillingEdit(s.id, "nextBillingOverrideAmount", e.target.value)}
                            placeholder={legacy("RNdWkTJvj7sW")}
                            type="number"
                            min={0}
                            className="border-2 border-black bg-white px-2 py-1.5 text-xs font-bold outline-none"
                          />
                          <input
                            value={edit.promoFreeMonthsRemaining}
                            onChange={(e) => updateBillingEdit(s.id, "promoFreeMonthsRemaining", e.target.value)}
                            placeholder={legacy("vuzx22LjAWFe")}
                            type="number"
                            min={0}
                            max={36}
                            className="border-2 border-black bg-white px-2 py-1.5 text-xs font-bold outline-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={edit.promoDiscountPercentage}
                              onChange={(e) => updateBillingEdit(s.id, "promoDiscountPercentage", e.target.value)}
                              placeholder={legacy("WS0QnUP0PhDw")}
                              type="number"
                              min={1}
                              max={100}
                              className="border-2 border-black bg-white px-2 py-1.5 text-xs font-bold outline-none"
                            />
                            <input
                              value={edit.promoDiscountMonthsRemaining}
                              onChange={(e) => updateBillingEdit(s.id, "promoDiscountMonthsRemaining", e.target.value)}
                              placeholder={legacy("0qaLCNhaVgDO")}
                              type="number"
                              min={0}
                              max={36}
                              className="border-2 border-black bg-white px-2 py-1.5 text-xs font-bold outline-none"
                            />
                          </div>
                          <textarea
                            value={edit.billingNotes}
                            onChange={(e) => updateBillingEdit(s.id, "billingNotes", e.target.value)}
                            placeholder={legacy("dM2vqmftDgku")}
                            rows={2}
                            className="border-2 border-black bg-white px-2 py-1.5 text-xs font-bold outline-none sm:col-span-2"
                          />
                          <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <button
                              disabled={isPending}
                              onClick={() => handleSaveBilling(s.id)}
                              className="inline-flex items-center gap-1 border-2 border-black bg-black px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0_#7C3AED] disabled:opacity-40"
                            >
                              <Save className="h-3 w-3" />
                              {billingAction === `${s.id}:save` ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => handleClearBilling(s.id)}
                              className="inline-flex items-center gap-1 border-2 border-black bg-[#FFB5E8] px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_#000] disabled:opacity-40"
                            >
                              <Trash2 className="h-3 w-3" />
                              {billingAction === `${s.id}:clear` ? "..." : "Limpiar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expiring soon */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-black" />
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-black">
            <LocalizedText id="yTSPwWjtFNIL" />
          </h2>
          <span className="border-2 border-black bg-[#FFF5BA] px-2 py-0.5 text-xs font-black">
            {expiringSoon.length} <LocalizedText id="yke6gzJ5hg6J" />
          </span>
        </div>
        {expiringSoon.length === 0 ? (
          <div className="border-4 border-black bg-white p-8 shadow-[4px_4px_0_#000] text-center">
            <p className="text-sm font-bold text-black/40"><LocalizedText id="VSYjqjNj43CN" /></p>
          </div>
        ) : (
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-[#FFF5BA] text-left text-xs uppercase font-black text-black">
                  <th className="px-6 py-3"><LocalizedText id="B8s6yKMYEqy_" /></th>
                  <th className="px-4 py-3"><LocalizedText id="-o7Qvavda8sc" /></th>
                  <th className="px-4 py-3"><LocalizedText id="1ggYqXlJSrCV" /></th>
                  <th className="px-4 py-3"><LocalizedText id="vfkelD3b02KM" /></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {expiringSoon.map((s) => {
                  const days = differenceInDays(new Date(s.trialEndsAt!), now);
                  return (
                    <tr key={s.id} className="border-b-2 border-black/10 hover:bg-[#FFFAEB] transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`${ADMIN_SECRET_PATH}/businesses/${s.business.id}`} className="font-black text-black hover:underline">
                          {s.business.name}
                        </Link>
                        <p className="font-mono text-xs text-black/40">/{s.business.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="border-2 border-black bg-[#85E3FF] px-2 py-0.5 text-xs font-black uppercase">
                          {s.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-black">
                        {format(new Date(s.trialEndsAt!), "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`border-2 border-black px-2 py-0.5 text-sm font-black ${days <= 2 ? "bg-[#FFB5E8]" : "bg-[#FFF5BA]"}`}>
                          {days === 0 ? "Hoy" : days === 1 ? "1 dia" : `${days} dias`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          disabled={extending === s.id || isPending}
                          onClick={() => handleExtend(s.id)}
                          className="flex items-center gap-1.5 border-2 border-black bg-[#B28DFF] px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-40"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {extending === s.id ? "..." : "+7 dias"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cancelled */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-black" />
          <h2 className="text-xl font-black uppercase tracking-tighter text-black">
            <LocalizedText id="WGDD64BpItWg" />
          </h2>
          <span className="border-2 border-black bg-[#FFB5E8] px-2 py-0.5 text-xs font-black">
            {cancelled.length}
          </span>
        </div>
        {cancelled.length === 0 ? (
          <div className="border-4 border-black bg-white p-8 shadow-[4px_4px_0_#000] text-center">
            <p className="text-sm font-bold text-black/40"><LocalizedText id="MNuBdz3QJjm7" /></p>
          </div>
        ) : (
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-[#FFB5E8] text-left text-xs uppercase font-black text-black">
                  <th className="px-6 py-3"><LocalizedText id="B8s6yKMYEqy_" /></th>
                  <th className="px-4 py-3"><LocalizedText id="-o7Qvavda8sc" /></th>
                  <th className="px-4 py-3"><LocalizedText id="S4wainXMC9yR" /></th>
                  <th className="px-4 py-3"><LocalizedText id="iQCGsWtIBAcO" /></th>
                </tr>
              </thead>
              <tbody>
                {cancelled.map((s) => (
                  <tr key={s.id} className="border-b-2 border-black/10 hover:bg-[#FFFAEB] transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`${ADMIN_SECRET_PATH}/businesses/${s.business.id}`} className="font-black text-black hover:underline">
                        {s.business.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="border-2 border-black bg-black/10 px-2 py-0.5 text-xs font-black uppercase">
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-black/60 text-xs uppercase">{s.billingCycle}</td>
                    <td className="px-4 py-3 text-xs font-bold text-black/40">
                      {format(new Date(s.createdAt), "dd/MM/yy", { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Revenue breakdown */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-black" />
          <h2 className="text-xl font-black uppercase tracking-tighter text-black">
            <LocalizedText id="P0haVjmD4LmY" />
          </h2>
        </div>
        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000]">
          {[
            { plan: "INDIVIDUAL", cycle: "MONTHLY", label: "Individual Mensual" },
            { plan: "INDIVIDUAL", cycle: "ANNUAL", label: "Individual Anual" },
            { plan: "EQUIPO", cycle: "MONTHLY", label: "Equipo Mensual" },
            { plan: "EQUIPO", cycle: "ANNUAL", label: "Equipo Anual" },
          ].map((row) => {
            const count = active.filter((s) => s.plan === row.plan && s.billingCycle === row.cycle).length;
            const unitPrice = PLAN_PRICES[row.plan]?.[row.cycle] ?? 0;
            const mrrContrib = row.cycle === "ANNUAL" ? Math.round(unitPrice / 12) : unitPrice;
            return (
              <div key={`${row.plan}-${row.cycle}`} className="flex items-center justify-between border-b-2 border-black/10 py-3 last:border-0">
                <span className="text-sm font-black uppercase text-black">{row.label}</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <span className="text-sm font-bold text-black/60">{count} <LocalizedText id="_Go9D_-TOWKv" /></span>
                  <span className="w-28 text-right text-sm font-black text-black">
                    {formatCLP(mrrContrib * count)} <LocalizedText id="anUC14rjj--1" />
                  </span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm font-black uppercase text-black"><LocalizedText id="YZg7V0A6QUlh" /></span>
            <span className="border-2 border-black bg-[#BFFCC6] px-3 py-1 text-sm font-black text-black">
              {formatCLP(mrr)} <LocalizedText id="anUC14rjj--1" />
            </span>
          </div>
        </div>
      </section>

      {/* All trialing */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-black" />
          <h2 className="text-xl font-black uppercase tracking-tighter text-black">
            <LocalizedText id="2m1ZiCio73_J" />
          </h2>
          <span className="border-2 border-black bg-[#FFF5BA] px-2 py-0.5 text-xs font-black">
            {trialing.length}
          </span>
        </div>
        {trialing.length === 0 ? (
          <div className="border-4 border-black bg-white p-8 shadow-[4px_4px_0_#000] text-center">
            <p className="text-sm font-bold text-black/40"><LocalizedText id="QnuEYYJf2MT4" /></p>
          </div>
        ) : (
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-[#FFF5BA] text-left text-xs uppercase font-black text-black">
                  <th className="px-6 py-3"><LocalizedText id="B8s6yKMYEqy_" /></th>
                  <th className="px-4 py-3"><LocalizedText id="-o7Qvavda8sc" /></th>
                  <th className="px-4 py-3"><LocalizedText id="1ggYqXlJSrCV" /></th>
                  <th className="px-4 py-3"><LocalizedText id="vfkelD3b02KM" /></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {trialing
                  .sort((a, b) => {
                    if (!a.trialEndsAt) return 1;
                    if (!b.trialEndsAt) return -1;
                    return new Date(a.trialEndsAt).getTime() - new Date(b.trialEndsAt).getTime();
                  })
                  .map((s) => {
                    const days = s.trialEndsAt ? differenceInDays(new Date(s.trialEndsAt), now) : null;
                    return (
                      <tr key={s.id} className="border-b-2 border-black/10 hover:bg-[#FFFAEB] transition-colors">
                        <td className="px-6 py-3">
                          <Link href={`${ADMIN_SECRET_PATH}/businesses/${s.business.id}`} className="font-black text-black hover:underline">
                            {s.business.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="border-2 border-black bg-[#85E3FF] px-2 py-0.5 text-xs font-black uppercase">
                            {s.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-black">
                          {s.trialEndsAt ? format(new Date(s.trialEndsAt), "dd/MM/yyyy") : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {days !== null ? (
                            <span className={`border-2 border-black px-2 py-0.5 text-xs font-black ${days <= 0 ? "bg-[#FFB5E8]" : days <= 3 ? "bg-[#FFF5BA]" : "bg-[#BFFCC6]"}`}>
                              {days <= 0 ? "Vencido" : days === 1 ? "1 dia" : `${days} dias`}
                            </span>
                          ) : (
                            <span className="text-black/30 text-xs font-bold">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            disabled={extending === s.id || isPending}
                            onClick={() => handleExtend(s.id)}
                            className="flex items-center gap-1.5 border-2 border-black bg-[#B28DFF] px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-40"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {extending === s.id ? "..." : "+7 dias"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
