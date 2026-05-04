"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, CheckCircle2, Save } from "lucide-react";
import { updateSubscriptionAction } from "@/server/actions/admin.actions";

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  extraStaffCount: number;
  createdAt: string;
}

export function SubscriptionEditor({ subscription }: { subscription: SubscriptionData }) {
  const router = useRouter();
  const [plan, setPlan] = useState(subscription.plan);
  const [status, setStatus] = useState(subscription.status);
  const [billingCycle, setBillingCycle] = useState(subscription.billingCycle);
  const [extraStaff, setExtraStaff] = useState(subscription.extraStaffCount);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const result = await updateSubscriptionAction(subscription.id, {
        plan: plan as "INDIVIDUAL" | "EQUIPO",
        status: status as "ACTIVE" | "TRIALING" | "INACTIVE" | "CANCELLED",
        billingCycle: billingCycle as "MONTHLY" | "ANNUAL",
        extraStaffCount: extraStaff,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
    "w-full rounded-xl border border-white/[0.06] bg-[#141418] px-3 py-2 text-sm text-white outline-none focus:border-[#7C3AED]/40 [&>option]:bg-[#141418] [&>option]:text-white";

  return (
    <div className="rounded-2xl border border-[#7C3AED]/15 bg-gradient-to-br from-[#7C3AED]/5 to-[#0e0e12] p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
        <CreditCard className="h-4 w-4" /> Suscripción
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#888]">Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={selectClass}>
            <option value="INDIVIDUAL">Individual ($9.990/mes)</option>
            <option value="EQUIPO">Equipo ($24.990/mes)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#888]">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="ACTIVE">Activo</option>
            <option value="TRIALING">En trial</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#888]">Ciclo de facturación</label>
          <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className={selectClass}>
            <option value="MONTHLY">Mensual</option>
            <option value="ANNUAL">Anual</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#888]">Staff extra</label>
          <input
            type="number"
            min={0}
            max={50}
            value={extraStaff}
            onChange={(e) => setExtraStaff(parseInt(e.target.value) || 0)}
            className="w-full rounded-xl border border-white/[0.06] bg-[#141418] px-3 py-2 text-sm text-white outline-none focus:border-[#7C3AED]/40"
          />
        </div>

        {subscription.isTrial && subscription.trialEndsAt && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-xs text-amber-400">
              Trial activo · Expira: {new Date(subscription.trialEndsAt).toLocaleDateString("es-CL")}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4" /> ¡Guardado!</>
          ) : (
            <><Save className="h-4 w-4" /> Guardar Cambios</>
          )}
        </button>
      </div>
    </div>
  );
}
