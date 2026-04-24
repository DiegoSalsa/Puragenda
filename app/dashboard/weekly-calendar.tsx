"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, addWeeks, subWeeks, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { X, Check, UserCheck, UserX, Loader2, Clock, Mail, User, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface CalendarAppointment {
  id: string; customerName: string; customerEmail: string;
  startTime: string; endTime: string; status: string;
  serviceName: string; staffName: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00-18:00

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  PENDING:    { bg: "bg-white/[0.04]", border: "border-white/10", text: "text-white/70", dot: "bg-white/40" },
  CONFIRMED:  { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400" },
  CANCELLED:  { bg: "bg-red-500/8", border: "border-red-500/15", text: "text-red-400/60", dot: "bg-red-400" },
  CHECKED_IN: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-300", dot: "bg-blue-400" },
  NO_SHOW:    { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", dot: "bg-amber-400" },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmada", CANCELLED: "Cancelada",
  CHECKED_IN: "Asistió", NO_SHOW: "No asistió",
};

export function WeeklyCalendar({ appointments, weekStartISO }: { appointments: CalendarAppointment[]; weekStartISO: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const weekStart = parseISO(weekStartISO);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStartISO]);
  const today = new Date();

  function navigateWeek(direction: "prev" | "next") {
    const target = direction === "next" ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    const dateStr = format(target, "yyyy-MM-dd");
    router.push(`/dashboard?date=${dateStr}`);
  }

  function goToday() {
    router.push("/dashboard");
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

  function getAptsForDayHour(day: Date, hour: number) {
    return appointments.filter((a) => {
      const start = parseISO(a.startTime);
      return isSameDay(start, day) && start.getHours() === hour;
    });
  }

  const isCurrentWeek = isSameDay(startOfWeek(today, { weekStartsOn: 1 }), weekStart);

  return (
    <>
      <div className="rounded-2xl border border-white/[0.06] bg-[#111] overflow-hidden">
        {/* Header with navigation */}
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Calendario</h2>
            {!isCurrentWeek && (
              <button onClick={goToday} className="rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2.5 py-1 text-xs font-medium text-[#A78BFA] transition-all hover:bg-[#7C3AED]/20">
                Hoy
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigateWeek("prev")} className="rounded-lg border border-white/[0.06] p-2 text-white/40 transition-all hover:bg-white/[0.03] hover:text-white/70">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[180px] text-center text-sm text-white/50">
              {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
            </span>
            <button onClick={() => navigateWeek("next")} className="rounded-lg border border-white/[0.06] p-2 text-white/40 transition-all hover:bg-white/[0.03] hover:text-white/70">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06]">
              <div className="p-2" />
              {days.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div key={day.toISOString()} className={`border-l border-white/[0.06] p-3 text-center ${isToday ? "bg-[#7C3AED]/5" : ""}`}>
                    <p className="text-[10px] uppercase tracking-widest text-white/30">{format(day, "EEE", { locale: es })}</p>
                    <p className={`text-xl font-bold ${isToday ? "text-[#7C3AED]" : ""}`}>{format(day, "d")}</p>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.03]">
                <div className="flex items-start justify-end pr-2 pt-2 text-[11px] text-white/20 font-mono">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {days.map((day) => {
                  const apts = getAptsForDayHour(day, hour);
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={day.toISOString()} className={`border-l border-white/[0.06] min-h-[52px] p-1 ${isToday ? "bg-[#7C3AED]/[0.02]" : ""}`}>
                      {apts.map((apt) => {
                        const sc = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING;
                        return (
                          <button key={apt.id} onClick={() => setSelected(apt)} className={`w-full rounded-lg border ${sc.bg} ${sc.border} p-1.5 text-left transition-all hover:scale-[1.02] mb-1`}>
                            <div className="flex items-center gap-1.5">
                              <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${sc.dot}`} />
                              <p className={`text-[11px] font-medium truncate ${sc.text}`}>{apt.customerName}</p>
                            </div>
                            <p className="mt-0.5 text-[10px] text-white/30 truncate">{format(parseISO(apt.startTime), "HH:mm")} · {apt.serviceName}</p>
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
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-white/[0.06] bg-[#111] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h3 className="text-lg font-semibold">Detalle de Cita</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-white/30 hover:text-white/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${(STATUS_COLORS[selected.status] || STATUS_COLORS.PENDING).dot}`} />
                <span className="text-sm font-medium">{STATUS_LABELS[selected.status] || selected.status}</span>
              </div>
              <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-white/30" /><span className="text-white/40">Cliente:</span><span className="font-medium">{selected.customerName}</span></div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-white/30" /><span className="text-white/40">Email:</span><span>{selected.customerEmail}</span></div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-white/30" /><span className="text-white/40">Hora:</span><span>{format(parseISO(selected.startTime), "HH:mm")} - {format(parseISO(selected.endTime), "HH:mm")}</span></div>
                <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-white/30" /><span className="text-white/40">Servicio:</span><span>{selected.serviceName}</span></div>
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-white/30" /><span className="text-white/40">Staff:</span><span>{selected.staffName}</span></div>
              </div>
              {!["CANCELLED", "CHECKED_IN", "NO_SHOW"].includes(selected.status) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white/40">Cambiar estado:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.status === "PENDING" && (<>
                      <button onClick={() => handleStatus("CONFIRMED")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-sm font-medium text-emerald-400 disabled:opacity-50">{loading === "CONFIRMED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirmar</button>
                      <button onClick={() => handleStatus("CANCELLED")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50">{loading === "CANCELLED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Cancelar</button>
                    </>)}
                    {selected.status === "CONFIRMED" && (<>
                      <button onClick={() => handleStatus("CHECKED_IN")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 py-2.5 text-sm font-medium text-blue-400 disabled:opacity-50">{loading === "CHECKED_IN" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />} Asistió</button>
                      <button onClick={() => handleStatus("NO_SHOW")} disabled={loading !== null} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 py-2.5 text-sm font-medium text-amber-400 disabled:opacity-50">{loading === "NO_SHOW" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />} No asistió</button>
                      <button onClick={() => handleStatus("CANCELLED")} disabled={loading !== null} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50">{loading === "CANCELLED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Cancelar cita</button>
                    </>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
