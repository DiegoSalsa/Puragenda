"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar el proceso de pago.");
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
        onClick={handleActivate}
        disabled={loading}
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
        <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
