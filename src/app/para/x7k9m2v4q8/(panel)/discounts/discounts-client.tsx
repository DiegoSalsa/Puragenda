"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useTransition } from "react";
import { Copy, Loader2, Pause, Play, Plus, Tag } from "@/components/icons/hover-icons";
import {
  createPlatformDiscountCodeAction,
  togglePlatformDiscountCodeAction,
} from "@/server/actions/admin.actions";

type DiscountCode = {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  trialEndsAtFrom: string | null;
  trialEndsAtTo: string | null;
  isActive: boolean;
  appliesToPlans: string[];
  createdAt: string;
  createdByName: string | null;
};

const PLAN_OPTIONS = ["INDIVIDUAL", "EQUIPO", "TEST"] as const;

function discountLabel(code: DiscountCode) {
  return code.discountType === "PERCENTAGE"
    ? `${code.discountValue}% OFF`
    : `$${code.discountValue.toLocaleString("es-CL")} OFF`;
}

export function DiscountsClient({ codes }: { codes: DiscountCode[] }) {
  const legacy = useTranslations("legacy");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: 25,
    maxRedemptions: "",
    expiresAt: "",
    trialEndsAtFrom: "",
    trialEndsAtTo: "",
    appliesToPlans: ["INDIVIDUAL", "EQUIPO"],
  });

  function togglePlan(plan: string) {
    setForm((prev) => ({
      ...prev,
      appliesToPlans: prev.appliesToPlans.includes(plan)
        ? prev.appliesToPlans.filter((p) => p !== plan)
        : [...prev.appliesToPlans, plan],
    }));
  }

  function handleCreate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createPlatformDiscountCodeAction({
        ...form,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        expiresAt: form.expiresAt || null,
        trialEndsAtFrom: form.trialEndsAtFrom || null,
        trialEndsAtTo: form.trialEndsAtTo || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Codigo creado correctamente.");
      setForm({
        code: "",
        name: "",
        discountType: "PERCENTAGE",
        discountValue: 25,
        maxRedemptions: "",
        expiresAt: "",
        trialEndsAtFrom: "",
        trialEndsAtTo: "",
        appliesToPlans: ["INDIVIDUAL", "EQUIPO"],
      });
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await togglePlatformDiscountCodeAction(id, isActive);
      if (result.error) setError(result.error);
      else setMessage(isActive ? "Codigo reactivado." : "Codigo pausado.");
    });
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-black"><LocalizedText id="E6DyZEMvc_8i" /></h1>
        <p className="text-sm font-bold text-black/50"><LocalizedText id="O5SCZXqBtUzY" /></p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-[#B28DFF] shadow-[2px_2px_0_#000]">
              <Tag className="h-5 w-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-black"><LocalizedText id="zAmBiXjB84ad" /></h2>
              <p className="text-xs font-bold text-black/50"><LocalizedText id="pPA6G9glBVD8" /></p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-black/60"><LocalizedText id="gN8dF3WUeal7" /></label>
              <input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder={legacy("dzxB0qKo9SJg")}
                className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 font-mono text-sm font-black uppercase outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-black/60"><LocalizedText id="yK09DLjFU34E" /></label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={legacy("hX3ppP4zUpy8")}
                className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 text-sm font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-black/60"><LocalizedText id="OGjShD1ZJMGS" /></label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as "PERCENTAGE" | "FIXED" }))}
                  className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 text-sm font-black outline-none"
                >
                  <option value="PERCENTAGE">Porcentaje</option>
                  <option value="FIXED">Monto fijo</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-black/60"><LocalizedText id="svUwxGmRMRzT" /></label>
                <input
                  type="number"
                  min={1}
                  max={form.discountType === "PERCENTAGE" ? 100 : 999999}
                  value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
                  className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 text-sm font-black outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 border-2 border-black bg-[#E7FFAC] p-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/70">Ventana de prueba elegible</p>
                <p className="text-[11px] font-bold text-black/50">Opcional. Limita el código a usuarios cuya prueba termina entre estas fechas.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-[11px] font-black uppercase text-black/60">
                  Desde
                  <input
                    type="date"
                    value={form.trialEndsAtFrom}
                    onChange={(e) => setForm((p) => ({ ...p, trialEndsAtFrom: e.target.value }))}
                    className="w-full border-2 border-black bg-white px-2 py-2 text-xs font-bold outline-none"
                  />
                </label>
                <label className="space-y-1 text-[11px] font-black uppercase text-black/60">
                  Hasta
                  <input
                    type="date"
                    value={form.trialEndsAtTo}
                    onChange={(e) => setForm((p) => ({ ...p, trialEndsAtTo: e.target.value }))}
                    className="w-full border-2 border-black bg-white px-2 py-2 text-xs font-bold outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-black/60"><LocalizedText id="a-dLheF8IR82" /></label>
                <input
                  type="number"
                  min={1}
                  value={form.maxRedemptions}
                  onChange={(e) => setForm((p) => ({ ...p, maxRedemptions: e.target.value }))}
                  placeholder={legacy("rsI9phZeUoOW")}
                  className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 text-sm font-bold outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-black/60"><LocalizedText id="1ggYqXlJSrCV" /></label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 text-sm font-bold outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black/60"><LocalizedText id="3w8McbDtpybS" /></label>
              <div className="flex flex-wrap gap-2">
                {PLAN_OPTIONS.map((plan) => {
                  const selected = form.appliesToPlans.includes(plan);
                  return (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => togglePlan(plan)}
                      className={`border-2 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#000] ${
                        selected ? "bg-[#BFFCC6]" : "bg-white text-black/40"
                      }`}
                    >
                      {plan}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="border-2 border-black bg-[#FFB5E8] px-3 py-2 text-sm font-black text-black">{error}</p>}
            {message && <p className="border-2 border-black bg-[#BFFCC6] px-3 py-2 text-sm font-black text-black">{message}</p>}

            <button
              type="button"
              disabled={isPending}
              onClick={handleCreate}
              className="flex w-full items-center justify-center gap-2 border-4 border-black bg-[#B28DFF] px-4 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <LocalizedText id="9A0KrYqnKZ9Y" />
            </button>
          </div>
        </div>

        <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          <div className="border-b-4 border-black bg-[#FFF5BA] p-5">
            <h2 className="text-lg font-black uppercase text-black"><LocalizedText id="b7u9gFsFHlPV" /></h2>
            <p className="text-xs font-bold text-black/50">{codes.length} <LocalizedText id="TY6m0l48IUB6" /></p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-black text-left text-xs font-black uppercase text-white">
                  <th className="px-4 py-3"><LocalizedText id="gN8dF3WUeal7" /></th>
                  <th className="px-4 py-3"><LocalizedText id="uMuwsBwzAsIP" /></th>
                  <th className="px-4 py-3"><LocalizedText id="2okggh4jYAl4" /></th>
                  <th className="px-4 py-3"><LocalizedText id="3w8McbDtpybS" /></th>
                  <th className="px-4 py-3"><LocalizedText id="mOWs3bbEaiSP" /></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm font-black text-black/40">
                      <LocalizedText id="V1-CrCu24Lhu" />
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => (
                    <tr key={code.id} className="border-b-2 border-black/10">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyCode(code.code)}
                            className="border-2 border-black bg-[#FFFAEB] px-2 py-1 font-mono text-xs font-black shadow-[2px_2px_0_#000]"
                          >
                            {code.code}
                          </button>
                          <button type="button" onClick={() => copyCode(code.code)} className="text-black/40 hover:text-black">
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-1 text-xs font-bold text-black/40">{copied === code.code ? "Copiado" : code.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="border-2 border-black bg-[#BFFCC6] px-2 py-1 text-xs font-black">
                          {discountLabel(code)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-black">
                        {code.redeemedCount}
                        <span className="text-black/40"> / {code.maxRedemptions ?? "∞"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(code.appliesToPlans.length ? code.appliesToPlans : ["TODOS"]).map((plan) => (
                            <span key={plan} className="border border-black bg-[#85E3FF] px-1.5 py-0.5 text-[10px] font-black">
                              {plan}
                            </span>
                          ))}
                        </div>
                        {(code.trialEndsAtFrom || code.trialEndsAtTo) && (
                          <p className="mt-1 text-[10px] font-bold text-black/50">
                            Prueba: {code.trialEndsAtFrom ? new Date(code.trialEndsAtFrom).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "…"}
                            {" — "}
                            {code.trialEndsAtTo ? new Date(code.trialEndsAtTo).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "…"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`border-2 border-black px-2 py-1 text-xs font-black ${code.isActive ? "bg-[#BFFCC6]" : "bg-[#FFB5E8]"}`}>
                          {code.isActive ? "Activo" : "Pausado"}
                        </span>
                        {code.expiresAt && (
                          <p className="mt-1 text-[10px] font-bold text-black/40">
                            <LocalizedText id="tRO7gX711Oys" /> {new Date(code.expiresAt).toLocaleDateString("es-CL")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggle(code.id, !code.isActive)}
                          className="flex items-center gap-1 border-2 border-black bg-white px-2 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:opacity-40"
                        >
                          {code.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {code.isActive ? "Pausar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
