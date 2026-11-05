"use client";
import { COMMERCIAL_CONSENT_TEXT } from "@/core/commercial-consent";
export function CommercialConsentChoice({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="rounded-xl border border-current/20 p-4 text-sm">
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-current" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{COMMERCIAL_CONSENT_TEXT} <strong>(Opcional)</strong></span>
    </label>
    <p className="mt-2 text-xs">Puedes reservar sin aceptar. Confirma esta preferencia desde tu cuenta con correo verificado en Mi agenda.</p>
  </div>;
}
