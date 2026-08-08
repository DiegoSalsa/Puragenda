"use client";

import { flushSync } from "react-dom";
import { useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import {
  Archive,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Download,
  ImagePlus,
  LayoutTemplate,
  Link2,
  Loader2,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getStoryVisibilityDefaults } from "@/core/story-visibility";
import { AvailabilityStoryImage } from "@/server/stories/availability-story-image";
import type { AvailabilityStoryData } from "@/server/services/availability-story.service";
import type {
  AvailabilityStoryRequest,
  StoryObjective,
  StoryTemplate,
} from "@/server/validations/availability-story";

interface StoryOpportunity {
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
  daysAway: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  reason: string;
  headline: string;
}

interface StoryPreset {
  id: string;
  name: string;
  configuration: AvailabilityStoryRequest;
  isDefault: boolean;
  updatedAt: string;
}

interface StoryOptions {
  canChooseStaff: boolean;
  ownStaffId: string | null;
  isIndividualPlan: boolean;
  hasMultipleLocations: boolean;
  businessAddress: string | null;
  locations: Array<{
    id: string;
    name: string;
    slug: string;
    address: string | null;
  }>;
  services: Array<{
    id: string;
    name: string;
    duration: number;
    locationIds: string[];
    staffIds: string[];
  }>;
  staff: Array<{ id: string; name: string; locationIds: string[] }>;
  opportunities: StoryOpportunity[];
  presets: StoryPreset[];
}

interface StoryInsights {
  totals: {
    generated: number;
    visits: number;
    bookings: number;
    revenue: number;
    downloads: number;
    shares: number;
    copies: number;
    conversionRate: number;
  };
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
    copies: number;
    status: "PUBLISHED" | "ARCHIVED";
    objective: StoryObjective;
    locationId: string | null;
    staffId: string | null;
    serviceIds: string[];
    targetDate: string | null;
    template: StoryTemplate;
    configuration: AvailabilityStoryRequest | null;
  }>;
}

interface StoryBrand {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}

type MobilePanel = "CONTENT" | "DESIGN" | "PREVIEW";
type StudioMode = "QUICK" | "ADVANCED";
type AnalyticsRange = "7" | "30" | "90" | "ALL";

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) =>
        value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function StoryTemplateThumbnail({
  template,
  data,
  accentColor,
  canvasColor,
  productLogoUrl,
}: {
  template: StoryTemplate;
  data: AvailabilityStoryData | null;
  accentColor: string;
  canvasColor: string;
  productLogoUrl: string;
}) {
  if (data) {
    return (
      <span
        className="relative block h-[134px] w-[76px] shrink-0 overflow-hidden rounded-[0.8rem] border-2 border-foreground bg-black shadow-[2px_3px_0_#171717]"
        aria-hidden="true"
      >
        <span className="absolute left-0 top-0 block h-[1920px] w-[1080px] origin-top-left scale-[.07]">
          <AvailabilityStoryImage
            data={{ ...data, template }}
            productLogoUrl={productLogoUrl}
          />
        </span>
      </span>
    );
  }

  const bold = template === "BOLD";
  const editorial = template === "EDITORIAL";
  const minimal = template === "MINIMAL";
  const framed = template === "FRAME";
  const foreground = bold ? "#171717" : accentColor;
  const background = bold ? accentColor : canvasColor;

  return (
    <span
      className="relative block h-[134px] w-[76px] shrink-0 overflow-hidden rounded-[0.8rem] border-2 border-foreground shadow-[2px_3px_0_#171717]"
      style={{ background }}
      aria-hidden="true"
    >
      {template === "AURORA" && (
        <>
          <span
            className="absolute -right-4 -top-3 h-12 w-12 rounded-full opacity-70"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className="absolute -bottom-4 -left-4 h-14 w-14 rounded-full opacity-35"
            style={{ backgroundColor: accentColor }}
          />
        </>
      )}
      {framed && (
        <span
          className="absolute inset-2 rounded-lg border-[3px]"
          style={{ borderColor: accentColor }}
        />
      )}
      <span
        className={`absolute left-3 right-3 top-3 flex items-center gap-1 ${editorial || minimal ? "justify-center" : ""}`}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: foreground }}
        />
        <span
          className="h-1.5 w-7 rounded-full opacity-70"
          style={{ backgroundColor: foreground }}
        />
      </span>
      <span
        className={`absolute left-3 right-3 top-10 space-y-1 ${editorial || minimal ? "text-center" : ""}`}
      >
        <span
          className={`block rounded-sm ${bold ? "h-3.5" : "h-2.5"} ${minimal ? "mx-auto w-9" : "w-full"}`}
          style={{ backgroundColor: foreground }}
        />
        <span
          className={`block rounded-sm ${bold ? "h-3.5 w-4/5" : "h-2 w-3/4"} ${editorial || minimal ? "mx-auto" : ""}`}
          style={{ backgroundColor: foreground, opacity: minimal ? 0.55 : 1 }}
        />
      </span>
      <span className="absolute bottom-5 left-3 right-3 space-y-1.5">
        {[0, 1, 2].map((row) => (
          <span
            key={row}
            className={`flex h-3 items-center rounded ${bold ? "border border-black/40 bg-white/70" : "bg-white/80"} px-1`}
          >
            <span
              className="h-1 rounded-full"
              style={{
                width: `${72 - row * 10}%`,
                backgroundColor: foreground,
                opacity: 0.6,
              }}
            />
          </span>
        ))}
      </span>
    </span>
  );
}

export function StoryGenerator({
  options,
  brand,
  insights,
  currencyCode,
}: {
  businessSlug: string;
  options: StoryOptions;
  brand: StoryBrand;
  insights: StoryInsights | null;
  currencyCode: string;
}) {
  const t = useTranslations("dashboard.stories");
  const designT = useTranslations("dashboard.storyDesign");
  const locale = useLocale();
  const visibilityDefaults = getStoryVisibilityDefaults(options);
  const defaultPreset = options.presets.find(
    (preset) => preset.isDefault,
  )?.configuration;

  const [studioMode, setStudioMode] = useState<StudioMode>("QUICK");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("CONTENT");
  const [locationId, setLocationId] = useState(
    defaultPreset?.locationId ?? options.locations[0]?.id ?? "",
  );
  const [staffId, setStaffId] = useState<string | null>(
    defaultPreset?.staffId ??
      (options.canChooseStaff ? null : options.ownStaffId),
  );
  const [allServices, setAllServices] = useState(
    defaultPreset?.allServices ?? true,
  );
  const [serviceIds, setServiceIds] = useState<string[]>(
    defaultPreset?.serviceIds ?? [],
  );
  const [range, setRange] = useState<AvailabilityStoryRequest["range"]>(
    defaultPreset?.range ?? "NEXT_AVAILABLE",
  );
  const [targetDate, setTargetDate] = useState(defaultPreset?.targetDate ?? "");
  const [endDate, setEndDate] = useState(defaultPreset?.endDate ?? "");
  const [excludedDates, setExcludedDates] = useState<string[]>(
    defaultPreset?.excludedDates ?? [],
  );
  const [excludeDateInput, setExcludeDateInput] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<
    AvailabilityStoryRequest["selectedSlots"]
  >(defaultPreset?.selectedSlots ?? []);
  const [objective, setObjective] = useState<StoryObjective>(
    defaultPreset?.objective ?? "FILL_SLOTS",
  );
  const [template, setTemplate] = useState<StoryTemplate>(
    defaultPreset?.template ?? "AURORA",
  );
  const [headline, setHeadline] = useState(
    defaultPreset?.headline ?? t("defaultHeadline"),
  );
  const [backgroundMode, setBackgroundMode] = useState<
    AvailabilityStoryRequest["backgroundMode"]
  >(defaultPreset?.backgroundMode ?? "ART");
  const [accentColor, setAccentColor] = useState(
    defaultPreset?.accentColor ?? brand.primaryColor,
  );
  const [secondaryColor, setSecondaryColor] = useState(
    defaultPreset?.secondaryColor ?? brand.secondaryColor,
  );
  const [canvasColor, setCanvasColor] = useState(
    defaultPreset?.canvasColor ?? brand.backgroundColor,
  );
  const [storyTextColor, setStoryTextColor] = useState(
    defaultPreset?.storyTextColor ?? "#171717",
  );
  const [artIntensity, setArtIntensity] = useState(
    defaultPreset?.artIntensity ?? 0.38,
  );
  const [fontStyle, setFontStyle] = useState<
    AvailabilityStoryRequest["fontStyle"]
  >(defaultPreset?.fontStyle ?? "MODERN");
  const [logoFit, setLogoFit] = useState<AvailabilityStoryRequest["logoFit"]>(
    defaultPreset?.logoFit ?? "CONTAIN",
  );
  const [showLogo, setShowLogo] = useState(defaultPreset?.showLogo ?? true);
  const [showServices, setShowServices] = useState(
    defaultPreset?.showServices ?? true,
  );
  const [showSchedule, setShowSchedule] = useState(
    defaultPreset?.showSchedule ?? true,
  );
  const [showProfessional, setShowProfessional] = useState(
    defaultPreset?.showProfessional ?? visibilityDefaults.showProfessional,
  );
  const [showLocationName, setShowLocationName] = useState(
    defaultPreset?.showLocationName ?? visibilityDefaults.showLocationName,
  );
  const [showAddress, setShowAddress] = useState(
    defaultPreset?.showAddress ?? visibilityDefaults.showAddress,
  );
  const [ctaMode, setCtaMode] = useState<AvailabilityStoryRequest["ctaMode"]>(
    defaultPreset?.ctaMode ?? "LINK_STICKER",
  );
  const [callToAction, setCallToAction] = useState(
    defaultPreset?.callToAction ?? designT("stickerDefaultCta"),
  );
  const [backgroundPhoto, setBackgroundPhoto] = useState<string | null>(null);
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [showVariants, setShowVariants] = useState(false);
  const [previewData, setPreviewData] = useState<AvailabilityStoryData | null>(
    null,
  );
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignFingerprint, setCampaignFingerprint] = useState("");
  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [presets, setPresets] = useState<StoryPreset[]>(options.presets);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [productLogoDataUrl, setProductLogoDataUrl] = useState<string | null>(
    null,
  );
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("30");
  const [analyticsNow] = useState(() => Date.now());
  const [showMetrics, setShowMetrics] = useState(false);
  const storyNodeRef = useRef<HTMLDivElement>(null);
  const productLogoPromiseRef = useRef<Promise<string> | null>(null);

  const selectedLocation = options.locations.find(
    (location) => location.id === locationId,
  );
  const availableStaff = useMemo(
    () =>
      options.staff.filter((staff) => staff.locationIds.includes(locationId)),
    [locationId, options.staff],
  );
  const availableServices = useMemo(
    () =>
      options.services.filter(
        (service) =>
          service.locationIds.includes(locationId) &&
          (!staffId ||
            service.staffIds.length === 0 ||
            service.staffIds.includes(staffId)),
      ),
    [locationId, options.services, staffId],
  );

  const configuration = useMemo<AvailabilityStoryRequest>(
    () => ({
      locationId,
      staffId,
      serviceIds,
      allServices,
      range,
      ...(targetDate ? { targetDate } : {}),
      ...(endDate ? { endDate } : {}),
      excludedDates,
      selectedSlots,
      objective,
      template,
      headline,
      backgroundMode,
      accentColor,
      secondaryColor,
      canvasColor,
      storyTextColor,
      artIntensity,
      fontStyle,
      logoFit,
      showLogo,
      showServices,
      showSchedule,
      showProfessional,
      showLocationName,
      showAddress,
      ctaMode,
      callToAction,
    }),
    [
      accentColor,
      allServices,
      artIntensity,
      backgroundMode,
      callToAction,
      canvasColor,
      ctaMode,
      endDate,
      excludedDates,
      fontStyle,
      headline,
      locationId,
      logoFit,
      objective,
      range,
      secondaryColor,
      selectedSlots,
      serviceIds,
      showAddress,
      showLocationName,
      showLogo,
      showProfessional,
      showSchedule,
      showServices,
      staffId,
      storyTextColor,
      targetDate,
      template,
    ],
  );

  const fingerprint = JSON.stringify(configuration);
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode, locale],
  );

  const renderData = useMemo(() => {
    if (!previewData) return null;
    const chosen = new Map(
      selectedSlots.map((slot) => [`${slot.date}:${slot.time}`, true]),
    );
    return {
      ...previewData,
      headline,
      template,
      objective,
      backgroundMode,
      primaryColor: accentColor,
      secondaryColor,
      backgroundColor: canvasColor,
      textColor: storyTextColor,
      artIntensity,
      fontStyle,
      logoFit,
      showLogo,
      showServices,
      showSchedule,
      showProfessional,
      showLocationName,
      showAddress,
      ctaMode,
      callToAction,
      serviceNames: showServices ? previewData.serviceNames : [],
      days:
        selectedSlots.length > 0
          ? previewData.days
              .map((day) => ({
                ...day,
                times: day.times.filter((time) =>
                  chosen.has(`${day.date}:${time}`),
                ),
              }))
              .filter((day) => day.times.length > 0)
          : previewData.days,
    } satisfies AvailabilityStoryData;
  }, [
    accentColor,
    artIntensity,
    backgroundMode,
    callToAction,
    canvasColor,
    ctaMode,
    fontStyle,
    headline,
    logoFit,
    objective,
    previewData,
    secondaryColor,
    selectedSlots,
    showAddress,
    showLocationName,
    showLogo,
    showProfessional,
    showSchedule,
    showServices,
    storyTextColor,
    template,
  ]);

  const variantTemplates = useMemo(() => {
    const templates: StoryTemplate[] = [
      "AURORA",
      "EDITORIAL",
      "BOLD",
      "MINIMAL",
      "FRAME",
    ];
    const start = templates.indexOf(template);
    return [
      templates[start],
      templates[(start + 1) % templates.length],
      templates[(start + 2) % templates.length],
    ];
  }, [template]);

  const contrast = contrastRatio(storyTextColor, canvasColor);
  const selectedServiceNames = allServices
    ? t("allServices")
    : options.services
        .filter((service) => serviceIds.includes(service.id))
        .map((service) => service.name)
        .join(", ");

  const headlineSuggestions = useMemo<Record<StoryObjective, string[]>>(
    () => ({
      FILL_SLOTS: [t("headlineFill1"), t("headlineFill2")],
      LAST_MINUTE: [t("headlineLastMinute1"), t("headlineLastMinute2")],
      PROMOTE_SERVICE: [t("headlineService1"), t("headlineService2")],
      CANCELLATION: [t("headlineCancellation1"), t("headlineCancellation2")],
    }),
    [t],
  );

  const filteredCampaigns = useMemo(() => {
    if (!insights) return [];
    const cutoff =
      analyticsRange === "ALL"
        ? null
        : analyticsNow - Number(analyticsRange) * 86_400_000;
    return insights.recent.filter(
      (campaign) => !cutoff || new Date(campaign.createdAt).getTime() >= cutoff,
    );
  }, [analyticsNow, analyticsRange, insights]);

  const filteredTotals = useMemo(() => {
    if (!insights)
      return {
        generated: 0,
        visits: 0,
        bookings: 0,
        revenue: 0,
        downloads: 0,
        shares: 0,
        copies: 0,
        conversionRate: 0,
      };
    if (analyticsRange === "ALL") return insights.totals;
    const published = filteredCampaigns.filter(
      (campaign) => campaign.status === "PUBLISHED",
    );
    const totals = published.reduce(
      (result, campaign) => ({
        generated: result.generated + 1,
        visits: result.visits + campaign.visits,
        bookings: result.bookings + campaign.bookings,
        revenue: result.revenue + campaign.revenue,
        downloads: result.downloads + campaign.downloads,
        shares: result.shares + campaign.shares,
        copies: result.copies + campaign.copies,
        conversionRate: 0,
      }),
      {
        generated: 0,
        visits: 0,
        bookings: 0,
        revenue: 0,
        downloads: 0,
        shares: 0,
        copies: 0,
        conversionRate: 0,
      },
    );
    totals.conversionRate =
      totals.visits > 0 ? totals.bookings / totals.visits : 0;
    return totals;
  }, [analyticsRange, filteredCampaigns, insights]);

  const servicePerformance = useMemo(() => {
    const byService = new Map<
      string,
      {
        name: string;
        visits: number;
        bookings: number;
        revenue: number;
        campaigns: number;
      }
    >();
    for (const campaign of filteredCampaigns.filter(
      (entry) => entry.status === "PUBLISHED",
    )) {
      for (const serviceId of campaign.serviceIds) {
        const service = options.services.find(
          (entry) => entry.id === serviceId,
        );
        if (!service) continue;
        const current = byService.get(serviceId) ?? {
          name: service.name,
          visits: 0,
          bookings: 0,
          revenue: 0,
          campaigns: 0,
        };
        current.visits += campaign.visits;
        current.bookings += campaign.bookings;
        current.revenue += campaign.revenue;
        current.campaigns += 1;
        byService.set(serviceId, current);
      }
    }
    return [...byService.values()]
      .map((entry) => ({
        ...entry,
        conversion: entry.visits > 0 ? entry.bookings / entry.visits : 0,
      }))
      .sort(
        (left, right) =>
          right.conversion - left.conversion || right.revenue - left.revenue,
      )
      .slice(0, 3);
  }, [filteredCampaigns, options.services]);

  const formValid = Boolean(
    locationId &&
    headline.trim() &&
    (allServices || serviceIds.length > 0) &&
    (range !== "CUSTOM" || (targetDate && endDate)),
  );

  async function requestStory(publish: boolean, input = configuration) {
    const response = await fetch(
      `/api/dashboard/stories${publish ? "?publish=1" : ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      data?: AvailabilityStoryData;
      campaignId?: string | null;
      bookingUrl?: string;
    };
    if (!response.ok || !body.data)
      throw new Error(body.error || t("generateError"));
    return body as {
      data: AvailabilityStoryData;
      campaignId: string | null;
      bookingUrl: string;
    };
  }

  async function generatePreview(input = configuration) {
    if (!formValid && input === configuration) return;
    setLoading(true);
    setError("");
    try {
      const result = await requestStory(false, input);
      setPreviewData(result.data);
      setSelectedSlots(input.selectedSlots ?? []);
      setMobilePanel("PREVIEW");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("generateError"));
    } finally {
      setLoading(false);
    }
  }

  async function ensurePublished() {
    if (
      campaignId &&
      bookingLink &&
      campaignFingerprint === fingerprint &&
      renderData
    ) {
      return { campaignId, bookingLink, data: renderData };
    }
    setPublishing(true);
    const result = await requestStory(true);
    flushSync(() => {
      setPreviewData(result.data);
      setCampaignId(result.campaignId);
      setCampaignFingerprint(fingerprint);
      setBookingLink(result.bookingUrl);
    });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    setPublishing(false);
    return {
      campaignId: result.campaignId,
      bookingLink: result.bookingUrl,
      data: result.data,
    };
  }

  async function ensureProductLogoEmbedded() {
    if (productLogoDataUrl) return;
    if (!productLogoPromiseRef.current) {
      productLogoPromiseRef.current = fetch("/icon-512x512.png")
        .then((response) => {
          if (!response.ok) throw new Error(t("generateError"));
          return response.blob();
        })
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error(t("generateError")));
              reader.onload = () => resolve(String(reader.result));
              reader.readAsDataURL(blob);
            }),
        );
    }
    const dataUrl = await productLogoPromiseRef.current;
    flushSync(() => setProductLogoDataUrl(dataUrl));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }

  async function captureStory() {
    await ensureProductLogoEmbedded();
    const node = storyNodeRef.current;
    if (!node) throw new Error(t("generateError"));
    await document.fonts.ready;
    const images = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : image.decode().catch(() => undefined),
      ),
    );
    const blob = await toBlob(node, {
      width: 1080,
      height: 1920,
      pixelRatio: 1,
      cacheBust: true,
    });
    if (!blob) throw new Error(t("generateError"));
    return blob;
  }

  async function recordActivity(
    id: string | null,
    activity: "download" | "share" | "copy" | "archive",
  ) {
    if (!id) return;
    await fetch(`/api/dashboard/stories/${id}/activity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity }),
    }).catch(() => undefined);
  }

  async function downloadStory() {
    setError("");
    try {
      const published = await ensurePublished();
      const blob = await captureStory();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `historia-${new Date().toISOString().slice(0, 10)}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      await recordActivity(published.campaignId, "download");
    } catch (reason) {
      setPublishing(false);
      setError(reason instanceof Error ? reason.message : t("generateError"));
    }
  }

  async function shareStory() {
    setError("");
    try {
      const published = await ensurePublished();
      const blob = await captureStory();
      const file = new File(
        [blob],
        `historia-${new Date().toISOString().slice(0, 10)}.png`,
        { type: "image/png" },
      );
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        try {
          await navigator.share({
            files: [file],
            title: headline,
            url: published.bookingLink,
          });
          await recordActivity(published.campaignId, "share");
          return;
        } catch (reason) {
          if (reason instanceof DOMException && reason.name === "AbortError")
            return;
        }
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `historia-${new Date().toISOString().slice(0, 10)}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      await recordActivity(published.campaignId, "download");
    } catch (reason) {
      setPublishing(false);
      setError(reason instanceof Error ? reason.message : t("generateError"));
    }
  }

  async function copyBookingLink() {
    setError("");
    try {
      const published = await ensurePublished();
      await navigator.clipboard.writeText(published.bookingLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      await recordActivity(published.campaignId, "copy");
    } catch (reason) {
      setPublishing(false);
      setError(reason instanceof Error ? reason.message : t("copyError"));
    }
  }

  function applyConfiguration(input: AvailabilityStoryRequest) {
    setLocationId(input.locationId);
    setStaffId(input.staffId ?? null);
    setServiceIds(input.serviceIds);
    setAllServices(input.allServices);
    setRange(input.range);
    setTargetDate(input.targetDate ?? "");
    setEndDate(input.endDate ?? "");
    setExcludedDates(input.excludedDates ?? []);
    setSelectedSlots(input.selectedSlots ?? []);
    setObjective(input.objective);
    setTemplate(input.template);
    setHeadline(input.headline);
    setBackgroundMode(input.backgroundMode);
    setAccentColor(input.accentColor);
    setSecondaryColor(input.secondaryColor);
    setCanvasColor(input.canvasColor);
    setStoryTextColor(input.storyTextColor);
    setArtIntensity(input.artIntensity);
    setFontStyle(input.fontStyle);
    setLogoFit(input.logoFit);
    setShowLogo(input.showLogo);
    setShowServices(input.showServices);
    setShowSchedule(input.showSchedule);
    setShowProfessional(input.showProfessional);
    setShowLocationName(input.showLocationName);
    setShowAddress(input.showAddress);
    setCtaMode(input.ctaMode);
    setCallToAction(input.callToAction ?? designT("stickerDefaultCta"));
    setCampaignId(null);
    setBookingLink(null);
    setPreviewData(null);
  }

  async function applyOpportunity(opportunity: StoryOpportunity) {
    const next: AvailabilityStoryRequest = {
      ...configuration,
      locationId: opportunity.locationId,
      staffId: opportunity.staffId,
      serviceIds: [opportunity.serviceId],
      allServices: false,
      range: "CUSTOM",
      targetDate: opportunity.date,
      endDate: opportunity.date,
      excludedDates: [],
      selectedSlots: [],
      headline: opportunity.headline,
      objective: opportunity.daysAway <= 2 ? "LAST_MINUTE" : "FILL_SLOTS",
    };
    applyConfiguration(next);
    setStudioMode("QUICK");
    await generatePreview(next);
  }

  async function savePreset() {
    if (presetName.trim().length < 2) return;
    setSavingPreset(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/stories/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          configuration,
          isDefault: presets.length === 0,
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        preset?: StoryPreset;
      };
      if (!response.ok || !body.preset)
        throw new Error(body.error || t("presetError"));
      const preset = {
        ...body.preset,
        updatedAt: new Date(body.preset.updatedAt).toISOString(),
      };
      setPresets((current) => [
        preset,
        ...current.filter((entry) => entry.id !== preset.id),
      ]);
      setPresetName("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("presetError"));
    } finally {
      setSavingPreset(false);
    }
  }

  async function deletePreset(id: string) {
    const response = await fetch(`/api/dashboard/stories/presets/${id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setPresets((current) => current.filter((preset) => preset.id !== id));
  }

  function changeLocation(nextLocationId: string) {
    setLocationId(nextLocationId);
    const nextServices = options.services.filter((service) =>
      service.locationIds.includes(nextLocationId),
    );
    setServiceIds((current) =>
      current.filter((id) => nextServices.some((service) => service.id === id)),
    );
    if (
      staffId &&
      !options.staff.some(
        (staff) =>
          staff.id === staffId && staff.locationIds.includes(nextLocationId),
      )
    )
      setStaffId(null);
    setPreviewData(null);
  }

  function toggleSlot(date: string, time: string) {
    setSelectedSlots((current) => {
      const exists = current.some(
        (slot) => slot.date === date && slot.time === time,
      );
      return exists
        ? current.filter((slot) => slot.date !== date || slot.time !== time)
        : [...current, { date, time }];
    });
  }

  const inputClass =
    "mt-2 w-full rounded-xl border-2 border-foreground/15 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10";
  const panelClass =
    "rounded-[1.65rem] border-2 border-foreground bg-white p-5 shadow-[5px_5px_0_#E9D8FF] sm:p-6";

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 pb-28 lg:space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-foreground bg-[#E9D8FF] p-6 shadow-[7px_7px_0_#171717] sm:p-9 lg:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[34px] border-[#FF5C8A]/70" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-[#FFD84D] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]">
              <Sparkles className="h-3.5 w-3.5" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 max-w-2xl text-[2.55rem] font-black leading-[0.92] tracking-[-0.06em] sm:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-foreground/65">
              {t("subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("story-studio")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-[#171717] px-6 py-4 text-sm font-black text-white shadow-[4px_4px_0_#7C3AED] transition hover:-translate-y-0.5"
          >
            {t("create")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="rounded-[1.5rem] border-2 border-foreground/10 bg-white p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setShowMetrics((current) => !current)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 font-black">
            <BarChart3 className="h-4 w-4 text-[#7C3AED]" />
            {t("metricsTitle")}
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            {(filteredTotals.conversionRate * 100).toFixed(1)}%{" "}
            {t("conversionShort")}
            <ChevronDown
              className={`h-4 w-4 transition ${showMetrics ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        <div
          className={`${showMetrics ? "grid" : "hidden"} mt-4 gap-3 sm:grid-cols-4 lg:grid`}
        >
          {[
            [t("generatedMetric"), filteredTotals.generated],
            [t("visitsMetric"), filteredTotals.visits],
            [t("bookingsMetric"), filteredTotals.bookings],
            [t("revenueMetric"), currency.format(filteredTotals.revenue)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-[#F8F5ED] p-4">
              <p className="text-2xl font-black">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED]">
              01 · {t("opportunityEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {t("opportunityTitle")}
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            {t("opportunityHint")}
          </p>
        </div>
        {options.opportunities.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {options.opportunities.map((opportunity, index) => (
              <article
                key={opportunity.id}
                className={`group rounded-[1.5rem] border-2 border-foreground p-5 transition hover:-translate-y-1 ${index === 0 ? "bg-[#FFD8E6] shadow-[5px_5px_0_#171717]" : "bg-white"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${opportunity.urgency === "HIGH" ? "bg-[#FF5C8A] text-white" : opportunity.source === "EXPLICIT" ? "bg-[#FFD84D]" : "bg-[#E9D8FF] text-[#5B21B6]"}`}
                  >
                    {opportunity.source === "EXPLICIT"
                      ? t("manualOpening")
                      : opportunity.urgency === "HIGH"
                        ? t("urgent")
                        : t("recurringOpening")}
                  </span>
                  <span className="text-sm font-black text-emerald-700">
                    {currency.format(opportunity.potentialRevenue)}
                  </span>
                </div>
                <p className="mt-5 text-xs font-black capitalize text-[#7C3AED]">
                  {opportunity.dateLabel}
                </p>
                <h3 className="mt-1 text-xl font-black">
                  {opportunity.serviceName}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {opportunity.reason}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {opportunity.times.slice(0, 5).map((time) => (
                    <span
                      key={time}
                      className="rounded-lg border border-foreground/10 bg-white px-2 py-1 text-xs font-bold"
                    >
                      {time}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void applyOpportunity(opportunity)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-[#171717] px-4 py-3 text-sm font-black text-white transition group-hover:bg-[#7C3AED]"
                >
                  <WandSparkles className="h-4 w-4" />
                  {t("createFromOpportunity")}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-foreground/20 p-8 text-center text-sm text-muted-foreground">
            {t("noOpportunities")}
          </div>
        )}
      </section>

      <section id="story-studio" className="scroll-mt-20">
        <div className="mb-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF4F87]">
              02 · Studio
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {t("configure")}
            </h2>
          </div>
          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStudioMode("QUICK")}
              aria-pressed={studioMode === "QUICK"}
              className={`group relative rounded-[1.35rem] border-2 p-4 text-left transition ${studioMode === "QUICK" ? "border-foreground bg-[#171717] text-white shadow-[4px_4px_0_#7C3AED]" : "border-foreground/15 bg-white hover:border-foreground"}`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${studioMode === "QUICK" ? "bg-[#FFD84D] text-[#171717]" : "bg-[#F8F5ED] text-[#7C3AED]"}`}
                >
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-base font-black">
                    {t("quickMode")}
                    {studioMode === "QUICK" && (
                      <Check className="h-4 w-4 text-[#7EE2B8]" />
                    )}
                  </span>
                  <span
                    className={`mt-1 block text-xs leading-5 ${studioMode === "QUICK" ? "text-white/65" : "text-muted-foreground"}`}
                  >
                    {t("configureHint")}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {[t("contentTab"), t("period"), t("preview")].map(
                      (item) => (
                        <span
                          key={item}
                          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${studioMode === "QUICK" ? "bg-white/10" : "bg-[#F8F5ED]"}`}
                        >
                          {item}
                        </span>
                      ),
                    )}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("ADVANCED")}
              aria-pressed={studioMode === "ADVANCED"}
              className={`group relative rounded-[1.35rem] border-2 p-4 text-left transition ${studioMode === "ADVANCED" ? "border-foreground bg-[#7C3AED] text-white shadow-[4px_4px_0_#171717]" : "border-foreground/15 bg-white hover:border-foreground"}`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${studioMode === "ADVANCED" ? "bg-[#FFD8E6] text-[#9D174D]" : "bg-[#F8F5ED] text-[#FF4F87]"}`}
                >
                  <LayoutTemplate className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-base font-black">
                    {t("advancedMode")}
                    {studioMode === "ADVANCED" && (
                      <Check className="h-4 w-4 text-[#7EE2B8]" />
                    )}
                  </span>
                  <span
                    className={`mt-1 block text-xs leading-5 ${studioMode === "ADVANCED" ? "text-white/70" : "text-muted-foreground"}`}
                  >
                    {t("designHint")}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {[t("template"), designT("background"), t("fontStyle")].map(
                      (item) => (
                        <span
                          key={item}
                          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${studioMode === "ADVANCED" ? "bg-white/15" : "bg-[#F8F5ED]"}`}
                        >
                          {item}
                        </span>
                      ),
                    )}
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="sticky top-2 z-30 mb-4 grid grid-cols-3 rounded-full border-2 border-foreground bg-white p-1 shadow-lg xl:hidden">
          {(["CONTENT", "DESIGN", "PREVIEW"] as MobilePanel[]).map((panel) => (
            <button
              key={panel}
              type="button"
              onClick={() => {
                setMobilePanel(panel);
                if (panel === "DESIGN") setStudioMode("ADVANCED");
              }}
              className={`rounded-full px-2 py-2.5 text-xs font-black ${mobilePanel === panel ? "bg-[#7C3AED] text-white" : ""}`}
            >
              {panel === "CONTENT"
                ? t("contentTab")
                : panel === "DESIGN"
                  ? t("designTab")
                  : t("preview")}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,480px)_minmax(430px,1fr)]">
          <div
            className={`${mobilePanel === "CONTENT" || mobilePanel === "DESIGN" ? "block" : "hidden"} space-y-5 xl:block`}
          >
            <section
              className={`${panelClass} ${mobilePanel === "DESIGN" ? "hidden xl:block" : ""}`}
            >
              <div className="flex items-center gap-3 border-b-2 border-foreground/10 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] text-sm font-black text-white">
                  01
                </span>
                <div>
                  <h3 className="font-black">{t("contentTab")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedLocation?.name} · {selectedServiceNames}
                  </p>
                </div>
              </div>

              {options.hasMultipleLocations && (
                <label className="mt-5 block text-sm font-medium">
                  {t("location")}
                  <select
                    value={locationId}
                    onChange={(event) => changeLocation(event.target.value)}
                    className={inputClass}
                  >
                    {options.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="mt-5">
                <span className="text-sm font-medium">{t("service")}</span>
                <button
                  type="button"
                  onClick={() => setAllServices((current) => !current)}
                  className={`mt-2 flex w-full items-center justify-between rounded-xl border-2 px-3 py-3 text-sm font-bold ${allServices ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15"}`}
                >
                  <span>{t("allServices")}</span>
                  {allServices && <Check className="h-4 w-4" />}
                </button>
                {!allServices && (
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border-2 border-foreground/10 p-2">
                    {availableServices.map((service) => {
                      const active = serviceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() =>
                            setServiceIds((current) =>
                              active
                                ? current.filter((id) => id !== service.id)
                                : [...current, service.id],
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-[#E9D8FF] text-[#5B21B6]" : "hover:bg-[#F8F5ED]"}`}
                        >
                          <span>
                            {service.name}
                            <small className="ml-2 opacity-60">
                              {service.duration} min
                            </small>
                          </span>
                          {active && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {options.canChooseStaff &&
                !options.isIndividualPlan &&
                availableStaff.length > 1 && (
                  <label className="mt-5 block text-sm font-medium">
                    {t("staff")}
                    <select
                      value={staffId ?? ""}
                      onChange={(event) =>
                        setStaffId(event.target.value || null)
                      }
                      className={inputClass}
                    >
                      <option value="">{t("wholeTeam")}</option>
                      {availableStaff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

              <div className="mt-5">
                <span className="text-sm font-medium">
                  {designT("availabilityContent")}
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSchedule(true)}
                    className={`rounded-xl border-2 p-3 text-left ${showSchedule ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15"}`}
                  >
                    <span className="block text-sm font-black">
                      {designT("withSchedule")}
                    </span>
                    <span className="mt-1 block text-[10px] opacity-65">
                      {designT("withScheduleHint")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSchedule(false)}
                    className={`rounded-xl border-2 p-3 text-left ${!showSchedule ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15"}`}
                  >
                    <span className="block text-sm font-black">
                      {designT("withoutSchedule")}
                    </span>
                    <span className="mt-1 block text-[10px] opacity-65">
                      {designT("withoutScheduleHint")}
                    </span>
                  </button>
                </div>
              </div>

              {showSchedule && (
                <div className="mt-5">
                  <span className="text-sm font-medium">{t("period")}</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["TODAY", t("today")],
                        ["TOMORROW", t("tomorrow")],
                        ["NEXT_3_AVAILABLE", t("next3Available")],
                        ["NEXT_AVAILABLE", t("nextAvailable")],
                        ["NEXT_7", t("next7")],
                        ["CUSTOM", t("customRange")],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRange(value)}
                        className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold ${range === value ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {range === "CUSTOM" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs font-medium">
                        {t("startDate")}
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(event) =>
                            setTargetDate(event.target.value)
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-xs font-medium">
                        {t("endDate")}
                        <input
                          type="date"
                          value={endDate}
                          min={targetDate}
                          onChange={(event) => setEndDate(event.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="date"
                      value={excludeDateInput}
                      onChange={(event) =>
                        setExcludeDateInput(event.target.value)
                      }
                      className="min-w-0 flex-1 rounded-xl border-2 border-foreground/15 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!excludeDateInput}
                      onClick={() => {
                        setExcludedDates((current) =>
                          current.includes(excludeDateInput)
                            ? current
                            : [...current, excludeDateInput],
                        );
                        setExcludeDateInput("");
                      }}
                      className="rounded-xl border-2 border-foreground px-3 text-xs font-black"
                    >
                      {t("excludeDate")}
                    </button>
                  </div>
                  {excludedDates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {excludedDates.map((date) => (
                        <button
                          key={date}
                          type="button"
                          onClick={() =>
                            setExcludedDates((current) =>
                              current.filter((entry) => entry !== date),
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-[#F8F5ED] px-2 py-1 text-[10px] font-bold"
                        >
                          {date}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5">
                <span className="text-sm font-medium">{t("objective")}</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      "FILL_SLOTS",
                      "LAST_MINUTE",
                      "PROMOTE_SERVICE",
                      "CANCELLATION",
                    ] as StoryObjective[]
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setObjective(value);
                        setHeadline(headlineSuggestions[value][0]);
                      }}
                      className={`rounded-xl border-2 p-2.5 text-left text-xs font-black ${objective === value ? "border-[#FF4F87] bg-[#FFD8E6]" : "border-foreground/15"}`}
                    >
                      {t(`objective${value}`)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-5 block text-sm font-medium">
                {t("headline")}
                <input
                  maxLength={80}
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {headlineSuggestions[objective].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setHeadline(suggestion)}
                    className="rounded-full border border-foreground/15 bg-[#F8F5ED] px-3 py-1.5 text-[10px] font-bold"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {previewData?.days.length ? (
                <div className="mt-5 rounded-2xl bg-[#F8F5ED] p-4">
                  <p className="text-xs font-black">{t("chooseSlots")}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {t("chooseSlotsHint")}
                  </p>
                  <div className="mt-3 space-y-3">
                    {previewData.days.map((day) => (
                      <div key={day.date}>
                        <p className="text-[10px] font-black capitalize">
                          {day.label}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {day.times.map((time) => {
                            const active =
                              selectedSlots.length === 0 ||
                              selectedSlots.some(
                                (slot) =>
                                  slot.date === day.date && slot.time === time,
                              );
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  if (selectedSlots.length === 0)
                                    setSelectedSlots(
                                      previewData.days
                                        .flatMap((entry) =>
                                          entry.times.map((entryTime) => ({
                                            date: entry.date,
                                            time: entryTime,
                                          })),
                                        )
                                        .filter(
                                          (slot) =>
                                            slot.date !== day.date ||
                                            slot.time !== time,
                                        ),
                                    );
                                  else toggleSlot(day.date, time);
                                }}
                                className={`rounded-lg px-2 py-1 text-xs font-bold ${active ? "bg-[#7C3AED] text-white" : "bg-white text-muted-foreground"}`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={loading || !formValid}
                onClick={() => void generatePreview()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-[#7C3AED] px-4 py-3.5 text-sm font-black text-white shadow-[4px_4px_0_#171717] disabled:opacity-45"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {loading ? t("calculating") : t("refreshPreview")}
              </button>
            </section>

            <section
              style={{ display: studioMode === "QUICK" ? "none" : undefined }}
              className={`${panelClass} ${mobilePanel === "CONTENT" ? "hidden xl:block" : ""}`}
            >
              <div className="flex items-center gap-3 border-b-2 border-foreground/10 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF4F87] text-sm font-black text-white">
                  02
                </span>
                <div>
                  <h3 className="font-black">{t("designTab")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("designHint")}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm font-medium">{t("template")}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    1080 × 1920
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      "AURORA",
                      "EDITORIAL",
                      "BOLD",
                      "MINIMAL",
                      "FRAME",
                    ] as StoryTemplate[]
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTemplate(value)}
                      aria-pressed={template === value}
                      className={`relative flex items-center gap-3 rounded-[1.15rem] border-2 bg-white p-3 text-left transition ${template === value ? "border-[#7C3AED] bg-[#F7F0FF] shadow-[3px_3px_0_#7C3AED]" : "border-foreground/10 hover:border-foreground/35"}`}
                    >
                      <StoryTemplateThumbnail
                        template={value}
                        data={renderData}
                        accentColor={accentColor}
                        canvasColor={canvasColor}
                        productLogoUrl={
                          productLogoDataUrl ?? "/icon-512x512.png"
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black">
                            {t(`template${value}`)}
                          </span>
                          {template === value && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED] text-white">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width:
                                value === "MINIMAL"
                                  ? "35%"
                                  : value === "EDITORIAL"
                                    ? "55%"
                                    : value === "BOLD"
                                      ? "100%"
                                      : value === "FRAME"
                                        ? "75%"
                                        : "65%",
                              backgroundColor: accentColor,
                            }}
                          />
                        </span>
                        <span className="mt-2 block text-[10px] font-medium text-muted-foreground">
                          {value === "MINIMAL" || value === "EDITORIAL"
                            ? t("fontElegant")
                            : value === "BOLD"
                              ? t("fontBold")
                              : t("fontModern")}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <span className="text-sm font-medium">
                  {designT("background")}
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["ART", "SOLID", "PHOTO"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBackgroundMode(mode)}
                      className={`rounded-xl border-2 p-2 text-xs font-black ${backgroundMode === mode ? "border-[#7C3AED] bg-[#E9D8FF] text-[#5B21B6]" : "border-foreground/15"}`}
                    >
                      {mode === "ART"
                        ? designT("artBackground")
                        : mode === "SOLID"
                          ? designT("solidBackground")
                          : t("photoBackground")}
                    </button>
                  ))}
                </div>
                {backgroundMode === "PHOTO" && (
                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/20 p-4 text-xs font-bold">
                    <ImagePlus className="h-4 w-4" />
                    {t("uploadPhoto")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file || file.size > 8_000_000) return;
                        const reader = new FileReader();
                        reader.onload = () =>
                          setBackgroundPhoto(String(reader.result));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
                <label className="mt-3 block text-xs font-medium">
                  {t("intensity")}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={artIntensity}
                    onChange={(event) =>
                      setArtIntensity(Number(event.target.value))
                    }
                    className="mt-2 w-full accent-[#7C3AED]"
                  />
                </label>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  [designT("accentColor"), accentColor, setAccentColor],
                  [
                    designT("secondaryColor"),
                    secondaryColor,
                    setSecondaryColor,
                  ],
                  [designT("canvasColor"), canvasColor, setCanvasColor],
                  [designT("textColor"), storyTextColor, setStoryTextColor],
                ].map(([label, value, setter]) => (
                  <label
                    key={String(label)}
                    className="flex items-center gap-2 rounded-xl border border-foreground/10 p-2 text-xs font-medium"
                  >
                    <input
                      type="color"
                      value={String(value)}
                      onChange={(event) =>
                        (setter as (value: string) => void)(event.target.value)
                      }
                      className="h-9 w-9 rounded border-0 bg-transparent"
                    />
                    {String(label)}
                  </label>
                ))}
              </div>

              {contrast < 4.5 && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-100 p-3 text-xs font-semibold text-amber-900">
                  <span>{t("contrastWarning")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setStoryTextColor(
                        contrastRatio("#171717", canvasColor) >=
                          contrastRatio("#ffffff", canvasColor)
                          ? "#171717"
                          : "#ffffff",
                      )
                    }
                    className="rounded-full bg-amber-900 px-3 py-1 text-white"
                  >
                    {t("fixContrast")}
                  </button>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <label className="text-xs font-medium">
                  {t("fontStyle")}
                  <select
                    value={fontStyle}
                    onChange={(event) =>
                      setFontStyle(
                        event.target
                          .value as AvailabilityStoryRequest["fontStyle"],
                      )
                    }
                    className={inputClass}
                  >
                    <option value="MODERN">{t("fontModern")}</option>
                    <option value="ELEGANT">{t("fontElegant")}</option>
                    <option value="BOLD">{t("fontBold")}</option>
                  </select>
                </label>
                <label className="text-xs font-medium">
                  {t("logoFit")}
                  <select
                    value={logoFit}
                    onChange={(event) =>
                      setLogoFit(
                        event.target
                          .value as AvailabilityStoryRequest["logoFit"],
                      )
                    }
                    className={inputClass}
                  >
                    <option value="CONTAIN">{t("logoContain")}</option>
                    <option value="COVER">{t("logoCover")}</option>
                  </select>
                </label>
              </div>

              <div className="mt-5">
                <span className="text-xs font-medium text-muted-foreground">
                  {designT("visibleInfo")}
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    [designT("showLogo"), showLogo, setShowLogo, false],
                    [
                      designT("showServices"),
                      showServices,
                      setShowServices,
                      false,
                    ],
                    [
                      designT("showProfessional"),
                      showProfessional,
                      setShowProfessional,
                      options.isIndividualPlan,
                    ],
                    [
                      designT("showLocationName"),
                      showLocationName,
                      setShowLocationName,
                      !options.hasMultipleLocations,
                    ],
                    [
                      designT("showAddress"),
                      showAddress,
                      setShowAddress,
                      !selectedLocation?.address && !options.businessAddress,
                    ],
                  ].map(([label, active, setter, disabled]) => (
                    <button
                      key={String(label)}
                      type="button"
                      disabled={Boolean(disabled)}
                      onClick={() =>
                        (setter as (value: boolean) => void)(!active)
                      }
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-semibold disabled:opacity-30 ${active ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-foreground/15"}`}
                    >
                      <span>{String(label)}</span>
                      {Boolean(active) && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <span className="text-xs font-medium text-muted-foreground">
                  {designT("ctaMode")}
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCtaMode("LINK_STICKER")}
                    className={`rounded-xl border-2 p-3 text-xs font-black ${ctaMode === "LINK_STICKER" ? "border-[#7C3AED] bg-[#E9D8FF]" : "border-foreground/15"}`}
                  >
                    {designT("linkSticker")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCtaMode("BIO")}
                    className={`rounded-xl border-2 p-3 text-xs font-black ${ctaMode === "BIO" ? "border-[#7C3AED] bg-[#E9D8FF]" : "border-foreground/15"}`}
                  >
                    {designT("bioLink")}
                  </button>
                </div>
                <label className="mt-3 block text-xs font-medium">
                  {designT("cta")}
                  <input
                    maxLength={90}
                    value={callToAction}
                    onChange={(event) => setCallToAction(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              {studioMode === "ADVANCED" && (
                <div className="mt-6 rounded-2xl bg-[#F8F5ED] p-4">
                  <div className="flex items-center gap-2 font-black">
                    <Save className="h-4 w-4 text-[#7C3AED]" />
                    {t("presets")}
                  </div>
                  {presets.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {presets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center gap-2 rounded-xl bg-white p-2"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              applyConfiguration(preset.configuration)
                            }
                            className="min-w-0 flex-1 truncate text-left text-xs font-bold"
                          >
                            {preset.name}
                            {preset.isDefault ? ` · ${t("defaultPreset")}` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deletePreset(preset.id)}
                            aria-label={t("deletePreset")}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={presetName}
                      onChange={(event) => setPresetName(event.target.value)}
                      placeholder={t("presetName")}
                      className="min-w-0 flex-1 rounded-xl border border-foreground/15 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      aria-label={t("presetName")}
                      disabled={savingPreset || presetName.trim().length < 2}
                      onClick={() => void savePreset()}
                      className="rounded-xl bg-[#171717] px-3 text-xs font-black text-white disabled:opacity-40"
                    >
                      {savingPreset ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section
            className={`${mobilePanel === "PREVIEW" ? "block" : "hidden"} overflow-hidden rounded-[1.75rem] border-2 border-foreground bg-[#171717] text-white shadow-[6px_6px_0_#FF5C8A] xl:sticky xl:top-6 xl:block`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/15 px-5 py-4">
              <div className="flex items-center gap-3">
                <LayoutTemplate className="h-5 w-5 text-[#C4A2FF]" />
                <div>
                  <h3 className="font-black">{t("preview")}</h3>
                  <p className="text-[10px] uppercase tracking-wider text-white/45">
                    {t("format")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={!renderData}
                  onClick={() => setShowVariants((current) => !current)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black disabled:opacity-30 ${showVariants ? "bg-[#C4A2FF] text-[#171717]" : "bg-white/10"}`}
                >
                  {t("compareVariants")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSafeAreas((current) => !current)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black ${showSafeAreas ? "bg-[#FFD84D] text-[#171717]" : "bg-white/10"}`}
                >
                  {t("safeAreas")}
                </button>
              </div>
            </div>
            <div className="flex min-h-[620px] items-center justify-center overflow-hidden bg-[#242128] p-4 sm:p-7">
              {renderData ? (
                <div className="relative h-[547px] w-[308px] overflow-hidden rounded-[1.4rem] border-[5px] border-black bg-black shadow-[0_30px_80px_rgba(0,0,0,.55)] sm:h-[653px] sm:w-[367px]">
                  <div className="h-[1920px] w-[1080px] origin-top-left scale-[.285] sm:scale-[.34]">
                    <div ref={storyNodeRef} className="h-[1920px] w-[1080px]">
                      <AvailabilityStoryImage
                        data={renderData}
                        backgroundImageUrl={backgroundPhoto}
                        productLogoUrl={
                          productLogoDataUrl ?? "/icon-512x512.png"
                        }
                      />
                    </div>
                  </div>
                  {showSafeAreas && (
                    <div className="pointer-events-none absolute inset-x-3 bottom-[7%] top-[5%] rounded-xl border border-dashed border-white/60">
                      <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-[8px] font-bold uppercase">
                        {t("safeAreaLabel")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-sm text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <ImagePlus className="h-7 w-7 text-[#C4A2FF]" />
                  </span>
                  <h3 className="mt-4 text-lg font-black">{t("emptyTitle")}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {t("emptyHint")}
                  </p>
                </div>
              )}
            </div>
            {renderData && showVariants && (
              <div className="grid grid-cols-3 gap-3 border-t border-white/10 bg-[#201D24] p-4">
                {variantTemplates.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => {
                      setTemplate(variant);
                      setShowVariants(false);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-2 ${template === variant ? "border-[#C4A2FF] bg-white/10" : "border-white/10"}`}
                  >
                    <span className="relative h-[154px] w-[87px] overflow-hidden rounded-lg border-2 border-black bg-black">
                      <span className="absolute left-0 top-0 block h-[1920px] w-[1080px] origin-top-left scale-[.08]">
                        <AvailabilityStoryImage
                          data={{ ...renderData, template: variant }}
                          backgroundImageUrl={backgroundPhoto}
                          productLogoUrl={
                            productLogoDataUrl ?? "/icon-512x512.png"
                          }
                        />
                      </span>
                    </span>
                    <span className="text-[10px] font-black">
                      {t(`template${variant}`)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {error && (
              <p className="mx-4 mt-4 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <div className="grid gap-2 border-t border-white/15 p-4 sm:grid-cols-3">
              <button
                type="button"
                disabled={!renderData || publishing}
                onClick={() => void downloadStory()}
                className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-[#171717] disabled:opacity-30"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t("download")}
              </button>
              <button
                type="button"
                disabled={!renderData || publishing}
                onClick={() => void shareStory()}
                className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-3 text-sm font-black disabled:opacity-30"
              >
                <Share2 className="h-4 w-4" />
                {t("share")}
              </button>
              <button
                type="button"
                disabled={!renderData || publishing}
                onClick={() => void copyBookingLink()}
                className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-3 text-sm font-black disabled:opacity-30"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#7EE2B8]" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {copied ? t("copied") : t("copyLink")}
              </button>
            </div>
          </section>
        </div>
      </section>

      {insights && insights.recent.length > 0 && (
        <section className="rounded-[1.75rem] border-2 border-foreground bg-white p-5 shadow-[5px_5px_0_#FFD84D] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD84D] text-sm font-black">
                03
              </span>
              <div>
                <h2 className="text-xl font-black">{t("historyTitle")}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("historyHint")}
                </p>
              </div>
            </div>
            <div className="flex gap-1 rounded-full bg-[#F8F5ED] p-1">
              {(["7", "30", "90", "ALL"] as AnalyticsRange[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAnalyticsRange(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${analyticsRange === value ? "bg-[#171717] text-white" : ""}`}
                >
                  {value === "ALL" ? t("allTime") : `${value}d`}
                </button>
              ))}
            </div>
          </div>
          {servicePerformance.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
                {t("topServices")}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {servicePerformance.map((service, index) => (
                  <div
                    key={service.name}
                    className="rounded-2xl border border-foreground/10 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black">
                        {index + 1}. {service.name}
                      </span>
                      <span className="text-xs font-black text-emerald-700">
                        {(service.conversion * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {service.bookings} {t("bookingsShort")} ·{" "}
                      {currency.format(service.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 grid gap-2">
            {filteredCampaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="grid gap-3 rounded-2xl border-2 border-foreground/10 bg-[#F8F5ED] p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{campaign.headline}</p>
                    {campaign.status === "ARCHIVED" && (
                      <span className="rounded-full bg-foreground/10 px-2 py-1 text-[9px] font-black uppercase">
                        {t("archived")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(campaign.createdAt).toLocaleDateString(locale)}
                    {campaign.locationName ? ` · ${campaign.locationName}` : ""}
                    {campaign.staffName ? ` · ${campaign.staffName}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-white px-2 py-1">
                      {campaign.visits} {t("visitsShort")}
                    </span>
                    <span className="rounded-full bg-[#E9D8FF] px-2 py-1 text-[#5B21B6]">
                      {campaign.bookings} {t("bookingsShort")}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1">
                      {campaign.downloads + campaign.shares}{" "}
                      {t("publishedShort")}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1">
                      {campaign.copies} {t("copiesShort")}
                    </span>
                  </div>
                </div>
                <p className="font-black text-emerald-700">
                  {currency.format(campaign.revenue)}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!campaign.configuration}
                    onClick={() =>
                      campaign.configuration &&
                      applyConfiguration(campaign.configuration)
                    }
                    className="rounded-full border-2 border-foreground px-3 py-2 text-xs font-black disabled:opacity-30"
                  >
                    {t("reuse")}
                  </button>
                  {campaign.status !== "ARCHIVED" && (
                    <button
                      type="button"
                      onClick={() => {
                        void recordActivity(campaign.id, "archive");
                      }}
                      aria-label={t("archive")}
                      className="rounded-full border-2 border-foreground/15 p-2"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-3 bottom-3 z-40 flex gap-2 rounded-full border-2 border-foreground bg-white p-2 shadow-[5px_5px_0_#171717] xl:hidden">
        <button
          type="button"
          disabled={loading || !formValid}
          onClick={() => void generatePreview()}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-4 py-3 text-sm font-black text-white disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {t("refreshPreview")}
        </button>
        {renderData && (
          <button
            type="button"
            onClick={() => setMobilePanel("PREVIEW")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171717] text-white"
          >
            <LayoutTemplate className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
