"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/frontend/components/ui/button";
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
      <span className="flex items-center gap-1 text-xs text-white/80">
        <Check className="w-3 h-3 text-violet-300" /> Confirmada
      </span>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleConfirm}
      disabled={loading}
      className="h-7 bg-gradient-to-r from-violet-900 to-purple-700 px-3 text-xs text-white hover:from-violet-800 hover:to-purple-600"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        "Confirmar"
      )}
    </Button>
  );
}
