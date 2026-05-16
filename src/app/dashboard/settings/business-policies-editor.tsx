"use client";

import { useState, useTransition } from "react";
import { updateBusinessPoliciesAction } from "@/server/actions/dashboard.actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  initialAllowRescheduling: boolean;
  initialRescheduleHoursLimit: number;
  initialRequiresClientRut: boolean;
}

export function BusinessPoliciesEditor({ initialAllowRescheduling, initialRescheduleHoursLimit, initialRequiresClientRut }: Props) {
  const [allowRescheduling, setAllowRescheduling] = useState(initialAllowRescheduling);
  const [rescheduleHoursLimit, setRescheduleHoursLimit] = useState(initialRescheduleHoursLimit);
  const [requiresClientRut, setRequiresClientRut] = useState(initialRequiresClientRut);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleSave() {
    setResult(null);
    startTransition(async () => {
      const res = await updateBusinessPoliciesAction({
        allowRescheduling,
        rescheduleHoursLimit,
        requiresClientRut,
      });
      if ("error" in res && res.error) {
        setResult({ ok: false, msg: res.error as string });
      } else {
        setResult({ ok: true, msg: "Politicas guardadas correctamente" });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Allow rescheduling toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Permitir reagendamiento</p>
          <p className="mt-0.5 text-xs text-muted-foreground">El cliente puede solicitar cambio de horario en sus sesiones recurrentes</p>
        </div>
        <button
          type="button"
          onClick={() => setAllowRescheduling((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
            allowRescheduling ? "bg-[#7C3AED]" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              allowRescheduling ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Hours limit (visible only when rescheduling is enabled) */}
      {allowRescheduling && (
        <div className="ml-0 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Horas minimas de anticipacion para reagendar</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={168}
              value={rescheduleHoursLimit}
              onChange={(e) => setRescheduleHoursLimit(parseInt(e.target.value) || 24)}
              className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
            />
            <span className="text-sm text-muted-foreground">horas</span>
          </div>
        </div>
      )}

      {/* Require RUT toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Requerir RUT del cliente</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Se solicita el RUT al completar reservas recurrentes (requerido para facturas)</p>
        </div>
        <button
          type="button"
          onClick={() => setRequiresClientRut((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
            requiresClientRut ? "bg-[#7C3AED]" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              requiresClientRut ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="rounded-xl bg-[#7C3AED] px-5 py-2 text-sm font-bold text-white hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
        >
          {pending ? "Guardando..." : "Guardar politicas"}
        </button>
        {result && (
          <span className={`flex items-center gap-1.5 text-sm ${result.ok ? "text-emerald-500" : "text-red-500"}`}>
            {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {result.msg}
          </span>
        )}
      </div>
    </div>
  );
}
