"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";

export function AppointmentActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: "CONFIRMED" | "CANCELLED") {
    setLoading(action);
    try {
      await fetch(`/api/dashboard/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(null);
    }
  }

  if (currentStatus === "CONFIRMED") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-emerald-400/70">
          <Check className="h-3 w-3" /> Confirmada
        </span>
        <button
          onClick={() => handleAction("CANCELLED")}
          disabled={loading !== null}
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
        >
          {loading === "CANCELLED" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Cancelar"
          )}
        </button>
      </div>
    );
  }

  if (currentStatus === "CANCELLED") {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400/70">
        <X className="h-3 w-3" /> Cancelada
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleAction("CONFIRMED")}
        disabled={loading !== null}
        className="rounded-lg bg-[#7C3AED] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
      >
        {loading === "CONFIRMED" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          "Confirmar"
        )}
      </button>
      <button
        onClick={() => handleAction("CANCELLED")}
        disabled={loading !== null}
        className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
      >
        {loading === "CANCELLED" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          "Cancelar"
        )}
      </button>
    </div>
  );
}
