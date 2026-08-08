"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ImagePlus, Loader2, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

interface StoryOptions {
  canChooseStaff: boolean;
  ownStaffId: string | null;
  locations: Array<{ id: string; name: string; slug: string }>;
  services: Array<{ id: string; name: string; duration: number; locationIds: string[] }>;
  staff: Array<{ id: string; name: string; locationIds: string[] }>;
}

export function StoryGenerator({ businessSlug, options }: { businessSlug: string; options: StoryOptions }) {
  const t = useTranslations("dashboard.stories");
  const [locationId, setLocationId] = useState(options.locations[0]?.id ?? "");
  const availableServices = useMemo(
    () => options.services.filter((service) => service.locationIds.includes(locationId)),
    [locationId, options.services],
  );
  const availableStaff = useMemo(
    () => options.staff.filter((staff) => staff.locationIds.includes(locationId)),
    [locationId, options.staff],
  );
  const [serviceId, setServiceId] = useState(
    options.services.find((service) => service.locationIds.includes(options.locations[0]?.id ?? ""))?.id ?? "",
  );
  const [staffId, setStaffId] = useState<string | null>(options.canChooseStaff ? null : options.ownStaffId);
  const [range, setRange] = useState<"TODAY" | "TOMORROW" | "NEXT_7">("TOMORROW");
  const [template, setTemplate] = useState<"GRADIENT" | "MINIMAL">("GRADIENT");
  const [headline, setHeadline] = useState(() => t("defaultHeadline"));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectedLocation = options.locations.find((location) => location.id === locationId);
  const bookingUrl = typeof window === "undefined"
    ? ""
    : `${window.location.origin}/widget/${businessSlug}?location=${encodeURIComponent(selectedLocation?.slug ?? "")}&utm_source=instagram&utm_medium=story&utm_campaign=availability`;

  async function generateStory() {
    if (!locationId || !serviceId || !staffId && !options.canChooseStaff) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, serviceId, staffId, range, template, headline }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || t("generateError"));
      }
      const blob = await response.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("generateError"));
    } finally {
      setLoading(false);
    }
  }

  function changeLocation(nextLocationId: string) {
    setLocationId(nextLocationId);
    const nextServices = options.services.filter((service) => service.locationIds.includes(nextLocationId));
    setServiceId(nextServices.some((service) => service.id === serviceId) ? serviceId : nextServices[0]?.id ?? "");
    if (options.canChooseStaff && staffId) {
      const remainsAssigned = options.staff.some(
        (staff) => staff.id === staffId && staff.locationIds.includes(nextLocationId),
      );
      if (!remainsAssigned) setStaffId(null);
    }
  }

  function downloadStory() {
    if (!previewBlob) return;
    const url = URL.createObjectURL(previewBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `historia-disponibilidad-${new Date().toISOString().slice(0, 10)}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyBookingLink() {
    if (!bookingUrl) return;
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const inputClass = "mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[#7C3AED]/50";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(320px,1fr)]">
      <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="font-semibold">{t("configure")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("configureHint")}</p>
        </div>

        <label className="block text-sm font-medium">{t("location")}
          <select value={locationId} onChange={(event) => changeLocation(event.target.value)} className={inputClass}>
            {options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium">{t("service")}
          <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className={inputClass}>
            {availableServices.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration} min</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium">{t("staff")}
          {options.canChooseStaff ? (
            <select value={staffId ?? ""} onChange={(event) => setStaffId(event.target.value || null)} className={inputClass}>
              <option value="">{t("wholeTeam")}</option>
              {availableStaff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          ) : (
            <div className={`${inputClass} flex items-center gap-2 bg-muted/40`}><UsersRound className="h-4 w-4 text-[#7C3AED]" />{availableStaff[0]?.name ?? t("mySchedule")}</div>
          )}
          {!options.canChooseStaff && <span className="mt-1.5 block text-xs text-muted-foreground">{t("ownScheduleHint")}</span>}
        </label>

        <div>
          <span className="text-sm font-medium">{t("period")}</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([['TODAY', t('today')], ['TOMORROW', t('tomorrow')], ['NEXT_7', t('next7')]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${range === value ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}>{label}</button>
            ))}
          </div>
        </div>

        <label className="block text-sm font-medium">{t("headline")}
          <input maxLength={80} value={headline} onChange={(event) => setHeadline(event.target.value)} className={inputClass} />
        </label>

        <div>
          <span className="text-sm font-medium">{t("template")}</span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setTemplate("GRADIENT")} className={`h-20 rounded-xl border bg-gradient-to-br from-[#7C3AED] to-[#111827] text-sm font-bold text-white ${template === "GRADIENT" ? "ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-background" : "border-border"}`}>{t("brandTemplate")}</button>
            <button type="button" onClick={() => setTemplate("MINIMAL")} className={`h-20 rounded-xl border bg-slate-50 text-sm font-bold text-slate-900 ${template === "MINIMAL" ? "ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-background" : "border-border"}`}>{t("minimalTemplate")}</button>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={loading || !locationId || !serviceId || !headline.trim()} onClick={generateStory} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6D28D9] disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {loading ? t("calculating") : t("create")}
        </button>
      </section>

      <section className="flex min-h-[620px] flex-col items-center rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex w-full items-center justify-between gap-3">
          <div><h2 className="font-semibold">{t("preview")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("format")}</p></div>
          {previewUrl && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">{t("ready")}</span>}
        </div>
        <div className="mt-5 flex w-full flex-1 items-center justify-center rounded-2xl bg-muted/30 p-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Vista previa de la historia" className="max-h-[720px] w-auto rounded-xl shadow-2xl" />
          ) : (
            <div className="max-w-sm text-center text-muted-foreground"><ImagePlus className="mx-auto h-10 w-10 opacity-40" /><p className="mt-3 text-sm font-semibold">{t("emptyTitle")}</p><p className="mt-1 text-xs">{t("emptyHint")}</p></div>
          )}
        </div>
        <div className="mt-5 grid w-full gap-3 sm:grid-cols-2">
          <button type="button" disabled={!previewBlob} onClick={downloadStory} className="flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background disabled:opacity-30"><Download className="h-4 w-4" />{t("download")}</button>
          <button type="button" disabled={!bookingUrl} onClick={copyBookingLink} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold disabled:opacity-30">{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}{copied ? t("copied") : t("copyLink")}</button>
        </div>
      </section>
    </div>
  );
}
