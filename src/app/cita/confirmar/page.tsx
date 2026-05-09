"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Enlace inválido. No se encontró el token de la cita.");
      return;
    }

    fetch("/api/appointments/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "confirm" }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage("¡Tu asistencia ha sido confirmada! Te esperamos mañana.");
        } else if (data.alreadyProcessed) {
          setStatus("already");
          setMessage(data.error);
        } else {
          setStatus("error");
          setMessage(data.error || "Ocurrió un error al confirmar tu cita.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Error de conexión. Intenta de nuevo más tarde.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#7C3AED]" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Confirmando asistencia...</h1>
            <p className="mt-2 text-sm text-muted-foreground">Procesando tu solicitud</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">¡Asistencia Confirmada!</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
              <p className="text-sm font-medium text-emerald-400">El negocio ha sido notificado de tu confirmación.</p>
            </div>
          </>
        )}

        {status === "already" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Cita ya procesada</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Error</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        <p className="mt-6 text-xs text-muted-foreground/60">Puragenda</p>
      </div>
    </div>
  );
}

export default function ConfirmarCitaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
