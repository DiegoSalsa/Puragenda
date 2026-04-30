"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Loader2, UserCheck, UserX, Clock, ChevronDown, ChevronUp, Save, AlertTriangle, Crown, Trash2, X, ShieldAlert } from "lucide-react";
import { createStaffAction, toggleStaffActiveAction, saveStaffScheduleAction, deleteStaffAction } from "@/server/actions/dashboard.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";


const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const TIMES: string[] = [];
for (let h = 6; h <= 23; h++) { TIMES.push(`${String(h).padStart(2, "0")}:00`); TIMES.push(`${String(h).padStart(2, "0")}:30`); }

interface ScheduleEntry { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean; }
interface StaffMember { id: string; name: string; email: string | null; isActive: boolean; schedule: ScheduleEntry[]; }
interface LimitInfo { plan: string; currentCount: number; maxAllowed: number; canAdd: boolean; }

function defaultSchedule(): ScheduleEntry[] {
  return Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "19:00", isWorking: i >= 1 && i <= 5 }));
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DEL-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const PLAN_LABELS: Record<string, string> = { INDIVIDUAL: "Individual", BASIC: "Base", PRO: "Pro" };

// ─── Delete Confirmation Modal ───
function DeleteModal({ staffName, onConfirm, onCancel, deleting }: { staffName: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  const [code] = useState(generateCode);
  const [input, setInput] = useState("");
  const canConfirm = input === code;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="mx-4 w-full max-w-md rounded-2xl border border-red-500/20 bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-500/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Eliminar Profesional</h3>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {/* Body */}
        <div className="space-y-5 p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta acción <span className="font-semibold text-red-400">no se puede deshacer</span>. Se eliminarán todos los horarios y se desvinculará de las citas existentes.
          </p>
          <p className="text-sm text-muted-foreground">
            Para confirmar que deseas eliminar a <span className="font-semibold text-white">{staffName}</span>, escribe el siguiente código de seguridad:
          </p>
          {/* Code display */}
          <div className="flex justify-center">
            <div className="rounded-xl border border-border bg-muted px-5 py-3">
              <p className="text-center font-mono text-xl font-bold tracking-[0.3em] text-white">{code}</p>
            </div>
          </div>
          {/* Input */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Escribe el código exacto:</label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="DEL-XXXX"
              autoFocus
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/50 focus:border-red-500/30 transition-colors"
            />
          </div>
          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm || deleting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Confirmar Eliminación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Staff List ───
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
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const atLimit = !limitInfo.canAdd;

  async function handleCreate() {
    if (!name.trim()) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setCreateError("Debes ingresar un email válido");
      return;
    }
    setCreating(true); setCreateError("");
    const result = await createStaffAction({ name: name.trim(), email: email.trim() });
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

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteStaffAction(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="space-y-4">
        {/* Limit indicator */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Profesionales: <span className="font-bold text-white">{limitInfo.currentCount}</span>
            <span className="text-muted-foreground/60"> / {limitInfo.maxAllowed}</span>
            <span className="ml-2 text-xs text-muted-foreground">Plan {PLAN_LABELS[limitInfo.plan] || limitInfo.plan}</span>
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
              atLimit ? "border-border/50 text-muted-foreground/30 cursor-not-allowed" : "border-border text-muted-foreground hover:border-[#7C3AED]/30 hover:text-foreground"
            }`}
          >
            <Plus className="h-4 w-4" /> {atLimit ? "Límite de profesionales alcanzado" : "Agregar profesional"}
          </button>
        ) : (
          <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5 space-y-3">
            <p className="text-sm font-medium">Nuevo profesional</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email del profesional" type="email" required className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50" />
            </div>
            {createError && <p className="text-sm text-red-400">{createError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !name.trim() || !email.trim()} className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear
              </button>
              <button onClick={() => { setShowForm(false); setCreateError(""); }} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
            </div>
          </div>
        )}

        {/* Staff List */}
        {initialStaff.map((s) => {
          const expanded = expandedId === s.id;
          const sched = schedules[s.id] || defaultSchedule();
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${s.isActive ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-muted text-muted-foreground"}`}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${s.isActive ? "" : "text-muted-foreground line-through"}`}>{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email || "Sin email"}</p>
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
                  <button onClick={() => setExpandedId(expanded ? null : s.id)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Clock className="h-3 w-3" /> Horario {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button onClick={() => setDeleteTarget(s)} className="rounded-lg border border-red-500/10 p-1.5 text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition-all" title="Eliminar profesional">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-white/[0.06] p-5 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Horario laboral de {s.name}</p>
                  {sched.map((entry) => (
                    <div key={entry.dayOfWeek} className={`flex items-center gap-3 rounded-lg border p-2.5 ${entry.isWorking ? "border-border bg-muted/50" : "border-border/50 opacity-40"}`}>
                      <button type="button" onClick={() => updateSchedule(s.id, entry.dayOfWeek, "isWorking", !entry.isWorking)}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${entry.isWorking ? "bg-[#7C3AED]" : "bg-white/10"}`}>
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${entry.isWorking ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                      <span className="w-12 text-xs font-medium">{DAYS[entry.dayOfWeek]}</span>
                      {entry.isWorking ? (
                        <div className="flex items-center gap-1.5">
                          <select value={entry.startTime} onChange={(e) => updateSchedule(s.id, entry.dayOfWeek, "startTime", e.target.value)}
                            className="rounded-lg border border-border bg-muted px-2 py-1 text-xs outline-none [&>option]:bg-muted [&>option]:text-foreground">
                            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-muted-foreground">-</span>
                          <select value={entry.endTime} onChange={(e) => updateSchedule(s.id, entry.dayOfWeek, "endTime", e.target.value)}
                            className="rounded-lg border border-border bg-muted px-2 py-1 text-xs outline-none [&>option]:bg-muted [&>option]:text-foreground">
                            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Libre</span>}
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

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          staffName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </>
  );
}
