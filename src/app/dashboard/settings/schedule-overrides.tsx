"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  saveScheduleOverrideAction,
  deleteScheduleOverrideAction,
  getScheduleOverridesAction,
} from "@/server/actions/dashboard.actions";
import { TimeTextInput } from "@/components/ui/time-text-input";

interface ScheduleOverride {
  id: string;
  date: string;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_LABELS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

function toDateKey(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ScheduleOverridesEditor({ locations }: { locations: { id: string; name: string }[] }) {
  const legacy = useTranslations("legacy");
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editIsOpen, setEditIsOpen] = useState(true);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("18:00");
  const [editBreakStart, setEditBreakStart] = useState("");
  const [editBreakEnd, setEditBreakEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOverrides = useCallback(async () => {
    setLoading(true);
    if (!locationId) { setOverrides([]); setLoading(false); return; }
    const result = await getScheduleOverridesAction(locationId);
    if (result.overrides) {
      setOverrides(result.overrides as ScheduleOverride[]);
    }
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadOverrides(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadOverrides]);

  function getCalendarDays() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];
    // Pad start of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }

  function getOverrideForDate(dateKey: string) {
    return overrides.find((o) => o.date === dateKey);
  }

  function handleDayClick(date: Date) {
    const key = toDateKey(date);
    setSelectedDate(key);
    setError("");
    setSuccess("");

    const existing = getOverrideForDate(key);
    if (existing) {
      setEditIsOpen(existing.isOpen);
      setEditStartTime(existing.startTime || "09:00");
      setEditEndTime(existing.endTime || "18:00");
      setEditBreakStart(existing.breakStart || "");
      setEditBreakEnd(existing.breakEnd || "");
    } else {
      setEditIsOpen(true);
      setEditStartTime("09:00");
      setEditEndTime("18:00");
      setEditBreakStart("");
      setEditBreakEnd("");
    }
  }

  async function handleSave() {
    if (!selectedDate) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const result = await saveScheduleOverrideAction({
      locationId,
      date: selectedDate,
      isOpen: editIsOpen,
      startTime: editIsOpen ? editStartTime : undefined,
      endTime: editIsOpen ? editEndTime : undefined,
      breakStart: editIsOpen && editBreakStart ? editBreakStart : null,
      breakEnd: editIsOpen && editBreakEnd ? editBreakEnd : null,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Guardado");
      await loadOverrides();
      setTimeout(() => setSuccess(""), 2000);
    }
  }

  async function handleDelete() {
    if (!selectedDate) return;
    setDeleting(true);
    setError("");
    setSuccess("");

    const result = await deleteScheduleOverrideAction(selectedDate, locationId);
    setDeleting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSelectedDate(null);
      await loadOverrides();
    }
  }

  function goNextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }

  function goPrevMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }

  const calendarDays = getCalendarDays();
  const todayKey = toDateKey(new Date());
  const hasExistingOverride = selectedDate
    ? !!getOverrideForDate(selectedDate)
    : false;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <LocalizedText id="_8WOXXd7wZ7v" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {locations.length > 1 && <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <label htmlFor="schedule-override-location" className="text-sm font-semibold"><LocalizedText id="dmqONaKvA3Th" /></label>
        <select id="schedule-override-location" value={locationId} onChange={(event) => { setLocationId(event.target.value); setSelectedDate(null); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
      </div>}
      <p className="text-sm text-muted-foreground">
        <LocalizedText id="FgdMWTgYog9d" />{" "}
        <strong className="text-emerald-500"><LocalizedText id="3z-STC3Oh2O2" /></strong> o{" "}
        <strong className="text-red-400"><LocalizedText id="5T7XXBU1_83d" /></strong><LocalizedText id="056hfuX1QgtI" />
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Calendar ── */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background transition-colors hover:bg-muted"
              aria-label={legacy("Uu5fZX8-XFZb")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-bold">
              {MONTH_NAMES[currentMonth.getMonth()]}{" "}
              {currentMonth.getFullYear()}
            </h3>
            <button
              type="button"
              onClick={goNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background transition-colors hover:bg-muted"
              aria-label={legacy("gzNJg1RlQQwI")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} />;
              }

              const key = toDateKey(day);
              const override = getOverrideForDate(key);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const isPast = key < todayKey;

              let bgClass = "bg-background hover:bg-muted";
              let textClass = "text-foreground";
              let borderClass = "border-transparent";

              if (override) {
                if (override.isOpen) {
                  bgClass = "bg-emerald-500/10 hover:bg-emerald-500/20";
                  textClass = "text-emerald-600 dark:text-emerald-400";
                  borderClass = "border-emerald-500/30";
                } else {
                  bgClass = "bg-red-500/10 hover:bg-red-500/20";
                  textClass = "text-red-500 dark:text-red-400";
                  borderClass = "border-red-500/30";
                }
              }

              if (isPast) {
                textClass = "text-muted-foreground/50";
                bgClass = override
                  ? bgClass.replace("hover:", "")
                  : "bg-background";
              }

              if (isSelected) {
                borderClass = "border-[#7C3AED] ring-2 ring-[#7C3AED]/20";
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  className={`relative flex h-10 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${bgClass} ${textClass} ${borderClass} disabled:cursor-default disabled:opacity-40`}
                >
                  {day.getDate()}
                  {isToday && (
                    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#7C3AED]" />
                  )}
                  {override && (
                    <span
                      className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                        override.isOpen ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <LocalizedText id="QayQCmt25CWx" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <LocalizedText id="RVTaPJVMBzDL" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#7C3AED]" />
              <LocalizedText id="VRM9Tm62Fyp8" />
            </span>
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="rounded-2xl border border-border bg-card p-4">
          {selectedDate ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {parseDateKey(selectedDate).toLocaleDateString("es-CL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {hasExistingOverride
                      ? legacy("gs3WJXpxKrvQ")
                      : legacy("ITwyMna8gSss")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted"
                  aria-label={legacy("nUCY4THlFves")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Toggle open/closed */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditIsOpen(!editIsOpen)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                    editIsOpen
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-border bg-muted"
                  }`}
                  aria-label={editIsOpen ? "Marcar cerrado" : "Marcar abierto"}
                  aria-pressed={editIsOpen}
                >
                  <span
                    className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      editIsOpen ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm font-bold">
                  {editIsOpen ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      <LocalizedText id="pEHMzfgS7aPo" />
                    </span>
                  ) : (
                    <span className="text-red-500 dark:text-red-400">
                      <LocalizedText id="J6qkHsgsm7T9" />
                    </span>
                  )}
                </span>
              </div>

              {/* Time inputs (only when open) */}
              {editIsOpen && (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <LocalizedText id="i06T6Sjf1spy" />
                      </span>
                      <TimeTextInput
                        ariaLabel={legacy("ujia-dw0NPj4")}
                        value={editStartTime}
                        onChange={setEditStartTime}
                      />
                    </label>
                    <span className="mb-3.5 text-xs font-medium text-muted-foreground">
                      a
                    </span>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <LocalizedText id="PIPjVYEHgYOb" />
                      </span>
                      <TimeTextInput
                        ariaLabel={legacy("T5i0RgOGS4PN")}
                        value={editEndTime}
                        onChange={setEditEndTime}
                      />
                    </label>
                  </div>

                  {/* Break toggle */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (editBreakStart && editBreakEnd) {
                          setEditBreakStart("");
                          setEditBreakEnd("");
                        } else {
                          setEditBreakStart("13:00");
                          setEditBreakEnd("14:00");
                        }
                      }}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                        editBreakStart && editBreakEnd
                          ? "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                          : "border-border bg-background text-foreground hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5"
                      }`}
                    >
                      {editBreakStart && editBreakEnd
                        ? "Quitar pausa"
                        : legacy("pMAWENYxGXI3")}
                    </button>

                    {editBreakStart && editBreakEnd && (
                      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <TimeTextInput
                          ariaLabel={legacy("BnB-xeLTeXsI")}
                          value={editBreakStart}
                          onChange={setEditBreakStart}
                          compact
                        />
                        <span className="text-xs text-muted-foreground">a</span>
                        <TimeTextInput
                          ariaLabel={legacy("IAFXiRmdaFpf")}
                          value={editBreakEnd}
                          onChange={setEditBreakEnd}
                          compact
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs font-medium text-red-500">
                  {error}
                </p>
              )}
              {success && (
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                  <Check className="h-3.5 w-3.5" /> {success}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 h-10 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <LocalizedText id="E-UaIQ9F7RsJ" />
                </button>
                {hasExistingOverride && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C3AED]/10">
                <CalendarPlus className="h-5 w-5 text-brand-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  <LocalizedText id="yq50Ibjlykui" />
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <LocalizedText id="e06aMH6LtIvc" />
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Existing overrides list ── */}
      {overrides.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <LocalizedText id="7vTOm3gcITCp" />{overrides.length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {overrides.map((o) => {
              const date = parseDateKey(o.date);
              const isPast = o.date < todayKey;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/40 ${
                    isPast ? "opacity-50" : ""
                  } ${
                    o.isOpen
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      o.isOpen
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-500 dark:text-red-400"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {date.toLocaleDateString("es-CL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {o.isOpen
                        ? `${o.startTime} – ${o.endTime}`
                        : "Cerrado"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
