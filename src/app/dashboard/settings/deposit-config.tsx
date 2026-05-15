"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveDepositConfigAction } from "@/server/actions/dashboard.actions";

interface Props {
  initialDepositRequired: boolean;
  isMpConnected: boolean;
}

export function DepositConfig({ initialDepositRequired, isMpConnected }: Props) {
  const router = useRouter();
  const [depositRequired, setDepositRequired] = useState(initialDepositRequired);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await saveDepositConfigAction({ depositRequired });
    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage("✓ Configuración de abonos guardada");
      router.refresh();
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={depositRequired}
            onChange={(e) => setDepositRequired(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full border border-border bg-muted transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:bg-[#7C3AED] peer-checked:after:translate-x-full peer-checked:after:border-transparent peer-focus:outline-none" />
        </label>
        <span className="text-sm font-medium">Activar sistema de abonos</span>
      </div>

      {depositRequired && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            El monto de abono se configura individualmente en cada servicio desde la sección <strong>Servicios</strong>.
          </p>
          {!isMpConnected && (
            <p className="text-xs text-amber-400">
              ⚠ Debes conectar tu cuenta de Mercado Pago antes de activar abonos.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>
        {message && (
          <p className={`text-sm ${message.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
