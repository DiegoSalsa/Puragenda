"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

export function AppointmentActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetch(`/api/dashboard/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      router.refresh();
    } catch (error) {
      console.error("Error al confirmar:", error);
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === "CONFIRMED") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400/70">
        <Check className="h-3 w-3" /> Confirmada
      </span>
    );
  }

  if (currentStatus === "CANCELLED") {
    return (
      <span className="text-xs text-red-400/70">Cancelada</span>
    );
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="rounded-lg bg-[#0085CB] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#006BA3] disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        "Confirmar"
      )}
    </button>
  );
}
