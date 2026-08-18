"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveDepositConfigAction } from "@/server/actions/dashboard.actions";

interface Props {
  initialDepositRequired: boolean;
  initialDepositPaymentMode: "MERCADOPAGO" | "MANUAL_LINK";
  isMpConnected: boolean;
}

export function DepositConfig({ initialDepositRequired, initialDepositPaymentMode, isMpConnected }: Props) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [depositRequired, setDepositRequired] = useState(initialDepositRequired);
  const [depositPaymentMode, setDepositPaymentMode] = useState(initialDepositPaymentMode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await saveDepositConfigAction({ depositRequired, depositPaymentMode });
    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage(legacy("sYc-tOX2aiS4"));
      router.refresh();
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={depositRequired}
            onChange={(e) => setDepositRequired(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full border border-border bg-muted transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:bg-[#7C3AED] peer-checked:after:translate-x-full peer-checked:after:border-transparent peer-focus:outline-none" />
        </label>
        <span className="text-sm font-medium"><LocalizedText id="1TAMsERkYCgg" /></span>
      </div>

      {depositRequired && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Cómo cobrar el abono</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
              <input
                type="radio"
                name="deposit-payment-mode"
                value="MERCADOPAGO"
                checked={depositPaymentMode === "MERCADOPAGO"}
                onChange={() => setDepositPaymentMode("MERCADOPAGO")}
                className="mt-1 accent-[#7C3AED]"
              />
              <span>
                <span className="block text-sm font-medium">Mercado Pago automático</span>
                <span className="block text-xs text-muted-foreground">El pago confirma la reserva automáticamente.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
              <input
                type="radio"
                name="deposit-payment-mode"
                value="MANUAL_LINK"
                checked={depositPaymentMode === "MANUAL_LINK"}
                onChange={() => setDepositPaymentMode("MANUAL_LINK")}
                className="mt-1 accent-[#7C3AED]"
              />
              <span>
                <span className="block text-sm font-medium">Link de pago por servicio</span>
                <span className="block text-xs text-muted-foreground">La clienta paga en un link externo y tú confirmas el abono desde la agenda.</span>
              </span>
            </label>
          </fieldset>
          <p className="text-sm text-muted-foreground">
            <LocalizedText id="GxzMHvqCgWhI" /> <strong><LocalizedText id="UnRPpCLeNiGc" /></strong>.
          </p>
          {depositPaymentMode === "MERCADOPAGO" && !isMpConnected && (
            <p className="text-xs text-amber-400">
              <LocalizedText id="OX6jrt269pRv" />
            </p>
          )}
          {depositPaymentMode === "MANUAL_LINK" && (
            <p className="min-w-0 break-words text-xs text-amber-500">
              Después de guardar, agrega el link correspondiente en cada servicio. Verifica el comprobante antes de marcar el abono como recibido.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <LocalizedText id="E-UaIQ9F7RsJ" />
        </button>
        {message && (
          <p className={`min-w-0 break-words text-sm ${message.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
