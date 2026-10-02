"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
export default function Simulator({ operation, amount, firstChargeAt }: { operation: string; amount: number; firstChargeAt: string | null }) {
  const [message, setMessage] = useState(""); const [pending, start] = useTransition(); const router = useRouter();
  function simulate(action: string) { start(async () => {
    const response = await fetch("/api/website/payment-simulator", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, action }) });
    const result = await response.json(); setMessage(result.error || `PASS SIMULATED: ${action}`);
    if (response.ok) { router.push("/dashboard/website"); router.refresh(); }
  }); }
  return <section className="mx-auto max-w-xl space-y-5 rounded-xl border p-6"><h1 className="text-2xl font-bold">Simulador local de Mercado Pago · Sitio Web</h1><p>Proveedor simulado; no crea acuerdos ni realiza cobros en Mercado Pago.</p><p>${amount.toLocaleString("es-CL")} CLP / mes. Primer cobro: {firstChargeAt ? new Date(firstChargeAt).toLocaleString("es-CL") : "desde activación"}.</p><p>Autorizar durante el trial conserva los días gratuitos. Aprobar antes de esa fecha debe ser rechazado.</p><div className="flex flex-wrap gap-3">{["authorized", "approved", "pending", "rejected", "past_due", "cancelled"].map(action => <button key={action} disabled={pending} className="rounded-lg border px-4 py-2" onClick={() => simulate(action)}>{action}</button>)}</div><p role="status">{message}</p><a href="/dashboard/website">Volver sin completar</a></section>;
}
