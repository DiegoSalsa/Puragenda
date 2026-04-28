"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2, X, UserCheck, UserX } from "lucide-react";
import { useState } from "react";

const STATUS_ACTIONS = [
  { status: "CONFIRMED" as const, label: "Confirmar", icon: Check, color: "emerald" },
  { status: "CHECKED_IN" as const, label: "Asistió", icon: UserCheck, color: "blue" },
  { status: "NO_SHOW" as const, label: "No asistió", icon: UserX, color: "amber" },
  { status: "CANCELLED" as const, label: "Cancelar", icon: X, color: "red" },
];

export function AppointmentActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: string) {
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

  const available = STATUS_ACTIONS.filter((a) => a.status !== currentStatus);

  if (currentStatus === "CANCELLED") {
    return <span className="flex items-center gap-1 text-xs text-red-400/70"><X className="h-3 w-3" /> Cancelada</span>;
  }

  if (currentStatus === "CHECKED_IN") {
    return <span className="flex items-center gap-1 text-xs text-blue-400/70"><UserCheck className="h-3 w-3" /> Asistió</span>;
  }

  if (currentStatus === "NO_SHOW") {
    return <span className="flex items-center gap-1 text-xs text-amber-400/70"><UserX className="h-3 w-3" /> No asistió</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {available.filter((a) => {
        if (currentStatus === "PENDING") return ["CONFIRMED", "CANCELLED"].includes(a.status);
        if (currentStatus === "CONFIRMED") return ["CHECKED_IN", "NO_SHOW", "CANCELLED"].includes(a.status);
        return false;
      }).map((action) => {
        const colorMap: Record<string, string> = {
          emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
          blue: "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
          amber: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20",
          red: "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20",
        };
        return (
          <button
            key={action.status}
            onClick={() => handleAction(action.status)}
            disabled={loading !== null}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-all disabled:opacity-50 ${colorMap[action.color]}`}
          >
            {loading === action.status ? <Loader2 className="h-3 w-3 animate-spin" /> : <action.icon className="h-3 w-3" />}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
