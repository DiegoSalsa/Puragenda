"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Unlink } from "lucide-react";
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
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!confirm("¿Estás seguro de desconectar Mercado Pago? Los abonos se desactivarán.")) return;
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
              Cuenta conectada
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Mercado Pago ID: <span className="font-mono text-foreground/70">{mpUserId || "—"}</span>
          </p>
          <p className="text-xs text-muted-foreground">Los abonos de reservas se crearán en {currencyCode}.</p>
          {!isCurrencyCompatible && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              La conexión queda bloqueada hasta volver a {mercadoPagoCurrency}. Desconecta Mercado Pago si quieres cobrar manualmente en otra moneda.
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
            Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              No conectado
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Conecta una cuenta de Mercado Pago de {countryName} para recibir abonos por reservas en {currencyCode}.
          </p>
          {!isCurrencyCompatible && mercadoPagoCurrency && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              En {countryName}, la integración de Mercado Pago cobra en {mercadoPagoCurrency}. Puedes usar {currencyCode} para precios o cobros manuales, pero no para esta integración online.
            </p>
          )}
          {!isOAuthConfigured && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Falta configurar la aplicación OAuth de Mercado Pago para {countryName}.
            </p>
          )}
          <a
            href={isOAuthConfigured && isCurrencyCompatible ? "/api/mercadopago/authorize" : undefined}
            aria-disabled={!isOAuthConfigured || !isCurrencyCompatible}
            className="inline-flex items-center gap-2 rounded-xl bg-[#009EE3] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#008CCB] hover:shadow-lg hover:shadow-[#009EE3]/20 active:scale-[0.98] aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8h-2V7h2v2z" />
            </svg>
            Conectar Mercado Pago
          </a>
        </div>
      )}
    </div>
  );
}
