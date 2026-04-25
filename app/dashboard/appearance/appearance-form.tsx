"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Save, Eye, Image as ImageIcon, RefreshCw } from "lucide-react";
import { saveAppearanceAction } from "@/server/actions/dashboard.actions";

interface FormData { primaryColor: string; secondaryColor: string; backgroundColor: string; textColor: string; logoUrl: string; }

const COLOR_FIELDS: { key: keyof FormData; label: string; description: string }[] = [
  { key: "primaryColor", label: "Color Primario", description: "Se aplica a botones, estados activos y acentos principales." },
  { key: "secondaryColor", label: "Color Secundario", description: "Se aplica a bordes, iconos y textos de apoyo." },
  { key: "backgroundColor", label: "Color de Fondo del Formulario", description: "Color de fondo de la tarjeta de reserva (no del sitio web)." },
  { key: "textColor", label: "Color de Texto", description: "Color principal de la tipografía dentro del widget." },
];

function ColorInput({ label, description, value, onChange }: { label: string; description: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white/80">{label}</label>
      <p className="text-[11px] text-white/35 leading-relaxed">{description}</p>
      <div className="flex items-center gap-3 mt-1.5">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-white/[0.06] bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-white/[0.06] bg-[#1a1a1a] px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-[#7C3AED]/30 transition-colors"
        />
      </div>
    </div>
  );
}

export function AppearanceForm({ initialData, widgetSlug }: { initialData: Omit<FormData, "textColor"> & { textColor?: string }; widgetSlug: string }) {
  const [data, setData] = useState<FormData>({
    ...initialData,
    textColor: initialData.textColor || "#FFFFFF",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Debounced preview URL
  const [previewUrl, setPreviewUrl] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildPreviewUrl(d: FormData) {
    const p = d.primaryColor.replace("#", "");
    const s = d.secondaryColor.replace("#", "");
    const b = d.backgroundColor.replace("#", "");
    const t = d.textColor.replace("#", "");
    return `/widget/${widgetSlug}?primary=${p}&secondary=${s}&bg=${b}&text=${t}`;
  }

  // Initialize preview
  useEffect(() => {
    setPreviewUrl(buildPreviewUrl(data));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: keyof FormData, value: string) {
    const next = { ...data, [field]: value };
    setData(next);
    setSaved(false);
    // Debounce iframe reload (350ms)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewUrl(buildPreviewUrl(next));
    }, 350);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveAppearanceAction({
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      logoUrl: data.logoUrl || undefined,
    });
    if (result.success) setSaved(true);
    setSaving(false);
  }

  // Contrast check: is text readable on background?
  function getContrastRatio(hex1: string, hex2: string): number {
    function lum(hex: string): number {
      const rgb = hex.replace("#", "").match(/.{2}/g)?.map((c) => {
        const v = parseInt(c, 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      }) || [0, 0, 0];
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }
    const l1 = lum(hex1), l2 = lum(hex2);
    const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  const contrastOk = data.textColor.length === 7 && data.backgroundColor.length === 7
    ? getContrastRatio(data.textColor, data.backgroundColor) >= 3
    : true;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 space-y-6">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ background: data.primaryColor }} />
            Personalización del Widget
          </h3>

          {COLOR_FIELDS.map((field) => (
            <ColorInput
              key={field.key}
              label={field.label}
              description={field.description}
              value={data[field.key]}
              onChange={(v) => update(field.key, v)}
            />
          ))}

          {/* Contrast warning */}
          {!contrastOk && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <span className="text-amber-400 text-xs mt-0.5">⚠</span>
              <p className="text-xs text-amber-400/80">Bajo contraste entre texto y fondo. El texto podría ser difícil de leer.</p>
            </div>
          )}

          {/* Preview swatch */}
          <div className="rounded-xl border border-white/[0.06] p-4 space-y-2">
            <p className="text-xs text-white/40">Vista previa rápida</p>
            <div className="flex items-center gap-3">
              <div className="h-16 flex-1 rounded-lg flex items-center justify-center text-sm font-medium" style={{ background: data.backgroundColor, color: data.textColor, border: `1px solid ${data.secondaryColor}40` }}>
                <span>Texto de ejemplo</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-7 w-16 rounded-md flex items-center justify-center text-[10px] font-semibold text-white" style={{ background: data.primaryColor }}>Botón</div>
                <div className="h-7 w-16 rounded-md flex items-center justify-center text-[10px]" style={{ background: `${data.secondaryColor}20`, color: data.secondaryColor, border: `1px solid ${data.secondaryColor}40` }}>Borde</div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#7C3AED]" /> Logo del Negocio
          </h3>
          <p className="text-[11px] text-white/35">URL de la imagen de tu logo. Se mostrará en la cabecera del widget.</p>
          <input
            type="text"
            value={data.logoUrl}
            onChange={(e) => update("logoUrl", e.target.value)}
            placeholder="https://ejemplo.com/logo.png"
            className="w-full rounded-xl border border-white/[0.06] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7C3AED]/30 transition-colors"
          />
          {data.logoUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <img src={data.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <p className="text-xs text-white/40">Vista previa del logo</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>

      {/* Live Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Eye className="h-4 w-4" /> Vista previa en tiempo real
          </div>
          <button
            onClick={() => setPreviewUrl(buildPreviewUrl(data) + "&_t=" + Date.now())}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Recargar
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]" style={{ background: "#1a1a1a" }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              width="100%"
              height="700"
              style={{ border: "none", background: "transparent" }}
            />
          )}
        </div>
        <p className="text-[11px] text-white/20 text-center">Los cambios se reflejan automáticamente. Presiona &quot;Guardar&quot; para persistirlos.</p>
      </div>
    </div>
  );
}
