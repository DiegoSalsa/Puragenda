"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  BadgePercent,
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
  updateWidgetPromoDiscountAction,
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
  discountType: string | null;
  discountValue: number | null;
  discountStartsAt: Date | string | null;
  discountEndsAt: Date | string | null;
  discountMinSubtotal: number;
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
  const legacy = useTranslations("legacy");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Personalizado");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold"><LocalizedText id="FULgAuu7OKLT" /></h3>
            <p className="mt-1 text-sm text-muted-foreground"><LocalizedText id="jJjuTHobptB3" /></p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium"><LocalizedText id="JtKFn8dADEjV" /></span>
            <input autoFocus maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder={legacy("zBlzZfqQyHPo")} className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-[#7C3AED]/50" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium"><LocalizedText id="j_UqPoyCWv3e" /></span>
            <input maxLength={40} value={category} onChange={(event) => setCategory(event.target.value)} placeholder={legacy("lTlNJLliq1n-")} className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-[#7C3AED]/50" />
          </label>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <button disabled={saving || name.trim().length < 2} onClick={() => onSave(name, category)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <LocalizedText id="bVof_tZPcGcb" />
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
  currencyCode = "CLP",
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
  currencyCode?: string;
}) {
  const legacy = useTranslations("legacy");
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
  // The initial iframe may finish loading before hydration attaches `onLoad`.
  // Start visible; explicit refreshes and edits still enable the loader.
  const [previewLoading, setPreviewLoading] = useState(false);
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
  const [localPromoBlocks, setLocalPromoBlocks] = useState(promoBlocks);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoDiscountEnabled, setPromoDiscountEnabled] = useState(false);
  const [promoFilePreview, setPromoFilePreview] = useState<{ url: string; name: string; size: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promoPreviewUrlRef = useRef<string | null>(null);
  const displayedPromoBlocks = localPromoBlocks;

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
      if (promoPreviewUrlRef.current) URL.revokeObjectURL(promoPreviewUrlRef.current);
    };
  }, []);

  function clearPromoFilePreview() {
    if (promoPreviewUrlRef.current) {
      URL.revokeObjectURL(promoPreviewUrlRef.current);
      promoPreviewUrlRef.current = null;
    }
    setPromoFilePreview(null);
  }

  function handlePromoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    clearPromoFilePreview();
    setPromoError("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      event.target.value = "";
      setPromoError(legacy("X36fqGFEUCRb"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      event.target.value = "";
      setPromoError(legacy("dapM7Y2J56Fn"));
      return;
    }
    const url = URL.createObjectURL(file);
    promoPreviewUrlRef.current = url;
    setPromoFilePreview({ url, name: file.name, size: file.size });
  }

  function refreshWidgetPreview() {
    setPreviewLoading(true);
    const nextUrl = new URL(buildPreviewUrl(data), window.location.origin);
    nextUrl.searchParams.set("previewRevision", String(Date.now()));
    setPreviewUrl(`${nextUrl.pathname}${nextUrl.search}`);
    setPreviewRevision((current) => current + 1);
  }

  function prepareDiscountDates(formData: globalThis.FormData) {
    const startsAt = String(formData.get("discountStartsAt") || "");
    const endsAt = String(formData.get("discountEndsAt") || "");
    if (startsAt) formData.set("discountStartsAt", new Date(`${startsAt}T00:00:00`).toISOString());
    if (endsAt) formData.set("discountEndsAt", new Date(`${endsAt}T23:59:59.999`).toISOString());
  }

  function toDateInputValue(value: Date | string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function update(field: keyof FormData, value: string | number) {
    const next = { ...data, [field]: value };
    setData(next);
    setSaved(false);
    setSaveError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreviewLoading(true);
    debounceRef.current = setTimeout(() => {
      setPreviewUrl(buildPreviewUrl(next));
      setPreviewRevision((current) => current + 1);
    }, 220);
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
      setPreviewLoading(true);
      setPreviewUrl(buildPreviewUrl(data));
      setPreviewRevision((current) => current + 1);
    } else {
      setSaveError(result.error || legacy("i2oZM8bdDkAz"));
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
      setThemeError(result.error || legacy("ArDOLHZlFguY"));
    }
    setSavingTheme(false);
  }

  async function handlePromoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new globalThis.FormData(form);
    prepareDiscountDates(formData);
    setPromoSaving(true);
    setPromoError("");
    try {
      const result = await createWidgetPromoBlockAction(formData);
      if ("success" in result && result.success) {
        setLocalPromoBlocks(result.blocks);
        form.reset();
        clearPromoFilePreview();
        setPromoDiscountEnabled(false);
        setPromoOpen(false);
        refreshWidgetPreview();
      } else {
        setPromoError(result.error || legacy("8iLNA-yLQYNq"));
      }
    } catch {
      setPromoError(legacy("CyUVDgDYEAb4"));
    } finally {
      setPromoSaving(false);
    }
  }

  async function mutatePromo(blockId: string, mutation: { isVisible?: boolean; direction?: "up" | "down" }) {
    setPromoBusyId(blockId);
    setPromoError("");
    setPreviewLoading(true);
    try {
      const result = await updateWidgetPromoBlockAction(blockId, mutation);
      if (!("success" in result) || !result.success) {
        setPromoError(result.error || legacy("ajKPFa2-3mPM"));
        setPreviewLoading(false);
        return;
      }
      setLocalPromoBlocks(result.blocks);
      refreshWidgetPreview();
    } catch {
      setPromoError(legacy("ajKPFa2-3mPM"));
      setPreviewLoading(false);
    } finally {
      setPromoBusyId(null);
    }
  }

  async function removePromo(blockId: string) {
    if (!window.confirm(legacy("5ARgQtNIdNE7"))) return;
    setPromoBusyId(blockId);
    setPromoError("");
    try {
      const result = await deleteWidgetPromoBlockAction(blockId);
      if (!("success" in result) || !result.success) {
        setPromoError(result.error || legacy("aW5D3r_pGodX"));
        return;
      }
      setLocalPromoBlocks(result.blocks);
      refreshWidgetPreview();
    } catch {
      setPromoError(legacy("aW5D3r_pGodX"));
    } finally {
      setPromoBusyId(null);
    }
  }

  async function handlePromoDiscountSubmit(
    event: React.FormEvent<HTMLFormElement>,
    blockId: string,
  ) {
    event.preventDefault();
    const formData = new globalThis.FormData(event.currentTarget);
    prepareDiscountDates(formData);
    setPromoBusyId(blockId);
    setPromoError("");
    try {
      const result = await updateWidgetPromoDiscountAction(blockId, formData);
      if (!("success" in result) || !result.success) {
        setPromoError(result.error || legacy("OXN4LfZyTdaQ"));
        return;
      }
      setLocalPromoBlocks(result.blocks);
      setEditingPromoId(null);
      refreshWidgetPreview();
    } catch {
      setPromoError(legacy("OXN4LfZyTdaQ"));
    } finally {
      setPromoBusyId(null);
    }
  }

  return (
    <>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(420px,0.95fr)_minmax(460px,1.05fr)]">
        <section className="space-y-3 xl:sticky xl:top-6" data-tour="appearance-preview">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-[#7C3AED]" /> <LocalizedText id="g7lEnc8xsC-m" />
            </div>
            <button
              onClick={() => {
                setPreviewLoading(true);
                setPreviewUrl(buildPreviewUrl(data));
                setPreviewRevision((current) => current + 1);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> <LocalizedText id="lWXxl4c_gd_C" />
            </button>
          </div>
          <div
            className="relative min-h-[760px] overflow-hidden rounded-2xl border border-border shadow-xl"
            style={{ background: data.backgroundColor }}
          >
            {previewLoading && (
              <div
                role="status"
                aria-live="polite"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden px-6 text-center"
                style={{
                  color: data.textColor,
                  background: `radial-gradient(circle at 50% 42%, ${data.primaryColor}24 0%, transparent 34%), ${data.backgroundColor}`,
                }}
              >
                <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-2xl opacity-20" style={{ background: data.primaryColor }} />
                  <span className="absolute inset-1 animate-spin rounded-2xl border-2 border-transparent" style={{ borderTopColor: data.primaryColor, borderRightColor: `${data.primaryColor}66` }} />
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-xl shadow-lg" style={{ background: data.primaryColor, color: "#FFFFFF" }}>
                    <Sparkles className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-base font-bold"><LocalizedText id="PjwTE92o3nVw" /></p>
                <p className="mt-1 max-w-xs text-xs opacity-60"><LocalizedText id="3hQ3U9ImnEQP" /></p>
                <span className="sr-only"><LocalizedText id="pTh4MrFdipm5" /></span>
              </div>
            )}
            {previewUrl && (
              <iframe
                key={previewRevision}
                title={legacy("mYUbEmHGVub-")}
                src={previewUrl}
                width="100%"
                height="760"
                onLoad={() => setPreviewLoading(false)}
                className={`border-0 transition-opacity duration-300 ${previewLoading ? "opacity-0" : "opacity-100"}`}
              />
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground"><LocalizedText id="EX7WEFjFstUK" /></p>
        </section>

        <section className="space-y-6" data-tour="appearance-controls">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold"><Palette className="h-4 w-4 text-[#7C3AED]" /> <LocalizedText id="sKD9pt34z5cG" /></h2>
                <p className="mt-1 text-xs text-muted-foreground"><LocalizedText id="1tn9UOSP-_8N" /></p>
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
            <h2 className="flex items-center gap-2 text-base font-bold"><Type className="h-4 w-4 text-[#7C3AED]" /> <LocalizedText id="P2Rhc0Xq3jqs" /></h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="flex justify-between text-sm font-medium"><LocalizedText id="k9QrzlRUbN5E" /> <b className="font-mono">{data.fontSize}<LocalizedText id="buLMEFpndDFA" /></b></span>
                <input type="range" min={10} max={24} value={data.fontSize} onChange={(event) => update("fontSize", Number(event.target.value))} className="w-full accent-[#7C3AED]" />
              </label>
              <label className="space-y-2">
                <span className="flex justify-between text-sm font-medium"><LocalizedText id="PotBjR-y8RaS" /> <b className="font-mono">{data.cornerRadius}<LocalizedText id="buLMEFpndDFA" /></b></span>
                <input type="range" min={0} max={40} value={data.cornerRadius} onChange={(event) => update("cornerRadius", Number(event.target.value))} className="w-full accent-[#7C3AED]" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium"><LocalizedText id="acnyA-832jbj" /></span>
                <select value={data.shadowStyle} onChange={(event) => update("shadowStyle", event.target.value)} className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm">
                  <option value="none">Sin sombra</option>
                  <option value="soft">Sombra suave</option>
                  <option value="strong">Sombra marcada</option>
                </select>
              </label>
              <div className="space-y-2">
                <span className="text-sm font-medium"><LocalizedText id="HZQQCYlxVV2f" /></span>
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
                <h2 className="flex items-center gap-2 text-base font-bold"><Layers3 className="h-4 w-4 text-[#7C3AED]" /> <LocalizedText id="c2kJDqQXbSb6" /></h2>
                <p className="mt-1 text-xs text-muted-foreground"><LocalizedText id="LMtsVQMjMt_f" /></p>
              </div>
              <button
                type="button"
                disabled={promoSaving}
                onClick={() => {
                  setPromoOpen((open) => !open);
                  setPromoError("");
                  if (promoOpen) clearPromoFilePreview();
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {promoOpen ? <X className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                {promoOpen ? "Cerrar" : legacy("vSQETwwC5F_O")}
              </button>
            </div>

            {promoOpen && (
              <form onSubmit={handlePromoSubmit} className="mt-5 space-y-4 rounded-2xl border border-dashed border-[#7C3AED]/40 bg-[#7C3AED]/5 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-xs font-medium"><LocalizedText id="TAil1f6yLOKT" /></span><input name="title" required maxLength={90} placeholder={legacy("LCEFBrykaBgq")} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="space-y-1.5"><span className="text-xs font-medium"><LocalizedText id="c7kYm2xu9pPx" /></span><select name="placement" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="HEADER">Encabezado</option><option value="BETWEEN_SERVICES">Antes de los servicios</option><option value="FOOTER">Pie del widget</option></select></label>
                  <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-medium"><LocalizedText id="29jBHEqzjHLT" /></span><input name="subtitle" maxLength={180} placeholder={legacy("469bToRLSJNR")} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium"><LocalizedText id="WNbymwYzcGk5" /></span>
                    <input name="image" type="file" required accept="image/png,image/jpeg,image/webp" onChange={handlePromoFileChange} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs" />
                    <span className="block text-[11px] text-muted-foreground"><LocalizedText id="xZfk_jVUHRGz" /></span>
                  </label>
                  <label className="space-y-1.5"><span className="text-xs font-medium"><LocalizedText id="VDKBjRgpYAWu" /></span><input name="linkUrl" type="url" placeholder="https://..." className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium"><LocalizedText id="4XcwwrPpIKnt" /></span>
                    <select name="textAlign" defaultValue="left" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-[#7C3AED]/25 bg-[#7C3AED]/5 p-3 sm:col-span-2">
                    <input
                      name="discountEnabled"
                      type="checkbox"
                      value="true"
                      checked={promoDiscountEnabled}
                      onChange={(event) => setPromoDiscountEnabled(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#7C3AED]"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold"><BadgePercent className="h-4 w-4 text-[#7C3AED]" /> <LocalizedText id="Z8VTk3ll8Dc8" /></span>
                      <span className="mt-1 block text-[11px] text-muted-foreground"><LocalizedText id="QDyDZqHqE6Gh" /></span>
                    </span>
                  </label>
                  {promoDiscountEnabled && (
                    <div className="grid gap-4 rounded-xl border border-border bg-background p-3 sm:col-span-2 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium"><LocalizedText id="KrtBnOO1iiH9" /></span>
                        <select name="discountType" defaultValue="PERCENTAGE" className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm">
                          <option value="PERCENTAGE">Porcentaje</option>
                          <option value="FIXED">Monto fijo ({currencyCode})</option>
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium"><LocalizedText id="svUwxGmRMRzT" /></span>
                        <input name="discountValue" type="number" min={1} required defaultValue={10} className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium"><LocalizedText id="SxER0NR4dM4n" />{currencyCode})</span>
                        <input name="discountMinSubtotal" type="number" min={0} defaultValue={0} className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm" />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1.5"><span className="text-xs font-medium"><LocalizedText id="i06T6Sjf1spy" /></span><input name="discountStartsAt" type="date" className="w-full rounded-xl border border-border bg-muted px-2 py-2.5 text-xs" /></label>
                        <label className="space-y-1.5"><span className="text-xs font-medium"><LocalizedText id="PIPjVYEHgYOb" /></span><input name="discountEndsAt" type="date" className="w-full rounded-xl border border-border bg-muted px-2 py-2.5 text-xs" /></label>
                      </div>
                      <p className="text-[11px] text-muted-foreground sm:col-span-2"><LocalizedText id="ZQS0r57frhBZ" /></p>
                    </div>
                  )}
                  {promoFilePreview && (
                    <div className="overflow-hidden rounded-2xl border border-border bg-background sm:col-span-2">
                      <img src={promoFilePreview.url} alt={legacy("eBAlKBTcW0O3")} className="aspect-[2/1] w-full object-cover" />
                      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{promoFilePreview.name}</span>
                        <span className="shrink-0">{(promoFilePreview.size / 1024 / 1024).toFixed(2)} <LocalizedText id="HQn2-iMjWIFR" /></span>
                      </div>
                    </div>
                  )}
                </div>
                {promoError && <p role="alert" className="text-sm text-red-500">{promoError}</p>}
                <button type="submit" disabled={promoSaving || !promoFilePreview} aria-busy={promoSaving} className="flex h-10 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-bold text-white disabled:opacity-50">{promoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {promoSaving ? "Subiendo imagen…" : "Subir y previsualizar"}</button>
              </form>
            )}

            <div className="mt-5 space-y-3">
              {displayedPromoBlocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"><LocalizedText id="RJkipA-P3kob" /></div>
              ) : displayedPromoBlocks.map((block) => (
                <div key={block.id} className="flex gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                  <img src={block.imageUrl} alt={block.title} className="h-20 w-28 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{block.title}</p>
                        <p className="text-[11px] text-muted-foreground">{PLACEMENT_LABELS[block.placement]}</p>
                        {block.discountType && block.discountValue ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                            <BadgePercent className="h-3 w-3" />
                            {block.discountType === "PERCENTAGE" ? `${block.discountValue}%` : `$${block.discountValue.toLocaleString("es-CL")}`} <LocalizedText id="EIWULeUtZHQf" />
                          </span>
                        ) : null}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" disabled={promoBusyId === block.id} onClick={() => mutatePromo(block.id, { direction: "up" })} title={legacy("4BiojLTPA9Ft")} aria-label={`Subir ${block.title} en el widget`} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={promoBusyId === block.id} onClick={() => mutatePromo(block.id, { direction: "down" })} title={legacy("QEto2IHPOec4")} aria-label={`Bajar ${block.title} en el widget`} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={promoBusyId === block.id} onClick={() => mutatePromo(block.id, { isVisible: !block.isVisible })} title={block.isVisible ? "Ocultar" : "Mostrar"} aria-label={`${block.isVisible ? "Ocultar" : "Mostrar"} ${block.title}`} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground disabled:opacity-50">{block.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                        <button type="button" disabled={promoBusyId === block.id} onClick={() => setEditingPromoId((current) => current === block.id ? null : block.id)} title={legacy("rVB2TMpXD7v-")} aria-label={`Configurar descuento de ${block.title}`} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50"><BadgePercent className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={promoBusyId === block.id} onClick={() => removePromo(block.id)} title={legacy("WJHnyOkmLaQ6")} aria-label={`Eliminar ${block.title}`} className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {block.subtitle && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{block.subtitle}</p>}
                    {editingPromoId === block.id && (
                      <form onSubmit={(event) => handlePromoDiscountSubmit(event, block.id)} className="mt-3 grid gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 sm:grid-cols-2">
                        <input type="hidden" name="discountEnabled" value="true" />
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium"><LocalizedText id="uMuwsBwzAsIP" /></span>
                          <select name="discountType" defaultValue={block.discountType || "NONE"} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs">
                            <option value="NONE">Sin descuento</option>
                            <option value="PERCENTAGE">Porcentaje</option>
                            <option value="FIXED">Monto fijo ({currencyCode})</option>
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium"><LocalizedText id="svUwxGmRMRzT" /></span>
                          <input name="discountValue" type="number" min={1} defaultValue={block.discountValue || 10} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs" />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium"><LocalizedText id="nAbG3MwQbKBd" /></span>
                          <input name="discountMinSubtotal" type="number" min={0} defaultValue={block.discountMinSubtotal} className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1"><span className="text-[11px] font-medium"><LocalizedText id="i06T6Sjf1spy" /></span><input name="discountStartsAt" type="date" defaultValue={toDateInputValue(block.discountStartsAt)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-[11px]" /></label>
                          <label className="space-y-1"><span className="text-[11px] font-medium"><LocalizedText id="PIPjVYEHgYOb" /></span><input name="discountEndsAt" type="date" defaultValue={toDateInputValue(block.discountEndsAt)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-[11px]" /></label>
                        </div>
                        <div className="flex gap-2 sm:col-span-2">
                          <button type="submit" disabled={promoBusyId === block.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><LocalizedText id="6XuSH3v2To81" /></button>
                          <button type="button" onClick={() => setEditingPromoId(null)} className="rounded-lg border border-border px-3 py-2 text-xs"><LocalizedText id="u527QG3L1SSL" /></button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-4 z-20 grid gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur sm:grid-cols-2">
            <button onClick={() => { setThemeError(""); setThemeModalOpen(true); }} data-tour="save-theme" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-sm font-bold text-[#7C3AED] hover:bg-[#7C3AED]/15">
              <Sparkles className="h-4 w-4" /> <LocalizedText id="U_uEslczx-g5" />
            </button>
            <button onClick={handleSave} disabled={saving} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "Cambios guardados" : legacy("FL368vrOOgfe")}
            </button>
            {saveError && <p role="alert" className="text-sm text-red-500 sm:col-span-2">{saveError}</p>}
          </div>
        </section>
      </div>

      {themeModalOpen && <ThemeSaveModal onClose={() => setThemeModalOpen(false)} onSave={handleSaveTheme} saving={savingTheme} error={themeError} />}
    </>
  );
}
