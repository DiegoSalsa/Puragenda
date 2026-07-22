"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { saveBusinessHoursAction } from "@/server/actions/dashboard.actions";
import { isValidTimeRange } from "@/lib/time";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
interface HourEntry { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean; }

export function BusinessHoursEditor({ initialHours }: { initialHours: HourEntry[] }) {
  const [hours, setHours] = useState<HourEntry[]>(initialHours);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(dayOfWeek: number, field: keyof HourEntry, value: string | boolean) {
    setHours((prev) => prev.map((h) => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));
    setSaved(false);
    setError("");
  }

  async function handleSave() {
    const invalidDay = hours.find((h) => h.isOpen && !isValidTimeRange(h.startTime, h.endTime));
    if (invalidDay) {
      setError(`Revisa el horario de ${DAYS[invalidDay.dayOfWeek]}: la apertura debe ser anterior al cierre.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await saveBusinessHoursAction(hours);
      if (result.success) setSaved(true);
      else setError(result.error || "No se pudieron guardar los horarios.");
    } catch (e) {
      console.error(e);
      setError("No se pudieron guardar los horarios.");
    }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      {hours.map((h) => (
        <div
          key={h.dayOfWeek}
          className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-all ${
            h.isOpen
              ? "border-border bg-muted/50"
              : "border-border/50 bg-muted/20 opacity-50"
          }`}
        >
          <button
            type="button"
            onClick={() => update(h.dayOfWeek, "isOpen", !h.isOpen)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              h.isOpen ? "bg-[#7C3AED]" : "bg-muted-foreground/30"
            }`}
          >
            <div
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                h.isOpen ? "left-[26px]" : "left-1"
              }`}
            />
          </button>

          <span className="w-20 sm:w-24 text-sm font-medium">{DAYS[h.dayOfWeek]}</span>

          {h.isOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="time"
                step={60}
                value={h.startTime}
                onChange={(e) => update(h.dayOfWeek, "startTime", e.target.value)}
                aria-label={`Hora de apertura del ${DAYS[h.dayOfWeek]}`}
                className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm outline-none focus:border-[#7C3AED]/40"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="time"
                step={60}
                value={h.endTime}
                onChange={(e) => update(h.dayOfWeek, "endTime", e.target.value)}
                aria-label={`Hora de cierre del ${DAYS[h.dayOfWeek]}`}
                className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm outline-none focus:border-[#7C3AED]/40"
              />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Cerrado</span>
          )}
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        Puedes escribir la hora exacta de apertura y cierre, por ejemplo 09:15.
      </p>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 h-11 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saved ? "¡Guardado!" : "Guardar horarios"}
      </button>
    </div>
  );
}
