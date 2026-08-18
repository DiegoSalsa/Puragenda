"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Loader2, QrCode, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface PosQrPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  statusDetail: string | null;
  expiresAt: string | null;
  qrImageDataUrl?: string | null;
  paidAt?: string | null;
}

export function PosPaymentDialog({
  appointmentId,
  balance,
  currencyCode,
  onPaid,
}: {
  appointmentId: string;
  balance: number;
  currencyCode: string;
  onPaid: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState<PosQrPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPayment() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/pos/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      const body = await response.json() as PosQrPayment & { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudo generar el QR");
      setPayment(body);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "No se pudo generar el QR");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !payment || payment.status !== "PENDING") return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/dashboard/pos/qr/${payment.id}`, { method: "POST" });
        const body = await response.json() as PosQrPayment & { error?: string };
        if (!response.ok) throw new Error(body.error || "No se pudo verificar el pago");
        if (cancelled) return;
        setPayment((current) => current ? { ...current, ...body } : body);
        if (body.status === "APPROVED") onPaid();
      } catch (syncError) {
        if (!cancelled) setError(syncError instanceof Error ? syncError.message : "No se pudo verificar el pago");
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, payment, onPaid]);

  return (
    <>
      <button
        type="button"
        onClick={createPayment}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#6D28D9]"
      >
        <QrCode className="h-4 w-4" />
        Cobrar saldo por QR · {formatPrice(balance, currencyCode)}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex overflow-y-auto bg-black/75 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A78BFA]">POS Puragenda</p>
                <h3 className="mt-1 text-xl font-bold">Cobro con Mercado Pago</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar POS">
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading && (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
                Generando un QR único…
              </div>
            )}

            {!loading && error && !payment && (
              <div className="space-y-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                <p>{error}</p>
                <button type="button" onClick={createPayment} className="w-full rounded-xl bg-red-500 px-4 py-2.5 font-semibold text-white">Reintentar</button>
              </div>
            )}

            {!loading && payment?.status === "APPROVED" && (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                <p className="mt-4 text-xl font-bold">Pago aprobado</p>
                <p className="mt-1 text-sm text-muted-foreground">El saldo quedó registrado en la cita.</p>
                <p className="mt-4 text-2xl font-black text-emerald-400">{formatPrice(payment.amount, payment.currency)}</p>
              </div>
            )}

            {!loading && payment && payment.status !== "APPROVED" && (
              <div className="space-y-4">
                {payment.qrImageDataUrl && (
                  <div className="mx-auto max-w-full w-fit rounded-3xl bg-white p-3">
                    <Image className="h-auto max-w-full" src={payment.qrImageDataUrl} alt="QR de cobro Mercado Pago" width={280} height={280} unoptimized priority />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">La clienta escanea con su tel&eacute;fono y paga en Mercado Pago</p>
                  <p className="mt-1 text-3xl font-black">{formatPrice(payment.amount, payment.currency)}</p>
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Loader2 className="h-3 w-3 animate-spin" /> Esperando pago
                  </p>
                </div>
                {error && <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">{error}</p>}
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" /> El QR vence automáticamente; cerrar no crea otro cobro.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
