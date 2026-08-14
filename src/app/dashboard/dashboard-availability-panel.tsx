"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  CalendarClock,
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  AppointmentEditor,
  type AppointmentEditorClient,
  type AppointmentEditorService,
  type AppointmentEditorStaff,
} from "./appointment-editor";

type AvailabilityService = AppointmentEditorService;
type AvailabilityStaff = AppointmentEditorStaff;

interface AvailabilityBookingOption {
  endTime: string;
  assignments: { serviceId: string; staffId: string; staffName: string }[];
}

interface AvailabilityResult {
  timezone: string;
  generatedAt: string;
  durationMinutes: number;
  serviceNames: string[];
  days: {
    date: string;
    slots: {
      time: string;
      startTime: string;
      bookingOptions: AvailabilityBookingOption[];
    }[];
  }[];
}

interface BookingSelection {
  startTime: string;
  staffId: string;
  serviceId: string;
  selectedOptionIds: string[];
}

function canPerform(service: AvailabilityService, staffId: string) {
  return service.staffIds.length === 0 || service.staffIds.includes(staffId);
}

export function DashboardAvailabilityPanel({
  location,
  services,
  staff,
  clients,
  currencyCode,
  maxServicesPerBooking,
  widgetSlug,
  canManageAppointments,
  canManageAllAppointments,
  manageableStaffId,
}: {
  location: { id: string; name: string; slug: string; timezone: string };
  services: AvailabilityService[];
  staff: AvailabilityStaff[];
  clients: AppointmentEditorClient[];
  currencyCode: string;
  maxServicesPerBooking: number;
  widgetSlug: string;
  canManageAppointments: boolean;
  canManageAllAppointments: boolean;
  manageableStaffId: string | null;
}) {
  const t = useTranslations("dashboard.availability");
  const locale = useLocale();
  const today = format(toZonedTime(new Date(), location.timezone), "yyyy-MM-dd");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"quick" | "simulation">("quick");
  const [serviceIds, setServiceIds] = useState<string[]>(services[0] ? [services[0].id] : []);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState("");
  const [splitStaff, setSplitStaff] = useState(false);
  const [staffByServiceId, setStaffByServiceId] = useState<Record<string, string>>({});
  const [fromDate, setFromDate] = useState(today);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [copied, setCopied] = useState<"times" | "link" | null>(null);
  const [booking, setBooking] = useState<BookingSelection | null>(null);

  const selectedServices = useMemo(
    () => serviceIds.map((id) => services.find((service) => service.id === id)).filter((service): service is AvailabilityService => Boolean(service)),
    [serviceIds, services],
  );
  const commonStaff = useMemo(
    () => staff.filter((member) => selectedServices.every((service) => canPerform(service, member.id))),
    [selectedServices, staff],
  );
  const mustSplitStaff = mode === "simulation" && selectedServices.length > 1 && commonStaff.length === 0;
  const effectiveSplitStaff = mode === "simulation" && selectedServices.length > 1 && (splitStaff || mustSplitStaff);
  const activeAlternativeIds = useMemo(
    () => new Set(selectedServices.flatMap((service) => service.optionCategories.flatMap((category) => category.alternatives.map((alternative) => alternative.id)))),
    [selectedServices],
  );
  const requestOptionIds = selectedOptionIds.filter((id) => activeAlternativeIds.has(id));
  const optionsComplete = selectedServices.every((service) => service.optionCategories.every(
    (category) => !category.isRequired || category.alternatives.some((alternative) => requestOptionIds.includes(alternative.id)),
  ));
  const splitAssignmentsComplete = !effectiveSplitStaff || selectedServices.every((service) => {
    const assignedId = staffByServiceId[service.id];
    return assignedId && canPerform(service, assignedId);
  });
  const availableDays = result?.days.filter((day) => day.slots.length > 0) ?? [];

  function switchMode(nextMode: "quick" | "simulation") {
    setMode(nextMode);
    setResult(null);
    setError(null);
    if (nextMode === "quick") {
      setSplitStaff(false);
      void searchOverview();
    }
  }

  function openQuickAvailability() {
    setOpen(true);
    setMode("quick");
    void searchOverview();
  }

  function selectQuickService(serviceId: string) {
    setServiceIds([serviceId]);
    setStaffId("");
    setResult(null);
  }

  function toggleSimulationService(serviceId: string) {
    setResult(null);
    setStaffId("");
    setServiceIds((current) => {
      if (current.includes(serviceId)) {
        return current.length === 1 ? current : current.filter((id) => id !== serviceId);
      }
      if (current.length >= maxServicesPerBooking) return current;
      return [...current, serviceId];
    });
  }

  function toggleOption(categoryId: string, alternativeId: string, maxSelections: number) {
    const categoryAlternatives = new Set(selectedServices.flatMap((service) =>
      service.optionCategories
        .filter((category) => category.id === categoryId)
        .flatMap((category) => category.alternatives.map((alternative) => alternative.id)),
    ));
    setSelectedOptionIds((current) => {
      if (current.includes(alternativeId)) return current.filter((id) => id !== alternativeId);
      const outsideCategory = current.filter((id) => !categoryAlternatives.has(id));
      const insideCategory = current.filter((id) => categoryAlternatives.has(id));
      return maxSelections === 1
        ? [...outsideCategory, alternativeId]
        : [...outsideCategory, ...insideCategory.slice(-(maxSelections - 1)), alternativeId];
    });
    setResult(null);
  }

  async function searchAvailability(nextDays = days) {
    if (!selectedServices.length || !optionsComplete || !splitAssignmentsComplete) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/dashboard/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "services",
          locationId: location.id,
          serviceIds,
          selectedOptionAlternativeIds: requestOptionIds,
          staffId: !effectiveSplitStaff && commonStaff.some((member) => member.id === staffId) ? staffId : undefined,
          staffAssignments: effectiveSplitStaff
            ? selectedServices.map((service) => ({ serviceId: service.id, staffId: staffByServiceId[service.id] }))
            : undefined,
          fromDate,
          days: nextDays,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("searchError"));
      setDays(nextDays);
      setResult(payload as AvailabilityResult);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : t("searchError"));
    } finally {
      setLoading(false);
    }
  }

  async function searchOverview() {
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
      setDays(7);
      setResult(payload as AvailabilityResult);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : t("searchError"));
    } finally {
      setLoading(false);
    }
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
    const resultName = result.serviceNames.length ? result.serviceNames.join(" · ") : t("quickMode");
    const lines = [t("copyHeading", { services: resultName })];
    for (const day of availableDays) {
      lines.push(`${dayLabel(day.date)}: ${day.slots.map((slot) => slot.time).join(", ")}`);
    }
    if (includeLink && typeof window !== "undefined") {
      const url = new URL(`/widget/${widgetSlug}`, window.location.origin);
      url.searchParams.set("location", location.slug);
      if (mode === "simulation" && serviceIds.length === 1) url.searchParams.set("service", serviceIds[0]);
      if (mode === "simulation" && !effectiveSplitStaff && staffId) url.searchParams.set("staff", staffId);
      if (availableDays[0]) url.searchParams.set("date", availableDays[0].date);
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

  function startBooking(slot: AvailabilityResult["days"][number]["slots"][number]) {
    if (!canManageAppointments || selectedServices.length !== 1) return;
    const option = slot.bookingOptions.find((candidate) => {
      const assigned = candidate.assignments.find((item) => item.serviceId === selectedServices[0].id);
      return assigned && (canManageAllAppointments || assigned.staffId === manageableStaffId);
    });
    const assignment = option?.assignments.find((item) => item.serviceId === selectedServices[0].id);
    if (!assignment) return;
    setBooking({
      startTime: slot.startTime,
      staffId: assignment.staffId,
      serviceId: selectedServices[0].id,
      selectedOptionIds: requestOptionIds,
    });
  }

  if (!services.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={openQuickAvailability}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6D28D9]"
      >
        <CalendarClock className="h-4 w-4" />
        {t("open")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/65 p-3 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="flex min-h-full items-center justify-center py-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("title")}
              className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-[#7C3AED]/10 p-2 text-[#7C3AED]"><CalendarClock className="h-5 w-5" /></div>
                    <div>
                      <h2 className="font-semibold">{t("title")}</h2>
                      <p className="text-xs text-muted-foreground">{t("location", { location: location.name })}</p>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={t("close")}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid max-h-[78vh] overflow-y-auto lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-5 border-b border-border p-5 lg:border-b-0 lg:border-r">
                  <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
                    <button type="button" onClick={() => switchMode("quick")} className={`rounded-lg px-3 py-2 text-sm font-medium ${mode === "quick" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                      {t("quickMode")}
                    </button>
                    <button type="button" onClick={() => switchMode("simulation")} className={`rounded-lg px-3 py-2 text-sm font-medium ${mode === "simulation" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                      {t("simulationMode")}
                    </button>
                  </div>

                  {mode === "quick" ? (
                    <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5 text-center">
                      {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#7C3AED]" /> : <CalendarClock className="mx-auto h-6 w-6 text-[#7C3AED]" />}
                      <p className="mt-3 font-semibold">{t("quickMode")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t("sevenDays")}</p>
                    </div>
                  ) : <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("services")}</label>
                      {mode === "simulation" && maxServicesPerBooking > 1 && <span className="text-xs text-muted-foreground">{t("serviceLimit", { count: maxServicesPerBooking })}</span>}
                    </div>
                    {maxServicesPerBooking === 1 ? (
                      <select value={serviceIds[0] ?? ""} onChange={(event) => selectQuickService(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                        {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration} min</option>)}
                      </select>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {services.map((service) => {
                          const checked = serviceIds.includes(service.id);
                          return (
                            <button key={service.id} type="button" onClick={() => toggleSimulationService(service.id)} className={`rounded-xl border p-3 text-left text-sm ${checked ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-border bg-background"}`}>
                              <span className="flex items-center gap-2 font-medium">
                                <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border"}`}>{checked && <Check className="h-3 w-3" />}</span>
                                {service.name}
                              </span>
                              <span className="mt-1 block pl-6 text-xs text-muted-foreground">{service.duration} min</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedServices.some((service) => service.optionCategories.length > 0) && (
                    <div className="space-y-3 border-t border-border pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("options")}</p>
                      {selectedServices.flatMap((service) => service.optionCategories.map((category) => (
                        <div key={category.id} className="rounded-xl border border-border bg-muted/20 p-3">
                          <p className="text-sm font-medium">{service.name} · {category.name}{category.isRequired && <span className="ml-1 text-red-400">*</span>}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {category.alternatives.map((alternative) => {
                              const checked = selectedOptionIds.includes(alternative.id);
                              return <button key={alternative.id} type="button" onClick={() => toggleOption(category.id, alternative.id, category.maxSelections)} className={`rounded-lg border px-3 py-2 text-xs ${checked ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border bg-background"}`}>{alternative.name}{alternative.durationDelta ? ` · +${alternative.durationDelta} min` : ""}</button>;
                            })}
                          </div>
                        </div>
                      )))}
                    </div>
                  )}

                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("professional")}</label>
                      {mode === "simulation" && selectedServices.length > 1 && !mustSplitStaff && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" checked={splitStaff} onChange={(event) => { setSplitStaff(event.target.checked); setResult(null); }} className="accent-[#7C3AED]" />
                          {t("differentProfessionals")}
                        </label>
                      )}
                    </div>
                    {effectiveSplitStaff ? (
                      <div className="space-y-2">
                        {mustSplitStaff && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">{t("splitRequired")}</p>}
                        {selectedServices.map((service) => {
                          const eligible = staff.filter((member) => canPerform(service, member.id));
                          return (
                            <label key={service.id} className="grid gap-1 text-xs text-muted-foreground">
                              <span>{service.name}</span>
                              <select value={staffByServiceId[service.id] ?? ""} onChange={(event) => { setStaffByServiceId((current) => ({ ...current, [service.id]: event.target.value })); setResult(null); }} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                                <option value="">{t("selectProfessional")}</option>
                                {eligible.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                              </select>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <select value={commonStaff.some((member) => member.id === staffId) ? staffId : ""} onChange={(event) => { setStaffId(event.target.value); setResult(null); }} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                        <option value="">{t("anyProfessional")}</option>
                        {commonStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      <span>{t("fromDate")}</span>
                      <input type="date" min={today} value={fromDate} onChange={(event) => { setFromDate(event.target.value); setResult(null); }} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
                    </label>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      <span>{t("range")}</span>
                      <select value={days} onChange={(event) => { setDays(Number(event.target.value)); setResult(null); }} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                        <option value={7}>{t("sevenDays")}</option>
                        <option value={14}>{t("fourteenDays")}</option>
                        <option value={30}>{t("thirtyDays")}</option>
                      </select>
                    </label>
                  </div>

                  {!optionsComplete && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">{t("requiredOptions")}</p>}
                  {!splitAssignmentsComplete && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">{t("requiredProfessionals")}</p>}
                  <button type="button" onClick={() => void searchAvailability()} disabled={loading || !optionsComplete || !splitAssignmentsComplete || !selectedServices.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {loading ? t("searching") : t("simulate")}
                  </button>
                  </>}
                </div>

                <div className="min-h-[420px] space-y-4 bg-muted/10 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("results")}</p>
                    <h3 className="mt-1 text-lg font-semibold">{result ? (mode === "quick" ? t("quickMode") : result.serviceNames.join(" · ")) : t("resultsEmptyTitle")}</h3>
                    <p className="text-sm text-muted-foreground">{result ? (mode === "quick" ? t("sevenDays") : t("duration", { count: result.durationMinutes })) : t("resultsEmptyHint")}</p>
                  </div>

                  {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
                  {loading && <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" /></div>}
                  {!loading && result && availableDays.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                      <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 font-medium">{t("noSlots")}</p>
                      {mode === "simulation" && days < 30 && <button type="button" onClick={() => void searchAvailability(30)} className="mt-3 text-sm font-semibold text-[#7C3AED]">{t("searchThirtyDays")}</button>}
                    </div>
                  )}
                  {!loading && result && availableDays.length > 0 && (
                    <>
                      <div className="space-y-3">
                        {availableDays.map((day) => (
                          <section key={day.date} className="rounded-2xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium capitalize">{dayLabel(day.date)}</p>
                              <span className="text-xs text-muted-foreground">{t("slots", { count: day.slots.length })}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {day.slots.map((slot) => {
                                const staffCount = new Set(slot.bookingOptions.flatMap((option) => option.assignments.map((assignment) => assignment.staffId))).size;
                                const canCreate = mode === "simulation" && canManageAppointments && selectedServices.length === 1 && slot.bookingOptions.some((option) => {
                                  const assigned = option.assignments.find((item) => item.serviceId === selectedServices[0].id);
                                  return assigned && (canManageAllAppointments || assigned.staffId === manageableStaffId);
                                });
                                return (
                                  <button key={slot.time} type="button" onClick={() => startBooking(slot)} disabled={!canCreate} title={canCreate ? t("createAt", { time: slot.time }) : undefined} className="group rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2 text-left disabled:cursor-default">
                                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED]">{slot.time}{canCreate && <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />}</span>
                                    {staffCount > 1 && <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Users className="h-2.5 w-2.5" />{t("professionals", { count: staffCount })}</span>}
                                  </button>
                                );
                              })}
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
                      {mode === "simulation" && selectedServices.length > 1 && <p className="text-center text-xs text-muted-foreground">{t("multiServiceCreateHint")}</p>}
                    </>
                  )}
                  {!loading && !result && !error && (
                    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
                      <CalendarClock className="h-9 w-9 text-muted-foreground" />
                      <p className="mt-3 font-medium">{t("resultsEmptyTitle")}</p>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("resultsEmptyHint")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {booking && (
        <AppointmentEditor
          initialStart={new Date(booking.startTime)}
          initialStaffId={booking.staffId}
          initialServiceId={booking.serviceId}
          initialSelectedOptionIds={booking.selectedOptionIds}
          timeZone={location.timezone}
          services={services}
          staff={staff}
          clients={clients}
          currencyCode={currencyCode}
          onClose={() => {
            setBooking(null);
            setResult(null);
          }}
        />
      )}
    </>
  );
}
