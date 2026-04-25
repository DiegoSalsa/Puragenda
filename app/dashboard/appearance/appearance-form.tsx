"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Save, Eye, Image as ImageIcon, RefreshCw, Type, Palette } from "lucide-react";
import { saveAppearanceAction } from "@/server/actions/dashboard.actions";

interface FormData {
  primaryColor: string; secondaryColor: string; backgroundColor: string;
  textColor: string; textSecondary: string; fontSize: number; logoUrl: string;
}

const COLOR_FIELDS: { key: keyof FormData; label: string; description: string }[] = [
  { key: "primaryColor", label: "Color de Botones y Acentos", description: "Se aplica a botones principales, estados activos, pills y enlaces destacados del widget." },
  { key: "secondaryColor", label: "Color Secundario", description: "Se aplica a bordes sutiles, iconos decorativos y estados hover de elementos secundarios." },
  { key: "backgroundColor", label: "Color de Fondo del Formulario", description: "Color de fondo de la tarjeta de reserva completa. No afecta al sitio web donde se incrusta." },
  { key: "textColor", label: "Color de Texto Principal", description: "Color de la tipografía principal: títulos, nombres de servicios y contenido prioritario." },
  { key: "textSecondary", label: "Color de Texto Secundario", description: "Color de etiquetas, descripciones y textos de menor jerarquía visual dentro del widget." },
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

export function AppearanceForm({
  initialData,
  widgetSlug,
}: {
  initialData: { primaryColor: string; secondaryColor: string; backgroundColor: string; logoUrl: string };
  widgetSlug: string;
}) {
  const [data, setData] = useState<FormData>({
    primaryColor: initialData.primaryColor,
    secondaryColor: initialData.secondaryColor,
    backgroundColor: initialData.backgroundColor,
    textColor: "#FFFFFF",
    textSecondary: "#FFFFFF66",
    fontSize: 14,
    logoUrl: initialData.logoUrl,
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
    const ts = d.textSecondary.replace("#", "");
    return `/widget/${widgetSlug}?primary=${p}&secondary=${s}&bg=${b}&text=${t}&textSecondary=${ts}&fontSize=${d.fontSize}`;
  }

  // Initialize preview on mount
  useEffect(() => {
    setPreviewUrl(buildPreviewUrl(data));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: keyof FormData, value: string | number) {
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

  // Contrast check
  function getContrastRatio(hex1: string, hex2: string): number {
    function lum(hex: string): number {
      const clean = hex.replace("#", "").slice(0, 6);
      if (clean.length !== 6) return 0;
      const rgb = clean.match(/.{2}/g)?.map((c) => {
        const v = parseInt(c, 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      }) || [0, 0, 0];
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }
    const l1 = lum(hex1), l2 = lum(hex2);
    const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  const bgHex = data.backgroundColor.replace("#", "").slice(0, 6);
  const textHex = data.textColor.replace("#", "").slice(0, 6);
  const contrastOk = bgHex.length === 6 && textHex.length === 6
    ? getContrastRatio(`#${textHex}`, `#${bgHex}`) >= 3
    : true;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-6">
        {/* Colors */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 space-y-6">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#7C3AED]" />
            Colores del Widget
          </h3>
          <p className="text-xs text-white/30 -mt-3">Personaliza cada aspecto visual de tu widget de reservas. Los cambios se reflejan al instante en la vista previa.</p>

          {COLOR_FIELDS.map((field) => (
            <ColorInput
              key={field.key}
              label={field.label}
              description={field.description}
              value={data[field.key] as string}
              onChange={(v) => update(field.key, v)}
            />
          ))}

          {/* Contrast warning */}
          {!contrastOk && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <span className="text-amber-400 text-xs mt-0.5">⚠</span>
              <p className="text-xs text-amber-400/80">Bajo contraste entre texto principal y fondo. Ratio actual: {getContrastRatio(`#${textHex}`, `#${bgHex}`).toFixed(1)}:1. Se recomienda al menos 4.5:1.</p>
            </div>
          )}
        </div>

        {/* Typography */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 space-y-5">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4 text-[#7C3AED]" />
            Tipografía
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/80">Tamaño de Fuente Base</label>
              <span className="rounded-lg border border-white/[0.06] bg-[#1a1a1a] px-3 py-1 font-mono text-xs text-white">{data.fontSize}px</span>
            </div>
            <p className="text-[11px] text-white/35">Controla el tamaño base de la tipografía. Todos los textos del widget se escalan proporcionalmente.</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-white/30">12</span>
              <input
                type="range"
                min={12}
                max={18}
                step={1}
                value={data.fontSize}
                onChange={(e) => update("fontSize", parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 appearance-none rounded-full bg-white/10 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7C3AED] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
              />
              <span className="text-xs text-white/30">18</span>
            </div>
          </div>

          {/* Preview swatch */}
          <div className="rounded-xl border border-white/[0.06] p-4 space-y-2">
            <p className="text-xs text-white/40">Vista previa de tipografía y colores</p>
            <div className="rounded-lg p-4 space-y-2" style={{ background: data.backgroundColor, border: `1px solid ${data.secondaryColor}25` }}>
              <p className="font-semibold" style={{ color: data.textColor, fontSize: `${data.fontSize}px` }}>Título de ejemplo</p>
              <p style={{ color: data.textSecondary, fontSize: `${data.fontSize - 2}px` }}>Esta es una descripción secundaria para validar el contraste visual.</p>
              <div className="flex gap-2 mt-2">
                <div className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: data.primaryColor, fontSize: `${data.fontSize - 2}px` }}>Reservar</div>
                <div className="rounded-lg px-3 py-1.5 text-xs" style={{ background: `${data.secondaryColor}15`, color: data.secondaryColor, border: `1px solid ${data.secondaryColor}30`, fontSize: `${data.fontSize - 2}px` }}>Cancelar</div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#7C3AED]" /> Logo del Negocio
          </h3>
          <p className="text-[11px] text-white/35">URL de la imagen de tu logo. Se muestra en la cabecera del widget de reservas.</p>
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
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]" style={{ background: "#000" }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              width="100%"
              height="700"
              style={{ border: "none", background: "transparent" }}
            />
          )}
        </div>
        <p className="text-[11px] text-white/20 text-center">Los cambios se reflejan automáticamente al mover los selectores. Presiona &quot;Guardar&quot; para persistirlos en la base de datos.</p>
      </div>
    </div>
  );
}
