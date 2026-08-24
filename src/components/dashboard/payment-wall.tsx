"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Loader2,
  Shield,
  Store,
  User,
  UserX,
} from "@/components/icons/hover-icons";

import { PRICING } from "@/core/constants";
import { DunningActions } from "./dunning-actions";
import { startBillingCheckout } from "@/components/paddle/checkout";

interface PaymentWallProps {
  userEmail: string;
  userName: string;
  businessId: string;
  businessName: string;
  countryCode: string;
  plan: string;
  paymentSimulatorEnabled?: boolean;
  reason?: "pending" | "past_due";
}

export function PaymentWall({
  userEmail,
  userName,
  businessName,
  countryCode,
  plan,
  paymentSimulatorEnabled = false,
  reason = "pending",
}: PaymentWallProps) {
  const legacy = useTranslations("legacy");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPastDue = reason === "past_due";
  const isInternational = countryCode !== "CL";
  const planName =
    plan === "EQUIPO" ? "Equipo" : plan === "INDIVIDUAL" ? "Individual" : "Test";
  const planPrice =
    plan === "EQUIPO"
      ? PRICING.EQUIPO.monthly
      : plan === "INDIVIDUAL"
        ? PRICING.INDIVIDUAL.monthly
        : PRICING.TEST.monthly;

  useEffect(() => {
    void verifyPayment();

    if (!isInternational) return;
    const pollId = window.setInterval(() => {
      void verifyPayment();
    }, 5_000);

    return () => window.clearInterval(pollId);
  }, [isInternational]);

  async function verifyPayment() {
    setVerifying(true);
    try {
      const response = await fetch("/api/billing/verify", { method: "POST" });
      const data = (await response.json()) as { status?: string; provider?: string };
      if (response.ok && data.status === "ACTIVE") {
        window.location.reload();
        return;
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handlePayment() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json()) as { init_point?: string; provider?: string; error?: string };

      if (response.ok && (data.init_point || data.provider === "paddle")) {
        await startBillingCheckout(data as Parameters<typeof startBillingCheckout>[0]);
        return;
      }
      setError(data.error || legacy("9xSo3rhgfFpo"));
    } catch {
      setError(legacy("S2__BDp5EpSo"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRegistration() {
    const confirmed = window.confirm(
      legacy("HiMBISCvumXg")
    );
    if (!confirmed) return;

    setCancelling(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/cancel-registration", {
        method: "DELETE",
      });
      if (response.ok) {
        window.location.href = "/";
        return;
      }
      const data = (await response.json()) as { error?: string };
      setError(data.error || legacy("liY-wANk6-V3"));
    } catch {
      setError(legacy("TQo_ghtUgYxu"));
    } finally {
      setCancelling(false);
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            <LocalizedText id="r6UUaKySs_6p" />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image
            src="/logos/logoPuragendaSVG.svg"
            alt="Puragenda"
            width={240}
            height={64}
            className="mx-auto h-16 w-auto"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <div className="mb-6 space-y-3 text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                isPastDue ? "bg-amber-500/10" : "bg-[#7C3AED]/10"
              }`}
            >
              {isPastDue ? (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              ) : (
                <Shield className="h-8 w-8 text-brand-foreground" />
              )}
            </div>
            <h1 className="text-2xl font-bold">
              {isPastDue
                ? legacy("F1kbZUmYwdct")
                : legacy("rG7jIc2s79LN")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isPastDue
                ? legacy("Za8eWcpRJJq7")
                : legacy("35zgM7QhNJs4")}
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-3 text-sm">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{businessName}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{userName}</span>
            </div>
            <p className="ml-7 mt-1 text-xs text-muted-foreground">
              {userEmail}
            </p>
          </div>

          <div className="mb-6 flex items-center justify-between rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4">
            <span className="text-sm font-medium"><LocalizedText id="-o7Qvavda8sc" /> {planName}</span>
            <span className="text-lg font-bold text-brand-foreground">
              {isInternational
                ? paymentSimulatorEnabled
                  ? legacy("BnuGonaob6WJ")
                  : "USD base + impuestos locales"
                : `$${planPrice.toLocaleString("es-CL")} CLP/mes`}
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {isPastDue && !paymentSimulatorEnabled && !isInternational ? (
            <DunningActions />
          ) : (
            <>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={loading || cancelling}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <LocalizedText id="I8SSvxW8prnr" />
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <LocalizedText id="XFmrQ8WXktfM" />
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={verifyPayment}
                  disabled={loading || cancelling}
                  className="flex w-full items-center justify-center rounded-xl border border-border bg-background py-3 text-sm font-medium"
                >
                  <LocalizedText id="Zt4qjj2ZqJFp" />
                </button>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <button
                  type="button"
                  onClick={handleCancelRegistration}
                  disabled={loading || cancelling}
                  className="flex w-full items-center justify-center gap-2 text-sm font-medium text-red-500 disabled:opacity-50"
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  {cancelling ? "Cancelando..." : legacy("YHuSQvSz0qCl")}
                </button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  <LocalizedText id="e5y98L-QSX1C" />
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <LocalizedText id="ZCvUYfxd9pT9" />
        </p>
      </div>
    </div>
  );
}
