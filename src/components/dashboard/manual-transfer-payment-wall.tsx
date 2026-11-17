"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, Copy, Loader2, Mail } from "@/components/icons/hover-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MANUAL_TRANSFER_ACCOUNT,
  manualTransferReceiptUrl,
  manualTransferReference,
} from "@/core/manual-transfer";

export interface ManualTransferPaymentWallProps {
  businessName: string;
  businessSlug: string;
  amountClp: number;
  billingCycle: "MONTHLY" | "ANNUAL";
}

export function ManualTransferPaymentWall({
  businessName,
  businessSlug,
  amountClp,
  billingCycle,
}: ManualTransferPaymentWallProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const [checking, startTransition] = useTransition();
  const [checked, setChecked] = useState(false);
  const amount = `$${amountClp.toLocaleString("es-CL")} CLP`;
  const reference = manualTransferReference(businessName, businessSlug);
  const receiptUrl = manualTransferReceiptUrl(reference);
  const rows = [
    ["Titular", MANUAL_TRANSFER_ACCOUNT.holder],
    ["RUT", MANUAL_TRANSFER_ACCOUNT.taxId],
    ["Banco", MANUAL_TRANSFER_ACCOUNT.bank],
    ["Tipo de cuenta", MANUAL_TRANSFER_ACCOUNT.accountType],
    ["Número de cuenta", MANUAL_TRANSFER_ACCOUNT.accountNumber],
    ["Correo", MANUAL_TRANSFER_ACCOUNT.email],
    ["Monto", amount],
    ["Referencia", reference],
  ];

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(rows.map(([label, value]) => `${label}: ${value}`).join("\n"));
      setCopyStatus("Datos copiados.");
    } catch {
      setCopyStatus("No pudimos copiar los datos. Puedes seleccionarlos y copiarlos desde aquí.");
    }
  }

  function checkPayment() {
    setChecked(true);
    startTransition(() => router.refresh());
  }

  const details = (
    <dl className="divide-y divide-border rounded-xl border border-border bg-muted/30 px-4">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 py-2.5 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="select-text break-words text-right font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <Image src="/logos/logoPuragendaSVG.svg" alt="Puragenda" width={240} height={64} className="mx-auto h-14 w-auto" />
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-7">
          <div className="space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h1 className="text-2xl font-bold">Renueva tu servicio por transferencia</h1>
            <p className="text-sm text-muted-foreground">
              El período de acceso de <strong className="text-foreground">{businessName}</strong> terminó.
              Transfiere el monto de tu renovación y envíanos el comprobante para reactivar el servicio.
            </p>
          </div>
          <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4">
            <p className="text-2xl font-bold text-brand-foreground">{amount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {billingCycle === "ANNUAL" ? "Renovación anual" : "Renovación mensual"} · IVA incluido · según tu acuerdo vigente
            </p>
          </div>
          {details}
          <p className="text-sm text-muted-foreground">
            Envía el comprobante a <a href={receiptUrl} className="font-semibold text-brand-foreground underline">{MANUAL_TRANSFER_ACCOUNT.email}</a> indicando el nombre de tu negocio.
            El servicio se reactivará cuando confirmemos la transferencia.
          </p>
          <div className="grid gap-3">
            <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-semibold text-white">
              Ver datos para transferir
            </button>
            <a href={receiptUrl} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold">
              <Mail className="h-4 w-4" /> Enviar comprobante
            </a>
            <button type="button" onClick={checkPayment} disabled={checking} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium disabled:opacity-50">
              {checking && <Loader2 className="h-4 w-4 animate-spin" />}
              {checking ? "Revisando estado..." : "Ya pagué, revisar estado"}
            </button>
          </div>
          {checked && !checking && <p role="status" className="text-sm text-muted-foreground">Tu renovación aún requiere confirmación. Si ya transferiste, envíanos el comprobante para revisarlo.</p>}
        </section>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-7 text-xl font-bold">Datos para renovar {businessName}</DialogTitle>
            <DialogDescription>
              Transfiere {amount} y envía el comprobante a {MANUAL_TRANSFER_ACCOUNT.email}. Confirmaremos el pago para reactivar tu servicio.
            </DialogDescription>
          </DialogHeader>
          {details}
          <div className="grid gap-3">
            <button type="button" onClick={copyDetails} className="flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 font-semibold text-white">
              <Copy className="h-4 w-4" /> Copiar datos de transferencia
            </button>
            <a href={receiptUrl} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 font-semibold">
              <Mail className="h-4 w-4" /> Enviar comprobante
            </a>
          </div>
          <p role="status" className="text-sm text-muted-foreground">{copyStatus}</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
