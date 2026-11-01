"use client";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelWebsiteAddon } from '@/server/actions/website.actions';

export default function LegacyWebsiteContractNotice({ cancelAt }: { cancelAt: string | null }) {
  const [pending, start] = useTransition(), [message, setMessage] = useState('');
  const router = useRouter();
  return <aside className="mb-4 space-y-2 rounded-xl border-2 border-black bg-white p-4 text-black">
    <p>Conservas un contrato histórico de Sitio Web. Puragenda+ ya incluye el sitio; revisa su renovación mientras se valida la migración.</p>
    {cancelAt ? <p>La renovación del complemento se canceló. Conservamos el período contratado y tu contenido.</p> : <button type="button" disabled={pending} className="font-bold underline" onClick={() => {
      if (!window.confirm('¿Cancelar la renovación del complemento histórico de Sitio Web? Tu suscripción principal y tu contenido se conservan.')) return;
      start(async () => {
        const result = await cancelWebsiteAddon(true);
        setMessage(result && 'error' in result ? result.error : 'Solicitud de cancelación procesada. La confirmación del proveedor determina su estado.');
        router.refresh();
      });
    }}>{pending ? 'Procesando…' : 'Cancelar renovación del complemento histórico'}</button>}
    {message ? <p role="status">{message}</p> : null}
  </aside>;
}
