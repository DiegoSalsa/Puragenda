"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarSearch,
  Check,
  Clock3,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  MapPin,
  MousePointerClick,
  Palette,
  Share2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getStoryVisibilityDefaults } from "@/core/story-visibility";

interface StoryOptions {
  canChooseStaff: boolean;
  ownStaffId: string | null;
  isIndividualPlan: boolean;
  hasMultipleLocations: boolean;
  businessAddress: string | null;
  locations: Array<{ id: string; name: string; slug: string; address: string | null }>;
  services: Array<{ id: string; name: string; duration: number; locationIds: string[]; staffIds: string[] }>;
  staff: Array<{ id: string; name: string; locationIds: string[] }>;
  opportunities: Array<{
    id: string;
    locationId: string;
    locationName: string;
    serviceId: string;
    serviceName: string;
    staffId: string;
    staffName: string;
    date: string;
    dateLabel: string;
    times: string[];
    slotCount: number;
    potentialRevenue: number;
    source: "EXPLICIT" | "RECURRING";
    headline: string;
  }>;
}

interface StoryInsights {
  totals: { generated: number; visits: number; bookings: number; revenue: number };
  recent: Array<{
    id: string;
    headline: string;
    createdAt: string;
    locationName: string | null;
    staffName: string | null;
    visits: number;
    bookings: number;
    revenue: number;
    downloads: number;
    shares: number;
    locationId: string | null;
    staffId: string | null;
    serviceIds: string[];
    targetDate: string | null;
    template: "AURORA" | "EDITORIAL" | "BOLD";
  }>;
}

interface StoryBrand {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}

export function StoryGenerator({ businessSlug, options, brand, insights, currencyCode }: { businessSlug: string; options: StoryOptions; brand: StoryBrand; insights: StoryInsights | null; currencyCode: string }) {
  const t = useTranslations("dashboard.stories");
  const designT = useTranslations("dashboard.storyDesign");
  const locale = useLocale();
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
  const [range, setRange] = useState<"TODAY" | "TOMORROW" | "NEXT_7" | "NEXT_AVAILABLE">("NEXT_AVAILABLE");
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [template, setTemplate] = useState<"AURORA" | "EDITORIAL" | "BOLD">("AURORA");
  const [headline, setHeadline] = useState(() => t("defaultHeadline"));
  const [backgroundMode, setBackgroundMode] = useState<"ART" | "SOLID">("ART");
  const [accentColor, setAccentColor] = useState(brand.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(brand.secondaryColor);
  const [canvasColor, setCanvasColor] = useState(brand.backgroundColor);
  const [storyTextColor, setStoryTextColor] = useState("#171717");
  const [showLogo, setShowLogo] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const [showSchedule, setShowSchedule] = useState(true);
  const visibilityDefaults = getStoryVisibilityDefaults(options);
  const [showProfessional, setShowProfessional] = useState(visibilityDefaults.showProfessional);
  const [showLocationName, setShowLocationName] = useState(visibilityDefaults.showLocationName);
  const [showAddress, setShowAddress] = useState(visibilityDefaults.showAddress);
  const [ctaMode, setCtaMode] = useState<"LINK_STICKER" | "BIO">("LINK_STICKER");
  const [callToAction, setCallToAction] = useState(() => designT("stickerDefaultCta"));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectedLocation = options.locations.find((location) => location.id === locationId);
  const fallbackBookingPath = selectedLocation
    ? `/widget/${businessSlug}?location=${encodeURIComponent(selectedLocation.slug)}&utm_source=instagram&utm_medium=story&utm_campaign=availability`
    : "";

  function invalidatePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setCampaignId(null);
    setBookingLink(null);
  }

  async function generateStory(overrides?: {
    locationId: string;
    serviceIds: string[];
    staffId: string | null;
    targetDate: string | null;
    headline: string;
    range?: "TODAY" | "TOMORROW" | "NEXT_7" | "NEXT_AVAILABLE";
  }) {
    const generationLocationId = overrides?.locationId ?? locationId;
    const generationServiceIds = overrides?.serviceIds ?? serviceIds;
    const generationStaffId = overrides?.staffId ?? staffId;
    const generationAllServices = overrides ? false : allServices;
    if (!generationLocationId || (!generationAllServices && generationServiceIds.length === 0) || !generationStaffId && !options.canChooseStaff) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: generationLocationId,
          serviceIds: generationServiceIds,
          allServices: generationAllServices,
          staffId: generationStaffId,
          range: overrides?.range ?? range,
          targetDate: overrides ? overrides.targetDate ?? undefined : targetDate ?? undefined,
          template,
          headline: overrides?.headline ?? headline,
          backgroundMode,
          accentColor,
          secondaryColor,
          canvasColor,
          storyTextColor,
          showLogo,
          showServices,
          showSchedule,
          showProfessional,
          showLocationName,
          showAddress,
          ctaMode,
          callToAction,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || t("generateError"));
      }
      const blob = await response.blob();
      setCampaignId(response.headers.get("X-Story-Campaign-Id"));
      setBookingLink(response.headers.get("X-Story-Booking-Url"));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("generateError"));
    } finally {
      setLoading(false);
    }
  }

  function applyOpportunity(opportunity: StoryOptions["opportunities"][number]) {
    invalidatePreview();
    setLocationId(opportunity.locationId);
    setStaffId(opportunity.staffId);
    setAllServices(false);
    setServiceIds([opportunity.serviceId]);
    setRange("NEXT_AVAILABLE");
    setTargetDate(opportunity.date);
    setHeadline(opportunity.headline);
    void generateStory({
      locationId: opportunity.locationId,
      serviceIds: [opportunity.serviceId],
      staffId: opportunity.staffId,
      targetDate: opportunity.date,
      headline: opportunity.headline,
      range: "NEXT_AVAILABLE",
    });
  }

  function reuseCampaign(campaign: StoryInsights["recent"][number]) {
    if (!campaign.locationId || campaign.serviceIds.length === 0) return;
    invalidatePreview();
    const today = new Date().toISOString().slice(0, 10);
    const reusableDate = campaign.targetDate && campaign.targetDate >= today ? campaign.targetDate : null;
    setLocationId(campaign.locationId);
    setStaffId(campaign.staffId);
    setAllServices(false);
    setServiceIds(campaign.serviceIds);
    setRange("NEXT_AVAILABLE");
    setTargetDate(reusableDate);
    setHeadline(campaign.headline);
    setTemplate(campaign.template);
    void generateStory({
      locationId: campaign.locationId,
      serviceIds: campaign.serviceIds,
      staffId: campaign.staffId,
      targetDate: reusableDate,
      headline: campaign.headline,
      range: "NEXT_AVAILABLE",
    });
  }

  function changeLocation(nextLocationId: string) {
    invalidatePreview();
    setLocationId(nextLocationId);
    const nextLocation = options.locations.find((location) => location.id === nextLocationId);
    if (!nextLocation?.address && !options.businessAddress) setShowAddress(false);
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
    invalidatePreview();
    setStaffId(nextStaffId);
    if (!nextStaffId) return;
    setServiceIds((current) => current.filter((id) => {
      const service = options.services.find((entry) => entry.id === id);
      return !!service && (service.staffIds.length === 0 || service.staffIds.includes(nextStaffId));
    }));
  }

  function toggleService(serviceId: string) {
    invalidatePreview();
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
    void recordActivity("download");
  }

  async function recordActivity(activity: "download" | "share") {
    if (!campaignId) return;
    await fetch(`/api/dashboard/stories/${campaignId}/activity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity }),
    }).catch(() => undefined);
  }

  async function shareStory() {
    if (!previewBlob) return;
    const file = new File(
      [previewBlob],
      `historia-disponibilidad-${new Date().toISOString().slice(0, 10)}.png`,
      { type: "image/png" },
    );
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ files: [file], title: headline, url: bookingLink ?? undefined });
        await recordActivity("share");
        return;
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
      }
    }
    downloadStory();
  }

  async function copyBookingLink() {
    const link = bookingLink ?? (fallbackBookingPath ? new URL(fallbackBookingPath, window.location.origin).toString() : "");
    if (!link) return;
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copiedWithFallback = document.execCommand("copy");
      textarea.remove();
      return copiedWithFallback;
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link).catch(() => {
          if (!fallbackCopy()) throw new Error("COPY_FAILED");
        });
      } else if (!fallbackCopy()) {
        throw new Error("COPY_FAILED");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(t("copyError"));
    }
  }

  const inputClass = "mt-2 w-full rounded-xl border-2 border-foreground/15 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10";
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
  const featuredOpportunity = options.opportunities[0];
  const otherOpportunities = options.opportunities.slice(1, 6);
  const selectedServiceNames = allServices
    ? t("allServices")
    : options.services.filter((service) => serviceIds.includes(service.id)).map((service) => service.name).join(", ");
  const selectedStaffName = options.staff.find((staff) => staff.id === staffId)?.name ?? t("wholeTeam");
  const selectedAddress = selectedLocation?.address ?? options.businessAddress;
  const selectedPlaceLabel = [
    showLocationName ? selectedLocation?.name : null,
    showAddress ? selectedAddress : null,
  ].filter(Boolean).join(" · ");
  const brandInitial = brand.name.trim().charAt(0).toUpperCase() || "P";

  function scrollToStudio() {
    document.getElementById("story-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeCtaMode(nextMode: "LINK_STICKER" | "BIO") {
    invalidatePreview();
    setCtaMode(nextMode);
    setCallToAction(nextMode === "LINK_STICKER" ? designT("stickerDefaultCta") : designT("defaultCta"));
  }

  return (
    <div className="space-y-12 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-foreground bg-[#E9D8FF] px-5 py-7 shadow-[7px_7px_0_#171717] sm:px-8 sm:py-9 lg:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border-[34px] border-[#FF5C8A]/80" />
        <div className="pointer-events-none absolute bottom-0 left-[42%] h-28 w-28 translate-y-1/2 rotate-12 bg-[#FFD84D]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-[#FFD84D] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]">
              <Sparkles className="h-3.5 w-3.5" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 max-w-xl text-[2.6rem] font-black leading-[0.94] tracking-[-0.055em] text-[#171717] sm:text-5xl lg:text-[3.5rem]">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-xl text-sm font-medium leading-6 text-[#171717]/70 sm:text-base">
              {t("subtitle")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={scrollToStudio} className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-[#171717] px-5 py-3 text-sm font-black text-white shadow-[3px_3px_0_#7C3AED] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#7C3AED]">
                {t("create")}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <div className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground/20 bg-white/55 px-5 py-3 text-sm font-bold text-[#171717] backdrop-blur-sm">
                <CalendarSearch className="h-4 w-4 text-[#7C3AED]" />{options.opportunities.length} · {t("opportunityEyebrow")}
              </div>
            </div>
          </div>

          {insights && (
            <div className="relative rounded-[1.75rem] border-2 border-foreground bg-[#171717] p-5 text-white shadow-[6px_6px_0_#FF5C8A] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4A2FF]">{t("metricsTitle")}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><Sparkles className="h-4 w-4 text-[#FFD84D]" /></span>
              </div>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15">
                {([
                  [t("generatedMetric"), insights.totals.generated, Sparkles, "#C4A2FF"],
                  [t("visitsMetric"), insights.totals.visits, MousePointerClick, "#FFD84D"],
                  [t("bookingsMetric"), insights.totals.bookings, CalendarSearch, "#FF83A6"],
                  [t("revenueMetric"), currency.format(insights.totals.revenue), Banknote, "#7EE2B8"],
                ] as const).map(([label, value, Icon, color]) => (
                  <div key={label} className="bg-[#171717] p-4 sm:p-5">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <p className="mt-4 text-xl font-black tracking-tight sm:text-2xl">{value}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED]">{t("opportunityEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{t("opportunityTitle")}</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{t("opportunityHint")}</p>
        </div>

        {featuredOpportunity ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
            <article className="group relative overflow-hidden rounded-[1.75rem] border-2 border-foreground bg-[#FFD6E5] p-5 shadow-[5px_5px_0_#171717] sm:p-7">
              <div className="pointer-events-none absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-[#FF5C8A]/35 transition-transform duration-500 group-hover:scale-125" />
              <div className="relative flex h-full flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span className={`rounded-full border-2 border-foreground px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${featuredOpportunity.source === "EXPLICIT" ? "bg-[#FFD84D] text-[#171717]" : "bg-white text-[#7C3AED]"}`}>
                    {featuredOpportunity.source === "EXPLICIT" ? t("manualOpening") : t("recurringOpening")}
                  </span>
                  <span className="rounded-full bg-[#171717] px-3 py-1.5 text-xs font-black text-white">{currency.format(featuredOpportunity.potentialRevenue)}</span>
                </div>
                <div className="mt-8 grid gap-6 sm:grid-cols-[120px_1fr] sm:items-end">
                  <div>
                    <p className="text-5xl font-black leading-none tracking-[-0.08em] text-[#7C3AED]">{new Date(`${featuredOpportunity.date}T12:00:00`).toLocaleDateString(locale, { day: "2-digit" })}</p>
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.16em]">{new Date(`${featuredOpportunity.date}T12:00:00`).toLocaleDateString(locale, { month: "short", weekday: "short" })}</p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">{featuredOpportunity.serviceName}</h3>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-[#171717]/65">
                      <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />{featuredOpportunity.staffName}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{featuredOpportunity.locationName}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-2">
                  {featuredOpportunity.times.map((time) => <span key={time} className="rounded-full border border-foreground/20 bg-white/60 px-3 py-1.5 text-xs font-black">{time}</span>)}
                  <span className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs font-bold text-[#171717]/60">{t("slotsCount", { count: featuredOpportunity.slotCount })}</span>
                </div>
                <button type="button" disabled={loading} onClick={() => applyOpportunity(featuredOpportunity)} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-[#171717] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#7C3AED] disabled:opacity-50 sm:w-fit">
                  <Sparkles className="h-4 w-4" />{t("createFromOpportunity")}
                </button>
              </div>
            </article>

            <div className="overflow-hidden rounded-[1.75rem] border-2 border-foreground bg-white">
              {otherOpportunities.length > 0 ? otherOpportunities.map((opportunity, index) => (
                <button key={opportunity.id} type="button" disabled={loading} onClick={() => applyOpportunity(opportunity)} className={`group flex w-full items-center gap-3 p-4 text-left transition hover:bg-[#F2E8FF] disabled:opacity-50 sm:p-5 ${index > 0 ? "border-t-2 border-foreground/10" : ""}`}>
                  <span className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-foreground text-center ${opportunity.source === "EXPLICIT" ? "bg-[#FFD84D]" : "bg-[#E9D8FF]"}`}>
                    <span className="text-lg font-black leading-none">{new Date(`${opportunity.date}T12:00:00`).toLocaleDateString(locale, { day: "2-digit" })}</span>
                    <span className="mt-0.5 text-[8px] font-black uppercase">{new Date(`${opportunity.date}T12:00:00`).toLocaleDateString(locale, { month: "short" })}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{opportunity.serviceName}</span>
                    <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Clock3 className="h-3 w-3 shrink-0" />{opportunity.times.join(" · ")} · {opportunity.staffName}</span>
                  </span>
                  <span className="hidden text-xs font-black text-emerald-700 sm:block">{currency.format(opportunity.potentialRevenue)}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </button>
              )) : <div className="flex h-full min-h-48 items-center justify-center p-6 text-sm text-muted-foreground">{t("noOpportunities")}</div>}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border-2 border-dashed border-foreground/20 bg-white/60 px-5 py-10 text-center text-sm text-muted-foreground">{t("noOpportunities")}</div>
        )}
      </section>

      <section id="story-studio" className="scroll-mt-20">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF4F87]">02 · Studio</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{t("configure")}</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{t("configureHint")}</p>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,460px)_minmax(360px,1fr)]">
      <section className="space-y-6 rounded-[1.75rem] border-2 border-foreground bg-white p-5 shadow-[5px_5px_0_#E9D8FF] sm:p-6">
        <div className="flex items-center gap-3 border-b-2 border-foreground/10 pb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] text-sm font-black text-white">01</span>
          <div>
            <h3 className="font-black">{t("configure")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{selectedLocation?.name} · {selectedStaffName}</p>
          </div>
        </div>

        <label className="block text-sm font-medium">{t("location")}
          <select value={locationId} onChange={(event) => changeLocation(event.target.value)} className={inputClass}>
            {options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>

        <div>
          <span className="text-sm font-medium">{t("service")}</span>
          <button type="button" onClick={() => { invalidatePreview(); setAllServices((current) => !current); }} className={`mt-2 flex w-full items-center justify-between rounded-xl border-2 px-3 py-3 text-left text-sm font-bold transition ${allServices ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15 hover:border-foreground/30"}`}>
            <span>{t("allServices")}</span>
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${allServices ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border"}`}>{allServices && <Check className="h-3.5 w-3.5" />}</span>
          </button>
          {!allServices && (
            <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-xl border-2 border-foreground/15 p-2">
              {availableServices.map((service) => {
                const selected = serviceIds.includes(service.id);
                return (
                  <button key={service.id} type="button" onClick={() => toggleService(service.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selected ? "bg-[#E9D8FF] text-[#5B21B6]" : "hover:bg-[#FFF6D8]"}`}>
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
            <div className={`${inputClass} flex items-center gap-2 bg-[#F8F5ED]`}><UsersRound className="h-4 w-4 text-[#7C3AED]" />{availableStaff[0]?.name ?? t("mySchedule")}</div>
          )}
          {!options.canChooseStaff && <span className="mt-1.5 block text-xs text-muted-foreground">{t("ownScheduleHint")}</span>}
        </label>

        <div>
          <span className="text-sm font-medium">{designT("availabilityContent")}</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { invalidatePreview(); setShowSchedule(true); }} className={`rounded-xl border-2 px-3 py-3 text-left transition ${showSchedule ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15"}`}>
              <span className="block text-sm font-black">{designT("withSchedule")}</span>
              <span className="mt-1 block text-[10px] leading-4 opacity-65">{designT("withScheduleHint")}</span>
            </button>
            <button type="button" onClick={() => { invalidatePreview(); setShowSchedule(false); }} className={`rounded-xl border-2 px-3 py-3 text-left transition ${!showSchedule ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15"}`}>
              <span className="block text-sm font-black">{designT("withoutSchedule")}</span>
              <span className="mt-1 block text-[10px] leading-4 opacity-65">{designT("withoutScheduleHint")}</span>
            </button>
          </div>
        </div>

        {showSchedule && <div>
          <span className="text-sm font-medium">{t("period")}</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([['TODAY', t('today')], ['TOMORROW', t('tomorrow')], ['NEXT_7', t('next7')], ['NEXT_AVAILABLE', t('nextAvailable')]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => { invalidatePreview(); setRange(value); setTargetDate(null); }} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${range === value && !targetDate ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15 hover:border-foreground/30"}`}>{label}</button>
            ))}
          </div>
          {targetDate && <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700">{t("selectedDate", { date: targetDate })}</p>}
        </div>}

        <label className="block text-sm font-medium">{t("headline")}
          <input maxLength={80} value={headline} onChange={(event) => { invalidatePreview(); setHeadline(event.target.value); }} className={inputClass} />
        </label>

        <div>
          <span className="text-sm font-medium">{t("template")}</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => { invalidatePreview(); setTemplate("AURORA"); }} style={{ backgroundColor: canvasColor }} className={`relative h-28 overflow-hidden rounded-xl border-2 p-2 text-left text-xs font-black transition hover:-translate-y-1 ${template === "AURORA" ? "border-foreground ring-4 ring-[#7C3AED]/20" : "border-foreground/15"}`}>
              <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full" style={{ backgroundColor: secondaryColor }} />
              <span className="absolute bottom-3 right-2 h-10 w-10 rotate-12 border-[6px]" style={{ borderColor: accentColor }} />
              <span className="relative rounded-full bg-white/90 px-2 py-1">{t("auroraTemplate")}</span>
            </button>
            <button type="button" onClick={() => { invalidatePreview(); setTemplate("EDITORIAL"); }} style={{ backgroundColor: canvasColor }} className={`relative flex h-28 items-end justify-center overflow-hidden rounded-xl border-2 p-2 text-center text-xs font-black transition hover:-translate-y-1 ${template === "EDITORIAL" ? "border-foreground ring-4 ring-[#7C3AED]/20" : "border-foreground/15"}`}>
              <span className="absolute -top-5 h-20 w-20 rounded-full opacity-80" style={{ backgroundColor: accentColor }} />
              <span className="relative rounded-full bg-white/90 px-2 py-1">{t("editorialTemplate")}</span>
            </button>
            <button type="button" onClick={() => { invalidatePreview(); setTemplate("BOLD"); }} style={{ backgroundColor: accentColor, boxShadow: `inset -42px 0 0 ${secondaryColor}` }} className={`relative h-28 overflow-hidden rounded-md border-2 p-2 text-left text-xs font-black transition hover:-translate-y-1 ${template === "BOLD" ? "border-foreground ring-4 ring-[#7C3AED]/20" : "border-foreground/15"}`}>
              <span className="relative inline-block border-2 border-foreground bg-white px-2 py-1">{t("boldTemplate")}</span>
            </button>
          </div>
        </div>

        <details open className="rounded-2xl border-2 border-foreground/15 bg-[#F8F5ED] p-4">
          <summary className="cursor-pointer list-none text-sm font-black"><span className="inline-flex items-center gap-2"><Palette className="h-4 w-4 text-[#7C3AED]" />{designT("customize")}</span></summary>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">{designT("background")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { invalidatePreview(); setBackgroundMode("ART"); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${backgroundMode === "ART" ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}>{designT("artBackground")}</button>
                <button type="button" onClick={() => { invalidatePreview(); setBackgroundMode("SOLID"); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${backgroundMode === "SOLID" ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}>{designT("solidBackground")}</button>
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
                  <input type="color" value={value} onChange={(event) => { invalidatePreview(); setter(event.target.value); }} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { invalidatePreview(); setShowLogo((current) => !current); }} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${showLogo ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}><span>{designT("showLogo")}</span>{showLogo && <Check className="h-3.5 w-3.5" />}</button>
              <button type="button" onClick={() => { invalidatePreview(); setShowServices((current) => !current); }} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${showServices ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}><span>{designT("showServices")}</span>{showServices && <Check className="h-3.5 w-3.5" />}</button>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">{designT("visibleInfo")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  [designT("showProfessional"), showProfessional, () => setShowProfessional((current) => !current), false],
                  [designT("showLocationName"), showLocationName, () => setShowLocationName((current) => !current), false],
                  [designT("showAddress"), showAddress, () => setShowAddress((current) => !current), !selectedAddress],
                ] as const).map(([label, active, toggle, disabled]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => { invalidatePreview(); toggle(); }}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border"}`}
                  >
                    <span>{label}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
              {options.isIndividualPlan && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{designT("individualDefaultHint")}</p>}
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">{designT("ctaMode")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => changeCtaMode("LINK_STICKER")} className={`rounded-xl border-2 px-3 py-3 text-left text-xs font-black transition ${ctaMode === "LINK_STICKER" ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15 bg-white"}`}>
                  {designT("linkSticker")}
                </button>
                <button type="button" onClick={() => changeCtaMode("BIO")} className={`rounded-xl border-2 px-3 py-3 text-left text-xs font-black transition ${ctaMode === "BIO" ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15 bg-white"}`}>
                  {designT("bioLink")}
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{ctaMode === "LINK_STICKER" ? designT("linkStickerHint") : designT("bioLinkHint")}</p>
            </div>
            <label className="block text-xs font-medium">{designT("cta")}
              <input maxLength={90} value={callToAction} onChange={(event) => { invalidatePreview(); setCallToAction(event.target.value); }} className={inputClass} />
            </label>
          </div>
        </details>

        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={loading || !locationId || (!allServices && serviceIds.length === 0) || !headline.trim()} onClick={() => void generateStory()} className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-[#7C3AED] px-4 py-3.5 text-sm font-black text-white shadow-[4px_4px_0_#171717] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#171717] disabled:translate-y-0 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {loading ? t("calculating") : t("create")}
        </button>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-foreground bg-[#171717] text-white shadow-[6px_6px_0_#FF5C8A] xl:sticky xl:top-6">
        <div className="flex items-center justify-between gap-3 border-b border-white/15 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><ImagePlus className="h-4 w-4 text-[#C4A2FF]" /></span>
            <div><h3 className="font-black">{t("preview")}</h3><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{t("format")}</p></div>
          </div>
          {previewUrl ? <span className="rounded-full bg-[#7EE2B8] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#171717]">{t("ready")}</span> : <span className="h-2.5 w-2.5 rounded-full bg-[#FFD84D] shadow-[0_0_0_5px_rgba(255,216,77,.12)]" />}
        </div>

        <div className="relative flex min-h-[640px] items-center justify-center overflow-hidden bg-[#242128] p-5 [background-image:radial-gradient(rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:18px_18px] sm:p-8">
          <div className="pointer-events-none absolute left-5 top-7 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/45">{brand.name}</div>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Vista previa de la historia" className="relative max-h-[680px] w-auto rounded-[1.4rem] border-[6px] border-black shadow-[0_30px_80px_rgba(0,0,0,.55)]" />
          ) : (
            <div
              className={`relative aspect-[9/16] w-full max-w-[330px] overflow-hidden border-[6px] border-black p-6 shadow-[0_30px_80px_rgba(0,0,0,.55)] ${template === "BOLD" ? "rounded-md" : template === "EDITORIAL" ? "rounded-[2rem]" : "rounded-[1.4rem]"}`}
              style={{
                backgroundColor: canvasColor,
                color: storyTextColor,
                backgroundImage: backgroundMode === "ART"
                  ? template === "BOLD"
                    ? "linear-gradient(115deg, " + accentColor + " 0 16%, transparent 16% 72%, " + secondaryColor + " 72%)"
                    : template === "EDITORIAL"
                      ? "radial-gradient(ellipse at 50% -5%, " + accentColor + " 0 22%, transparent 23%), radial-gradient(circle at 15% 85%, " + secondaryColor + " 0 18%, transparent 19%)"
                      : "radial-gradient(circle at 90% 10%, " + secondaryColor + " 0 17%, transparent 18%), radial-gradient(circle at 8% 78%, " + accentColor + " 0 21%, transparent 22%)"
                  : "none",
              }}
            >
              <div className="absolute -right-10 top-[28%] h-28 w-28 rotate-12 border-[16px] opacity-75" style={{ borderColor: accentColor }} />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between">
                  {showLogo ? (
                    <div className="flex items-center gap-2">
                      {brand.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logoUrl} alt="" className="h-9 w-9 rounded-full border border-black/10 bg-white object-contain p-0.5 shadow-lg" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white shadow-lg" style={{ backgroundColor: accentColor }}>{brandInitial}</span>
                      )}
                      <span className="max-w-[130px] truncate text-[10px] font-black uppercase tracking-[0.14em]">{brand.name}</span>
                    </div>
                  ) : <span />}
                  <span className="rounded-full border border-current/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{t("nextAvailable")}</span>
                </div>
                <div className={`my-auto ${template === "EDITORIAL" ? "text-center" : ""}`}>
                  {showProfessional && <span className="inline-block rotate-[-2deg] rounded px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white" style={{ backgroundColor: accentColor }}>{selectedStaffName}</span>}
                  <p className={`max-w-[260px] font-black leading-[0.9] tracking-[-0.065em] ${showProfessional ? "mt-5" : ""} ${showSchedule ? "text-[2rem]" : "text-[2.4rem]"} ${template === "EDITORIAL" ? "mx-auto" : ""}`}>{headline || t("defaultHeadline")}</p>
                  {showServices && <p className={`mt-5 max-w-[230px] text-xs font-bold leading-5 opacity-65 ${template === "EDITORIAL" ? "mx-auto" : ""}`}>{selectedServiceNames}</p>}
                  {showSchedule && featuredOpportunity && (
                    <div className="mt-5 rounded-xl border border-current/15 bg-white/55 p-2.5 text-left">
                      <p className="text-[8px] font-black capitalize">{featuredOpportunity.dateLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {featuredOpportunity.times.slice(0, 4).map((time) => <span key={time} className="rounded-md px-1.5 py-1 text-[8px] font-black text-white" style={{ backgroundColor: accentColor }}>{time}</span>)}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="h-px w-full bg-current opacity-20" />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="max-w-[130px] text-[8px] font-black uppercase tracking-[0.12em] opacity-55">{selectedPlaceLabel}</span>
                    {ctaMode === "LINK_STICKER" ? (
                      <span className="flex flex-col items-end gap-1.5">
                        <span className="text-[9px] font-black">{callToAction}</span>
                        <span className="flex h-10 w-28 items-center justify-center rounded-full border border-dashed border-current/40 bg-white/35 text-[7px] font-black uppercase tracking-wider">{designT("stickerArea")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-black text-white" style={{ backgroundColor: accentColor }}>{callToAction}<ArrowRight className="h-3 w-3" /></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2 border-t border-white/15 bg-[#171717] p-4 sm:grid-cols-3">
          <button type="button" disabled={!previewBlob} onClick={downloadStory} className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-[#171717] transition hover:-translate-y-0.5 disabled:opacity-25"><Download className="h-4 w-4" />{t("download")}</button>
          <button type="button" disabled={!previewBlob} onClick={() => void shareStory()} className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-3 text-sm font-black transition hover:bg-white/10 disabled:opacity-25"><Share2 className="h-4 w-4" />{t("share")}</button>
          <button type="button" disabled={!bookingLink && !fallbackBookingPath} onClick={copyBookingLink} className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-3 text-sm font-black transition hover:bg-white/10 disabled:opacity-25">{copied ? <Check className="h-4 w-4 text-[#7EE2B8]" /> : <Copy className="h-4 w-4" />}{copied ? t("copied") : t("copyLink")}</button>
        </div>
      </section>
        </div>
      </section>

      {insights && insights.recent.length > 0 && (
        <section className="rounded-[1.75rem] border-2 border-foreground bg-white p-5 shadow-[5px_5px_0_#FFD84D] sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD84D] text-sm font-black">03</span><h2 className="text-xl font-black tracking-tight">{t("historyTitle")}</h2></div>
          <div className="mt-5 space-y-2">
            {insights.recent.map((campaign) => (
              <div key={campaign.id} className="grid gap-3 rounded-2xl border-2 border-foreground/10 bg-[#F8F5ED] p-4 text-sm transition hover:border-foreground/25 sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)] sm:items-center sm:gap-4">
                <div><p className="font-black">{campaign.headline}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(campaign.createdAt).toLocaleDateString(locale)}{campaign.locationName ? ` · ${campaign.locationName}` : ""}{campaign.staffName ? ` · ${campaign.staffName}` : ""}</p></div>
                <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-muted-foreground">{t("visitsValue", { count: campaign.visits })}</span>
                <span className="w-fit rounded-full bg-[#E9D8FF] px-3 py-1.5 text-xs font-bold text-[#5B21B6]">{t("bookingsValue", { count: campaign.bookings })}</span>
                <span className="text-sm font-black text-emerald-700">{currency.format(campaign.revenue)}</span>
                <button type="button" disabled={loading || !campaign.locationId || campaign.serviceIds.length === 0} onClick={() => reuseCampaign(campaign)} className="rounded-full border-2 border-foreground px-3 py-2 text-xs font-black transition hover:bg-[#171717] hover:text-white disabled:opacity-40">{t("reuse")}</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
