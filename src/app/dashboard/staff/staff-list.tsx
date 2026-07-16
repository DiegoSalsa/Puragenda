"use client";

import { useState } from "react";
import { Plus, Loader2, UserCheck, UserX, Clock, ChevronDown, ChevronUp, Save, AlertTriangle, Crown, Trash2, X, ShieldAlert, Wrench, Settings2, Ban, CalendarOff, Upload, ImageIcon } from "lucide-react";
import { createStaffAction, toggleStaffActiveAction, saveStaffScheduleAction, deleteStaffAction, updateStaffServicesAction, updateStaffRoleAction, createScheduleBlockAction, deleteScheduleBlockAction, updateStaffImageAction, removeStaffImageAction } from "@/server/actions/dashboard.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";


const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const TIMES: string[] = [];
for (let h = 6; h <= 23; h++) { TIMES.push(`${String(h).padStart(2, "0")}:00`); TIMES.push(`${String(h).padStart(2, "0")}:30`); }

interface ScheduleEntry { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean; }
interface BlockEntry { id: string; startTime: string; endTime: string; reason: string | null; }
type EditableStaffRole = "ADMIN" | "RECEPTIONIST" | "STAFF";
type StaffAccessRole = EditableStaffRole | "SUPERADMIN";
interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
  isActive: boolean;
  role: StaffAccessRole | null;
  userId: string | null;
  isOwner: boolean;
  schedule: ScheduleEntry[];
  serviceIds: string[];
  blocks?: BlockEntry[];
}
interface LimitInfo { plan: string; currentCount: number; maxAllowed: number; canAdd: boolean; }
interface ServiceOption { id: string; name: string; }

function defaultSchedule(): ScheduleEntry[] {
  return Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "19:00", isWorking: i >= 1 && i <= 5 }));
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DEL-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const PLAN_LABELS: Record<string, string> = { INDIVIDUAL: "Individual", EQUIPO: "Equipo" };
const ROLE_LABELS: Record<StaffAccessRole, string> = {
  ADMIN: "Admin",
  RECEPTIONIST: "Recepcionista",
  STAFF: "Trabajador",
  SUPERADMIN: "Superadmin",
};

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
            Para confirmar que deseas eliminar a <span className="font-semibold text-foreground">{staffName}</span>, escribe el siguiente código de seguridad:
          </p>
          {/* Code display */}
          <div className="flex justify-center">
            <div className="rounded-xl border border-border bg-muted px-5 py-3">
              <p className="text-center font-mono text-xl font-bold tracking-[0.3em] text-foreground">{code}</p>
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
export function StaffList({
  staff: initialStaff,
  limitInfo,
  allServices = [],
  canManageRoles = false,
}: {
  staff: StaffMember[];
  limitInfo: LimitInfo;
  allServices?: ServiceOption[];
  canManageRoles?: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "RECEPTIONIST" | "STAFF">("STAFF");
  const [createServiceIds, setCreateServiceIds] = useState<string[]>([]);
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
  const [staffServices, setStaffServices] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const s of initialStaff) { map[s.id] = s.serviceIds || []; }
    return map;
  });
  const [savingServices, setSavingServices] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [uploadingStaffImage, setUploadingStaffImage] = useState<string | null>(null);
  const [staffImageErrors, setStaffImageErrors] = useState<Record<string, string>>({});

  // Block form state
  const [blockStaffId, setBlockStaffId] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("13:00");
  const [blockEnd, setBlockEnd] = useState("14:00");
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  const atLimit = !limitInfo.canAdd;

  // Build a name map for services
  const serviceNameMap: Record<string, string> = {};
  for (const svc of allServices) { serviceNameMap[svc.id] = svc.name; }

  function toggleCreateService(serviceId: string) {
    setCreateServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  }

  async function handleCreate() {
    if (!name.trim()) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setCreateError("Debes ingresar un email válido");
      return;
    }
    setCreating(true); setCreateError("");
    const result = await createStaffAction({ name: name.trim(), email: email.trim(), role, serviceIds: createServiceIds });
    if (result.error) { setCreateError(result.error); setCreating(false); return; }
    setName(""); setEmail(""); setRole("STAFF"); setCreateServiceIds([]); setShowForm(false); setCreating(false); setCreateError("");
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

  function toggleServiceForStaff(staffId: string, serviceId: string) {
    setStaffServices((prev) => {
      const current = prev[staffId] || [];
      return { ...prev, [staffId]: current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId] };
    });
  }

  async function handleSaveServices(staffId: string) {
    setSavingServices(staffId);
    await updateStaffServicesAction(staffId, staffServices[staffId] || []);
    setSavingServices(null);
    router.refresh();
  }

  async function handleRoleChange(staffId: string, nextRole: EditableStaffRole) {
    setSavingRoleId(staffId);
    setRoleErrors((prev) => ({ ...prev, [staffId]: "" }));
    const result = await updateStaffRoleAction(staffId, nextRole);
    if (result.error) {
      setRoleErrors((prev) => ({ ...prev, [staffId]: result.error }));
    }
    setSavingRoleId(null);
    router.refresh();
  }

  async function handleStaffImageChange(staffId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setStaffImageErrors((prev) => ({ ...prev, [staffId]: "Formato no soportado. Usa PNG, JPG o WebP." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStaffImageErrors((prev) => ({ ...prev, [staffId]: "La imagen es muy pesada. Maximo 5MB." }));
      return;
    }

    setUploadingStaffImage(staffId);
    setStaffImageErrors((prev) => ({ ...prev, [staffId]: "" }));
    const formData = new FormData();
    formData.append("image", file);
    const result = await updateStaffImageAction(staffId, formData);
    if (result.error) {
      setStaffImageErrors((prev) => ({ ...prev, [staffId]: result.error }));
    }
    setUploadingStaffImage(null);
    input.value = "";
    router.refresh();
  }

  async function handleRemoveStaffImage(staffId: string) {
    setUploadingStaffImage(staffId);
    setStaffImageErrors((prev) => ({ ...prev, [staffId]: "" }));
    const result = await removeStaffImageAction(staffId);
    if (result.error) {
      setStaffImageErrors((prev) => ({ ...prev, [staffId]: result.error }));
    }
    setUploadingStaffImage(null);
    router.refresh();
  }

  return (
    <>
      <div className="space-y-4">
        {/* Limit indicator */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Profesionales: <span className="font-bold text-foreground">{limitInfo.currentCount}</span>
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
          <div className="flex items-start gap-3 rounded-xl border-[3px] border-black dark:border-white bg-[#FFDB58] px-4 py-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF]">
            <AlertTriangle className="h-5 w-5 shrink-0 text-black mt-0.5" />
            <div>
              <p className="text-sm font-black text-black uppercase tracking-wider">Límite alcanzado</p>
              <p className="text-xs font-bold text-black/80 mt-1">Tu plan {PLAN_LABELS[limitInfo.plan]} permite máximo {limitInfo.maxAllowed} profesional(es). Mejora tu plan para agregar más.</p>
            </div>
          </div>
        )}

        {/* ═══ ADD STAFF FORM ═══ */}
        {!showForm ? (
          <button
            id="btn-add-staff"
            onClick={() => { if (!atLimit) setShowForm(true); }}
            disabled={atLimit}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm w-full justify-center transition-all ${
              atLimit ? "border-[3px] border-dashed border-black/30 dark:border-white/30 text-black/50 dark:text-white/50 cursor-not-allowed bg-black/5 dark:bg-white/5 font-bold" : "border-[3px] border-black dark:border-white bg-[#85E3FF] text-black font-black uppercase tracking-wider shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] hover:translate-y-1 hover:translate-x-1 hover:shadow-none"
            }`}
          >
            <Plus className="h-4 w-4" /> {atLimit ? "Límite de profesionales alcanzado" : "Agregar profesional"}
          </button>
        ) : (
          <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5 space-y-4">
            <p className="text-sm font-medium">Nuevo profesional</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" required className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email del profesional" type="email" required className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Rol asignado</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "RECEPTIONIST" | "STAFF")}
                className="w-full sm:w-auto rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none [&>option]:bg-muted [&>option]:text-foreground"
              >
                <option value="ADMIN">Admin — Acceso total</option>
                <option value="RECEPTIONIST">Recepcionista — Gestiona agenda</option>
                <option value="STAFF">Profesional — Solo sus citas</option>
              </select>
            </div>

            {/* ═══ SERVICE CHECKBOXES ON CREATE ═══ */}
            {allServices.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Wrench className="h-3 w-3" /> Servicios que puede realizar
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {allServices.map((svc) => {
                    const checked = createServiceIds.includes(svc.id);
                    return (
                      <label key={svc.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${checked ? "border-[#7C3AED]/30 bg-[#7C3AED]/10" : "border-border"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCreateService(svc.id)}
                          className="h-4 w-4 rounded border-border accent-[#7C3AED]"
                        />
                        <span className={checked ? "text-foreground" : "text-muted-foreground"}>{svc.name}</span>
                      </label>
                    );
                  })}
                </div>
                {createServiceIds.length === 0 && (
                  <p className="text-xs text-amber-400/80">⚠ Si no seleccionas ninguno, el profesional podrá atender todos los servicios.</p>
                )}
              </div>
            )}

            {createError && <p className="text-sm text-red-400">{createError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !name.trim() || !email.trim()} className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear
              </button>
              <button onClick={() => { setShowForm(false); setCreateError(""); setRole("STAFF"); setCreateServiceIds([]); }} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
            </div>
          </div>
        )}

        {/* ═══ STAFF LIST ═══ */}
        {initialStaff.map((s) => {
          const expanded = expandedId === s.id;
          const sched = schedules[s.id] || defaultSchedule();
          const assignedServiceNames = (staffServices[s.id] || []).map((id) => serviceNameMap[id]).filter(Boolean);

          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* ── Card Header ── */}
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold ${s.isActive ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-muted text-muted-foreground"}`}>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt={s.name} className="h-full w-full object-cover" />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${s.isActive ? "" : "text-muted-foreground line-through"}`}>{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email || "Sin email"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:ml-auto sm:shrink-0">
                  <button
                    onClick={() => handleToggle(s.id)}
                    disabled={togglingId === s.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${s.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}
                  >
                    {togglingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : s.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                    {s.isActive ? "Activo" : "Inactivo"}
                  </button>
                  <span className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {s.role ? ROLE_LABELS[s.role] : "Sin cuenta"}
                  </span>
                  <button onClick={() => setExpandedId(expanded ? null : s.id)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Settings2 className="h-3 w-3" /> Configurar {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button onClick={() => setDeleteTarget(s)} className="rounded-lg border border-red-500/10 p-2 text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition-all" title="Eliminar profesional">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Service Badges (always visible) ── */}
              {assignedServiceNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3 sm:px-5 sm:pb-4 -mt-1">
                  {assignedServiceNames.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#7C3AED]">
                      <Wrench className="h-2.5 w-2.5" /> {name}
                    </span>
                  ))}
                </div>
              )}
              {assignedServiceNames.length === 0 && allServices.length > 0 && (
                <div className="px-4 pb-3 sm:px-5 sm:pb-4 -mt-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                    ⚠ Todos los servicios (sin asignar)
                  </span>
                </div>
              )}

              {/* ── Expanded Panel ── */}
              {expanded && (
                <div className="border-t border-border/50 p-5 space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <ImageIcon className="h-3.5 w-3.5 text-[#7C3AED]" /> Foto del profesional
                    </p>
                    <div className="flex items-start gap-4 rounded-xl border border-border bg-muted/30 p-4">
                      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                        )}
                        {uploadingStaffImage === s.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm text-muted-foreground">Se muestra cuando el cliente elige profesional en el widget.</p>
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#7C3AED] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#6D28D9]">
                            {uploadingStaffImage === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Subir foto
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => handleStaffImageChange(s.id, e)}
                              disabled={uploadingStaffImage === s.id}
                              className="hidden"
                            />
                          </label>
                          {s.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStaffImage(s.id)}
                              disabled={uploadingStaffImage === s.id}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/60">PNG, JPG o WebP. Maximo 5MB.</p>
                        {staffImageErrors[s.id] && <p className="text-xs text-red-400">{staffImageErrors[s.id]}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldAlert className="h-3.5 w-3.5 text-[#7C3AED]" /> Rol de acceso
                    </p>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {s.role ? ROLE_LABELS[s.role] : "Sin cuenta vinculada"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Admin y recepcionista pueden ver la agenda completa. Trabajador ve solo sus citas.
                          </p>
                        </div>
                        <select
                          value={s.role && s.role !== "SUPERADMIN" ? s.role : "STAFF"}
                          disabled={!canManageRoles || !s.userId || s.isOwner || savingRoleId === s.id}
                          onChange={(e) => handleRoleChange(s.id, e.target.value as EditableStaffRole)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-[190px]"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="RECEPTIONIST">Recepcionista</option>
                          <option value="STAFF">Trabajador</option>
                        </select>
                      </div>
                      {!canManageRoles && (
                        <p className="mt-3 text-xs text-muted-foreground">Solo la cuenta owner puede cambiar roles.</p>
                      )}
                      {s.isOwner && (
                        <p className="mt-3 text-xs text-muted-foreground">La cuenta owner no se puede cambiar desde aqui.</p>
                      )}
                      {!s.userId && (
                        <p className="mt-3 text-xs text-amber-400">Este profesional no tiene una cuenta de acceso vinculada.</p>
                      )}
                      {roleErrors[s.id] && (
                        <p className="mt-3 text-xs text-red-400">{roleErrors[s.id]}</p>
                      )}
                    </div>
                  </div>
                  {/* ── Section: Services ── */}
                  {allServices.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <Wrench className="h-3.5 w-3.5 text-[#7C3AED]" /> Servicios asignados
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {allServices.map((svc) => {
                          const checked = (staffServices[s.id] || []).includes(svc.id);
                          return (
                            <label key={svc.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-all ${checked ? "border-[#7C3AED]/30 bg-[#7C3AED]/5" : "border-border hover:border-border/80"}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleServiceForStaff(s.id, svc.id)}
                                className="h-4 w-4 rounded border-border accent-[#7C3AED]"
                              />
                              <span className={checked ? "text-foreground font-medium" : "text-muted-foreground"}>{svc.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      {(staffServices[s.id] || []).length === 0 && (
                        <p className="text-xs text-amber-400/80">⚠ Sin servicios asignados — este profesional aparece disponible para todos los servicios.</p>
                      )}
                      <button onClick={() => handleSaveServices(s.id)} disabled={savingServices === s.id}
                        className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:bg-[#6D28D9]">
                        {savingServices === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar servicios
                      </button>
                    </div>
                  )}

                  {/* ── Section: Schedule ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="h-3.5 w-3.5 text-[#7C3AED]" /> Horario laboral
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const activeDays = sched.filter(s => s.isWorking);
                          if (activeDays.length === 0) return;
                          const source = activeDays[0];
                          setSchedules(prev => ({
                            ...prev,
                            [s.id]: (prev[s.id] || defaultSchedule()).map(ds => ({
                              ...ds,
                              isWorking: ds.dayOfWeek === 0 ? false : true, // Dom (0) libre by default
                              startTime: source.startTime,
                              endTime: source.endTime,
                            }))
                          }));
                        }}
                        className="text-[10px] font-bold uppercase underline decoration-2 underline-offset-2 hover:text-[#7C3AED]"
                      >
                        Copiar horario a todos
                      </button>
                    </div>
                    {sched.map((entry) => (
                      <div key={entry.dayOfWeek} className={`flex items-center gap-3 rounded-lg border-2 p-2.5 transition-all ${entry.isWorking ? "border-black dark:border-white bg-[#FFF5BA] dark:bg-[#222]" : "border-black/30 dark:border-white/30 bg-black/5 dark:bg-white/5"}`}>
                        <button type="button" onClick={() => updateSchedule(s.id, entry.dayOfWeek, "isWorking", !entry.isWorking)}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors border-2 border-black dark:border-white ${entry.isWorking ? "bg-[#BFFCC6]" : "bg-white dark:bg-black"}`}>
                          <div className={`absolute top-[2px] h-4 w-4 rounded-full border-2 border-black dark:border-white transition-transform ${entry.isWorking ? "left-[20px] bg-white dark:bg-black" : "left-[2px] bg-black/20 dark:bg-white/20"}`} />
                        </button>
                        <span className={`w-12 text-xs font-bold uppercase tracking-wider ${entry.isWorking ? "text-black dark:text-white" : "text-black/50 dark:text-white/50"}`}>{DAYS[entry.dayOfWeek]}</span>
                        {entry.isWorking ? (
                          <div className="flex items-center gap-1.5">
                            <select value={entry.startTime} onChange={(e) => updateSchedule(s.id, entry.dayOfWeek, "startTime", e.target.value)}
                              className="rounded-lg border-2 border-black dark:border-white bg-white px-2 py-1 text-xs font-bold outline-none dark:bg-black dark:text-white">
                              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <span className="text-black font-bold dark:text-white">-</span>
                            <select value={entry.endTime} onChange={(e) => updateSchedule(s.id, entry.dayOfWeek, "endTime", e.target.value)}
                              className="rounded-lg border-2 border-black dark:border-white bg-white px-2 py-1 text-xs font-bold outline-none dark:bg-black dark:text-white">
                              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        ) : <span className="text-xs font-bold uppercase text-black/50 dark:text-white/50">Libre</span>}
                      </div>
                    ))}
                    <button onClick={() => handleSaveSchedule(s.id)} disabled={savingSchedule === s.id}
                      className="flex items-center gap-2 rounded-xl bg-[#BFFCC6] border-2 border-black px-4 py-2 text-sm font-bold uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none dark:border-white dark:bg-[#BFFCC6] dark:text-black">
                      {savingSchedule === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar horario
                    </button>
                  </div>

                  {/* ── Section: Schedule Blocks ── */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Ban className="h-3.5 w-3.5 text-[#7C3AED]" /> Bloqueos de Agenda
                    </p>
                    <p className="text-xs text-muted-foreground">Bloquea horarios para descansos, colación u otros motivos. Estos horarios no estarán disponibles para reservas.</p>

                    {/* Existing blocks */}
                    {(s.blocks && s.blocks.length > 0) && (
                      <div className="space-y-1.5">
                        {s.blocks.map((block) => {
                          const bStart = new Date(block.startTime);
                          const bEnd = new Date(block.endTime);
                          const dateStr = bStart.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
                          const timeStr = `${bStart.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} - ${bEnd.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
                          return (
                            <div key={block.id} className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2">
                              <div className="flex items-center gap-2 text-sm">
                                <CalendarOff className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-foreground font-medium">{dateStr}</span>
                                <span className="text-muted-foreground">{timeStr}</span>
                                {block.reason && <span className="text-xs text-red-400/80">({block.reason})</span>}
                              </div>
                              <button
                                onClick={async () => { setDeletingBlockId(block.id); await deleteScheduleBlockAction(block.id); setDeletingBlockId(null); router.refresh(); }}
                                disabled={deletingBlockId === block.id}
                                className="rounded p-2 min-h-[32px] min-w-[32px] text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center"
                                title="Eliminar bloqueo"
                              >
                                {deletingBlockId === block.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add block form */}
                    {blockStaffId === s.id ? (
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Fecha</label>
                            <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Motivo (opcional)</label>
                            <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                              placeholder="Ej: Colación, Médico..."
                              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50" />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Hora inicio</label>
                            <select value={blockStart} onChange={(e) => setBlockStart(e.target.value)}
                              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none [&>option]:bg-muted [&>option]:text-foreground">
                              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Hora fin</label>
                            <select value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)}
                              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none [&>option]:bg-muted [&>option]:text-foreground">
                              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        {blockError && <p className="text-xs text-red-400">{blockError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!blockDate) { setBlockError("Selecciona una fecha"); return; }
                              setSavingBlock(true); setBlockError("");
                              const res = await createScheduleBlockAction({ staffId: s.id, date: blockDate, startTime: blockStart, endTime: blockEnd, reason: blockReason || undefined });
                              if (res.error) { setBlockError(res.error); } else { setBlockStaffId(null); setBlockDate(""); setBlockReason(""); router.refresh(); }
                              setSavingBlock(false);
                            }}
                            disabled={savingBlock}
                            className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:bg-[#6D28D9]"
                          >
                            {savingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            Crear bloqueo
                          </button>
                          <button onClick={() => { setBlockStaffId(null); setBlockError(""); }} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setBlockStaffId(s.id); setBlockDate(""); setBlockReason(""); setBlockError(""); }}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-[#7C3AED]/30 transition-all">
                        <Plus className="h-4 w-4" /> Agregar bloqueo
                      </button>
                    )}
                  </div>
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
