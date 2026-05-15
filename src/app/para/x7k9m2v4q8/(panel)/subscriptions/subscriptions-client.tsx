"use client";

import { useState, useTransition } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, AlertTriangle, XCircle, Clock, TrendingUp, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { extendTrialAction } from "@/server/actions/admin.actions";

type Sub = {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  isTrial: boolean;
  trialEndsAt: Date | null;
  createdAt: Date;
  freeMonthsRemaining: number;
  business: { id: string; name: string; slug: string };
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
  const [extending, setExtending] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const now = new Date();

  const trialing = allSubscriptions.filter((s) => s.status === "TRIALING");
  const mrr = active.reduce((acc, s) => {
    const price = PLAN_PRICES[s.plan]?.[s.billingCycle];
    if (!price) return acc;
    // Annual: divide total by 12 to get monthly equivalent
    return acc + (s.billingCycle === "ANNUAL" ? Math.round(price / 12) : price);
  }, 0);

  function handleExtend(subscriptionId: string) {
    setExtending(subscriptionId);
    startTransition(async () => {
      await extendTrialAction(subscriptionId, 7);
      setExtending(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-black">Suscripciones</h1>
        <p className="text-sm font-bold text-black/50">{allSubscriptions.length} en total</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "MRR aprox.", value: formatCLP(mrr), bg: "bg-[#BFFCC6]" },
          { label: "Activas", value: active.length, bg: "bg-[#85E3FF]" },
          { label: "En trial", value: trialing.length, bg: "bg-[#FFF5BA]" },
          { label: "Canceladas", value: cancelled.length, bg: "bg-[#FFB5E8]" },
        ].map((s) => (
          <div key={s.label} className={`border-4 border-black ${s.bg} p-4 shadow-[4px_4px_0_#000]`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/60">{s.label}</p>
            <p className="text-3xl font-black text-black tracking-tighter">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Expiring soon */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-black" />
          <h2 className="text-xl font-black uppercase tracking-tighter text-black">
            Trials por expirar
          </h2>
          <span className="border-2 border-black bg-[#FFF5BA] px-2 py-0.5 text-xs font-black">
            {expiringSoon.length} en 7 dias o menos
          </span>
        </div>
        {expiringSoon.length === 0 ? (
          <div className="border-4 border-black bg-white p-8 shadow-[4px_4px_0_#000] text-center">
            <p className="text-sm font-bold text-black/40">Ningun trial expira pronto</p>
          </div>
        ) : (
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-[#FFF5BA] text-left text-xs uppercase font-black text-black">
                  <th className="px-6 py-3">Negocio</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Expira</th>
                  <th className="px-4 py-3">Dias restantes</th>
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
            Canceladas
          </h2>
          <span className="border-2 border-black bg-[#FFB5E8] px-2 py-0.5 text-xs font-black">
            {cancelled.length}
          </span>
        </div>
        {cancelled.length === 0 ? (
          <div className="border-4 border-black bg-white p-8 shadow-[4px_4px_0_#000] text-center">
            <p className="text-sm font-bold text-black/40">Sin cancelaciones</p>
          </div>
        ) : (
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-[#FFB5E8] text-left text-xs uppercase font-black text-black">
                  <th className="px-6 py-3">Negocio</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Ciclo</th>
                  <th className="px-4 py-3">Registro</th>
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
            Activas por plan
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
                <div className="flex items-center gap-6">
                  <span className="text-sm font-bold text-black/60">{count} subs</span>
                  <span className="w-28 text-right text-sm font-black text-black">
                    {formatCLP(mrrContrib * count)} / mes
                  </span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm font-black uppercase text-black">MRR Total</span>
            <span className="border-2 border-black bg-[#BFFCC6] px-3 py-1 text-sm font-black text-black">
              {formatCLP(mrr)} / mes
            </span>
          </div>
        </div>
      </section>

      {/* All trialing */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-black" />
          <h2 className="text-xl font-black uppercase tracking-tighter text-black">
            Todos en trial
          </h2>
          <span className="border-2 border-black bg-[#FFF5BA] px-2 py-0.5 text-xs font-black">
            {trialing.length}
          </span>
        </div>
        {trialing.length === 0 ? (
          <div className="border-4 border-black bg-white p-8 shadow-[4px_4px_0_#000] text-center">
            <p className="text-sm font-bold text-black/40">Sin trials activos</p>
          </div>
        ) : (
          <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-4 border-black bg-[#FFF5BA] text-left text-xs uppercase font-black text-black">
                  <th className="px-6 py-3">Negocio</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Expira</th>
                  <th className="px-4 py-3">Dias restantes</th>
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
