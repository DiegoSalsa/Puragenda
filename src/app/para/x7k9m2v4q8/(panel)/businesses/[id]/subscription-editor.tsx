"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, CheckCircle2, Save } from "@/components/icons/hover-icons";
import { updateSubscriptionAction } from "@/server/actions/admin.actions";
import { STAFF_LIMITS } from "@/core/constants";

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  extraStaffCount: number;
  createdAt: string;
}

export function SubscriptionEditor({ subscription }: { subscription: SubscriptionData }) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [plan, setPlan] = useState(subscription.plan);
  const [status, setStatus] = useState(subscription.status);
  const [billingCycle, setBillingCycle] = useState(subscription.billingCycle);
  const [extraStaff, setExtraStaff] = useState(subscription.extraStaffCount);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionEnd = subscription.status === "TRIALING" && subscription.trialEndsAt
    ? subscription.trialEndsAt
    : subscription.currentPeriodEnd;

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const result = await updateSubscriptionAction(subscription.id, {
        plan: plan as "INDIVIDUAL" | "EQUIPO",
        status: status as "ACTIVE" | "TRIALING" | "PAST_DUE" | "INACTIVE" | "CANCELLED",
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
      setError(legacy("z78xVmJB3PIC"));
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
    "w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black [&>option]:bg-white [&>option]:text-black";

  return (
    <div className="border-4 border-black bg-[#FFF5BA] p-6 shadow-[4px_4px_0_#000]">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
        <CreditCard className="h-4 w-4" /> <LocalizedText id="Wqk3gBDPmBHB" />
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-black/60"><LocalizedText id="-o7Qvavda8sc" /></label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={selectClass}>
            <option value="INDIVIDUAL">Individual ($12.990/mes)</option>
            <option value="EQUIPO">Equipo ($29.990/mes)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-black/60"><LocalizedText id="mOWs3bbEaiSP" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="ACTIVE">Activo</option>
            <option value="TRIALING">En trial</option>
            <option value="PAST_DUE">Pago pendiente</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-black/60"><LocalizedText id="54jNtp3o_hzy" /></label>
          <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className={selectClass}>
            <option value="MONTHLY">Mensual</option>
            <option value="ANNUAL">Anual</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-black/60"><LocalizedText id="vRHBmKIdI2Ti" /></label>
          <input
            type="number"
            min={0}
            max={50}
            value={extraStaff}
            onChange={(e) => setExtraStaff(parseInt(e.target.value) || 0)}
            className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black outline-none"
          />
          {plan === "EQUIPO" && (
            <p className="text-xs font-bold text-black/50">
              <LocalizedText id="fEkJPD20uVSY" /> {STAFF_LIMITS.EQUIPO}<LocalizedText id="fy_ghNZ9TscP" /> {STAFF_LIMITS.EQUIPO + 1}.
            </p>
          )}
        </div>

        {subscription.isTrial && subscription.trialEndsAt && (
          <div className="border-2 border-black bg-[#FFF5BA] px-3 py-2">
            <p className="text-xs font-black text-black">
              <LocalizedText id="FjwQffrXoXGL" /> {new Date(subscription.trialEndsAt).toLocaleDateString("es-CL")}
            </p>
          </div>
        )}

        <div className="border-2 border-black bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/50">
            Fin de suscripción
          </p>
          <p className="text-sm font-black text-black">
            {subscriptionEnd
              ? new Date(subscriptionEnd).toLocaleDateString("es-CL")
              : "Sin fecha registrada"}
          </p>
          {subscriptionEnd && (
            <p className="text-[10px] font-bold text-black/40">
              {subscription.status === "TRIALING" ? "Fin de prueba" : "Fin del período actual"}
            </p>
          )}
        </div>

        {error && (
          <div className="border-2 border-black bg-[#FFB5E8] px-3 py-2 text-xs font-black text-black">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 border-4 border-black bg-black py-2.5 text-sm font-black uppercase text-white shadow-[3px_3px_0_#7C3AED] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> <LocalizedText id="Nns87zWABS3j" /></>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4" /> <LocalizedText id="8XwQSbnobQwE" /></>
          ) : (
            <><Save className="h-4 w-4" /> <LocalizedText id="4sJwCqAtyNLm" /></>
          )}
        </button>
      </div>
    </div>
  );
}
