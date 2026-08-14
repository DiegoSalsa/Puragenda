"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  CalendarClock,
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  Loader2,
  PlayCircle,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface AvailabilityResult {
  days: {
    date: string;
    slots: { time: string }[];
  }[];
}

type ActivePanel = "availability" | "simulation" | null;

export function DashboardAvailabilityPanel({
  location,
  widgetSlug,
}: {
  location: { id: string; name: string; slug: string; timezone: string };
  widgetSlug: string;
}) {
  const t = useTranslations("dashboard.availability");
  const locale = useLocale();
  const today = format(toZonedTime(new Date(), location.timezone), "yyyy-MM-dd");
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [copied, setCopied] = useState<"times" | "link" | null>(null);
  const [simulationSession, setSimulationSession] = useState(0);

  const availableDays = result?.days.filter((day) => day.slots.length > 0) ?? [];
  const simulationUrl = useMemo(
    () => `/widget/${widgetSlug}?location=${encodeURIComponent(location.slug)}&preview=1`,
    [location.slug, widgetSlug],
  );

  async function openAvailability() {
    setActivePanel("availability");
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/dashboard/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "overview",
          locationId: location.id,
          fromDate: today,
          days: 7,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("searchError"));
      setResult(payload as AvailabilityResult);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : t("searchError"));
    } finally {
      setLoading(false);
    }
  }

  function openSimulation() {
    setSimulationSession((current) => current + 1);
    setActivePanel("simulation");
  }

  function dayLabel(date: string) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00.000Z`));
  }

  function buildClipboardText(includeLink: boolean) {
    if (!result) return "";
    const lines = [t("copyHeading", { services: t("quickMode") })];
    for (const day of availableDays) {
      lines.push(`${dayLabel(day.date)}: ${day.slots.map((slot) => slot.time).join(", ")}`);
    }
    if (includeLink && typeof window !== "undefined") {
      const url = new URL(`/widget/${widgetSlug}`, window.location.origin);
      url.searchParams.set("location", location.slug);
      lines.push("", t("bookingLink", { url: url.toString() }));
    }
    return lines.join("\n");
  }

  async function copyAvailability(includeLink: boolean) {
    const text = buildClipboardText(includeLink);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(includeLink ? "link" : "times");
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setError(t("copyError"));
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void openAvailability()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6D28D9]"
        >
          <CalendarClock className="h-4 w-4" />
          {t("open")}
        </button>
        <button
          type="button"
          onClick={openSimulation}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 px-4 py-2.5 text-sm font-semibold text-[#7C3AED] transition-colors hover:bg-[#7C3AED]/10"
        >
          <PlayCircle className="h-4 w-4" />
          {t("simulationMode")}
        </button>
      </div>

      {activePanel === "availability" && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/65 p-3 backdrop-blur-sm" onClick={() => setActivePanel(null)}>
          <div className="flex min-h-full items-center justify-center py-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("quickMode")}
              className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#7C3AED]/10 p-2 text-[#7C3AED]"><CalendarClock className="h-5 w-5" /></div>
                  <div>
                    <h2 className="font-semibold">{t("quickMode")}</h2>
                    <p className="text-xs text-muted-foreground">{t("location", { location: location.name })} · {t("sevenDays")}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setActivePanel(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={t("close")}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[76vh] space-y-4 overflow-y-auto p-5">
                {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
                {loading && <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" /></div>}
                {!loading && result && availableDays.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 font-medium">{t("noSlots")}</p>
                  </div>
                )}
                {!loading && result && availableDays.length > 0 && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableDays.map((day) => (
                        <section key={day.date} className="rounded-2xl border border-border bg-background p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium capitalize">{dayLabel(day.date)}</p>
                            <span className="text-xs text-muted-foreground">{t("slots", { count: day.slots.length })}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {day.slots.map((slot) => (
                              <span key={slot.time} className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2 text-sm font-semibold text-[#7C3AED]">
                                {slot.time}
                              </span>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => void copyAvailability(false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium">
                        {copied === "times" ? <Check className="h-4 w-4 text-emerald-500" /> : <Clipboard className="h-4 w-4" />}
                        {copied === "times" ? t("copied") : t("copyTimes")}
                      </button>
                      <button type="button" onClick={() => void copyAvailability(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium">
                        {copied === "link" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        {copied === "link" ? t("copied") : t("copyWithLink")}
                      </button>
                    </div>
                    <a href={`/widget/${widgetSlug}?location=${encodeURIComponent(location.slug)}`} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground">
                      <ExternalLink className="h-4 w-4" /> {t("openWidget")}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activePanel === "simulation" && (
        <div className="fixed inset-0 z-[70] bg-black/70 p-2 backdrop-blur-sm sm:p-4" onClick={() => setActivePanel(null)}>
          <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#7C3AED]/10 p-2 text-[#7C3AED]"><PlayCircle className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-semibold">{t("simulationMode")}</h2>
                  <p className="text-xs text-muted-foreground">{t("location", { location: location.name })}</p>
                </div>
              </div>
              <button type="button" onClick={() => setActivePanel(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={t("close")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              key={simulationSession}
              src={simulationUrl}
              title={t("simulationMode")}
              className="min-h-0 flex-1 bg-background"
            />
          </div>
        </div>
      )}
    </>
  );
}
