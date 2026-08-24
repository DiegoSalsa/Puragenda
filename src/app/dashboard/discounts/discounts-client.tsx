"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent, Power, Trash2 } from "@/components/icons/hover-icons";
import {
  createBookingDiscountCodeAction,
  deleteBookingDiscountCodeAction,
  toggleBookingDiscountCodeAction,
} from "./actions";

type DiscountCode = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minSubtotal: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

export function DiscountCodesClient({ codes, currencyCode }: { codes: DiscountCode[]; currencyCode: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(10);
  const [minSubtotal, setMinSubtotal] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createBookingDiscountCodeAction({
        code,
        discountType,
        discountValue,
        minSubtotal,
        startsAt: startsAt || null,
        expiresAt: expiresAt || null,
      });
      if ("error" in result) {
        setError(result.error || "No se pudo crear el código");
        return;
      }
      setMessage("Código creado correctamente.");
      setCode("");
      setDiscountValue(10);
      setMinSubtotal(0);
      setStartsAt("");
      setExpiresAt("");
      router.refresh();
    });
  }

  function toggle(item: DiscountCode) {
    setError(null);
    startTransition(async () => {
      const result = await toggleBookingDiscountCodeAction(item.id, !item.isActive);
      if ("error" in result) setError(result.error || "No se pudo cambiar el estado");
      else router.refresh();
    });
  }

  function remove(item: DiscountCode) {
    if (!window.confirm(`¿Eliminar el código ${item.code}? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBookingDiscountCodeAction(item.id);
      if ("error" in result) setError(result.error || "No se pudo eliminar el código");
      else router.refresh();
    });
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,380px)_1fr]">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Crear código</h2>
          <p className="mt-1 text-xs text-muted-foreground">El código se guarda normalizado en mayúsculas.</p>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Código</span>
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required maxLength={50} placeholder="VERANO10" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono uppercase outline-none focus:border-[#7C3AED]" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="font-medium">Tipo</span>
            <select value={discountType} onChange={(event) => setDiscountType(event.target.value as "PERCENTAGE" | "FIXED")} className="w-full rounded-xl border border-border bg-background px-3 py-2.5">
              <option value="PERCENTAGE">Porcentaje</option>
              <option value="FIXED">Monto fijo</option>
            </select>
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="font-medium">Valor</span>
            <input type="number" min={1} max={discountType === "PERCENTAGE" ? 100 : undefined} value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value))} required className="w-full rounded-xl border border-border bg-background px-3 py-2.5" />
          </label>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Compra mínima ({currencyCode})</span>
          <input type="number" min={0} value={minSubtotal} onChange={(event) => setMinSubtotal(Number(event.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="font-medium">Desde</span>
            <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="min-w-0 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs" />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="font-medium">Hasta</span>
            <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="min-w-0 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs" />
          </label>
        </div>
        {error && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        {message && <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{message}</p>}
        <button type="submit" disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />} Crear código
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Códigos configurados</h2>
          <span className="text-xs text-muted-foreground">{codes.length} total</span>
        </div>
        {codes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Todavía no hay códigos de reserva.</div>
        ) : codes.map((item) => (
          <div key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0 max-w-full">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <code className="min-w-0 break-all font-mono font-bold tracking-wider">{item.code}</code>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{item.isActive ? "Activo" : "Inactivo"}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.discountType === "PERCENTAGE" ? `${item.discountValue}% de descuento` : `${item.discountValue.toLocaleString("es-CL")} ${currencyCode}`} · mínimo {item.minSubtotal.toLocaleString("es-CL")} {currencyCode}
              </p>
              {(item.startsAt || item.expiresAt) && <p className="mt-1 text-xs text-muted-foreground">{item.startsAt ? `Desde ${new Date(item.startsAt).toLocaleString("es-CL")}` : "Sin inicio"}{item.expiresAt ? ` · hasta ${new Date(item.expiresAt).toLocaleString("es-CL")}` : " · sin vencimiento"}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => toggle(item)} disabled={isPending} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"><Power className="h-3.5 w-3.5" /> {item.isActive ? "Desactivar" : "Activar"}</button>
              <button type="button" onClick={() => remove(item)} disabled={isPending} className="rounded-xl border border-red-500/25 p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50" aria-label={`Eliminar ${item.code}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
