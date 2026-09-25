"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { addDays, addWeeks, subWeeks, format, parseISO, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Crown, FileText, Phone, Plus, RefreshCw } from "@/components/icons/hover-icons";
import { useLocale, useTranslations } from "next-intl";
import { getDateLocale } from "@/i18n/date-locale";
import {
  AppointmentEditor,
  type AppointmentEditorClient,
  type AppointmentEditorService,
  type AppointmentEditorStaff,
} from "./appointment-editor";
import { APPOINTMENT_STATUS_COLORS as STATUS_COLORS, AppointmentDetailDialog } from "./appointment-detail-dialog";

interface CalendarAppointment {
  id: string; customerName: string; customerEmail: string;
  startTime: string; endTime: string; status: string;
  paymentStatus: string; depositAmount: number | null; depositPaymentUrl: string | null;
  totalPrice: number; posPaidAmount: number;
  depositReceiptStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  depositReceiptOriginalName: string | null; depositReceiptUploadedAt: string | null;
  serviceId: string; serviceName: string; staffId: string | null; staffName: string;
  clientId: string | null; customerPhone: string | null;
  selectedOptions?: { alternativeId?: string; categoryName: string; alternativeName: string; priceDelta: number; durationDelta: number }[];
  recurringBookingId?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
  sessionBaseAmount: number | null;
  tipAmount: number;
  postSessionItems: { description: string; amount: number }[];
  paymentMethod: string | null;
  settledAt: string | null;
}

interface CalendarBusinessHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
}

interface CalendarPriorityBlock {
  id: string;
  staffId: string;
  staffName: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  releaseAt: string | null;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function buildVisibleHours(
  businessHours: CalendarBusinessHour[],
  appointments: CalendarAppointment[],
  priorityBlocks: CalendarPriorityBlock[],
  timeZone?: string,
) {
  const openHours = businessHours.filter((h) => h.isOpen);
  // Keep the previous dashboard range as a floor, then expand it with configured
  // business hours and any appointments that already exist.
  let minMinutes = 7 * 60;
  let maxMinutes = 18 * 60;

  if (openHours.length > 0) {
    minMinutes = Math.min(minMinutes,
      Math.min(...openHours.map((h) => timeToMinutes(h.startTime) ?? 9 * 60))
    );
    maxMinutes = Math.max(maxMinutes,
      Math.max(...openHours.map((h) => timeToMinutes(h.endTime) ?? 19 * 60))
    );
  }

  for (const apt of appointments) {
    const start = zonedDate(apt.startTime, timeZone);
    const end = zonedDate(apt.endTime, timeZone);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    minMinutes = Math.min(minMinutes, start.getHours() * 60 + start.getMinutes());
    maxMinutes = Math.max(maxMinutes, end.getHours() * 60 + end.getMinutes());
  }
  for (const block of priorityBlocks) {
    const start = zonedDate(block.startTime, timeZone);
    const end = zonedDate(block.endTime, timeZone);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    minMinutes = Math.min(minMinutes, start.getHours() * 60 + start.getMinutes());
    maxMinutes = Math.max(maxMinutes, end.getHours() * 60 + end.getMinutes());
  }

  const startHour = Math.max(0, Math.floor(minMinutes / 60));
  const endHour = Math.min(24, Math.ceil(maxMinutes / 60));
  const length = Math.max(1, endHour - startHour + 1);
  return Array.from({ length }, (_, i) => startHour + i);
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function zonedDate(iso: string, timeZone?: string) {
  const date = parseISO(iso);
  return timeZone ? toZonedTime(date, timeZone) : date;
}

export function WeeklyCalendar({
  appointments,
  priorityBlocks = [],
  weekStartISO,
  todayKey,
  locationSlug,
  agendaMode,
  businessHours = [],
  services = [],
  staff = [],
  clients = [],
  currencyCode,
  timeZone,
  canManageAppointments = false,
  posEnabled = false,
}: {
  appointments: CalendarAppointment[];
  priorityBlocks?: CalendarPriorityBlock[];
  weekStartISO: string;
  todayKey?: string;
  locationSlug?: string;
  agendaMode?: "mine";
  businessHours?: CalendarBusinessHour[];
  services?: AppointmentEditorService[];
  staff?: AppointmentEditorStaff[];
  clients?: AppointmentEditorClient[];
  currencyCode: string;
  timeZone?: string;
  canManageAppointments?: boolean;
  posEnabled?: boolean;
}) {
  const t = useTranslations("dashboard.calendar");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [editor, setEditor] = useState<{
    initialStart?: Date;
    initialStaffId?: string;
  } | null>(null);
  const touchStartX = useRef<number | null>(null);

  const weekStart = useMemo(() => {
    // Parse yyyy-MM-dd as local date (noon to avoid DST edge cases)
    const [y, m, d] = weekStartISO.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [weekStartISO]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const now = new Date();

  function agendaPath(date?: string) {
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    if (agendaMode === "mine") query.set("agenda", "mine");
    if (locationSlug) query.set("location", locationSlug);
    const value = query.toString();
    return value ? `/dashboard/agenda?${value}` : "/dashboard/agenda";
  }

  function navigateWeek(direction: "prev" | "next") {
    const target = direction === "next" ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    router.push(agendaPath(format(target, "yyyy-MM-dd")));
  }

  function goToday() {
    router.push(agendaPath(todayKey));
  }

  function prevDay() {
    if (selectedDayIdx > 0) {
      setSelectedDayIdx((p) => p - 1);
    } else {
      navigateWeek("prev");
      setSelectedDayIdx(6);
    }
  }

  function nextDay() {
    if (selectedDayIdx < 6) {
      setSelectedDayIdx((p) => p + 1);
    } else {
      navigateWeek("next");
      setSelectedDayIdx(0);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) nextDay();
      else prevDay();
    }
    touchStartX.current = null;
  }

  function sameAgendaDay(iso: string, day: Date) {
    return format(zonedDate(iso, timeZone), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
  }

  function getAptsForDayHour(day: Date, hour: number) {
    return appointments.filter((appointment) => {
      const start = zonedDate(appointment.startTime, timeZone);
      return sameAgendaDay(appointment.startTime, day) && start.getHours() === hour;
    });
  }

  function getPriorityBlocksForDayHour(day: Date, hour: number) {
    return priorityBlocks.filter((block) => {
      const start = zonedDate(block.startTime, timeZone);
      return sameAgendaDay(block.startTime, day) && start.getHours() === hour;
    });
  }

  function slotInstant(day: Date, hour: number) {
    const key = format(day, "yyyy-MM-dd");
    const hours = String(hour).padStart(2, "0");
    return timeZone ? fromZonedTime(`${key}T${hours}:00:00`, timeZone) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
  }

  function openNewAppointment(start?: Date, preferredStaffId?: string) {
    if (!canManageAppointments) return;
    const suggested = start ? new Date(start) : new Date(Date.now() + 60 * 60 * 1000);
    if (!start) suggested.setMinutes(0, 0, 0);
    if (suggested <= new Date()) suggested.setHours(suggested.getHours() + 1);
    setEditor({
      initialStart: suggested,
      initialStaffId: preferredStaffId ?? (staff.length === 1 ? staff[0].id : undefined),
    });
  }

  const locationToday = useMemo(() => {
    const key = todayKey && /^\d{4}-\d{2}-\d{2}$/.test(todayKey) ? todayKey : format(new Date(), "yyyy-MM-dd");
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }, [todayKey]);
  const isCurrentWeek = format(startOfWeek(locationToday, { weekStartsOn: 1 }), "yyyy-MM-dd") === format(weekStart, "yyyy-MM-dd");
  const selectedDay = days[selectedDayIdx] ?? days[0];
  const isDayToday = format(selectedDay, "yyyy-MM-dd") === format(locationToday, "yyyy-MM-dd");
  const visibleHours = useMemo(
    () => buildVisibleHours(businessHours, appointments, priorityBlocks, timeZone),
    [businessHours, appointments, priorityBlocks, timeZone],
  );

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <h2 className="text-base sm:text-lg font-semibold">{t("title")}</h2>
              {!isCurrentWeek && (
                <button onClick={goToday} className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2.5 py-1 text-xs font-medium text-[#A78BFA] transition-all hover:bg-[#7C3AED]/20">
                  {t("today")}
                </button>
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {canManageAppointments && (
                <button
                  type="button"
                  onClick={() => openNewAppointment()}
                  className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#7C3AED] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6D28D9] sm:flex-none"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("newAppointment")}
                </button>
              )}
              <div className="flex shrink-0 items-center rounded-xl border border-border bg-muted p-0.5">
                <button
                  onClick={() => setViewMode("day")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "day" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t("day")}
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t("week")}
                </button>
              </div>
            </div>
          </div>
          {/* Navigation row */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={viewMode === "week" ? () => navigateWeek("prev") : prevDay}
              aria-label={t("previous")}
              className="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-sm">
              {viewMode === "week" ? (
                <span className="text-muted-foreground">
                  {format(weekStart, "d MMM", { locale: dateLocale })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: dateLocale })}
                </span>
              ) : (
                <span className="font-medium capitalize">
                  {format(selectedDay, "PPPP", { locale: dateLocale })}
                </span>
              )}
            </span>
            <button
              onClick={viewMode === "week" ? () => navigateWeek("next") : nextDay}
              aria-label={t("next")}
              className="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {viewMode === "week" ? (
          /* ── Week view ── */
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                <div className="p-2" />
                {days.map((day) => {
                  const isToday = format(day, "yyyy-MM-dd") === format(locationToday, "yyyy-MM-dd");
                  return (
                    <div key={day.toISOString()} className={`border-l border-border p-3 text-center ${isToday ? "bg-[#7C3AED]/5" : ""}`}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{format(day, "EEE", { locale: dateLocale })}</p>
                      <p className={`text-xl font-bold ${isToday ? "text-brand-foreground" : ""}`}>{format(day, "d")}</p>
                    </div>
                  );
                })}
              </div>
              {/* Time grid */}
              {visibleHours.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30">
                  <div className="flex items-start justify-end pr-2 pt-2 text-[11px] text-muted-foreground/60 font-mono">
                    {formatHour(hour)}
                  </div>
                  {days.map((day) => {
                    const apts = getAptsForDayHour(day, hour);
                    const isToday = format(day, "yyyy-MM-dd") === format(locationToday, "yyyy-MM-dd");
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          const start = slotInstant(day, hour);
                          if (start > new Date()) openNewAppointment(start);
                        }}
                        className={`border-l border-border min-h-[52px] p-1 min-w-0 overflow-hidden ${isToday ? "bg-[#7C3AED]/[0.02]" : ""} ${canManageAppointments ? "cursor-pointer hover:bg-[#7C3AED]/5" : ""}`}
                      >
                        {getPriorityBlocksForDayHour(day, hour).map((block) => {
                          const start = zonedDate(block.startTime, timeZone);
                          const released = !!block.releaseAt && parseISO(block.releaseAt) <= now;
                          return (
                            <button
                              key={block.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openNewAppointment(parseISO(block.startTime), block.staffId);
                              }}
                              disabled={!canManageAppointments || parseISO(block.startTime) <= now}
                              className={`mb-1 w-full rounded-lg border p-1.5 text-left transition-colors disabled:cursor-default ${
                                released
                                  ? "border-amber-500/10 bg-amber-500/[0.03] text-amber-500/60"
                                  : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                              }`}
                              title={canManageAppointments ? t("bookPriority") : t("prioritySlot")}
                            >
                              <div className="flex items-center gap-1">
                                <Crown className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate text-[10px] font-semibold">
                                  {released ? t("releasedSlot") : t("priority")}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-[9px] opacity-80">
                                {format(start, "HH:mm")} · {block.staffName}
                              </p>
                            </button>
                          );
                        })}
                        {apts.map((apt) => {
                          const sc = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                          return (
                            <button key={apt.id} onClick={(event) => { event.stopPropagation(); setSelected(apt); }} className={`w-full rounded-lg border ${sc.bg} ${sc.border} p-1.5 text-left transition-all hover:scale-[1.02] mb-1 overflow-hidden`}>
                              <div className="flex items-center gap-1.5">
                                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${sc.dot}`} />
                                <p className={`text-[11px] font-medium truncate ${sc.text}`}>{apt.customerName}</p>
                                {apt.recurringBookingId && <RefreshCw className="h-2.5 w-2.5 shrink-0 text-brand-foreground opacity-70" />}
                                {apt.depositReceiptStatus === "PENDING" && <FileText className="ml-auto h-3 w-3 shrink-0 text-sky-400" />}
                              </div>
                              <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{format(zonedDate(apt.startTime, timeZone), "HH:mm")} · {apt.serviceName}</p>
                              {apt.customerPhone && (
                                <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-muted-foreground">
                                  <Phone className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{apt.customerPhone}</span>
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Day view ── */
          <div className="select-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {visibleHours.map((hour) => (
              <div key={hour} className="grid grid-cols-[56px_1fr] border-b border-border/30">
                <div className="flex items-start justify-end pr-2 pt-2 text-[10px] sm:text-[11px] text-muted-foreground/60 font-mono">
                  {formatHour(hour)}
                </div>
                <div
                  onClick={() => {
                    const start = slotInstant(selectedDay, hour);
                    if (start > new Date()) openNewAppointment(start);
                  }}
                  className={`border-l border-border min-h-[56px] p-1.5 ${isDayToday ? "bg-[#7C3AED]/[0.02]" : ""} ${canManageAppointments ? "cursor-pointer hover:bg-[#7C3AED]/5" : ""}`}
                >
                  {getPriorityBlocksForDayHour(selectedDay, hour).map((block) => {
                    const start = zonedDate(block.startTime, timeZone);
                    const released = !!block.releaseAt && parseISO(block.releaseAt) <= now;
                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openNewAppointment(parseISO(block.startTime), block.staffId);
                        }}
                        disabled={!canManageAppointments || parseISO(block.startTime) <= now}
                        className={`mb-1.5 w-full rounded-lg border p-2 text-left transition-colors disabled:cursor-default ${
                          released
                            ? "border-amber-500/10 bg-amber-500/[0.03] text-amber-500/60"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                        }`}
                        title={canManageAppointments ? t("bookPriority") : t("prioritySlot")}
                      >
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3 shrink-0" />
                          <span className="text-xs font-semibold">
                            {released ? t("releasedPrioritySlot") : t("prioritySlot")}
                          </span>
                          <span className="ml-auto text-[10px] opacity-80">{format(start, "HH:mm")}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] opacity-75">
                          {block.staffName}{block.reason ? ` · ${block.reason}` : ""}
                        </p>
                      </button>
                    );
                  })}
                  {getAptsForDayHour(selectedDay, hour).map((apt) => {
                    const sc = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                    return (
                      <button key={apt.id} onClick={(event) => { event.stopPropagation(); setSelected(apt); }} className={`w-full rounded-lg border ${sc.bg} ${sc.border} p-2 text-left transition-all hover:scale-[1.01] mb-1`}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 shrink-0 rounded-full ${sc.dot}`} />
                          <p className={`text-xs font-medium ${sc.text}`}>{apt.customerName}</p>
                          {apt.recurringBookingId && <RefreshCw className="h-3 w-3 shrink-0 text-brand-foreground opacity-70" />}
                          {apt.depositReceiptStatus === "PENDING" && <FileText className="h-3 w-3 shrink-0 text-sky-400" />}
                          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{format(zonedDate(apt.startTime, timeZone), "HH:mm")}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{apt.serviceName} · {apt.staffName}</p>
                        {apt.customerPhone && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{apt.customerPhone}</span>
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <AppointmentDetailDialog
          appointment={selected}
          onClose={() => setSelected(null)}
          canManageAppointments={canManageAppointments}
          posEnabled={posEnabled}
          services={services}
          staff={staff}
          clients={clients}
          currencyCode={currencyCode}
          timeZone={timeZone}
        />
      )}
      {editor && (
        <AppointmentEditor
          initialStart={editor.initialStart}
          initialStaffId={editor.initialStaffId}
          timeZone={timeZone}
          services={services}
          staff={staff}
          clients={clients}
          currencyCode={currencyCode}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
