"use client";

import { useState } from "react";
import { AlertCircle, CreditCard, Loader2 } from "lucide-react";

function getFriendlyBillingError(data: { error?: string; code?: string }, status: number) {
  if (
    data.code === "MERCADOPAGO_NOT_CONFIGURED" ||
    data.code === "MERCADOPAGO_UNAUTHORIZED" ||
    data.code === "MERCADOPAGO_UNAVAILABLE" ||
    data.code === "MERCADOPAGO_RATE_LIMITED"
  ) {
    return "El sistema de pagos no está disponible en este momento. Inténtalo nuevamente más tarde o contacta a soporte.";
  }

  if (data.code === "MERCADOPAGO_REJECTED_REQUEST") {
    return "No pudimos preparar tu suscripción con los datos actuales. Inténtalo nuevamente o contacta a soporte.";
  }

  return (
    data.error ||
    `No pudimos iniciar el proceso de pago (HTTP ${status}). Intenta nuevamente.`
  );
}

export function ActivatePlanButton({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planLabel = plan === "EQUIPO" ? "Equipo" : "Individual";

  async function handleActivate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(getFriendlyBillingError(data, res.status));
        setLoading(false);
        return;
      }

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError("No se recibió la URL de pago. Intenta de nuevo.");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleActivate}
        disabled={loading}
        aria-busy={loading}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/20 transition-all hover:shadow-xl hover:shadow-[#7C3AED]/30 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirigiendo…
          </>
        ) : (
          <>
            <CreditCard className="h-3.5 w-3.5" /> Activar Plan {planLabel}
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-3 flex max-w-lg items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold">No pudimos iniciar el pago</p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
