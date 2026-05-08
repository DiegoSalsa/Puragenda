"use client";

import { useState } from "react";
import { Crown, Loader2, Sparkles } from "lucide-react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar el proceso de pago.");
        setLoading(false);
        return;
      }

      if (data.init_point) {
        // Redirect to MercadoPago checkout
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
    <div className="space-y-3">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#7C3AED]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {/* Shine effect */}
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        {loading ? (
          <>
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
            <span>Redirigiendo a MercadoPago…</span>
          </>
        ) : (
          <>
            <Crown className="h-4.5 w-4.5" />
            <span>Mejorar a Plan Equipo</span>
            <Sparkles className="h-3.5 w-3.5 text-white/70" />
          </>
        )}
      </button>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
