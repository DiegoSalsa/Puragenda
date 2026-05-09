"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { XCircle, Loader2, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

function CancelContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [step, setStep] = useState<"confirm" | "loading" | "success" | "error" | "already">("confirm");
  const [message, setMessage] = useState("");

  function handleCancel() {
    if (!token) {
      setStep("error");
      setMessage("Enlace inválido. No se encontró el token de la cita.");
      return;
    }

    setStep("loading");

    fetch("/api/appointments/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "cancel" }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStep("success");
          setMessage("Tu cita ha sido cancelada. El negocio ha sido notificado.");
        } else if (data.alreadyProcessed) {
          setStep("already");
          setMessage(data.error);
        } else {
          setStep("error");
          setMessage(data.error || "Ocurrió un error al cancelar tu cita.");
        }
      })
      .catch(() => {
        setStep("error");
        setMessage("Error de conexión. Intenta de nuevo más tarde.");
      });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">

        {/* Step 1: Confirmation layer */}
        {step === "confirm" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">¿Cancelar tu cita?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estás a punto de cancelar tu cita de mañana. Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <p className="text-sm text-amber-400">
                Si cancelas, el profesional y el negocio serán notificados inmediatamente.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleCancel}
                className="w-full rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-600 hover:shadow-red-500/35"
              >
                Sí, cancelar mi cita
              </button>
              <a
                href="/"
                className="w-full rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground inline-block"
              >
                No, mantener mi cita
              </a>
            </div>
          </>
        )}

        {/* Loading */}
        {step === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Cancelando cita...</h1>
            <p className="mt-2 text-sm text-muted-foreground">Procesando tu solicitud</p>
          </>
        )}

        {/* Success */}
        {step === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Cita Cancelada</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm font-medium text-red-400">El negocio ha sido notificado de tu cancelación.</p>
            </div>
          </>
        )}

        {/* Already processed */}
        {step === "already" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Cita ya procesada</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {/* Error */}
        {step === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Error</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}

        {step !== "confirm" && (
          <p className="mt-6 text-xs text-muted-foreground/60">Puragenda</p>
        )}
      </div>
    </div>
  );
}

export default function CancelarCitaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
