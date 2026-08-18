"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

type RecoveryConfig = {
  publicKey: string;
  cardId: string | null;
  paymentMethodId: string | null;
  checkoutUrl: string | null;
};

type MercadoPagoField = {
  mount: (elementId: string) => MercadoPagoField;
  unmount?: () => void;
};

type MercadoPagoInstance = {
  fields: {
    create: (
      field: "securityCode",
      options: { placeholder: string }
    ) => MercadoPagoField;
    createCardToken: (data: { cardId: string }) => Promise<{ id: string }>;
  };
};

type MercadoPagoOptions = {
  locale?: string;
  trackingDisabled?: boolean;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: MercadoPagoOptions
    ) => MercadoPagoInstance;
  }
}

export function DunningActions({ compact = false }: { compact?: boolean }) {
  const legacy = useTranslations("legacy");
  const rawId = useId();
  const fieldId = `mp-security-code-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [scriptReady, setScriptReady] = useState(false);
  const [config, setConfig] = useState<RecoveryConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState<"prepare" | "pay" | "verify" | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mpRef = useRef<MercadoPagoInstance | null>(null);

  useEffect(() => {
    if (
      !modalOpen ||
      !scriptReady ||
      !config?.cardId ||
      !window.MercadoPago
    ) {
      return;
    }

    const mp = new window.MercadoPago(config.publicKey, {
      locale: "es-CL",
      trackingDisabled: true,
    });
    mpRef.current = mp;
    const field = mp.fields
      .create("securityCode", { placeholder: "CVV" })
      .mount(fieldId);

    return () => {
      field.unmount?.();
      mpRef.current = null;
    };
  }, [config, fieldId, modalOpen, scriptReady]);

  async function prepareRecovery() {
    setLoading("prepare");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/recovery", {
        cache: "no-store",
      });
      const data = (await response.json()) as RecoveryConfig & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "No se pudo abrir el pago");

      if (!data.cardId) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        throw new Error(
          "Mercado Pago no entregó una tarjeta guardada para esta suscripción"
        );
      }

      setConfig(data);
      setModalOpen(true);
    } catch (recoveryError) {
      setError(
        recoveryError instanceof Error
          ? recoveryError.message
          : legacy("pxH9-B2c4ffa")
      );
    } finally {
      setLoading(null);
    }
  }

  async function submitRecovery(event: React.FormEvent) {
    event.preventDefault();
    if (!config?.cardId || !mpRef.current) return;

    setLoading("pay");
    setError(null);
    setMessage(null);

    try {
      const token = await mpRef.current.fields.createCardToken({
        cardId: config.cardId,
      });
      if (!token.id) throw new Error("No se pudo autorizar la tarjeta");

      const response = await fetch("/api/billing/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardToken: token.id }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        status?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo regularizar el pago");
      }

      setMessage(data.message || "Tarjeta reautorizada correctamente");
      if (data.status === "ACTIVE") {
        window.setTimeout(() => window.location.reload(), 900);
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : legacy("vatmrSbvBlxj")
      );
    } finally {
      setLoading(null);
    }
  }

  async function verifyPayment() {
    setLoading("verify");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/billing/verify", { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        status?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo verificar el cobro");
      }

      if (data.status === "ACTIVE") {
        setMessage(legacy("Ydu7-15U0k-L"));
        window.setTimeout(() => window.location.reload(), 700);
      } else {
        setMessage(
          legacy("a1pi6U3CxCDZ")
        );
      }
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : legacy("13dWH2O0BY9s")
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />

      <div
        className={`flex ${compact ? "flex-wrap" : "flex-col"} items-stretch gap-2`}
      >
        <button
          type="button"
          onClick={prepareRecovery}
          disabled={loading !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "prepare" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          <LocalizedText id="a7Czv6v1_6eF" />
        </button>
        <button
          type="button"
          onClick={verifyPayment}
          disabled={loading !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-background/70 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "verify" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <LocalizedText id="lmUfLODwF7kO" />
        </button>
      </div>

      {(message || error) && !modalOpen && (
        <p
          className={`mt-2 text-xs font-medium ${
            error ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {error || message}
        </p>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-black/70 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <LocalizedText id="Nv5HtqlVM6BT" />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <LocalizedText id="Zr6B3a8p4yd_" />
                </p>
              </div>
              <button
                type="button"
                aria-label={legacy("rsyuNC5L0KcN")}
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitRecovery} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  <LocalizedText id="16IrBrk0m6ae" />
                </label>
                <div
                  id={fieldId}
                  className="h-11 rounded-xl border border-border bg-background px-3 py-3"
                />
              </div>

              {message && (
                <div className="flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {message}
                </div>
              )}
              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading !== null || !scriptReady}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === "pay" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                <LocalizedText id="U3uIoBwEkJoW" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
