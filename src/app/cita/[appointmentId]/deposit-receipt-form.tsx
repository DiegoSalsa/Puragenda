"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Upload } from "lucide-react";

type ReceiptStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export function DepositReceiptForm({
  appointmentId,
  paymentUrl,
  receiptToken,
  initialStatus,
  primaryColor,
}: {
  appointmentId: string;
  paymentUrl: string;
  receiptToken?: string;
  initialStatus: ReceiptStatus;
  primaryColor: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submitReceipt() {
    if (!file || !receiptToken) return;
    setSubmitting(true);
    setError("");

    try {
      const form = new FormData();
      form.set("receipt", file);
      form.set("receiptToken", receiptToken);
      const response = await fetch(`/api/appointments/${appointmentId}/deposit-receipt`, {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo subir el comprobante.");
      setStatus("PENDING");
      setFile(null);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo subir el comprobante.");
    } finally {
      setSubmitting(false);
    }
  }

  const canUpload = status === "NONE" || status === "REJECTED";

  return (
    <div className="space-y-3">
      <a
        href={paymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        Pagar abono <ExternalLink className="h-4 w-4" />
      </a>

      {status === "PENDING" && (
        <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-300">Comprobante enviado</p>
            <p className="text-xs text-muted-foreground">El negocio lo revisará y te avisará cuando confirme la reserva.</p>
          </div>
        </div>
      )}

      {status === "REJECTED" && (
        <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <p className="font-semibold text-red-300">No pudimos validar el comprobante</p>
            <p className="text-xs text-muted-foreground">Revisa el pago y sube una imagen o PDF nuevo.</p>
          </div>
        </div>
      )}

      {canUpload && receiptToken && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-semibold">Adjunta tu comprobante</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP o PDF, máximo 5 MB.</p>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError("");
            }}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={submitReceipt}
            disabled={!file || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white/10 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {submitting ? "Subiendo…" : "Enviar comprobante"}
          </button>
        </div>
      )}

      {canUpload && !receiptToken && (
        <p className="text-center text-xs text-muted-foreground">
          Para adjuntar el comprobante, abre el enlace original que recibiste al reservar.
        </p>
      )}
    </div>
  );
}
