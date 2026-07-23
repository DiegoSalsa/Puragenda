"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Layers3,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { saveAppearanceAction } from "@/server/actions/dashboard.actions";
import {
  createWidgetPromoBlockAction,
  createWidgetThemeAction,
  deleteWidgetPromoBlockAction,
  updateWidgetPromoBlockAction,
} from "@/server/actions/appearance-studio.actions";

type Placement = "HEADER" | "BETWEEN_SERVICES" | "FOOTER";
type PromoBlock = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: Placement;
  position: number;
  isVisible: boolean;
  textAlign: string;
};

interface FormData {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  textMutedColor: string;
  fontSize: number;
  cornerRadius: number;
  shadowStyle: string;
  headerAlign: string;
  logoUrl: string;
}

const COLOR_FIELDS: { key: keyof FormData; label: string; description: string }[] = [
  { key: "primaryColor", label: "Botones y acentos", description: "Acciones principales, pasos activos y enlaces." },
  { key: "secondaryColor", label: "Bordes y acentos secundarios", description: "Bordes, estados hover y elementos decorativos." },
  { key: "backgroundColor", label: "Fondo del widget", description: "Fondo general de la experiencia de reserva." },
  { key: "textColor", label: "Texto principal", description: "Títulos, servicios y contenido prioritario." },
  { key: "textMutedColor", label: "Texto secundario", description: "Ayudas, descripciones y etiquetas de menor jerarquía." },
];

const PLACEMENT_LABELS: Record<Placement, string> = {
  HEADER: "Encabezado",
  BETWEEN_SERVICES: "Antes de los servicios",
  FOOTER: "Pie del widget",
};

function ColorInput({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold">{label}</label>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value.slice(0, 7)}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-12 cursor-pointer rounded-xl border border-border bg-transparent p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm uppercase outline-none transition-colors focus:border-[#7C3AED]/50"
        />
      </div>
    </div>
  );
}

function ThemeSaveModal({
  onClose,
  onSave,
  saving,
  error,
}: {
  onClose: () => void;
  onSave: (name: string, category: string) => void;
  saving: boolean;
  error: string;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Personalizado");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">Guardar como nuevo tema</h3>
            <p className="mt-1 text-sm text-muted-foreground">Crea un preset reutilizable para este negocio.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Nombre del tema</span>
            <input autoFocus maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej: Verano PuroCode" className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-[#7C3AED]/50" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Categoría o etiqueta</span>
            <input maxLength={40} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ej: Verano, Oscuro, Minimalista" className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-[#7C3AED]/50" />
          </label>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <button disabled={saving || name.trim().length < 2} onClick={() => onSave(name, category)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Guardar tema
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppearanceForm({
  initialData,
  widgetSlug,
  promoBlocks,
}: {
  initialData: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor?: string;
    textMutedColor?: string;
    widgetFontSize?: number;
    widgetCornerRadius?: number;
    widgetShadowStyle?: string;
    widgetHeaderAlign?: string;
    logoUrl: string;
  };
  widgetSlug: string;
  promoBlocks: PromoBlock[];
}) {
  const router = useRouter();
  const [data, setData] = useState<FormData>({
    primaryColor: initialData.primaryColor,
    secondaryColor: initialData.secondaryColor,
    backgroundColor: initialData.backgroundColor,
    textColor: initialData.textColor || "#FFFFFF",
    textMutedColor: initialData.textMutedColor || "#FFFFFF66",
    fontSize: initialData.widgetFontSize || 14,
    cornerRadius: initialData.widgetCornerRadius ?? 16,
    shadowStyle: initialData.widgetShadowStyle || "soft",
    headerAlign: initialData.widgetHeaderAlign || "left",
    logoUrl: initialData.logoUrl,
  });
  const [previewUrl, setPreviewUrl] = useState(() => buildPreviewUrl(data));
  const [previewRevision, setPreviewRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeError, setThemeError] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoBusyId, setPromoBusyId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildPreviewUrl(next: FormData) {
    const params = new URLSearchParams({
      primary: next.primaryColor.replace("#", ""),
      secondary: next.secondaryColor.replace("#", ""),
      bg: next.backgroundColor.replace("#", ""),
      text: next.textColor.replace("#", ""),
      textSecondary: next.textMutedColor.replace("#", ""),
      fontSize: String(next.fontSize),
      radius: String(next.cornerRadius),
      shadow: next.shadowStyle,
      headerAlign: next.headerAlign,
    });
    return `/widget/${widgetSlug}?${params.toString()}`;
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function update(field: keyof FormData, value: string | number) {
    const next = { ...data, [field]: value };
    setData(next);
    setSaved(false);
    setSaveError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPreviewUrl(buildPreviewUrl(next)), 220);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const result = await saveAppearanceAction({
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor,
      textMutedColor: data.textMutedColor,
      widgetFontSize: data.fontSize,
      widgetCornerRadius: data.cornerRadius,
      widgetShadowStyle: data.shadowStyle,
      widgetHeaderAlign: data.headerAlign,
      logoUrl: data.logoUrl || undefined,
    });
    if ("success" in result && result.success) {
      setSaved(true);
      setPreviewUrl(buildPreviewUrl(data));
      setPreviewRevision((current) => current + 1);
    } else {
      setSaveError(result.error || "No se pudieron guardar los cambios");
    }
    setSaving(false);
  }

  async function handleSaveTheme(name: string, category: string) {
    setSavingTheme(true);
    setThemeError("");
    const result = await createWidgetThemeAction({
      name,
      category,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor,
      textMutedColor: data.textMutedColor,
      fontSize: data.fontSize,
      cornerRadius: data.cornerRadius,
      shadowStyle: data.shadowStyle,
      headerAlign: data.headerAlign,
      logoUrl: data.logoUrl || undefined,
    });
    if ("success" in result && result.success) {
      setThemeModalOpen(false);
      router.refresh();
    } else {
      setThemeError(result.error || "No se pudo guardar el tema");
    }
    setSavingTheme(false);
  }

  async function handlePromoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPromoSaving(true);
    setPromoError("");
    const result = await createWidgetPromoBlockAction(new FormData(event.currentTarget));
    if ("success" in result && result.success) {
      event.currentTarget.reset();
      setPromoOpen(false);
      router.refresh();
      setPreviewUrl(buildPreviewUrl(data));
      setPreviewRevision((current) => current + 1);
    } else {
      setPromoError(result.error || "No se pudo crear el bloque");
    }
    setPromoSaving(false);
  }

  async function mutatePromo(blockId: string, mutation: { isVisible?: boolean; direction?: "up" | "down" }) {
    setPromoBusyId(blockId);
    await updateWidgetPromoBlockAction(blockId, mutation);
    setPromoBusyId(null);
    router.refresh();
    setPreviewUrl(buildPreviewUrl(data));
    setPreviewRevision((current) => current + 1);
  }

  async function removePromo(blockId: string) {
    setPromoBusyId(blockId);
    await deleteWidgetPromoBlockAction(blockId);
    setPromoBusyId(null);
    router.refresh();
    setPreviewUrl(buildPreviewUrl(data));
    setPreviewRevision((current) => current + 1);
  }

  return (
    <>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(420px,0.95fr)_minmax(460px,1.05fr)]">
        <section className="space-y-3 xl:sticky xl:top-6" data-tour="appearance-preview">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-[#7C3AED]" /> Vista previa en tiempo real
            </div>
            <button
              onClick={() => {
                setPreviewUrl(buildPreviewUrl(data));
                setPreviewRevision((current) => current + 1);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Recargar
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-[#111] shadow-xl">
            {previewUrl && <iframe key={previewRevision} title="Vista previa del widget" src={previewUrl} width="100%" height="760" className="border-0" />}
          </div>
          <p className="text-center text-[11px] text-muted-foreground">Edita a la derecha; la vista previa permanece visible mientras trabajas.</p>
        </section>

        <section className="space-y-6" data-tour="appearance-controls">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold"><Palette className="h-4 w-4 text-[#7C3AED]" /> Identidad visual</h2>
                <p className="mt-1 text-xs text-muted-foreground">Controla cada color de la experiencia de reserva.</p>
              </div>
              <div className="flex gap-1">
                {[data.backgroundColor, data.primaryColor, data.secondaryColor, data.textColor].map((color, index) => (
                  <span key={`${color}-${index}`} className="h-6 w-6 rounded-full border border-border shadow-sm" style={{ background: color }} />
                ))}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {COLOR_FIELDS.map((field) => (
                <ColorInput key={field.key} label={field.label} description={field.description} value={String(data[field.key])} onChange={(value) => update(field.key, value)} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold"><Type className="h-4 w-4 text-[#7C3AED]" /> Forma y tipografía</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="flex justify-between text-sm font-medium">Tamaño base <b className="font-mono">{data.fontSize}px</b></span>
                <input type="range" min={10} max={24} value={data.fontSize} onChange={(event) => update("fontSize", Number(event.target.value))} className="w-full accent-[#7C3AED]" />
              </label>
              <label className="space-y-2">
                <span className="flex justify-between text-sm font-medium">Radio de bordes <b className="font-mono">{data.cornerRadius}px</b></span>
                <input type="range" min={0} max={40} value={data.cornerRadius} onChange={(event) => update("cornerRadius", Number(event.target.value))} className="w-full accent-[#7C3AED]" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Profundidad de sombra</span>
                <select value={data.shadowStyle} onChange={(event) => update("shadowStyle", event.target.value)} className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm">
                  <option value="none">Sin sombra</option>
                  <option value="soft">Sombra suave</option>
                  <option value="strong">Sombra marcada</option>
                </select>
              </label>
              <div className="space-y-2">
                <span className="text-sm font-medium">Alineación del encabezado</span>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["left", AlignLeft, "Izquierda"],
                    ["center", AlignCenter, "Centro"],
                    ["right", AlignRight, "Derecha"],
                  ] as const).map(([value, Icon, label]) => (
                    <button key={value} onClick={() => update("headerAlign", value)} title={label} className={`flex h-10 items-center justify-center rounded-xl border ${data.headerAlign === value ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold"><Layers3 className="h-4 w-4 text-[#7C3AED]" /> Bloques promocionales</h2>
                <p className="mt-1 text-xs text-muted-foreground">Sube banners y decide dónde aparecen dentro del widget.</p>
              </div>
              <button onClick={() => setPromoOpen((open) => !open)} className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-black">
                {promoOpen ? <X className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                {promoOpen ? "Cerrar" : "Agregar imagen"}
              </button>
            </div>

            {promoOpen && (
              <form onSubmit={handlePromoSubmit} className="mt-5 space-y-4 rounded-2xl border border-dashed border-[#7C3AED]/40 bg-[#7C3AED]/5 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-medium">Título</span><input name="title" required maxLength={90} placeholder="20% en tu primera cita" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-medium">Ubicación</span><select name="placement" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="HEADER">Encabezado</option><option value="BETWEEN_SERVICES">Antes de los servicios</option><option value="FOOTER">Pie del widget</option></select></label>
                  <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-medium">Texto secundario</span><input name="subtitle" maxLength={180} placeholder="Promoción válida durante julio" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-medium">Imagen</span><input name="image" type="file" required accept="image/png,image/jpeg,image/webp" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-medium">Enlace opcional</span><input name="linkUrl" type="url" placeholder="https://..." className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
                </div>
                {promoError && <p role="alert" className="text-sm text-red-500">{promoError}</p>}
                <button disabled={promoSaving} className="flex h-10 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-bold text-white disabled:opacity-50">{promoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Subir bloque</button>
              </form>
            )}

            <div className="mt-5 space-y-3">
              {promoBlocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aún no hay imágenes promocionales.</div>
              ) : promoBlocks.map((block) => (
                <div key={block.id} className="flex gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                  <img src={block.imageUrl} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{block.title}</p>
                        <p className="text-[11px] text-muted-foreground">{PLACEMENT_LABELS[block.placement]}</p>
                      </div>
                      <div className="flex gap-1">
                        <button disabled={promoBusyId === block.id} onClick={() => mutatePromo(block.id, { direction: "up" })} title="Mover arriba" className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button disabled={promoBusyId === block.id} onClick={() => mutatePromo(block.id, { direction: "down" })} title="Mover abajo" className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button disabled={promoBusyId === block.id} onClick={() => mutatePromo(block.id, { isVisible: !block.isVisible })} title={block.isVisible ? "Ocultar" : "Mostrar"} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground">{block.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                        <button disabled={promoBusyId === block.id} onClick={() => removePromo(block.id)} title="Eliminar bloque" className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {block.subtitle && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{block.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-4 z-20 grid gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur sm:grid-cols-2">
            <button onClick={() => { setThemeError(""); setThemeModalOpen(true); }} data-tour="save-theme" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-sm font-bold text-[#7C3AED] hover:bg-[#7C3AED]/15">
              <Sparkles className="h-4 w-4" /> Guardar como tema
            </button>
            <button onClick={handleSave} disabled={saving} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "Cambios guardados" : "Guardar cambios"}
            </button>
            {saveError && <p role="alert" className="text-sm text-red-500 sm:col-span-2">{saveError}</p>}
          </div>
        </section>
      </div>

      {themeModalOpen && <ThemeSaveModal onClose={() => setThemeModalOpen(false)} onSave={handleSaveTheme} saving={savingTheme} error={themeError} />}
    </>
  );
}
