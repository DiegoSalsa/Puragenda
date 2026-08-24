"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Unlink } from "@/components/icons/hover-icons";
import { disconnectMercadoPagoAction } from "@/server/actions/dashboard.actions";

interface Props {
  isConnected: boolean;
  mpUserId: string | null;
  countryName: string;
  currencyCode: string;
  mercadoPagoCurrency: string | null;
  isCurrencyCompatible: boolean;
  isOAuthConfigured: boolean;
}

export function MercadoPagoConnect({
  isConnected,
  mpUserId,
  countryName,
  currencyCode,
  mercadoPagoCurrency,
  isCurrencyCompatible,
  isOAuthConfigured,
}: Props) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!confirm(legacy("gmMC15wdRCcR"))) return;
    setDisconnecting(true);
    const result = await disconnectMercadoPagoAction();
    if (result.error) {
      alert(result.error);
    }
    setDisconnecting(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              <LocalizedText id="8R4D0gWqtkm1" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <LocalizedText id="WST6iivWTi40" /> <span className="font-mono text-foreground/70">{mpUserId || "—"}</span>
          </p>
          <p className="text-xs text-muted-foreground"><LocalizedText id="ZaTuWP_K83N0" /> {currencyCode}.</p>
          {!isCurrencyCompatible && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <LocalizedText id="I0BUW-yMgWOH" /> {mercadoPagoCurrency}<LocalizedText id="z2ZsWkyLYYOI" />
            </p>
          )}
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
            <LocalizedText id="iRMPd7f6Q2vG" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              <LocalizedText id="X6OYmnbRmVqK" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <LocalizedText id="AKWGLYFQMXXz" /> {countryName} <LocalizedText id="eBsV7htQi9_R" /> {currencyCode}.
          </p>
          {!isCurrencyCompatible && mercadoPagoCurrency && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              <LocalizedText id="-5LH44G3HO2j" /> {countryName}<LocalizedText id="ZLfl-oma25nK" /> {mercadoPagoCurrency}<LocalizedText id="UMX9_Uo8SRj_" /> {currencyCode} <LocalizedText id="QtY-MECO3KUc" />
            </p>
          )}
          {!isOAuthConfigured && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              <LocalizedText id="WcZFFpRHSmfC" /> {countryName}.
            </p>
          )}
          <a
            href={isOAuthConfigured && isCurrencyCompatible ? "/api/mercadopago/authorize" : undefined}
            aria-disabled={!isOAuthConfigured || !isCurrencyCompatible}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00AEEF] px-5 py-3 text-sm font-bold text-[#08212B] transition-all hover:bg-[#18B8F0] hover:shadow-lg hover:shadow-[#009EE3]/20 active:scale-[0.98] aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8h-2V7h2v2z" />
            </svg>
            <LocalizedText id="TnGcJmjGJpRh" />
          </a>
        </div>
      )}
    </div>
  );
}
