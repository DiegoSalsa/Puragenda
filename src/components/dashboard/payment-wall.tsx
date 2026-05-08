"use client";

import { useState, useEffect } from "react";
import { CreditCard, Loader2, Shield, ArrowRight } from "lucide-react";
import { PRICING } from "@/core/constants";

interface PaymentWallProps {
  userEmail: string;
  businessId: string;
  plan: string;
}

export function PaymentWall({ userEmail, plan }: PaymentWallProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planName = plan === "EQUIPO" ? "Equipo" : plan === "INDIVIDUAL" ? "Individual" : "Test";
  const planPrice = plan === "EQUIPO" ? PRICING.EQUIPO.monthly : plan === "INDIVIDUAL" ? PRICING.INDIVIDUAL.monthly : PRICING.TEST.monthly;

  // Auto-verify on mount
  useEffect(() => {
    verifyPayment();
  }, []);

  async function verifyPayment() {
    setVerifying(true);
    try {
      const res = await fetch("/api/billing/verify", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.status === "ACTIVE") {
        window.location.reload(); // Refresh to enter dashboard
      } else {
        setVerifying(false);
      }
    } catch {
      setVerifying(false);
    }
  }

  async function handlePayment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError(data.error || "Error al iniciar el proceso de pago.");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
          <p className="text-sm font-medium text-muted-foreground">Verificando estado de tu pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      {/* Background effect */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-44 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#7C3AED]/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6 animate-fade-up">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex w-fit items-center gap-3 mb-2">
            <img src="/logos/logo-black.svg" alt="Puragenda" className="h-12 w-auto dark:hidden" />
            <img src="/logos/logo-white.svg" alt="Puragenda" className="hidden h-12 w-auto dark:block" />
            <span className="text-2xl font-bold tracking-tight">
              Pura<span className="text-[#7C3AED]">genda</span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <div className="mb-6 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED]/10">
              <Shield className="h-8 w-8 text-[#7C3AED]" />
            </div>
            <h1 className="text-2xl font-bold">Completa tu pago</h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta fue creada exitosamente. Para acceder al dashboard, completa el pago de tu suscripción.
            </p>
          </div>

          {/* Plan info */}
          <div className="mb-6 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan {planName}</span>
              <span className="text-lg font-bold text-[#7C3AED]">${planPrice.toLocaleString("es-CL")}/mes</span>
            </div>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] py-3 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:shadow-xl hover:shadow-[#7C3AED]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo a MercadoPago...</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pagar y activar mi cuenta <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
            
            <button
              onClick={verifyPayment}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-medium text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ya pagué, verificar estado
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Serás redirigido a MercadoPago para completar el pago de forma segura.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          ¿Necesitas ayuda? Escríbenos a soporte@puragenda.cl
        </p>
      </div>
    </div>
  );
}
