"use client";

import { useState } from "react";
import { Loader2, Save, MapPin, Map } from "lucide-react";
import { updateBusinessLocationAction } from "@/server/actions/dashboard.actions";
import { useRouter } from "next/navigation";

interface BusinessLocationEditorProps {
  initialAddress: string | null;
  initialMapsUrl: string | null;
}

export function BusinessLocationEditor({ initialAddress, initialMapsUrl }: BusinessLocationEditorProps) {
  const router = useRouter();
  const [address, setAddress] = useState(initialAddress || "");
  const [mapsUrl, setMapsUrl] = useState(initialMapsUrl || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const hasChanges = address !== (initialAddress || "") || mapsUrl !== (initialMapsUrl || "");

  async function handleSave() {
    if (!hasChanges) return;
    setSaving(true);
    setMessage(null);

    const result = await updateBusinessLocationAction({ address, mapsUrl });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Ubicación actualizada" });
      router.refresh();
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección física (ej. Av. Providencia 1234, Oficina 501)"
            className="flex-1 w-full rounded-xl border border-border bg-muted px-4 py-2 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-muted-foreground" />
          <input
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="Enlace de Google Maps (ej. https://maps.app.goo.gl/...)"
            className="flex-1 w-full rounded-xl border border-border bg-muted px-4 py-2 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Estos datos se incluirán en los correos enviados a tus clientes (confirmación, recordatorios).
        </p>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 h-10 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Ubicación
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
