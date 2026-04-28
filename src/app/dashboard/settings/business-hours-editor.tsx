"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { saveBusinessHoursAction } from "@/server/actions/dashboard.actions";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

interface HourEntry { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean; }

export function BusinessHoursEditor({ initialHours }: { initialHours: HourEntry[] }) {
  const [hours, setHours] = useState<HourEntry[]>(initialHours);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(dayOfWeek: number, field: keyof HourEntry, value: string | boolean) {
    setHours((prev) => prev.map((h) => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveBusinessHoursAction(hours);
      if (result.success) setSaved(true);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      {hours.map((h) => (
        <div
          key={h.dayOfWeek}
          className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-all ${
            h.isOpen
              ? "border-white/[0.06] bg-white/[0.02]"
              : "border-white/[0.03] bg-white/[0.01] opacity-50"
          }`}
        >
          <button
            type="button"
            onClick={() => update(h.dayOfWeek, "isOpen", !h.isOpen)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              h.isOpen ? "bg-[#7C3AED]" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                h.isOpen ? "left-6" : "left-1"
              }`}
            />
          </button>

          <span className="w-24 text-sm font-medium">{DAYS[h.dayOfWeek]}</span>

          {h.isOpen ? (
            <div className="flex items-center gap-2">
              <select
                value={h.startTime}
                onChange={(e) => update(h.dayOfWeek, "startTime", e.target.value)}
                className="rounded-lg border border-white/[0.06] bg-[#1a1a1a] px-3 py-1.5 text-sm text-white outline-none [&>option]:bg-[#1a1a1a] [&>option]:text-white"
              >
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="text-white/30">—</span>
              <select
                value={h.endTime}
                onChange={(e) => update(h.dayOfWeek, "endTime", e.target.value)}
                className="rounded-lg border border-white/[0.06] bg-[#1a1a1a] px-3 py-1.5 text-sm text-white outline-none [&>option]:bg-[#1a1a1a] [&>option]:text-white"
              >
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ) : (
            <span className="text-sm text-white/30">Cerrado</span>
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saved ? "¡Guardado!" : "Guardar horarios"}
      </button>
    </div>
  );
}
