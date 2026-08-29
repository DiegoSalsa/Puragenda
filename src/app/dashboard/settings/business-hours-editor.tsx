"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { Check, Coffee, Copy, Loader2, Save, Sparkles } from "@/components/icons/hover-icons";
import { saveBusinessHoursAction } from "@/server/actions/dashboard.actions";
import { getDefaultBreakRange, isValidTimeRange } from "@/lib/time";
import { TimeTextInput } from "@/components/ui/time-text-input";
import { track } from "@/lib/analytics/client";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface HourEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  breakStart?: string | null;
  breakEnd?: string | null;
}

export function BusinessHoursEditor({ initialHours, locations = [] }: { initialHours: HourEntry[]; locations?: { id: string; name: string; hours: HourEntry[] }[] }) {
  const legacy = useTranslations("legacy");
  const [hours, setHours] = useState<HourEntry[]>(initialHours);
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(dayOfWeek: number, field: keyof HourEntry, value: string | boolean | null) {
    setHours((current) =>
      current.map((entry) => entry.dayOfWeek === dayOfWeek ? { ...entry, [field]: value } : entry)
    );
    setSaved(false);
    setError("");
  }

  function selectLocation(nextLocationId: string) {
    const location = locations.find((item) => item.id === nextLocationId);
    setLocationId(nextLocationId);
    setHours(location?.hours?.length ? location.hours : initialHours);
    setSaved(false);
    setError("");
  }

  function copyToWeekdays() {
    const source = hours.find((entry) => entry.isOpen && entry.dayOfWeek >= 1 && entry.dayOfWeek <= 5);
    if (!source) return;

    setHours((current) =>
      current.map((entry) =>
        entry.dayOfWeek >= 1 && entry.dayOfWeek <= 5
          ? {
              ...entry,
              isOpen: true,
              startTime: source.startTime,
              endTime: source.endTime,
              breakStart: source.breakStart,
              breakEnd: source.breakEnd,
            }
          : entry
      )
    );
    setSaved(false);
  }

  function closeWeekend() {
    setHours((current) =>
      current.map((entry) =>
        entry.dayOfWeek === 0 || entry.dayOfWeek === 6
          ? { ...entry, isOpen: false }
          : entry
      )
    );
    setSaved(false);
  }

  async function handleSave() {
    const invalid = hours.find((entry) =>
      entry.isOpen && (
        !isValidTimeRange(entry.startTime, entry.endTime) ||
        ((entry.breakStart || entry.breakEnd) && (
          !entry.breakStart ||
          !entry.breakEnd ||
          !isValidTimeRange(entry.breakStart, entry.breakEnd) ||
          entry.breakStart < entry.startTime ||
          entry.breakEnd > entry.endTime
        ))
      )
    );

    if (invalid) {
      setError(`Revisa el horario o la pausa de ${DAYS[invalid.dayOfWeek]}.`);
      return;
    }

    setSaving(true);
    const result = await saveBusinessHoursAction(hours, locationId || undefined);
    setSaving(false);

    if (result.success) {
      track("dashboard_availability_configured", { scope: locationId ? "location" : "business" });
      setSaved(true);
      setError("");
    } else {
      setError(result.error || legacy("NLtLjHhnx_OX"));
    }
  }

  return (
    <div className="space-y-5">
      {locations.length > 1 && <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <label htmlFor="business-hours-location" className="text-sm font-semibold"><LocalizedText id="dmqONaKvA3Th" /></label>
        <select id="business-hours-location" value={locationId} onChange={(event) => selectLocation(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
      </div>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyToWeekdays}
          className="flex items-center gap-2 rounded-xl border border-[#7C3AED] bg-[#7C3AED] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#6D28D9]"
        >
          <Copy className="h-3.5 w-3.5" />
          <LocalizedText id="d9onzGigACmE" />
        </button>
        <button
          type="button"
          onClick={closeWeekend}
          className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <LocalizedText id="L7vMDch7y5K4" />
        </button>
      </div>

      <div className="space-y-3" data-tour="business-hours-list">
        {hours.map((entry) => {
          const hasBreak = Boolean(entry.breakStart && entry.breakEnd);
          const day = DAYS[entry.dayOfWeek];

          return (
            <div
              key={entry.dayOfWeek}
              className={`overflow-hidden rounded-2xl border transition-colors ${
                entry.isOpen
                  ? "border-[#7C3AED]/30 bg-[#7C3AED]/[0.035]"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="grid gap-4 p-4 md:grid-cols-[minmax(160px,0.7fr)_minmax(260px,1.35fr)] md:items-center xl:grid-cols-[minmax(180px,0.7fr)_minmax(320px,1.35fr)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => update(entry.dayOfWeek, "isOpen", !entry.isOpen)}
                    className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                      entry.isOpen
                        ? "border-[#7C3AED] bg-[#7C3AED]"
                        : "border-border bg-muted"
                    }`}
                    aria-label={`${entry.isOpen ? "Cerrar" : "Abrir"} ${day}`}
                    aria-pressed={entry.isOpen}
                  >
                    <span
                      className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        entry.isOpen ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{day}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        entry.isOpen
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {entry.isOpen ? legacy("4mShX0yzYUqZ") : "Cerrado"}
                    </span>
                  </div>
                </div>

                {entry.isOpen ? (
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                    <label className="grid min-w-0 gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground"><LocalizedText id="i06T6Sjf1spy" /></span>
                      <TimeTextInput
                        ariaLabel={`Inicio ${day}`}
                        value={entry.startTime}
                        onChange={(value) => update(entry.dayOfWeek, "startTime", value)}
                      />
                    </label>
                    <span className="mb-3.5 text-xs font-medium text-muted-foreground">a</span>
                    <label className="grid min-w-0 gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground"><LocalizedText id="PIPjVYEHgYOb" /></span>
                      <TimeTextInput
                        ariaLabel={`Fin ${day}`}
                        value={entry.endTime}
                        onChange={(value) => update(entry.dayOfWeek, "endTime", value)}
                      />
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground lg:col-span-2">
                    <LocalizedText id="Uyni3cMu0rqX" />
                  </p>
                )}

                {entry.isOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      const suggestedBreak = getDefaultBreakRange(entry.startTime, entry.endTime);
                      update(
                        entry.dayOfWeek,
                        "breakStart",
                        hasBreak ? null : suggestedBreak?.startTime ?? null,
                      );
                      update(
                        entry.dayOfWeek,
                        "breakEnd",
                        hasBreak ? null : suggestedBreak?.endTime ?? null,
                      );
                    }}
                    aria-label={`${hasBreak ? "Quitar" : legacy("dUKl6AD5KAp5")} pausa de ${day}`}
                    className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors md:col-span-2 xl:col-span-1 ${
                      hasBreak
                        ? "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                        : "border-border bg-background text-foreground hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5"
                    }`}
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    {hasBreak ? "Quitar pausa" : legacy("pMAWENYxGXI3")}
                  </button>
                )}
              </div>

              {entry.isOpen && hasBreak && (
                <div className="grid gap-3 border-t border-[#7C3AED]/15 bg-[#7C3AED]/5 px-4 py-3 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-brand-foreground">
                      <Coffee className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground"><LocalizedText id="tAGIuN6rN_3C" /></p>
                      <p className="text-[11px] text-muted-foreground"><LocalizedText id="deC89mXNNtTj" /></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <TimeTextInput
                      ariaLabel={`Inicio de pausa ${day}`}
                      value={entry.breakStart || ""}
                      onChange={(value) => update(entry.dayOfWeek, "breakStart", value)}
                      compact
                    />
                    <span className="text-xs text-muted-foreground">a</span>
                    <TimeTextInput
                      ariaLabel={`Fin de pausa ${day}`}
                      value={entry.breakEnd || ""}
                      onChange={(value) => update(entry.dayOfWeek, "breakEnd", value)}
                      compact
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        <LocalizedText id="PRKLWYfAUkRa" />
      </p>
      {error && <p role="alert" className="text-sm font-medium text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex h-11 items-center gap-2 rounded-xl bg-[#7C3AED] px-5 text-sm font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? "Horarios guardados" : legacy("wpsbca2D-yPs")}
      </button>
    </div>
  );
}
