"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CircleDollarSign, ImageIcon, Loader2, Palette, Save, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { GiftCardVisual } from "@/components/gift-cards/gift-card-visual";
import { formatPrice } from "@/lib/utils";
import { uploadGiftCardImageAssetAction } from "@/server/actions/gift-card.actions";

export type GiftCardDashboardService = { id: string; name: string; price: number };
export type GiftCardDashboardTemplate = {
  id: string;
  name: string;
  description: string | null;
  type: "BALANCE" | "SERVICE";
  salePrice: number;
  faceValue: number | null;
  isActive: boolean;
  isPublic: boolean;
  designPreset: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  imageUrl: string | null;
  shortMessage: string | null;
  createdAt: string;
  updatedAt: string;
  services: Array<{ serviceId: string; quantity: number; service: { id: string; name: string } }>;
};

type TemplateForm = {
  name: string;
  description: string;
  type: "BALANCE" | "SERVICE";
  salePrice: number;
  faceValue: number;
  isActive: boolean;
  isPublic: boolean;
  designPreset: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  imageUrl: string;
  shortMessage: string;
  services: Array<{ serviceId: string; quantity: number }>;
};

type Props = {
  business: {
    name: string;
    currencyCode: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  services: GiftCardDashboardService[];
  template?: GiftCardDashboardTemplate | null;
  onSaved: (template: GiftCardDashboardTemplate) => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

const messageSuggestions = [
  "Un regalo para ti 💕",
  "Regala un momento especial",
  "Te mereces un momento para ti",
  "Feliz cumpleaños 🎉",
  "Un detalle pensado para ti",
  "Especial Navidad 🎄",
];

const copyByLocale = {
  es: {
    builder: "Constructor visual",
    newTitle: "Nueva Gift Card",
    newDescription: "Diseña una tarjeta que tus clientes quieran comprar y regalar.",
    editTitle: "Editar Gift Card",
    config: "Crea tu Gift Card",
    configHint: "Los cambios aparecen en la vista previa al instante.",
    preview: "Así la verán tus clientes",
    previewHint: "Esta misma tarjeta se usa en tu página de reservas.",
    identity: "1. Nombre y mensaje",
    namePlaceholder: "Un regalo para ti",
    descriptionPlaceholder: "El mejor regalo para esta Navidad.",
    shortMessage: "Mensaje corto visible en la tarjeta",
    shortMessagePlaceholder: "Regala un momento especial 💕",
    suggestions: "Sugerencias rápidas",
    type: "2. Tipo de Gift Card",
    amountTitle: "Por monto",
    amountHint: "Regala saldo para reservar.",
    servicesTitle: "Por servicios",
    servicesHint: "Regala sesiones específicas.",
    value: "3. Precio y valor",
    clientPays: "Precio que paga el cliente",
    clientReceives: "Valor que recibe en su Gift Card",
    sameValue: "El cliente recibe el mismo valor que paga.",
    extraValue: "Tu cliente recibe {amount} extra.",
    lowerValue: "El valor recibido es menor al precio pagado. Revisa esta configuración antes de guardar.",
    servicesValueHint: "El precio de venta se mostrará como información secundaria; los servicios son el regalo principal.",
    chooseServices: "Elige los servicios incluidos",
    design: "4. Diseño",
    designHint: "Parte de un estilo y personalízalo si lo necesitas.",
    customColors: "Personalizar colores",
    image: "Imagen opcional",
    imageHint: "Sube una imagen de tu marca, servicio o campaña. PNG, JPG o WebP de hasta 5 MB.",
    uploadImage: "Subir imagen",
    replaceImage: "Cambiar imagen",
    removeImage: "Quitar imagen",
    uploadingImage: "Subiendo…",
    invalidImage: "Usa una imagen PNG, JPG o WebP.",
    imageTooLarge: "La imagen no puede superar 5 MB.",
    availability: "5. Disponibilidad",
    activeTitle: "Gift Card activa",
    activeHint: "Puede venderse y utilizarse.",
    publicTitle: "Visible en el widget",
    publicHint: "Los clientes pueden comprarla desde tu página de reservas.",
    saveNew: "Guardar Gift Card",
    saving: "Guardando…",
    saved: "Guardado",
    discard: "Tienes cambios sin guardar. ¿Quieres descartarlos?",
    missingService: "Selecciona al menos un servicio.",
    saleValue: "Se vende por {amount}",
    receiveValue: "Tu cliente recibe {amount}",
  },
  en: {
    builder: "Visual builder",
    newTitle: "New Gift Card",
    newDescription: "Design a card your customers will want to buy and gift.",
    editTitle: "Edit Gift Card",
    config: "Create your Gift Card",
    configHint: "Changes appear in the preview instantly.",
    preview: "This is how customers will see it",
    previewHint: "The same card is used on your booking page.",
    identity: "1. Name and message",
    namePlaceholder: "A gift for you",
    descriptionPlaceholder: "The perfect gift for a special day.",
    shortMessage: "Short message shown on the card",
    shortMessagePlaceholder: "Give a special moment 💕",
    suggestions: "Quick suggestions",
    type: "2. Gift Card type",
    amountTitle: "By amount",
    amountHint: "Gift a balance to book with.",
    servicesTitle: "By services",
    servicesHint: "Gift specific sessions.",
    value: "3. Price and value",
    clientPays: "Price paid by the customer",
    clientReceives: "Value received on the Gift Card",
    sameValue: "The customer receives the same value they pay.",
    extraValue: "Your customer receives {amount} extra.",
    lowerValue: "The received value is lower than the price paid. Review this setup before saving.",
    servicesValueHint: "The sale price is secondary information; the services are the main gift.",
    chooseServices: "Choose included services",
    design: "4. Design",
    designHint: "Start with a style and customize it if needed.",
    customColors: "Customize colors",
    image: "Optional image",
    imageHint: "Upload an image from your brand, service, or campaign. PNG, JPG or WebP up to 5 MB.",
    uploadImage: "Upload image",
    replaceImage: "Replace image",
    removeImage: "Remove image",
    uploadingImage: "Uploading…",
    invalidImage: "Use a PNG, JPG or WebP image.",
    imageTooLarge: "The image cannot exceed 5 MB.",
    availability: "5. Availability",
    activeTitle: "Active Gift Card",
    activeHint: "It can be sold and redeemed.",
    publicTitle: "Visible in the widget",
    publicHint: "Customers can buy it from your booking page.",
    saveNew: "Save Gift Card",
    saving: "Saving…",
    saved: "Saved",
    discard: "You have unsaved changes. Do you want to discard them?",
    missingService: "Select at least one service.",
    saleValue: "Sells for {amount}",
    receiveValue: "Your customer receives {amount}",
  },
} as const;

function readableTextColor(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#111111";
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? "#111111" : "#FFFDF8";
}

function formFromTemplate(template: GiftCardDashboardTemplate | null | undefined): TemplateForm {
  if (!template) return {
    name: "",
    description: "",
    type: "BALANCE",
    salePrice: 0,
    faceValue: 0,
    isActive: true,
    isPublic: true,
    designPreset: "cream",
    backgroundColor: "#FFF5BA",
    accentColor: "#FF8FAB",
    textColor: "#111111",
    imageUrl: "",
    shortMessage: "Un regalo para ti 💕",
    services: [],
  };
  return {
    name: template.name,
    description: template.description || "",
    type: template.type,
    salePrice: template.salePrice,
    faceValue: template.faceValue || 0,
    isActive: template.isActive,
    isPublic: template.isPublic,
    designPreset: template.designPreset,
    backgroundColor: template.backgroundColor,
    accentColor: template.accentColor,
    textColor: template.textColor,
    imageUrl: template.imageUrl || "",
    shortMessage: template.shortMessage || "",
    services: template.services.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity })),
  };
}

function CurrencyInput({ id, value, currencyCode, locale, onChange, invalid }: {
  id: string;
  value: number;
  currencyCode: string;
  locale: string;
  onChange: (value: number) => void;
  invalid?: boolean;
}) {
  const displayValue = value > 0 ? new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value) : "";
  return <input id={id} inputMode="numeric" value={displayValue} onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")) || 0)} aria-invalid={invalid} className={`mt-1 h-12 w-full rounded-xl border-2 bg-[#fffdf8] px-4 text-base font-black outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd] ${invalid ? "border-red-600" : "border-black"}`} />;
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-2xl border-2 border-black bg-[#fffdf8] p-4">
    <div><p className="text-sm font-black">{label}</p><p className="mt-1 text-xs font-semibold text-black/55">{description}</p></div>
    <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={onChange} className={`relative h-8 w-14 shrink-0 rounded-full border-[3px] border-black p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd] ${checked ? "bg-[#bffcc6]" : "bg-black/15"}`}>
      <span className={`block h-5 w-5 rounded-full border-2 border-black bg-white shadow-[1px_1px_0_#000] transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  </div>;
}

export function GiftCardBuilder({ business, services, template, onSaved, onClose, onDirtyChange }: Props) {
  const t = useTranslations("giftCardsDashboard");
  const locale = useLocale();
  const copy = locale.startsWith("es") ? copyByLocale.es : copyByLocale.en;
  const initialForm = useMemo(() => formFromTemplate(template), [template]);
  const [form, setForm] = useState(initialForm);
  const [recordId, setRecordId] = useState(template?.id || null);
  const [baseline, setBaseline] = useState(JSON.stringify(initialForm));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [customColorsOpen, setCustomColorsOpen] = useState(template?.designPreset === "custom");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== baseline;

  const presets = useMemo(() => [
    { id: "rose", label: locale.startsWith("es") ? "Rosa" : "Rose", background: "#FFD5E5", accent: "#FF5C8A", text: "#111111" },
    { id: "cream", label: locale.startsWith("es") ? "Crema" : "Cream", background: "#FFF5BA", accent: "#FFCB47", text: "#111111" },
    { id: "lavender", label: locale.startsWith("es") ? "Lavanda" : "Lavender", background: "#DDD0FF", accent: "#7C3AED", text: "#111111" },
    { id: "green", label: locale.startsWith("es") ? "Verde" : "Green", background: "#C8F7C5", accent: "#16865B", text: "#111111" },
    { id: "dark", label: locale.startsWith("es") ? "Oscura" : "Dark", background: "#171717", accent: business.secondaryColor, text: "#FFFDF8" },
    { id: "brand", label: locale.startsWith("es") ? "Mi marca" : "My brand", background: business.primaryColor, accent: business.secondaryColor, text: readableTextColor(business.primaryColor) },
  ], [business.primaryColor, business.secondaryColor, locale]);

  const selectedServices = form.services.map((selected) => {
    const service = services.find((item) => item.id === selected.serviceId);
    return service ? { name: service.name, quantity: selected.quantity } : null;
  }).filter((item): item is { name: string; quantity: number } => Boolean(item));

  const invalidBalance = form.type === "BALANCE" && (form.salePrice <= 0 || form.faceValue <= 0);
  const invalidServices = form.type === "SERVICE" && form.services.length === 0;
  const canSave = dirty && !uploadingImage && form.name.trim().length >= 2 && form.salePrice > 0 && !invalidBalance && !invalidServices;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);
  function update(patch: Partial<TemplateForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setSaveState((current) => current === "saved" ? "idle" : current);
    setError("");
  }

  function closeBuilder() {
    if (dirty && !window.confirm(copy.discard)) return;
    onDirtyChange(false);
    onClose();
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setImageError(copy.invalidImage);
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError(copy.imageTooLarge);
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setImageError("");
    try {
      const data = new FormData();
      data.append("image", file);
      const result = await uploadGiftCardImageAssetAction(data);
      if (result.error || !("url" in result) || !result.url) {
        setImageError(result.error || t("genericError"));
        return;
      }
      update({ imageUrl: result.url });
    } catch {
      setImageError(t("genericError"));
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaveState("saving");
    setError("");
    try {
      const response = await fetch(recordId ? `/api/dashboard/gift-cards/templates/${recordId}` : "/api/dashboard/gift-cards/templates", {
        method: recordId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, faceValue: form.type === "BALANCE" ? form.faceValue : null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("requestError"));
      setRecordId(payload.id);
      setBaseline(JSON.stringify(form));
      setSaveState("saved");
      onSaved(payload);
    } catch (requestError) {
      setSaveState("idle");
      setError(requestError instanceof Error ? requestError.message : t("genericError"));
    }
  }

  const fieldClass = "mt-1 h-12 w-full rounded-xl border-2 border-black bg-[#fffdf8] px-4 font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]";
  const sectionClass = "rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_#000] sm:p-5";

  return <div className="space-y-5">
    <header className="flex items-start justify-between gap-4 rounded-2xl border-[3px] border-black bg-[#ffb5e8] p-4 shadow-[4px_4px_0_#000] sm:p-5">
      <div><p className="text-[11px] font-black uppercase tracking-[0.18em]">{copy.builder}</p><h2 className="mt-1 text-2xl font-black">{recordId ? copy.editTitle : copy.newTitle}{recordId && form.name ? ` · ${form.name}` : ""}</h2><p className="mt-1 text-sm font-semibold text-black/60">{copy.newDescription}</p></div>
      <button type="button" onClick={closeBuilder} aria-label={t("cancelEdit")} className="rounded-xl border-2 border-black bg-white p-2 shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]"><X className="h-5 w-5" /></button>
    </header>

    <form onSubmit={save} className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,.88fr)]">
      <div className="space-y-5">
        <div className="px-1"><h3 className="text-lg font-black uppercase">{copy.config}</h3><p className="text-sm font-semibold text-black/55">{copy.configHint}</p></div>

        <section className={sectionClass}>
          <h3 className="text-lg font-black">{copy.identity}</h3>
          <div className="mt-4 space-y-4">
            <label htmlFor="gift-card-name" className="block text-sm font-black">{t("name")}<input id="gift-card-name" required maxLength={100} value={form.name} placeholder={copy.namePlaceholder} onChange={(event) => update({ name: event.target.value })} className={fieldClass} /></label>
            <label htmlFor="gift-card-description" className="block text-sm font-black">{t("description")}<textarea id="gift-card-description" maxLength={500} value={form.description} placeholder={copy.descriptionPlaceholder} onChange={(event) => update({ description: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-4 font-semibold outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]" /></label>
            <label htmlFor="gift-card-short-message" className="block text-sm font-black">{copy.shortMessage}<input id="gift-card-short-message" maxLength={160} value={form.shortMessage} placeholder={copy.shortMessagePlaceholder} onChange={(event) => update({ shortMessage: event.target.value })} className={fieldClass} /></label>
            <div><p className="text-xs font-black uppercase tracking-wide text-black/55">{copy.suggestions}</p><div className="mt-2 flex flex-wrap gap-2">{messageSuggestions.map((message) => <button key={message} type="button" onClick={() => update({ shortMessage: message })} className="rounded-full border-2 border-black bg-[#fff5ba] px-3 py-1.5 text-left text-xs font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]">{message}</button>)}</div></div>
          </div>
        </section>

        <section className={sectionClass}>
          <h3 className="text-lg font-black">{copy.type}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" aria-pressed={form.type === "BALANCE"} onClick={() => update({ type: "BALANCE", services: [] })} className={`flex items-start gap-3 rounded-2xl border-[3px] border-black p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd] ${form.type === "BALANCE" ? "-translate-y-0.5 bg-[#fff5ba] shadow-[4px_4px_0_#000]" : "bg-white opacity-65"}`}><CircleDollarSign className="mt-0.5 h-6 w-6 shrink-0" /><span><strong className="block font-black">{copy.amountTitle}</strong><span className="mt-1 block text-xs font-semibold text-black/60">{copy.amountHint}</span></span></button>
            <button type="button" aria-pressed={form.type === "SERVICE"} onClick={() => update({ type: "SERVICE", faceValue: 0 })} className={`flex items-start gap-3 rounded-2xl border-[3px] border-black p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd] ${form.type === "SERVICE" ? "-translate-y-0.5 bg-[#ffb5e8] shadow-[4px_4px_0_#000]" : "bg-white opacity-65"}`}><Sparkles className="mt-0.5 h-6 w-6 shrink-0" /><span><strong className="block font-black">{copy.servicesTitle}</strong><span className="mt-1 block text-xs font-semibold text-black/60">{copy.servicesHint}</span></span></button>
          </div>
        </section>

        <section className={sectionClass}>
          <h3 className="text-lg font-black">{copy.value}</h3>
          <div className={`mt-4 grid gap-4 ${form.type === "BALANCE" ? "sm:grid-cols-2" : ""}`}>
            <label htmlFor="gift-card-sale-price" className="block text-xs font-black uppercase tracking-wide">{copy.clientPays}<CurrencyInput id="gift-card-sale-price" value={form.salePrice} currencyCode={business.currencyCode} locale={locale} onChange={(salePrice) => update({ salePrice })} invalid={form.salePrice <= 0} /></label>
            {form.type === "BALANCE" && <label htmlFor="gift-card-face-value" className="block text-xs font-black uppercase tracking-wide">{copy.clientReceives}<CurrencyInput id="gift-card-face-value" value={form.faceValue} currencyCode={business.currencyCode} locale={locale} onChange={(faceValue) => update({ faceValue })} invalid={form.faceValue <= 0} /></label>}
          </div>
          {form.type === "BALANCE" && form.salePrice > 0 && form.faceValue > 0 && <p role={form.faceValue < form.salePrice ? "alert" : undefined} className={`mt-4 rounded-xl border-2 border-black p-3 text-sm font-black ${form.faceValue < form.salePrice ? "bg-red-100 text-red-800" : form.faceValue > form.salePrice ? "bg-[#bffcc6]" : "bg-[#fff5ba]"}`}>{form.faceValue < form.salePrice ? copy.lowerValue : form.faceValue > form.salePrice ? copy.extraValue.replace("{amount}", formatPrice(form.faceValue - form.salePrice, business.currencyCode)) : copy.sameValue}</p>}
          {form.type === "SERVICE" && <div className="mt-4"><p className="text-sm font-black">{copy.chooseServices}</p><p className="mt-1 text-xs font-semibold text-black/55">{copy.servicesValueHint}</p><div className="mt-3 space-y-2">{services.map((service) => { const selected = form.services.find((item) => item.serviceId === service.id); return <div key={service.id} className={`flex items-center gap-3 rounded-xl border-2 border-black p-3 ${selected ? "bg-[#fff5ba]" : "bg-[#fffdf8]"}`}><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={Boolean(selected)} onChange={(event) => update({ services: event.target.checked ? [...form.services, { serviceId: service.id, quantity: 1 }] : form.services.filter((item) => item.serviceId !== service.id) })} className="h-5 w-5 accent-black" /><span className="min-w-0 flex-1"><span className="block truncate">{service.name}</span><span className="text-xs text-black/50">{formatPrice(service.price, business.currencyCode)}</span></span></label>{selected && <label className="text-[10px] font-black uppercase">{t("quantityOf", { name: service.name })}<input aria-label={t("quantityOf", { name: service.name })} type="number" min={1} max={100} value={selected.quantity} onChange={(event) => update({ services: form.services.map((item) => item.serviceId === service.id ? { ...item, quantity: Number(event.target.value) } : item) })} className="ml-2 h-9 w-16 rounded-lg border-2 border-black bg-white px-2 text-center text-sm" /></label>}</div>; })}</div>{invalidServices && <p role="alert" className="mt-3 text-sm font-black text-red-700">{copy.missingService}</p>}</div>}
        </section>

        <section className={sectionClass}>
          <div className="flex items-start gap-3"><Palette className="mt-0.5 h-5 w-5" /><div><h3 className="text-lg font-black">{copy.design}</h3><p className="text-sm font-semibold text-black/55">{copy.designHint}</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{presets.map((preset) => <button key={preset.id} type="button" aria-pressed={form.designPreset === preset.id} onClick={() => { update({ designPreset: preset.id, backgroundColor: preset.background, accentColor: preset.accent, textColor: preset.text }); setCustomColorsOpen(false); }} className={`rounded-xl border-2 border-black p-2 text-left text-xs font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd] ${form.designPreset === preset.id ? "shadow-[3px_3px_0_#000]" : "opacity-70"}`} style={{ backgroundColor: preset.background, color: preset.text }}><span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full border-2 border-black" style={{ backgroundColor: preset.accent }} />{preset.label}</span></button>)}</div>
          <button type="button" aria-expanded={customColorsOpen} onClick={() => setCustomColorsOpen((open) => !open)} className="mt-4 w-full rounded-xl border-2 border-black bg-[#c4b5fd]/50 px-4 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]">{copy.customColors} {customColorsOpen ? "−" : "+"}</button>
          {customColorsOpen && <div className="mt-4 grid gap-3 rounded-2xl border-2 border-black bg-[#fffaf0] p-4 sm:grid-cols-3">{([[t("background"), "backgroundColor"], [t("accent"), "accentColor"], [t("text"), "textColor"]] as const).map(([label, key]) => <label key={key} className="text-xs font-black">{label}<span className="mt-1 flex items-center gap-2"><input type="color" value={form[key]} onChange={(event) => update({ [key]: event.target.value, designPreset: "custom" })} className="h-11 w-12 cursor-pointer rounded-lg border-2 border-black bg-white p-1" /><input aria-label={`${label} HEX`} value={form[key].toUpperCase()} maxLength={7} onChange={(event) => { const value = event.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(value)) update({ [key]: value, designPreset: "custom" }); }} className="h-11 min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-2 font-mono text-xs font-black" /></span></label>)}</div>}
          <div className="mt-4 rounded-2xl border-2 border-black bg-[#fffaf0] p-4">
            <div className="flex items-start gap-3"><ImageIcon className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-black">{copy.image}</p><p className="mt-1 text-xs font-semibold text-black/50">{copy.imageHint}</p></div></div>
            <input ref={imageInputRef} id="gift-card-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} className="sr-only" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-black bg-[#c4b5fd] px-4 text-sm font-black shadow-[2px_2px_0_#000] disabled:cursor-wait disabled:opacity-60">
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingImage ? copy.uploadingImage : form.imageUrl ? copy.replaceImage : copy.uploadImage}
              </button>
              {form.imageUrl && <button type="button" onClick={() => { update({ imageUrl: "" }); setImageError(""); }} disabled={uploadingImage} className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-black bg-white px-4 text-sm font-black disabled:opacity-60"><Trash2 className="h-4 w-4" />{copy.removeImage}</button>}
            </div>
            {imageError && <p role="alert" className="mt-3 text-sm font-black text-red-700">{imageError}</p>}
          </div>
        </section>

        <section className={sectionClass}><h3 className="text-lg font-black">{copy.availability}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><Toggle checked={form.isActive} onChange={() => update({ isActive: !form.isActive })} label={copy.activeTitle} description={copy.activeHint} /><Toggle checked={form.isPublic} onChange={() => update({ isPublic: !form.isPublic })} label={copy.publicTitle} description={copy.publicHint} /></div></section>

        {error && <p role="alert" className="rounded-xl border-2 border-red-700 bg-red-100 p-3 text-sm font-black text-red-800">{error}</p>}
        <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={!canSave || saveState === "saving"} className="inline-flex h-12 items-center gap-2 rounded-xl border-[3px] border-black bg-[#bffcc6] px-6 font-black shadow-[4px_4px_0_#000] disabled:cursor-not-allowed disabled:opacity-45">{saveState === "saving" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{saveState === "saving" ? copy.saving : saveState === "saved" ? copy.saved : recordId ? t("saveChanges") : copy.saveNew}</button>{dirty && <span className="text-xs font-black text-black/55">● {locale.startsWith("es") ? "Cambios sin guardar" : "Unsaved changes"}</span>}</div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24">
        <div className="rounded-3xl border-[3px] border-black bg-[#fffaf0] p-4 shadow-[7px_7px_0_#000] sm:p-5"><p className="text-[11px] font-black uppercase tracking-[0.18em]">{copy.preview}</p><p className="mt-1 text-xs font-semibold text-black/50">{copy.previewHint}</p><GiftCardVisual businessName={business.name} logoUrl={business.logoUrl} giftCardName={form.name} type={form.type} faceValue={form.faceValue} services={selectedServices} shortMessage={form.shortMessage} background={form.backgroundColor} accent={form.accentColor} text={form.textColor} imageUrl={form.imageUrl} currencyCode={business.currencyCode} className="mt-5" /><div className="mt-5 grid gap-2 text-sm font-black sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><p className="rounded-xl border-2 border-black bg-white p-3">{copy.saleValue.replace("{amount}", formatPrice(form.salePrice, business.currencyCode))}</p><p className="rounded-xl border-2 border-black bg-[#bffcc6] p-3">{form.type === "BALANCE" ? copy.receiveValue.replace("{amount}", formatPrice(form.faceValue, business.currencyCode)) : `${selectedServices.length} ${locale.startsWith("es") ? "servicios incluidos" : "included services"}`}</p></div></div>
      </aside>
    </form>
  </div>;
}
