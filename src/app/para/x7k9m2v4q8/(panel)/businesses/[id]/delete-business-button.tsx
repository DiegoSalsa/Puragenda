"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteBusinessAction } from "@/server/actions/admin.actions";

export function DeleteBusinessButton({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const result = await deleteBusinessAction(businessId);
      if (result.error) {
        alert(result.error);
      } else {
        router.push("/para/x7k9m2v4q8/businesses");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400">¿Eliminar &quot;{businessName}&quot;?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Sí, eliminar
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-[#888] hover:text-white"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10"
    >
      <Trash2 className="h-3 w-3" />
      Eliminar
    </button>
  );
}
