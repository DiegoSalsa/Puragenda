"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STEP_UP_REQUIRED } from "@/core/constants";
import { setMcpBusinessAccess } from "@/server/actions/mcp-rollout.actions";
import { AdminStepUpForm } from "../admin-step-up-form";

type Props = { backendEnabled: boolean; businessAccessEnabled: boolean; version: number; approvalReference: string };

export function McpRolloutControl({ backendEnabled, businessAccessEnabled, version, approvalReference }: Props) {
  const router = useRouter();
  const [reference, setReference] = useState(approvalReference);
  const [approved, setApproved] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function change(enabled: boolean) {
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const result = await setMcpBusinessAccess({ enabled, expectedVersion: version, approvalConfirmed: approved, approvalReference: reference });
        if (result.error === STEP_UP_REQUIRED) { setNeedsVerification(true); return; }
        if (result.error) { setError(result.error); router.refresh(); return; }
        setNeedsVerification(false); setApproved(false);
        setMessage(enabled ? "Los negocios ya pueden conectar su cuenta con sus propios permisos." : "Acceso para negocios deshabilitado. Las cuentas de revisión conservan su acceso.");
        router.refresh();
      } catch { setError("No se pudo guardar el cambio. Actualiza la página y vuelve a intentarlo."); }
    });
  }

  return <section className="space-y-5 border-2 border-black bg-white p-6 text-black shadow-[4px_4px_0_#7C3AED]">
    <div><h2 className="text-xl font-black">ChatGPT y Codex</h2><p className="mt-2 font-bold">{businessAccessEnabled && backendEnabled ? "Habilitado para negocios" : "Negocios deshabilitados"}</p></div>
    <p className="text-sm">Cuando OpenAI apruebe la integración, habilita el acceso aquí. Cada negocio deberá conectar su cuenta y autorizar sus permisos.</p>
    {!backendEnabled && <p className="border-2 border-black bg-[#FFF5BA] p-3 text-sm font-bold">El servidor está apagado en este entorno. El acceso a negocios permanecerá cerrado.</p>}
    {businessAccessEnabled ? <button type="button" disabled={pending} onClick={() => change(false)} className="border-2 border-black bg-[#FFB5E8] px-5 py-3 font-black disabled:opacity-50">{pending ? "Guardando…" : "Deshabilitar para negocios"}</button> : <div className="space-y-4">
      <label className="block space-y-2 text-sm font-bold">Referencia de la aprobación de OpenAI<input value={reference} onChange={event => setReference(event.target.value)} maxLength={500} className="block w-full border-2 border-black p-3 font-normal" placeholder="Identificador o enlace de la aprobación" /></label>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} />He verificado que OpenAI aprobó esta integración para su publicación.</label>
      <button type="button" disabled={pending || !backendEnabled || !approved || reference.trim().length < 3} onClick={() => change(true)} className="border-2 border-black bg-black px-5 py-3 font-black text-[#B28DFF] disabled:opacity-50">{pending ? "Guardando…" : "Habilitar para negocios"}</button>
    </div>}
    {needsVerification && <AdminStepUpForm onVerified={() => { setNeedsVerification(false); change(true); }} />}
    {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm font-bold text-green-800">{message}</p>}
  </section>;
}
