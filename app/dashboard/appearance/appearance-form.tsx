"use client";

import { useState } from "react";
import { Loader2, Save, Eye, Image as ImageIcon } from "lucide-react";
import { saveAppearanceAction } from "@/server/actions/dashboard.actions";

interface FormData { primaryColor: string; secondaryColor: string; backgroundColor: string; logoUrl: string; }

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/60">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-white/[0.06] bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none" />
        </div>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-white/[0.06] bg-[#1a1a1a] px-4 py-2.5 font-mono text-sm text-white outline-none" />
      </div>
    </div>
  );
}

export function AppearanceForm({ initialData, widgetSlug }: { initialData: FormData; widgetSlug: string }) {
  const [data, setData] = useState<FormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(field: keyof FormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveAppearanceAction(data);
    if (result.success) setSaved(true);
    setSaving(false);
  }

  const previewUrl = `/widget/${widgetSlug}?color=${data.primaryColor.replace("#", "")}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 space-y-5">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ background: data.primaryColor }} />
            Colores del Widget
          </h3>
          <ColorInput label="Color Primario" value={data.primaryColor} onChange={(v) => update("primaryColor", v)} />
          <ColorInput label="Color Secundario" value={data.secondaryColor} onChange={(v) => update("secondaryColor", v)} />
          <ColorInput label="Color de Fondo" value={data.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#7C3AED]" /> Logo del Negocio
          </h3>
          <input type="text" value={data.logoUrl} onChange={(e) => update("logoUrl", e.target.value)}
            placeholder="https://ejemplo.com/logo.png"
            className="w-full rounded-xl border border-white/[0.06] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          {data.logoUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <img src={data.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <p className="text-xs text-white/40">Vista previa del logo</p>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Eye className="h-4 w-4" /> Vista previa del widget
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          <iframe src={previewUrl} width="100%" height="700" style={{ border: "none" }} key={`${data.primaryColor}-${data.backgroundColor}`} />
        </div>
      </div>
    </div>
  );
}
