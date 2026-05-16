"use client";

import { useState } from "react";
import { format, parseISO, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  RefreshCw, Mail, Loader2, CheckCircle2, XCircle, PauseCircle, PlayCircle,
  Calendar, Clock, User, Briefcase, AlertTriangle, Shield,
} from "lucide-react";

// ── Types ──

interface SerializedAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface SerializedOverride {
  id: string;
  originalDate: string;
  action: string;
  newTime: string | null;
  reason: string | null;
  createdAt: string;
}

interface BookingData {
  id: string;
  customerName: string;
  status: string;
  selectedDays: number[];
  selectedTimes: Record<string, string>;
  startDate: string;
  endDate: string;
  durationMonths: number;
  pausedUntil: string | null;
  service: { name: string; duration: number };
  staff: { name: string } | null;
  business: { name: string; primaryColor: string; slug: string };
  appointments: SerializedAppointment[];
  sessionOverrides: SerializedOverride[];
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE: { label: "Activo", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  PAUSED: { label: "Pausado", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  PENDING_APPROVAL: { label: "Pendiente", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  CANCELLED: { label: "Cancelado", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  COMPLETED: { label: "Completado", color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border" },
};

export function PlanClient({ token }: { token: string }) {
  const [step, setStep] = useState<"identity" | "main">("identity");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pauseDate, setPauseDate] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mi-plan/${token}?email=${encodeURIComponent(email.trim())}`);
      if (res.status === 403) { setError("El email ingresado no coincide con el de la suscripción"); return; }
      if (res.status === 404) { setError("Link inválido o expirado"); return; }
      if (!res.ok) { setError("Error al verificar"); return; }
      const data = await res.json();
      setBooking(data);
      setStep("main");
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  }

  async function refetchBooking() {
    try {
      const res = await fetch(`/api/mi-plan/${token}?email=${encodeURIComponent(email)}`);
      if (res.ok) setBooking(await res.json());
    } catch { /* silent */ }
  }

  async function handleAction(action: string, extra?: Record<string, string>) {
    setActionLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/mi-plan/${token}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al ejecutar acción"); return; }
      await refetchBooking();
      setConfirmCancel(false);
      setPauseDate("");
    } catch { setError("Error de conexión"); }
    finally { setActionLoading(null); }
  }

  // ── Identity step ──
  if (step === "identity") {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Shield className="mx-auto h-12 w-12 text-[#7C3AED]" />
          <h1 className="text-2xl font-bold">Gestionar mi plan</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa el email con el que te suscribiste para verificar tu identidad.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED]"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white transition-all hover:bg-[#6D28D9] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Verificar identidad
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground/50">
          Powered by <span className="font-semibold text-[#7C3AED]">Puragenda</span>
        </p>
      </div>
    );
  }

  // ── Main view ──
  if (!booking) return null;

  const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.COMPLETED;
  const now = new Date();
  const completedCount = booking.appointments.filter((a) => ["CHECKED_IN", "COMPLETED"].includes(a.status)).length;
  const totalCount = booking.appointments.length;
  const nextSession = booking.appointments.find((a) => !isPast(parseISO(a.startTime)) && a.status !== "CANCELLED");
  const pc = booking.business.primaryColor || "#7C3AED";

  return (
    <div className="w-full max-w-md space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: pc }}>{booking.business.name}</h1>
            <p className="text-sm text-muted-foreground">{booking.service.name}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-lg ${sc.bg} border ${sc.border} px-3 py-1 text-xs font-medium ${sc.color}`}>
            <RefreshCw className="h-3 w-3" />
            {sc.label}
          </span>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{booking.customerName}</span>
          </div>
          {booking.staff && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Profesional:</span>
              <span className="font-medium">{booking.staff.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Período:</span>
            <span className="font-medium">
              {format(parseISO(booking.startDate), "d MMM", { locale: es })} — {format(parseISO(booking.endDate), "d MMM yyyy", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Horario:</span>
            <span className="font-medium">
              {booking.selectedDays.map((d) => DAY_NAMES[d]).join(", ")}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{completedCount} / {totalCount} sesiones</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`, backgroundColor: pc }}
            />
          </div>
        </div>

        {/* Next session */}
        {nextSession && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
            <Calendar className="h-5 w-5 shrink-0" style={{ color: pc }} />
            <div>
              <p className="text-xs text-muted-foreground">Próxima sesión</p>
              <p className="text-sm font-semibold capitalize">
                {format(parseISO(nextSession.startTime), "EEEE d 'de' MMMM", { locale: es })}
                <span className="text-muted-foreground font-normal"> · {format(parseISO(nextSession.startTime), "HH:mm")} - {format(parseISO(nextSession.endTime), "HH:mm")}</span>
              </p>
            </div>
          </div>
        )}

        {booking.pausedUntil && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-400">
            <PauseCircle className="h-4 w-4 shrink-0" />
            Pausado hasta {format(parseISO(booking.pausedUntil), "d 'de' MMMM yyyy", { locale: es })}
          </div>
        )}
      </div>

      {/* Actions */}
      {(booking.status === "ACTIVE" || booking.status === "PAUSED") && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Acciones</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {booking.status === "ACTIVE" && (
            <>
              {/* Pause */}
              <div className="space-y-2">
                <input
                  type="date"
                  value={pauseDate}
                  onChange={(e) => setPauseDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  onClick={() => pauseDate && handleAction("pause", { pauseUntil: pauseDate })}
                  disabled={!pauseDate || actionLoading !== null}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 py-2.5 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/20 disabled:opacity-50"
                >
                  {actionLoading === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                  Pausar plan
                </button>
              </div>
            </>
          )}

          {booking.status === "PAUSED" && (
            <button
              onClick={() => handleAction("resume")}
              disabled={actionLoading !== null}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {actionLoading === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Reanudar plan
            </button>
          )}

          {/* Cancel */}
          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4" />
              Cancelar todo el plan
            </button>
          ) : (
            <div className="space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-xs text-red-400 font-medium">¿Estás seguro? Esta acción cancela todas las sesiones futuras y no se puede deshacer.</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  No, volver
                </button>
                <button
                  onClick={() => handleAction("cancel")}
                  disabled={actionLoading !== null}
                  className="rounded-xl bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                  Sí, cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sessions list */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Sesiones ({totalCount})</h2>
        <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
          {booking.appointments.map((apt) => {
            const past = isPast(parseISO(apt.startTime));
            const cancelled = apt.status === "CANCELLED";
            return (
              <div
                key={apt.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                  cancelled ? "border-red-500/10 bg-red-500/5 line-through opacity-60" :
                  past ? "border-border bg-muted/30 opacity-60" :
                  "border-border bg-muted/50"
                }`}
              >
                <span className={`font-medium capitalize ${cancelled ? "text-red-400" : ""}`}>
                  {format(parseISO(apt.startTime), "EEE d MMM", { locale: es })}
                </span>
                <span className="text-muted-foreground">
                  {format(parseISO(apt.startTime), "HH:mm")} - {format(parseISO(apt.endTime), "HH:mm")}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  cancelled ? "bg-red-500/10 text-red-400" :
                  apt.status === "COMPLETED" || apt.status === "CHECKED_IN" ? "bg-emerald-500/10 text-emerald-400" :
                  past ? "bg-muted text-muted-foreground" :
                  "bg-[#7C3AED]/10 text-[#A78BFA]"
                }`}>
                  {cancelled ? "Cancelada" : apt.status === "COMPLETED" || apt.status === "CHECKED_IN" ? "Realizada" : past ? "Pasada" : "Próxima"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overrides history */}
      {booking.sessionOverrides.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Historial de cambios</h2>
          <div className="space-y-2">
            {booking.sessionOverrides.map((ov) => (
              <div key={ov.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">
                    {format(parseISO(ov.originalDate), "EEE d MMM yyyy", { locale: es })}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    ov.action === "CANCELLED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {ov.action === "CANCELLED" ? "Cancelada" : "Hora cambiada"}
                  </span>
                </div>
                {ov.reason && <p className="text-muted-foreground">Motivo: {ov.reason}</p>}
                {ov.newTime && <p className="text-muted-foreground">Nueva hora: {ov.newTime}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground/50">
        Powered by <span className="font-semibold" style={{ color: pc }}>Puragenda</span>
      </p>
    </div>
  );
}
