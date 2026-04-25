"use client";

import { useState } from "react";
import { Plus, Loader2, UserCheck, UserX, Clock, ChevronDown, ChevronUp, Save, AlertTriangle, Crown } from "lucide-react";
import { createStaffAction, toggleStaffActiveAction, saveStaffScheduleAction } from "@/server/actions/dashboard.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TIMES: string[] = [];
for (let h = 6; h <= 23; h++) { TIMES.push(`${String(h).padStart(2, "0")}:00`); TIMES.push(`${String(h).padStart(2, "0")}:30`); }

interface ScheduleEntry { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean; }
interface StaffMember { id: string; name: string; email: string | null; isActive: boolean; schedule: ScheduleEntry[]; }
interface LimitInfo { plan: string; currentCount: number; maxAllowed: number; canAdd: boolean; }

function defaultSchedule(): ScheduleEntry[] {
  return Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "19:00", isWorking: i >= 1 && i <= 5 }));
}

const PLAN_LABELS: Record<string, string> = { INDIVIDUAL: "Individual", BASIC: "Base", PRO: "Pro" };

export function StaffList({ staff: initialStaff, limitInfo }: { staff: StaffMember[]; limitInfo: LimitInfo }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, ScheduleEntry[]>>(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    for (const s of initialStaff) { map[s.id] = s.schedule.length === 7 ? s.schedule : defaultSchedule(); }
    return map;
  });
  const [savingSchedule, setSavingSchedule] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const atLimit = !limitInfo.canAdd;

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true); setCreateError("");
    const result = await createStaffAction({ name: name.trim(), email: email.trim() || undefined });
    if (result.error) { setCreateError(result.error); setCreating(false); return; }
    setName(""); setEmail(""); setShowForm(false); setCreating(false); setCreateError("");
    router.refresh();
  }

  async function handleToggle(id: string) {
    setTogglingId(id);
    await toggleStaffActiveAction(id);
    setTogglingId(null);
    router.refresh();
  }

  function updateSchedule(staffId: string, dow: number, field: string, value: string | boolean) {
    setSchedules((prev) => ({
      ...prev,
      [staffId]: (prev[staffId] || defaultSchedule()).map((s) => s.dayOfWeek === dow ? { ...s, [field]: value } : s),
    }));
  }

  async function handleSaveSchedule(staffId: string) {
    setSavingSchedule(staffId);
    await saveStaffScheduleAction(staffId, schedules[staffId] || defaultSchedule());
    setSavingSchedule(null);
  }

  return (
    <div className="space-y-4">
      {/* Limit indicator */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-sm text-white/50">
          Profesionales: <span className="font-bold text-white">{limitInfo.currentCount}</span>
          <span className="text-white/30"> / {limitInfo.maxAllowed}</span>
          <span className="ml-2 text-xs text-white/30">Plan {PLAN_LABELS[limitInfo.plan] || limitInfo.plan}</span>
        </p>
        {atLimit && (
          <Link href="/dashboard/settings#plan" className="flex items-center gap-1.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 px-3 py-1.5 text-xs font-medium text-[#A78BFA] hover:bg-[#7C3AED]/20 transition-all">
            <Crown className="h-3 w-3" /> Mejorar plan
          </Link>
        )}
      </div>

      {/* Limit warning */}
      {atLimit && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Límite alcanzado</p>
            <p className="text-xs text-amber-400/70">Tu plan {PLAN_LABELS[limitInfo.plan]} permite máximo {limitInfo.maxAllowed} profesional(es). Mejora tu plan para agregar más.</p>
          </div>
        </div>
      )}

      {/* Add Staff */}
      {!showForm ? (
        <button
          onClick={() => { if (!atLimit) setShowForm(true); }}
          disabled={atLimit}
          className={`flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm w-full justify-center transition-all ${
            atLimit ? "border-white/[0.03] text-white/15 cursor-not-allowed" : "border-white/10 text-white/40 hover:border-[#7C3AED]/30 hover:text-white/70"
          }`}
        >
          <Plus className="h-4 w-4" /> {atLimit ? "Límite de profesionales alcanzado" : "Agregar profesional"}
        </button>
      ) : (
        <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5 space-y-3">
          <p className="text-sm font-medium">Nuevo profesional</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30" />
          </div>
          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || !name.trim()} className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear
            </button>
            <button onClick={() => { setShowForm(false); setCreateError(""); }} className="rounded-xl border border-white/[0.06] px-4 py-2 text-sm text-white/50">Cancelar</button>
          </div>
        </div>
      )}

      {/* Staff List */}
      {initialStaff.map((s) => {
        const expanded = expandedId === s.id;
        const sched = schedules[s.id] || defaultSchedule();
        return (
          <div key={s.id} className="rounded-2xl border border-white/[0.06] bg-[#111] overflow-hidden">
            <div className="flex items-center gap-4 p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${s.isActive ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-white/[0.03] text-white/20"}`}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${s.isActive ? "" : "text-white/40 line-through"}`}>{s.name}</p>
                <p className="text-xs text-white/30">{s.email || "Sin email"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(s.id)}
                  disabled={togglingId === s.id}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${s.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}
                >
                  {togglingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : s.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                  {s.isActive ? "Activo" : "Inactivo"}
                </button>
                <button onClick={() => setExpandedId(expanded ? null : s.id)} className="flex items-center gap-1 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/50 hover:text-white/80">
                  <Clock className="h-3 w-3" /> Horario {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {expanded && (
              <div className="border-t border-white/[0.06] p-5 space-y-3">
                <p className="text-xs font-medium text-white/40">Horario laboral de {s.name}</p>
                {sched.map((entry) => (
                  <div key={entry.dayOfWeek} className={`flex items-center gap-3 rounded-lg border p-2.5 ${entry.isWorking ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.03] opacity-40"}`}>
                    <button type="button" onClick={() => updateSchedule(s.id, entry.dayOfWeek, "isWorking", !entry.isWorking)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${entry.isWorking ? "bg-[#7C3AED]" : "bg-white/10"}`}>
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${entry.isWorking ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                    <span className="w-12 text-xs font-medium">{DAYS[entry.dayOfWeek]}</span>
                    {entry.isWorking ? (
                      <div className="flex items-center gap-1.5">
                        <select value={entry.startTime} onChange={(e) => updateSchedule(s.id, entry.dayOfWeek, "startTime", e.target.value)}
                          className="rounded-lg border border-white/[0.06] bg-[#1a1a1a] px-2 py-1 text-xs text-white outline-none [&>option]:bg-[#1a1a1a] [&>option]:text-white">
                          {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-white/20">-</span>
                        <select value={entry.endTime} onChange={(e) => updateSchedule(s.id, entry.dayOfWeek, "endTime", e.target.value)}
                          className="rounded-lg border border-white/[0.06] bg-[#1a1a1a] px-2 py-1 text-xs text-white outline-none [&>option]:bg-[#1a1a1a] [&>option]:text-white">
                          {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : <span className="text-xs text-white/20">Libre</span>}
                  </div>
                ))}
                <button onClick={() => handleSaveSchedule(s.id)} disabled={savingSchedule === s.id}
                  className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {savingSchedule === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar horario
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
