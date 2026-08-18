"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, CheckCircle2, XCircle, PauseCircle, PlayCircle, Trash2,
  ChevronLeft, Search, StickyNote, Clock, Calendar,
  User, Link2, X, Loader2
} from "lucide-react";
import {
  approveRecurringBookingAction,
  rejectRecurringBookingAction,
  cancelFullRecurringAction,
  pauseRecurringAction,
  resumeRecurringAction,
  addInternalNoteAction,
} from "@/server/actions/recurring.actions";

const WEEK_NAMES: Record<number, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mie", 4: "Jue", 5: "Vie", 6: "Sab" };

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Activa", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  PENDING_APPROVAL: { label: "Pendiente aprobacion", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  PAUSED: { label: "Pausada", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  CANCELLED: { label: "Cancelada", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  COMPLETED: { label: "Completada", color: "text-muted-foreground", bg: "bg-muted border-border" },
};

const APPOINTMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-500/80",
  CONFIRMED: "bg-emerald-500/80",
  CHECKED_IN: "bg-emerald-600",
  CANCELLED: "bg-red-500/50",
  NO_SHOW: "bg-red-700/50",
};

type FilterStatus = "ALL" | "ACTIVE" | "PENDING_APPROVAL" | "PAUSED" | "COMPLETED" | "CANCELLED";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface SessionOverride {
  id: string;
  originalDate: string;
  newTime: string | null;
  reason: string | null;
  requestedByClient: boolean;
  createdAt: string;
}

interface RecurringBooking {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerRut: string | null;
  serviceName: string;
  serviceId: string;
  staffName: string | null;
  staffId: string | null;
  clientId: string | null;
  selectedDays: number[];
  selectedTimes: Record<string, string>;
  startDate: string;
  endDate: string;
  durationMonths: number;
  internalNotes: string | null;
  healthAnswers: Record<string, string> | null;
  healthFreeText: string | null;
  pausedUntil: string | null;
  managementToken: string | null;
  createdAt: string;
  totalAppointments: number;
  completedAppointments: number;
  appointments: Appointment[];
  sessionOverrides: SessionOverride[];
}

export function RecurringClient({
  bookings,
  locale,
  timezone,
  taxIdLabel,
}: {
  bookings: RecurringBooking[];
  locale: string;
  timezone: string;
  taxIdLabel: string;
}) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Panel state
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showPause, setShowPause] = useState(false);
  const [pauseUntil, setPauseUntil] = useState("");
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteText, setNoteText] = useState("");

  const selected = bookings.find((b) => b.id === selectedId) ?? null;

  const filtered = bookings.filter((b) => {
    if (filter !== "ALL" && b.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.customerEmail.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        (b.staffName?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  function openDetail(id: string) {
    const b = bookings.find((x) => x.id === id);
    setSelectedId(id);
    setNoteText(b?.internalNotes ?? "");
    setShowReject(false);
    setShowPause(false);
    setShowNoteEditor(false);
    setRejectReason("");
    setPauseUntil("");
  }

  function closeDetail() {
    setSelectedId(null);
  }

  function doAction(key: string, fn: () => Promise<unknown>) {
    setLoadingAction(key);
    startTransition(async () => {
      await fn();
      router.refresh();
      setLoadingAction(null);
      setShowReject(false);
      setShowPause(false);
      setShowNoteEditor(false);
    });
  }

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "";

  return (
    <div className="flex min-w-0 max-w-full gap-4 min-h-[70vh]">
      {/* ── LEFT: list ── */}
      <div className={`flex flex-col gap-3 ${selected ? "hidden lg:flex lg:w-80 shrink-0" : "w-full"}`}>
        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "ACTIVE", "PENDING_APPROVAL", "PAUSED", "COMPLETED", "CANCELLED"] as FilterStatus[]).map((s) => {
            const meta = s === "ALL" ? null : STATUS_LABELS[s];
            const count = s === "ALL" ? bookings.length : bookings.filter((b) => b.status === s).length;
            const isActive = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#7C3AED]"
                    : "border-border text-muted-foreground hover:border-[#7C3AED]/20 hover:text-foreground"
                }`}
              >
                {s === "ALL" ? "Todas" : meta?.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={legacy("I0awLAEsGcyb")}
            className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
          />
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center">
              <RefreshCw className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground"><LocalizedText id="W2KV5qesDLQQ" />{filter !== "ALL" ? ` con estado "${STATUS_LABELS[filter]?.label}"` : ""}</p>
            </div>
          )}
          {filtered.map((b) => {
            const meta = STATUS_LABELS[b.status] ?? STATUS_LABELS.CANCELLED;
            const isSelected = selectedId === b.id;
            const nextApt = b.appointments.find(
              (a) => new Date(a.startTime) > new Date() && a.status !== "CANCELLED"
            );
            return (
              <button
                key={b.id}
                onClick={() => openDetail(b.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                  isSelected
                    ? "border-[#7C3AED]/40 bg-[#7C3AED]/5"
                    : "border-border bg-card hover:border-[#7C3AED]/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">
                      {b.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{b.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.serviceName}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-medium ${meta.color} ${meta.bg}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{b.selectedDays.map((d) => WEEK_NAMES[d]).join(", ")}</span>
                  <span>·</span>
                  <span>{b.durationMonths} {b.durationMonths === 1 ? "mes" : "meses"}</span>
                  {nextApt && (
                    <>
                      <span>·</span>
                      <span className="text-[#7C3AED]">
                        <LocalizedText id="qnPO135fJqiV" /> {new Date(nextApt.startTime).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: timezone })}
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: detail panel ── */}
      {selected && (
        <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={closeDetail}
                className="lg:hidden rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="font-semibold truncate">{selected.customerName}</p>
                <p className="text-xs text-muted-foreground truncate">{selected.serviceName}{selected.staffName ? ` · ${selected.staffName}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const meta = STATUS_LABELS[selected.status] ?? STATUS_LABELS.CANCELLED;
                return (
                  <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${meta.color} ${meta.bg}`}>
                    {meta.label}
                  </span>
                );
              })()}
              <button onClick={closeDetail} className="hidden lg:flex rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {/* Client info */}
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="wV364-RNk213" /></p>
                <div className="flex min-w-0 items-start gap-2"><User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 break-all">{selected.customerEmail}</span></div>
                {selected.customerPhone && <div className="flex min-w-0 items-start gap-2 text-muted-foreground"><span className="h-3.5 w-3.5 shrink-0 text-center text-xs">T</span><span className="min-w-0 break-all text-foreground">{selected.customerPhone}</span></div>}
                {selected.customerRut && <div className="flex min-w-0 items-start gap-2 text-muted-foreground"><span className="h-3.5 w-3.5 shrink-0 text-center text-xs"><LocalizedText id="OEOXHc_e5Qg-" /></span><span className="min-w-0 break-words text-foreground">{taxIdLabel}: {selected.customerRut}</span></div>}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="-o7Qvavda8sc" /></p>
                <div className="flex min-w-0 items-start gap-2"><Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words">{new Date(selected.startDate).toLocaleDateString(locale, { timeZone: "UTC" })} - {new Date(selected.endDate).toLocaleDateString(locale, { timeZone: "UTC" })}</span></div>
                <div className="flex min-w-0 items-start gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words">{selected.selectedDays.map((d) => `${WEEK_NAMES[d]} ${selected.selectedTimes[String(d)]}`).join(" / ")}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {selected.completedAppointments} / {selected.totalAppointments} <LocalizedText id="Kzy0uzeiNOS_" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7C3AED]/60 transition-all"
                    style={{ width: selected.totalAppointments > 0 ? `${(selected.completedAppointments / selected.totalAppointments) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Health form */}
            {selected.healthAnswers && Object.keys(selected.healthAnswers).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="LyTjbgn_C_Eu" /></p>
                <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5 text-sm">
                  {Object.entries(selected.healthAnswers).map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground">P{parseInt(k) + 1}: </span><span>{v}</span></div>
                  ))}
                  {selected.healthFreeText && <div><span className="text-muted-foreground"><LocalizedText id="IHQedcFUmsMN" /> </span><span>{selected.healthFreeText}</span></div>}
                </div>
              </div>
            )}

            {/* Appointments mini-calendar */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="03aozig9yeUr" />{selected.appointments.length})</p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {selected.appointments.map((a) => {
                  const d = new Date(a.startTime);
                  const isPast = d < new Date();
                  const color = APPOINTMENT_STATUS_COLOR[a.status] ?? "bg-muted";
                  return (
                    <div
                      key={a.id}
                      title={`${d.toLocaleDateString(locale, { timeZone: timezone })} ${d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: timezone })} - ${a.status}`}
                      className={`flex flex-col items-center justify-center rounded-lg border border-border/50 p-2 text-xs w-14 text-center ${isPast ? "opacity-50" : ""}`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full mb-1 ${color}`} />
                      <span className="font-medium">{d.toLocaleDateString(locale, { day: "numeric", month: "numeric", timeZone: timezone })}</span>
                      <span className="text-muted-foreground">{d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: timezone })}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session overrides history */}
            {selected.sessionOverrides.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="SjqN74BwHg7r" />{selected.sessionOverrides.length})</p>
                <div className="space-y-1.5">
                  {selected.sessionOverrides.map((o) => (
                    <div key={o.id} className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{new Date(o.originalDate).toLocaleDateString(locale, { timeZone: timezone })}</span>
                        {o.newTime && <span className="text-[#7C3AED]"><LocalizedText id="93xQpK2XC2yY" /> {o.newTime}</span>}
                        {!o.newTime && <span className="text-red-500"><LocalizedText id="ZkayZHgaY7aC" /></span>}
                      </div>
                      {o.reason && <p className="text-muted-foreground">{o.reason}</p>}
                      <p className="text-muted-foreground">{o.requestedByClient ? legacy("63wGgHSAlblg") : legacy("l6xN9n4TNjSO")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="dM2vqmftDgku" /></p>
                <button
                  onClick={() => { setShowNoteEditor((v) => !v); setNoteText(selected.internalNotes ?? ""); }}
                  className="text-xs text-[#7C3AED] hover:underline"
                >
                  {showNoteEditor ? "Cancelar" : selected.internalNotes ? "Editar" : legacy("H-PzUezh1Xbn")}
                </button>
              </div>
              {!showNoteEditor && selected.internalNotes && (
                <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground whitespace-pre-wrap">
                  {selected.internalNotes}
                </div>
              )}
              {!showNoteEditor && !selected.internalNotes && (
                <p className="text-xs text-muted-foreground italic"><LocalizedText id="_LcWzOUBzPla" /></p>
              )}
              {showNoteEditor && (
                <div className="space-y-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    placeholder={legacy("qX7umq4xXlKL")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
                  />
                  <button
                    disabled={pending}
                    onClick={() => doAction("note", () => addInternalNoteAction(selected.id, noteText))}
                    className="rounded-xl bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
                  >
                    {loadingAction === "note" ? "Guardando..." : legacy("SJFBMH_K9Qep")}
                  </button>
                </div>
              )}
            </div>

            {/* Management link */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="rFdHMxO3FDZ5" /></p>
              <button
                onClick={() => {
                const url = selected.managementToken
                  ? `${baseUrl}/mi-plan/${selected.managementToken}`
                  : "";
                if (!url) { alert(legacy("q7JO-7wIgtIG")); return; }
                  navigator.clipboard.writeText(url).catch(() => {});
                  alert(legacy("n2S2ZbPnRCgQ"));
                }}
                className="flex items-center gap-2 rounded-xl border border-dashed border-[#7C3AED]/40 bg-[#7C3AED]/5 px-3 py-2 text-xs text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
                <LocalizedText id="j0oPzpncwq5C" />
              </button>
            </div>
          </div>

          {/* Panel actions */}
          <div className="border-t border-border px-5 py-4 space-y-2">
            {/* Reject form */}
            {showReject && (
              <div className="space-y-2 pb-2">
                <label className="text-xs font-medium text-muted-foreground"><LocalizedText id="dU9DsJNmy1tF" /></label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-red-500/30 transition-colors"
                  placeholder={legacy("tdVrUcD_tA6e")}
                />
                <div className="flex gap-2">
                  <button
                    disabled={pending || !rejectReason.trim()}
                    onClick={() => doAction("reject", () => rejectRecurringBookingAction(selected.id, rejectReason.trim()))}
                    className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {loadingAction === "reject" ? "Rechazando..." : "Confirmar rechazo"}
                  </button>
                  <button onClick={() => setShowReject(false)} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><LocalizedText id="u527QG3L1SSL" /></button>
                </div>
              </div>
            )}

            {/* Pause form */}
            {showPause && (
              <div className="space-y-2 pb-2">
                <label className="text-xs font-medium text-muted-foreground"><LocalizedText id="HGA1FXj4Hvhd" /></label>
                <input
                  type="date"
                  value={pauseUntil}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPauseUntil(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    disabled={pending || !pauseUntil}
                    onClick={() => doAction("pause", () => pauseRecurringAction(selected.id, pauseUntil))}
                    className="flex-1 rounded-xl bg-blue-500 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loadingAction === "pause" ? "Pausando..." : "Confirmar pausa"}
                  </button>
                  <button onClick={() => setShowPause(false)} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><LocalizedText id="u527QG3L1SSL" /></button>
                </div>
              </div>
            )}

            {/* Main action buttons */}
            <div className="flex flex-wrap gap-2">
              {selected.status === "PENDING_APPROVAL" && (
                <>
                  <button
                    disabled={pending}
                    onClick={() => doAction("approve", () => approveRecurringBookingAction(selected.id))}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {loadingAction === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <LocalizedText id="EKAP3xpE3sLS" />
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => setShowReject((v) => !v)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    <LocalizedText id="KgUVYC0xWHYb" />
                  </button>
                </>
              )}
              {selected.status === "ACTIVE" && (
                <button
                  disabled={pending}
                  onClick={() => setShowPause((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm font-medium text-blue-500 hover:bg-blue-500/10 disabled:opacity-50 transition-colors"
                >
                  <PauseCircle className="h-4 w-4" />
                  <LocalizedText id="zSXuWx249bCq" />
                </button>
              )}
              {selected.status === "PAUSED" && (
                <button
                  disabled={pending}
                  onClick={() => doAction("resume", () => resumeRecurringAction(selected.id))}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
                >
                  {loadingAction === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  <LocalizedText id="VoXh-vCzjbKD" />
                </button>
              )}
              {(selected.status === "ACTIVE" || selected.status === "PAUSED") && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Cancelar toda la suscripcion de ${selected.customerName}? Esta accion no se puede deshacer.`)) return;
                    doAction("cancel", () => cancelFullRecurringAction(selected.id));
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  {loadingAction === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <LocalizedText id="CEF77upoZYJZ" />
                </button>
              )}
              <button
                onClick={() => setShowNoteEditor((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <StickyNote className="h-4 w-4" />
                <LocalizedText id="7O-Kh__wXsXQ" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
