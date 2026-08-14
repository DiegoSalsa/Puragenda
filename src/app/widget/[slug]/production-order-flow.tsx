"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CheckCircle2, ChevronLeft, ImagePlus, Loader2, Package, Trash2, Upload } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ProductionWindow {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  capacity: number;
  used: number;
  available: number;
  scheduleMode: "WEEKLY" | "CUSTOM";
}

interface Props {
  business: { slug: string; apiKey: string; name: string; currencyCode: string };
  service: {
    id: string;
    name: string;
    productionScheduleMode: "WEEKLY" | "CUSTOM";
    productionDepositPercent: number;
    requiresReferenceImages: boolean;
  };
  selectedOptionAlternativeIds: string[];
  totalPrice: number;
  primaryColor: string;
  textColor: string;
  textSecondary: string;
  onBack: () => void;
  previewMode?: boolean;
}

type OrderResult = {
  orderNumber: string;
  depositAmount: number;
  balanceAmount: number;
  paymentMode: string;
  paymentUrl?: string | null;
};

export function ProductionOrderFlow({
  business,
  service,
  selectedOptionAlternativeIds,
  totalPrice,
  primaryColor,
  textColor,
  textSecondary,
  onBack,
  previewMode = false,
}: Props) {
  const legacy = useTranslations("legacy");
  const inputRef = useRef<HTMLInputElement>(null);
  const [windows, setWindows] = useState<ProductionWindow[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [selectedWindowKey, setSelectedWindowKey] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    petName: "",
    petDetails: "",
    deliveryMethod: "COORDINATE",
    address: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  const depositAmount = useMemo(
    () => Math.round(totalPrice * service.productionDepositPercent / 100),
    [totalPrice, service.productionDepositPercent],
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/business/${business.slug}/production-weeks?serviceId=${service.id}`, {
      headers: { "x-api-key": business.apiKey },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los cupos");
        if (active) setWindows(payload.windows);
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : legacy("BoWN8xn69iqz")))
      .finally(() => active && setLoadingWeeks(false));
    return () => { active = false; };
  }, [business.apiKey, business.slug, service.id, legacy]);

  async function uploadImages(files: File[]) {
    const remaining = 6 - images.length;
    const selected = files.slice(0, remaining);
    if (selected.length === 0) return;
    setUploading(true);
    setError("");
    try {
      if (previewMode) {
        const localImages: string[] = [];
        for (const file of selected) {
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            throw new Error("Usa imagenes JPG, PNG o WebP");
          }
          if (file.size > 5 * 1024 * 1024) throw new Error("Cada imagen puede pesar hasta 5MB");
          localImages.push(URL.createObjectURL(file));
        }
        setImages((current) => [...current, ...localImages]);
        return;
      }
      const uploaded: string[] = [];
      for (const file of selected) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Usa imagenes JPG, PNG o WebP");
        }
        if (file.size > 5 * 1024 * 1024) throw new Error("Cada imagen puede pesar hasta 5MB");
        const body = new FormData();
        body.append("image", file);
        const response = await fetch(`/api/business/${business.slug}/production-assets`, {
          method: "POST",
          headers: { "x-api-key": business.apiKey },
          body,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo subir una imagen");
        uploaded.push(payload.url);
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : legacy("pCDCdT_R3JSD"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const selectedWindow = windows.find((window) => window.key === selectedWindowKey);
    if (!selectedWindow) return setError(legacy("4s5v5rjL67xc"));
    if (service.requiresReferenceImages && images.length === 0) return setError(legacy("ekdmj92ximYB"));
    if (previewMode) {
      setResult({
        orderNumber: "SIMULACION",
        depositAmount,
        balanceAmount: Math.max(0, totalPrice - depositAmount),
        paymentMode: "SIMULATION",
      });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/business/${business.slug}/production-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": business.apiKey },
        body: JSON.stringify({
          serviceId: service.id,
          selectedOptionAlternativeIds,
          productionWeek: selectedWindow.startDate,
          productionWindowKey: selectedWindow.key,
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          petName: form.petName,
          petDetails: form.petDetails,
          referenceImageUrls: images,
          deliveryMethod: form.deliveryMethod,
          customerAddress: form.deliveryMethod === "SHIPPING" ? form.address : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.details?.join(". ") || payload.error || "No se pudo enviar el encargo");
      if (payload.paymentUrl) {
        window.location.href = payload.paymentUrl;
        return;
      }
      setResult(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : legacy("5zlS8TJtHN93"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="animate-scale-in space-y-6 py-5 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${primaryColor}15` }}>
          <CheckCircle2 className="h-10 w-10" style={{ color: primaryColor }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold"><LocalizedText id="_UkJ93Gbrdmx" /></h2>
          <p className="mt-2 text-sm" style={{ color: textSecondary }}>
            <LocalizedText id="xMJrX5NTAFhU" />
          </p>
        </div>
        <div className="mx-auto max-w-md rounded-2xl border p-5 text-left text-sm" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
          <p className="mb-3 flex items-center gap-2 font-semibold" style={{ color: primaryColor }}><Package className="h-4 w-4" />{result.orderNumber}</p>
          <div className="space-y-2">
            <p><span style={{ color: textSecondary }}><LocalizedText id="Xn5rZDSz0P56" /></span> {service.name}</p>
            <p><span style={{ color: textSecondary }}><LocalizedText id="II9i55cJhFRf" /></span> {form.petName}</p>
            <p><span style={{ color: textSecondary }}><LocalizedText id="GOhyviNZ126R" /></span> {formatPrice(totalPrice, business.currencyCode)}</p>
            <p><span style={{ color: textSecondary }}><LocalizedText id="R5FTETj45I0u" /></span> {formatPrice(result.depositAmount, business.currencyCode)}</p>
            <p><span style={{ color: textSecondary }}><LocalizedText id="VBwE9DuUb3G3" /></span> {formatPrice(result.balanceAmount, business.currencyCode)}</p>
          </div>
        </div>
        <button type="button" onClick={onBack} className="rounded-xl border px-6 py-3 text-sm font-medium" style={{ borderColor: "var(--wborder)", color: textColor }}>
          <LocalizedText id="fqmnIJ72A0eJ" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitOrder} className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-90" style={{ color: textColor }}>
          <ChevronLeft className="h-4 w-4" /><LocalizedText id="qyaue8o2IZU4" />
        </button>
        <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${primaryColor}15`, color: primaryColor }}><LocalizedText id="lXykB3U2NQbL" /></span>
      </div>

      <div>
        <h2 className="text-xl font-bold"><LocalizedText id="XgZg8s6g3tfr" /></h2>
        <p className="mt-1 text-sm" style={{ color: textSecondary }}><LocalizedText id="QWNSFBoon2iD" /></p>
      </div>

      {loadingWeeks ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border p-8 text-sm" style={{ borderColor: "var(--wborder)", color: textSecondary }}>
          <Loader2 className="h-4 w-4 animate-spin" /><LocalizedText id="P1Q-3qBnNGKr" />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {windows.map((window) => {
            const active = selectedWindowKey === window.key;
            const full = window.available === 0;
            return (
              <button
                key={window.key}
                type="button"
                disabled={full}
                onClick={() => setSelectedWindowKey(window.key)}
                className="rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-35"
                style={active ? { borderColor: primaryColor, background: `${primaryColor}12` } : { borderColor: "var(--wborder)", background: "var(--wsubtle)" }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <CalendarDays className="h-4 w-4" style={{ color: primaryColor }} />
                  {window.scheduleMode === "CUSTOM"
                    ? window.label
                    : `${format(parseISO(window.startDate), "d MMM", { locale: es })} – ${format(addDays(parseISO(window.endDate), 0), "d MMM", { locale: es })}`}
                </span>
                {window.scheduleMode === "CUSTOM" && (
                  <span className="mt-1 block text-xs" style={{ color: textSecondary }}>
                    {format(parseISO(window.startDate), "d MMM", { locale: es })} – {format(parseISO(window.endDate), "d MMM yyyy", { locale: es })}
                  </span>
                )}
                <span className="mt-1 block text-xs" style={{ color: full ? "#ef4444" : textSecondary }}>{full ? "Completo" : `${window.available} ${window.available === 1 ? "cupo disponible" : "cupos disponibles"}`}</span>
              </button>
            );
          })}
        </div>
      )}
      {!loadingWeeks && windows.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--wborder)", color: textSecondary }}>
          <LocalizedText id="By7yCBiK3QhC" />
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold"><LocalizedText id="tQ9mhcNVfPvd" /></h3>
        <input required value={form.petName} onChange={(event) => setForm({ ...form, petName: event.target.value })} placeholder={legacy("YLa2UCHuy8Cw")} maxLength={80}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
        <textarea required value={form.petDetails} onChange={(event) => setForm({ ...form, petDetails: event.target.value })}
          placeholder={legacy("nMmAXcs2Bz7A")} minLength={10} maxLength={2000} rows={5}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold"><LocalizedText id="SlnOrZ25kFj0" /> {service.requiresReferenceImages && <span style={{ color: primaryColor }}>*</span>}</h3>
          <p className="text-xs" style={{ color: textSecondary }}><LocalizedText id="k_Y_8gdeemue" /></p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {images.map((url, index) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border" style={{ borderColor: "var(--wborder)" }}>
              <img src={url} alt={`Referencia ${index + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setImages((current) => current.filter((item) => item !== url))}
                className="absolute right-1 top-1 rounded-lg bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length < 6 && (
            <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs disabled:opacity-50"
              style={{ borderColor: `${primaryColor}60`, color: primaryColor, background: `${primaryColor}08` }}>
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              {uploading ? "Subiendo" : "Agregar"}
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={(event) => uploadImages(Array.from(event.target.files ?? []))} />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold"><LocalizedText id="IAkiAUdTqKb9" /></h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={legacy("rMLiRdW5UYo2")}
            className="rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
          <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email"
            className="rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
        </div>
        <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+56 9 1234 5678"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
        <select value={form.deliveryMethod} onChange={(event) => setForm({ ...form, deliveryMethod: event.target.value })}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }}>
          <option value="COORDINATE">Entrega a coordinar</option>
          <option value="PICKUP">Retiro</option>
          <option value="SHIPPING">Despacho</option>
        </select>
        {form.deliveryMethod === "SHIPPING" && (
          <textarea required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder={legacy("6ztNJLQsAho8")} rows={3}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
        )}
      </div>

      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: `${primaryColor}35`, background: `${primaryColor}08` }}>
        <div className="flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="ybPDgkf3ROF9" /></span><strong>{formatPrice(totalPrice, business.currencyCode)}</strong></div>
        <div className="mt-2 flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="buQuL4y1MA4L" />{service.productionDepositPercent}%)</span><strong style={{ color: primaryColor }}>{formatPrice(depositAmount, business.currencyCode)}</strong></div>
        <p className="mt-2 text-xs" style={{ color: textSecondary }}><LocalizedText id="Phnqs7VW5uof" /> {formatPrice(Math.max(0, totalPrice - depositAmount), business.currencyCode)} <LocalizedText id="YW2TfB_BvG6J" /></p>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

      <button type="submit" disabled={submitting || uploading || loadingWeeks}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40"
        style={{ background: primaryColor, color: "#fff" }}>
        {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /><LocalizedText id="sVyzoigicdJO" /></> : <><Upload className="h-4 w-4" /><LocalizedText id="C_wwe35JyY8L" /></>}
      </button>
    </form>
  );
}
