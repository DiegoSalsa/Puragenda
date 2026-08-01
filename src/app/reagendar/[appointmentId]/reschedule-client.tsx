"use client";

import { useState, useTransition } from "react";
import { format, parseISO, addDays, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  Calendar, Clock, Briefcase, User, Loader2, CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import { rescheduleAppointmentAction } from "@/server/actions/appointment.actions";

interface Props {
  appointmentId: string;
  token: string;
  business: {
    name: string;
    slug: string;
    primaryColor: string;
    rescheduleHoursLimit: number;
    timezone: string;
  };
  service: { name: string; duration: number };
  staff: { id: string; name: string } | null;
  currentStart: string;
  currentEnd: string;
}

export function RescheduleClient({ appointmentId, token, business, service, staff, currentStart, currentEnd }: Props) {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newAptId, setNewAptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pc = business.primaryColor;
  const minDate = format(
    addDays(toZonedTime(new Date(), business.timezone), 1),
    "yyyy-MM-dd",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate || !newTime) return;
    setError(null);

    const newStart = fromZonedTime(
      `${newDate}T${newTime}:00`,
      business.timezone,
    );
    const newEnd = addMinutes(newStart, service.duration);

    startTransition(async () => {
      const result = await rescheduleAppointmentAction(
        appointmentId,
        newStart.toISOString(),
        newEnd.toISOString(),
        token,
      );
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(true);
        setNewAptId(result.newAppointmentId ?? null);
      }
    });
  }

  // ── Success state ──
  if (success) {
    const newStart = toZonedTime(
      fromZonedTime(`${newDate}T${newTime}:00`, business.timezone),
      business.timezone,
    );
    const newEnd = addMinutes(newStart, service.duration);
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="text-xl font-bold">¡Cita reagendada!</h1>
          <p className="text-sm text-muted-foreground">Tu cita ha sido actualizada exitosamente. Recibirás un email de confirmación.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: pc }}>Nueva cita</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Servicio:</span>
              <span className="font-medium">{service.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium capitalize">{format(newStart, "EEEE d 'de' MMMM yyyy", { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Hora:</span>
              <span className="font-medium">{format(newStart, "HH:mm")} - {format(newEnd, "HH:mm")}</span>
            </div>
            {staff && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Profesional:</span>
                <span className="font-medium">{staff.name}</span>
              </div>
            )}
          </div>
        </div>

        {newAptId && (
          <div className="text-center">
            <a
              href={`/cita/${newAptId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
            >
              Ver detalle de cita
            </a>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/50">
          Powered by <span className="font-semibold" style={{ color: pc }}>Puragenda</span>
        </p>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="w-full max-w-md space-y-5">
      {/* Current appointment summary */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h1 className="text-lg font-bold" style={{ color: pc }}>Reagendar cita</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona una nueva fecha y hora para tu cita en <strong className="text-foreground">{business.name}</strong>.
        </p>

        <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2 text-sm text-foreground">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cita actual</p>
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{service.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium capitalize">
              {format(
                toZonedTime(parseISO(currentStart), business.timezone),
                "EEEE d 'de' MMMM yyyy",
                { locale: es },
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {format(toZonedTime(parseISO(currentStart), business.timezone), "HH:mm")} -{" "}
              {format(toZonedTime(parseISO(currentEnd), business.timezone), "HH:mm")}
            </span>
          </div>
          {staff && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{staff.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* New date/time form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nueva fecha y hora</p>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Fecha</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            min={minDate}
            required
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Hora</label>
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]"
          />
        </div>

        {newDate && newTime && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3 shrink-0" style={{ color: pc }} />
            <span>
              Nueva cita: <strong className="text-foreground capitalize">{format(new Date(`${newDate}T${newTime}:00`), "EEEE d MMM", { locale: es })}</strong>
              {" "}a las <strong className="text-foreground">{newTime}</strong>
              {" "}({service.duration} min)
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !newDate || !newTime}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:saturate-50"
          style={{ backgroundColor: pc }}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar reagendamiento
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Puedes reagendar hasta {business.rescheduleHoursLimit}h antes de tu cita.
        </p>
      </form>

      <p className="text-center text-xs text-white/60">
        Powered by <span className="font-semibold" style={{ color: pc }}>Puragenda</span>
      </p>
    </div>
  );
}
