"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Algo salió mal</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Ocurrió un error cargando esta sección. Podés intentar de nuevo.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  );
}
