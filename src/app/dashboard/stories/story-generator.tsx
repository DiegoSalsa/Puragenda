"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ImagePlus, Loader2, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

interface StoryOptions {
  canChooseStaff: boolean;
  ownStaffId: string | null;
  locations: Array<{ id: string; name: string; slug: string }>;
  services: Array<{ id: string; name: string; duration: number; locationIds: string[]; staffIds: string[] }>;
  staff: Array<{ id: string; name: string; locationIds: string[] }>;
}

interface StoryBrand {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}

export function StoryGenerator({ businessSlug, options, brand }: { businessSlug: string; options: StoryOptions; brand: StoryBrand }) {
  const t = useTranslations("dashboard.stories");
  const designT = useTranslations("dashboard.storyDesign");
  const [locationId, setLocationId] = useState(options.locations[0]?.id ?? "");
  const [staffId, setStaffId] = useState<string | null>(options.canChooseStaff ? null : options.ownStaffId);
  const availableServices = useMemo(() => options.services.filter((service) => (
    service.locationIds.includes(locationId)
    && (!staffId || service.staffIds.length === 0 || service.staffIds.includes(staffId))
  )), [locationId, options.services, staffId]);
  const availableStaff = useMemo(
    () => options.staff.filter((staff) => staff.locationIds.includes(locationId)),
    [locationId, options.staff],
  );
  const [allServices, setAllServices] = useState(true);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [range, setRange] = useState<"TODAY" | "TOMORROW" | "NEXT_7">("TOMORROW");
  const [template, setTemplate] = useState<"AURORA" | "EDITORIAL" | "BOLD">("AURORA");
  const [headline, setHeadline] = useState(() => t("defaultHeadline"));
  const [backgroundMode, setBackgroundMode] = useState<"ART" | "SOLID">("ART");
  const [accentColor, setAccentColor] = useState(brand.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(brand.secondaryColor);
  const [canvasColor, setCanvasColor] = useState(brand.backgroundColor);
  const [storyTextColor, setStoryTextColor] = useState("#171717");
  const [showLogo, setShowLogo] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const [callToAction, setCallToAction] = useState(() => designT("defaultCta"));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectedLocation = options.locations.find((location) => location.id === locationId);
  const bookingPath = selectedLocation
    ? `/widget/${businessSlug}?location=${encodeURIComponent(selectedLocation.slug)}&utm_source=instagram&utm_medium=story&utm_campaign=availability`
    : "";

  async function generateStory() {
    if (!locationId || (!allServices && serviceIds.length === 0) || !staffId && !options.canChooseStaff) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          serviceIds,
          allServices,
          staffId,
          range,
          template,
          headline,
          backgroundMode,
          accentColor,
          secondaryColor,
          canvasColor,
          storyTextColor,
          showLogo,
          showServices,
          callToAction,
        }),
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
    setServiceIds((current) => current.filter((id) => nextServices.some((service) => service.id === id)));
    if (options.canChooseStaff && staffId) {
      const remainsAssigned = options.staff.some(
        (staff) => staff.id === staffId && staff.locationIds.includes(nextLocationId),
      );
      if (!remainsAssigned) setStaffId(null);
    }
  }

  function changeStaff(nextStaffId: string | null) {
    setStaffId(nextStaffId);
    if (!nextStaffId) return;
    setServiceIds((current) => current.filter((id) => {
      const service = options.services.find((entry) => entry.id === id);
      return !!service && (service.staffIds.length === 0 || service.staffIds.includes(nextStaffId));
    }));
  }

  function toggleService(serviceId: string) {
    setServiceIds((current) => current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId]);
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
    if (!bookingPath) return;
    await navigator.clipboard.writeText(new URL(bookingPath, window.location.origin).toString());
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

        <div>
          <span className="text-sm font-medium">{t("service")}</span>
          <button type="button" onClick={() => setAllServices((current) => !current)} className={`mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${allServices ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}>
            <span>{t("allServices")}</span>
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${allServices ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border"}`}>{allServices && <Check className="h-3.5 w-3.5" />}</span>
          </button>
          {!allServices && (
            <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
              {availableServices.map((service) => {
                const selected = serviceIds.includes(service.id);
                return (
                  <button key={service.id} type="button" onClick={() => toggleService(service.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selected ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "hover:bg-muted"}`}>
                    <span><span className="font-medium">{service.name}</span><span className="ml-2 text-xs opacity-65">{service.duration} min</span></span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${selected ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>
                  </button>
                );
              })}
            </div>
          )}
          <span className="mt-1.5 block text-xs text-muted-foreground">{allServices ? t("allServicesHint") : t("selectedServices", { count: serviceIds.length })}</span>
        </div>

        <label className="block text-sm font-medium">{t("staff")}
          {options.canChooseStaff ? (
            <select value={staffId ?? ""} onChange={(event) => changeStaff(event.target.value || null)} className={inputClass}>
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
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setTemplate("AURORA")} style={{ backgroundImage: "url('/story-templates/editorial-paper.webp')", backgroundSize: "cover", borderTopColor: brand.primaryColor }} className={`h-24 rounded-xl border border-t-8 p-2 text-left text-xs font-bold text-slate-900 ${template === "AURORA" ? "ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-background" : "border-border"}`}><span className="rounded bg-white/90 px-2 py-1">{t("auroraTemplate")}</span></button>
            <button type="button" onClick={() => setTemplate("EDITORIAL")} style={{ backgroundImage: "url('/story-templates/organic-paper.webp')", backgroundSize: "cover", borderTopColor: brand.primaryColor }} className={`h-24 rounded-xl border border-t-8 p-2 text-left text-xs font-bold text-slate-900 ${template === "EDITORIAL" ? "ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-background" : "border-border"}`}><span className="rounded bg-white/90 px-2 py-1">{t("editorialTemplate")}</span></button>
            <button type="button" onClick={() => setTemplate("BOLD")} style={{ backgroundImage: "url('/story-templates/graphic-paper.webp')", backgroundSize: "cover", borderTopColor: brand.primaryColor }} className={`h-24 rounded-xl border border-t-8 p-2 text-left text-xs font-black text-slate-900 ${template === "BOLD" ? "ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-background" : "border-border"}`}><span className="rounded bg-white/90 px-2 py-1">{t("boldTemplate")}</span></button>
          </div>
        </div>

        <details open className="rounded-xl border border-border bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold">{designT("customize")}</summary>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">{designT("background")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setBackgroundMode("ART")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${backgroundMode === "ART" ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}>{designT("artBackground")}</button>
                <button type="button" onClick={() => setBackgroundMode("SOLID")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${backgroundMode === "SOLID" ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}>{designT("solidBackground")}</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                [designT("accentColor"), accentColor, setAccentColor],
                [designT("secondaryColor"), secondaryColor, setSecondaryColor],
                [designT("canvasColor"), canvasColor, setCanvasColor],
                [designT("textColor"), storyTextColor, setStoryTextColor],
              ] as const).map(([label, value, setter]) => (
                <label key={label} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-xs font-medium">
                  <input type="color" value={value} onChange={(event) => setter(event.target.value)} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowLogo((current) => !current)} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${showLogo ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}><span>{designT("showLogo")}</span>{showLogo && <Check className="h-3.5 w-3.5" />}</button>
              <button type="button" onClick={() => setShowServices((current) => !current)} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${showServices ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}><span>{designT("showServices")}</span>{showServices && <Check className="h-3.5 w-3.5" />}</button>
            </div>
            <label className="block text-xs font-medium">{designT("cta")}
              <input maxLength={90} value={callToAction} onChange={(event) => setCallToAction(event.target.value)} className={inputClass} />
            </label>
          </div>
        </details>

        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={loading || !locationId || (!allServices && serviceIds.length === 0) || !headline.trim()} onClick={generateStory} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6D28D9] disabled:opacity-50">
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
          <button type="button" disabled={!bookingPath} onClick={copyBookingLink} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold disabled:opacity-30">{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}{copied ? t("copied") : t("copyLink")}</button>
        </div>
      </section>
    </div>
  );
}
