"use client";

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
} from "lucide-react";

import { PRICING } from "@/core/constants";
import { DunningActions } from "./dunning-actions";

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
  }, []);

  async function verifyPayment() {
    setVerifying(true);
    try {
      const response = await fetch("/api/billing/verify", { method: "POST" });
      const data = (await response.json()) as { status?: string };
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
      const data = (await response.json()) as {
        init_point?: string;
        error?: string;
      };

      if (response.ok && data.init_point) {
        window.location.href = data.init_point;
        return;
      }
      setError(data.error || "Error al iniciar el proceso de pago.");
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRegistration() {
    const confirmed = window.confirm(
      "¿Estás seguro de que quieres cancelar el registro? Tu cuenta será eliminada y tendrás que registrarte nuevamente."
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
      setError(data.error || "Error al cancelar el registro.");
    } catch {
      setError("Error de conexión al intentar cancelar.");
    } finally {
      setCancelling(false);
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
          <p className="text-sm font-medium text-muted-foreground">
            Verificando el estado de tu pago...
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
                <Shield className="h-8 w-8 text-[#7C3AED]" />
              )}
            </div>
            <h1 className="text-2xl font-bold">
              {isPastDue
                ? "Tu suscripción está pendiente"
                : "Completa tu pago"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isPastDue
                ? "El periodo de gracia terminó, pero tus datos siguen guardados. Regulariza el cobro de la misma suscripción para recuperar el acceso."
                : "Tu cuenta fue creada exitosamente. Para acceder al dashboard, completa el pago de tu suscripción."}
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
            <span className="text-sm font-medium">Plan {planName}</span>
            <span className="text-lg font-bold text-[#7C3AED]">
              {isInternational
                ? paymentSimulatorEnabled
                  ? "Prueba local · sin dinero real"
                  : "Cobro internacional pendiente"
                : `$${planPrice.toLocaleString("es-CL")} CLP/mes`}
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {isInternational && !paymentSimulatorEnabled ? (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-300">
              No intentaremos cobrarte en CLP. Contacta a soporte para recuperar el acceso mientras se habilita el proveedor internacional.
            </div>
          ) : isPastDue && !paymentSimulatorEnabled ? (
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
                      Abriendo pago...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pagar y activar mi cuenta
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
                  Ya pagué, verificar estado
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
                  {cancelling ? "Cancelando..." : "Cancelar y borrar cuenta"}
                </button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Si elegiste el plan equivocado, puedes empezar nuevamente.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ¿Necesitas ayuda? Escríbenos a soporte@puragenda.cl
        </p>
      </div>
    </div>
  );
}
