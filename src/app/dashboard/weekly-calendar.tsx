"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { addDays, addWeeks, subWeeks, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { X, Check, UserCheck, UserX, Loader2, Clock, Mail, Phone, User, ChevronLeft, ChevronRight, CalendarDays, RefreshCw, FileText, Link2, Plus, Pencil, Crown } from "lucide-react";
import {
  AppointmentEditor,
  type AppointmentEditorClient,
  type AppointmentEditorService,
  type AppointmentEditorStaff,
  type EditableAppointment,
} from "./appointment-editor";

interface CalendarAppointment {
  id: string; customerName: string; customerEmail: string;
  startTime: string; endTime: string; status: string;
  serviceId: string; serviceName: string; staffId: string | null; staffName: string;
  clientId: string | null; customerPhone: string | null;
  selectedOptions?: { alternativeId?: string; categoryName: string; alternativeName: string; priceDelta: number; durationDelta: number }[];
  recurringBookingId?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
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
    const start = parseISO(apt.startTime);
    const end = parseISO(apt.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    minMinutes = Math.min(minMinutes, start.getHours() * 60 + start.getMinutes());
    maxMinutes = Math.max(maxMinutes, end.getHours() * 60 + end.getMinutes());
  }
  for (const block of priorityBlocks) {
    const start = parseISO(block.startTime);
    const end = parseISO(block.endTime);
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

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  PENDING:          { bg: "bg-muted/50", border: "border-border", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  AWAITING_PAYMENT: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-300", dot: "bg-orange-400" },
  CONFIRMED:        { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400" },
  CANCELLED:        { bg: "bg-red-500/8", border: "border-red-500/15", text: "text-red-400/60", dot: "bg-red-400" },
  CHECKED_IN:       { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-300", dot: "bg-blue-400" },
  NO_SHOW:          { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", dot: "bg-amber-400" },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", AWAITING_PAYMENT: "Esperando pago", CONFIRMED: "Confirmada", CANCELLED: "Cancelada",
  CHECKED_IN: "Asistió", NO_SHOW: "Inasistencia",
};

export function WeeklyCalendar({
  appointments,
  priorityBlocks = [],
  weekStartISO,
  agendaMode,
  businessHours = [],
  services = [],
  staff = [],
  clients = [],
  canManageAppointments = false,
}: {
  appointments: CalendarAppointment[];
  priorityBlocks?: CalendarPriorityBlock[];
  weekStartISO: string;
  agendaMode?: "mine";
  businessHours?: CalendarBusinessHour[];
  services?: AppointmentEditorService[];
  staff?: AppointmentEditorStaff[];
  clients?: AppointmentEditorClient[];
  canManageAppointments?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [cancellingSession, setCancellingSession] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [editor, setEditor] = useState<{
    appointment?: EditableAppointment;
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
  const today = new Date();

  function navigateWeek(direction: "prev" | "next") {
    const target = direction === "next" ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    const dateStr = format(target, "yyyy-MM-dd");
    router.push(`/dashboard?date=${dateStr}${agendaMode === "mine" ? "&agenda=mine" : ""}`);
  }

  function goToday() {
    router.push(agendaMode === "mine" ? "/dashboard?agenda=mine" : "/dashboard");
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

  async function handleStatus(status: string) {
    if (!selected) return;
    setLoading(status);
    try {
      await fetch(`/api/dashboard/appointments/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setSelected(null);
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setLoading(null); }
  }

  async function handleCancelRecurringSession(mode: "single" | "future") {
    if (!selected) return;
    setCancellingSession(true);
    try {
      await fetch(`/api/dashboard/appointments/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      // If cancelling all future, cancel them via the recurring service
      if (mode === "future" && selected.recurringBookingId) {
        await fetch(`/api/dashboard/recurring/${selected.recurringBookingId}/cancel-future`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromDate: selected.startTime }),
        });
      }
      setSelected(null);
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setCancellingSession(false); }
  }

  function getAptsForDayHour(day: Date, hour: number) {
    return appointments.filter((a) => {
      const start = parseISO(a.startTime);
      return isSameDay(start, day) && start.getHours() === hour;
    });
  }

  function getPriorityBlocksForDayHour(day: Date, hour: number) {
    return priorityBlocks.filter((block) => {
      const start = parseISO(block.startTime);
      return isSameDay(start, day) && start.getHours() === hour;
    });
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

  function openEditAppointment(appointment: CalendarAppointment) {
    if (!canManageAppointments || appointment.recurringBookingId) return;
    setSelected(null);
    setEditor({
      appointment: {
        id: appointment.id,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        customerPhone: appointment.customerPhone,
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        staffId: appointment.staffId,
        startTime: appointment.startTime,
        internalNotes: appointment.internalNotes ?? null,
        selectedOptions: appointment.selectedOptions ?? [],
      },
    });
  }

  const isCurrentWeek = isSameDay(startOfWeek(today, { weekStartsOn: 1 }), weekStart);
  const selectedDay = days[selectedDayIdx] ?? days[0];
  const isDayToday = isSameDay(selectedDay, today);
  const visibleHours = useMemo(
    () => buildVisibleHours(businessHours, appointments, priorityBlocks),
    [businessHours, appointments, priorityBlocks],
  );

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-base sm:text-lg font-semibold">Calendario</h2>
              {!isCurrentWeek && (
                <button onClick={goToday} className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2.5 py-1 text-xs font-medium text-[#A78BFA] transition-all hover:bg-[#7C3AED]/20">
                  Hoy
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canManageAppointments && (
                <button
                  type="button"
                  onClick={() => openNewAppointment()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6D28D9]"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva cita
                </button>
              )}
              <div className="flex items-center rounded-xl border border-border bg-muted p-0.5">
                <button
                  onClick={() => setViewMode("day")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "day" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Día
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Semana
                </button>
              </div>
            </div>
          </div>
          {/* Navigation row */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={viewMode === "week" ? () => navigateWeek("prev") : prevDay}
              className="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-sm">
              {viewMode === "week" ? (
                <span className="text-muted-foreground">
                  {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
                </span>
              ) : (
                <span className="font-medium capitalize">
                  {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </span>
              )}
            </span>
            <button
              onClick={viewMode === "week" ? () => navigateWeek("next") : nextDay}
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
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={day.toISOString()} className={`border-l border-border p-3 text-center ${isToday ? "bg-[#7C3AED]/5" : ""}`}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{format(day, "EEE", { locale: es })}</p>
                      <p className={`text-xl font-bold ${isToday ? "text-[#7C3AED]" : ""}`}>{format(day, "d")}</p>
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
                    const isToday = isSameDay(day, today);
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          const start = new Date(day);
                          start.setHours(hour, 0, 0, 0);
                          if (start > new Date()) openNewAppointment(start);
                        }}
                        className={`border-l border-border min-h-[52px] p-1 min-w-0 overflow-hidden ${isToday ? "bg-[#7C3AED]/[0.02]" : ""} ${canManageAppointments ? "cursor-pointer hover:bg-[#7C3AED]/5" : ""}`}
                      >
                        {getPriorityBlocksForDayHour(day, hour).map((block) => {
                          const start = parseISO(block.startTime);
                          const released = !!block.releaseAt && parseISO(block.releaseAt) <= today;
                          return (
                            <button
                              key={block.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openNewAppointment(start, block.staffId);
                              }}
                              disabled={!canManageAppointments || start <= today}
                              className={`mb-1 w-full rounded-lg border p-1.5 text-left transition-colors disabled:cursor-default ${
                                released
                                  ? "border-amber-500/10 bg-amber-500/[0.03] text-amber-500/60"
                                  : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                              }`}
                              title={canManageAppointments ? "Agendar una clienta en este cupo prioritario" : "Cupo prioritario"}
                            >
                              <div className="flex items-center gap-1">
                                <Crown className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate text-[10px] font-semibold">
                                  {released ? "Cupo liberado" : "Prioritario"}
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
                                {apt.recurringBookingId && <RefreshCw className="h-2.5 w-2.5 shrink-0 text-[#7C3AED] opacity-70" />}
                              </div>
                              <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{format(parseISO(apt.startTime), "HH:mm")} · {apt.serviceName}</p>
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
                    const start = new Date(selectedDay);
                    start.setHours(hour, 0, 0, 0);
                    if (start > new Date()) openNewAppointment(start);
                  }}
                  className={`border-l border-border min-h-[56px] p-1.5 ${isDayToday ? "bg-[#7C3AED]/[0.02]" : ""} ${canManageAppointments ? "cursor-pointer hover:bg-[#7C3AED]/5" : ""}`}
                >
                  {getPriorityBlocksForDayHour(selectedDay, hour).map((block) => {
                    const start = parseISO(block.startTime);
                    const released = !!block.releaseAt && parseISO(block.releaseAt) <= today;
                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openNewAppointment(start, block.staffId);
                        }}
                        disabled={!canManageAppointments || start <= today}
                        className={`mb-1.5 w-full rounded-lg border p-2 text-left transition-colors disabled:cursor-default ${
                          released
                            ? "border-amber-500/10 bg-amber-500/[0.03] text-amber-500/60"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                        }`}
                        title={canManageAppointments ? "Agendar una clienta en este cupo prioritario" : "Cupo prioritario"}
                      >
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3 shrink-0" />
                          <span className="text-xs font-semibold">
                            {released ? "Cupo prioritario liberado" : "Cupo prioritario"}
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
                          {apt.recurringBookingId && <RefreshCw className="h-3 w-3 shrink-0 text-[#7C3AED] opacity-70" />}
                          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{format(parseISO(apt.startTime), "HH:mm")}</span>
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

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold">Detalle de Cita</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${(STATUS_COLORS[selected.status] || STATUS_COLORS.PENDING).dot}`} />
                <span className="text-sm font-medium">{STATUS_LABELS[selected.status] || selected.status}</span>
                {selected.recurringBookingId && (
                  <span className="ml-auto flex items-center gap-1 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 px-2 py-0.5 text-[10px] font-medium text-[#A78BFA]">
                    <RefreshCw className="h-2.5 w-2.5" /> Recurrente
                  </span>
                )}
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-4 text-sm">
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Cliente:</span><span className="font-medium">{selected.customerName}</span></div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Email:</span><span>{selected.customerEmail}</span></div>
                {selected.customerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Teléfono:</span>
                    <a
                      href={`tel:${selected.customerPhone.replace(/[^\d+]/g, "")}`}
                      className="font-medium text-[#A78BFA] hover:underline"
                    >
                      {selected.customerPhone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Hora:</span><span>{format(parseISO(selected.startTime), "HH:mm")} - {format(parseISO(selected.endTime), "HH:mm")}</span></div>
                <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Servicio:</span><span>{selected.serviceName}</span></div>
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Staff:</span><span>{selected.staffName}</span></div>
                {(selected.selectedOptions?.length ?? 0) > 0 && (
                  <div className="space-y-1 border-t border-border pt-3">
                    {selected.selectedOptions!.map((option) => (
                      <div key={`${option.categoryName}-${option.alternativeName}`} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{option.categoryName}:</span>
                        <span className="font-medium text-right">{option.alternativeName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client private notes (CRM Light) */}
              {selected.clientNotes && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="h-3 w-3 text-amber-400" />
                    <span className="text-[11px] font-medium text-amber-400">Nota del cliente</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selected.clientNotes}</p>
                </div>
              )}

              {selected.internalNotes && (
                <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-[#A78BFA]" />
                    <span className="text-[11px] font-medium text-[#A78BFA]">Nota de la cita</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{selected.internalNotes}</p>
                </div>
              )}

              {/* Recurring-specific section */}
              {selected.recurringBookingId && (
                <div className="space-y-2">
                  <a href="/dashboard/recurring" className="flex items-center gap-1.5 text-xs font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors">
                    <Link2 className="h-3 w-3" /> Ver todas las sesiones de este plan
                  </a>
                  {!["CANCELLED", "NO_SHOW"].includes(selected.status) && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCancelRecurringSession("single")}
                        disabled={cancellingSession}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 py-2 text-xs font-medium text-red-400 disabled:opacity-50 transition-all"
                      >
                        {cancellingSession ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        Cancelar esta sesion
                      </button>
                      <button
                        onClick={() => handleCancelRecurringSession("future")}
                        disabled={cancellingSession}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 py-2 text-xs font-medium text-red-400 disabled:opacity-50 transition-all"
                      >
                        {cancellingSession ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        Cancelar siguientes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!["CANCELLED", "CHECKED_IN", "NO_SHOW"].includes(selected.status) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Cambiar estado:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.status === "PENDING" && (<>
                      <button onClick={() => handleStatus("CONFIRMED")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-sm font-medium text-emerald-400 disabled:opacity-50">{loading === "CONFIRMED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirmar</button>
                      <button onClick={() => handleStatus("CANCELLED")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50">{loading === "CANCELLED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Cancelar</button>
                    </>)}
                    {selected.status === "CONFIRMED" && (<>
                      <button onClick={() => handleStatus("CHECKED_IN")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 py-2.5 text-sm font-medium text-blue-400 disabled:opacity-50">{loading === "CHECKED_IN" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />} Asistio</button>
                      <button onClick={() => handleStatus("NO_SHOW")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 py-2.5 text-sm font-medium text-amber-400 disabled:opacity-50">{loading === "NO_SHOW" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />} Inasistencia</button>
                      <button onClick={() => handleStatus("CANCELLED")} disabled={loading !== null} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50">{loading === "CANCELLED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Cancelar cita</button>
                    </>)}
                  </div>
                </div>
              )}

              {canManageAppointments && !selected.recurringBookingId && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(selected.status) && (
                <button
                  type="button"
                  onClick={() => openEditAppointment(selected)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 py-2.5 text-sm font-medium text-[#A78BFA]"
                >
                  <Pencil className="h-4 w-4" /> Editar o reagendar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {editor && (
        <AppointmentEditor
          appointment={editor.appointment}
          initialStart={editor.initialStart}
          initialStaffId={editor.initialStaffId}
          services={services}
          staff={staff}
          clients={clients}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
