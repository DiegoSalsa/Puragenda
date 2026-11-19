"use client";

import { useActionState, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "@/core/constants";
import { recordManualSubscriptionPaymentAction } from "@/server/actions/admin.actions";

const inputClass = "mt-1 block w-full min-w-0 rounded-none border-2 border-black bg-white px-2 py-2 text-sm";

export function ManualTransferForm({
  businessId,
  currentPeriodEnd,
  amountLabel,
}: {
  businessId: string;
  currentPeriodEnd: string | null;
  amountLabel: string;
}) {
  const periodEndDay = currentPeriodEnd ? formatInTimeZone(currentPeriodEnd, DEFAULT_TIMEZONE, "yyyy-MM-dd") : "";
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [startsOn, setStartsOn] = useState<string | null>(null);
  const [endsOn, setEndsOn] = useState("");
  const [state, action, pending] = useActionState(
    recordManualSubscriptionPaymentAction.bind(null, businessId, currentPeriodEnd),
    {},
  );

  return (
    <form action={action} className="border-2 border-black bg-white p-3">
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <legend className="text-sm font-black">Registrar transferencia recibida</legend>
        <p className="text-xs text-black/70">El monto del acuerdo es {amountLabel}. El acceso vence a las 00:00 de la fecha indicada, hora de Chile.</p>
        <label className="block text-xs font-bold">
          Referencia del comprobante
          <input name="reference" className={inputClass} required minLength={3} maxLength={150} value={reference} onChange={(event) => setReference(event.target.value)} />
        </label>
        <label className="block text-xs font-bold">
          Monto recibido en pesos chilenos
          <input name="amountClp" className={inputClass} required type="number" inputMode="numeric" min={1} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="block text-xs font-bold">
          Inicio del período pagado
          <input name="startsOn" className={inputClass} required type="date" min={periodEndDay || undefined} value={startsOn ?? periodEndDay} onChange={(event) => setStartsOn(event.target.value)} />
        </label>
        <label className="block text-xs font-bold">
          Fecha de vencimiento
          <input name="endsOn" className={inputClass} required type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
        </label>
        <button type="submit" className="w-full border-2 border-black bg-black px-2 py-2 text-sm font-black text-white disabled:opacity-50">
          {pending ? "Registrando…" : "Registrar pago y activar"}
        </button>
        {state.error && <p role="alert" className="text-xs font-bold text-red-800">{state.error}</p>}
        {state.message && <p role="status" className="text-xs font-bold text-green-800">{state.message}</p>}
      </fieldset>
    </form>
  );
}
