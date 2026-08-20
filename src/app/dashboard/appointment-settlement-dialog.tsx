"use client";

import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type SettlementItem = { description: string; amount: number };

export type SettlementAppointment = {
  id: string;
  totalPrice: number;
  sessionBaseAmount: number | null;
  tipAmount: number;
  postSessionItems: SettlementItem[];
  paymentMethod: string | null;
  settledAt: string | null;
};

export function AppointmentSettlementDialog({
  appointment,
  currencyCode,
  onClose,
  onSaved,
}: {
  appointment: SettlementAppointment;
  currencyCode: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [baseAmount, setBaseAmount] = useState(String(appointment.sessionBaseAmount ?? appointment.totalPrice));
  const [tipAmount, setTipAmount] = useState(String(appointment.tipAmount || 0));
  const [paymentMethod, setPaymentMethod] = useState(appointment.paymentMethod ?? "");
  const [items, setItems] = useState<{ description: string; amount: string }[]>(
    appointment.postSessionItems.map((item) => ({ description: item.description, amount: String(item.amount) })),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(() => (
    Number(baseAmount || 0) + Number(tipAmount || 0) + items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  ), [baseAmount, tipAmount, items]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/dashboard/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settlement: {
          baseAmount,
          tipAmount,
          paymentMethod: paymentMethod || null,
          items: items.map((item) => ({ description: item.description, amount: item.amount })),
        },
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "No se pudo cerrar la sesión");
      setLoading(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center py-5">
        <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3"><Banknote className="h-5 w-5 text-[#A78BFA]" /><div><h2 className="font-semibold">Cierre post-sesión</h2><p className="text-xs text-muted-foreground">Registra lo que realmente se cobró.</p></div></div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
            <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Importe del servicio reservado</span><input type="number" min="0" step="0.01" required value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
            <section className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Servicios o cargos extra</p><p className="text-xs text-muted-foreground">Añade solo lo que ocurrió durante la sesión.</p></div><button type="button" onClick={() => setItems((current) => [...current, { description: "", amount: "0" }])} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-medium"><Plus className="h-3.5 w-3.5" /> Añadir</button></div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_120px_auto] gap-2">
                  <input required maxLength={100} value={item.description} onChange={(event) => setItems((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, description: event.target.value } : value))} placeholder="Ej. Masaje adicional" className="min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                  <input required type="number" min="0" step="0.01" value={item.amount} onChange={(event) => setItems((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, amount: event.target.value } : value))} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                  <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Eliminar extra" className="rounded-lg p-2 text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </section>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Propina</span><input type="number" min="0" step="0.01" required value={tipAmount} onChange={(event) => setTipAmount(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
              <label className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground">Método de pago</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="">Sin especificar</option><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option><option value="TRANSFER">Transferencia</option><option value="OTHER">Otro</option></select></label>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#7C3AED]/10 p-4"><span className="text-sm font-medium">Total final</span><span className="text-xl font-bold text-[#A78BFA]">{formatPrice(Math.round(total), currencyCode)}</span></div>
            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
          </div>
          <div className="flex gap-3 border-t border-border bg-muted/20 px-5 py-4"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium">Cancelar</button><button disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Guardar cierre</button></div>
        </form>
      </div>
    </div>
  );
}
