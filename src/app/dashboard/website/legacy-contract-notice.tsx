"use client";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelWebsiteAddon } from '@/server/actions/website.actions';

export default function LegacyWebsiteContractNotice({ cancelAt, included = true, canCancel = true }: { cancelAt: string | null; included?: boolean; canCancel?: boolean }) {
  const [pending, start] = useTransition(), [message, setMessage] = useState('');
  const router = useRouter();
  return <aside className="mb-4 space-y-2 rounded-xl border-2 border-black bg-white p-4 text-black">
    <p>{included ? 'Conservas un contrato histórico de Sitio Web. Puragenda+ ya incluye el sitio; revisa su renovación mientras se valida la migración.' : 'Tu sitio y su contrato histórico se conservan. La regularización requiere una revisión controlada para evitar otro acuerdo recurrente. No se ha creado ni cancelado una suscripción automáticamente.'}</p>
    {cancelAt ? <p>La renovación del complemento se canceló. Conservamos el período contratado y tu contenido.</p> : canCancel ? <button type="button" disabled={pending} className="font-bold underline" onClick={() => {
      if (!window.confirm('¿Cancelar la renovación del complemento histórico de Sitio Web? Tu suscripción principal y tu contenido se conservan.')) return;
      start(async () => {
        const result = await cancelWebsiteAddon(true);
        setMessage(result && 'error' in result ? result.error : 'Solicitud de cancelación procesada. La confirmación del proveedor determina su estado.');
        router.refresh();
      });
    }}>{pending ? 'Procesando…' : 'Cancelar renovación del complemento histórico'}</button> : null}
    {message ? <p role="status">{message}</p> : null}
  </aside>;
}
