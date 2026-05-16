"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Wrench, Settings2, Banknote, RefreshCw, ChevronDown, ChevronUp, Info } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { updateMaxServicesAction } from "@/server/actions/dashboard.actions";
import { createRecurringPlanAction, deleteRecurringPlanAction } from "@/server/actions/recurring.actions";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface RecurringPlan {
  mode: "FIXED_DAYS" | "DAYS_WITH_REST" | "FREE_MINIMUM";
  fixedDays: number[];
  daysPerWeek: number | null;
  minRestDays: number | null;
  durationOptions: number[];
  startDateRangeDays: number;
  requiresApproval: boolean;
  requiresHealthForm: boolean;
  healthQuestions: string[];
  requiresRut: boolean;
  renewalMessage: string | null;
  expirationWarningDays: number;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  depositAmount: number;
  recurringPlan: RecurringPlan | null;
  _count: { recurringBookings: number };
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const WEEK_DAYS = [
  { value: 1, label: "Lu" },
  { value: 2, label: "Ma" },
  { value: 3, label: "Mi" },
  { value: 4, label: "Ju" },
  { value: 5, label: "Vi" },
  { value: 6, label: "Sa" },
  { value: 0, label: "Do" },
];

const DEFAULT_RECURRING: {
  mode: "FIXED_DAYS" | "DAYS_WITH_REST" | "FREE_MINIMUM";
  fixedDays: number[];
  daysPerWeek: number;
  minRestDays: number;
  durationOptions: number[];
  startDateRangeDays: number;
  requiresApproval: boolean;
  requiresHealthForm: boolean;
  healthQuestions: string[];
  requiresRut: boolean;
  renewalMessage: string;
  expirationWarningDays: number;
} = {
  mode: "FIXED_DAYS",
  fixedDays: [],
  daysPerWeek: 3,
  minRestDays: 1,
  durationOptions: [1],
  startDateRangeDays: 14,
  requiresApproval: false,
  requiresHealthForm: false,
  healthQuestions: [],
  requiresRut: false,
  renewalMessage: "",
  expirationWarningDays: 7,
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function ServicesClient({
  initialServices,
  maxServicesPerBooking = 1,
  depositEnabled = false,
  businessPolicies = { requiresClientRut: false, allowRescheduling: false },
}: {
  initialServices: Service[];
  maxServicesPerBooking?: number;
  depositEnabled?: boolean;
  businessPolicies?: { requiresClientRut: boolean; allowRescheduling: boolean };
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [maxServices, setMaxServices] = useState(maxServicesPerBooking);
  const [savingMax, setSavingMax] = useState(false);

  // Base service form
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
    depositAmount: "",
  });

  // Recurring plan form
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ ...DEFAULT_RECURRING });
  const [newQuestion, setNewQuestion] = useState("");

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────

  async function handleSaveMaxServices(val: number) {
    setMaxServices(val);
    setSavingMax(true);
    await updateMaxServicesAction(val);
    setSavingMax(false);
  }

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/services");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingService(null);
    setForm({ name: "", description: "", duration: "", price: "", depositAmount: "" });
    setRecurringEnabled(false);
    setRecurringOpen(false);
    setRecurringForm({ ...DEFAULT_RECURRING });
    setNewQuestion("");
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || "",
      duration: String(service.duration),
      price: String(service.price),
      depositAmount: String(service.depositAmount || 0),
    });
    if (service.recurringPlan) {
      setRecurringEnabled(true);
      setRecurringOpen(true);
      setRecurringForm({
        mode: service.recurringPlan.mode,
        fixedDays: service.recurringPlan.fixedDays,
        daysPerWeek: service.recurringPlan.daysPerWeek ?? 3,
        minRestDays: service.recurringPlan.minRestDays ?? 1,
        durationOptions: service.recurringPlan.durationOptions,
        startDateRangeDays: service.recurringPlan.startDateRangeDays,
        requiresApproval: service.recurringPlan.requiresApproval,
        requiresHealthForm: service.recurringPlan.requiresHealthForm,
        healthQuestions: service.recurringPlan.healthQuestions,
        requiresRut: service.recurringPlan.requiresRut,
        renewalMessage: service.recurringPlan.renewalMessage ?? "",
        expirationWarningDays: service.recurringPlan.expirationWarningDays,
      });
    } else {
      setRecurringEnabled(false);
      setRecurringOpen(false);
      setRecurringForm({ ...DEFAULT_RECURRING });
    }
    setNewQuestion("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let serviceId: string;

      if (editingService) {
        await fetch(`/api/dashboard/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        serviceId = editingService.id;
      } else {
        const res = await fetch("/api/dashboard/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const created = await res.json();
        serviceId = created.id;
      }

      // Handle recurring plan
      if (recurringEnabled && recurringForm.durationOptions.length > 0) {
        const result = await createRecurringPlanAction(serviceId, {
          mode: recurringForm.mode,
          fixedDays: recurringForm.mode === "FIXED_DAYS" ? recurringForm.fixedDays : [],
          daysPerWeek: recurringForm.mode !== "FIXED_DAYS" ? recurringForm.daysPerWeek : undefined,
          minRestDays: recurringForm.mode === "DAYS_WITH_REST" ? recurringForm.minRestDays : undefined,
          durationOptions: recurringForm.durationOptions,
          startDateRangeDays: recurringForm.startDateRangeDays,
          requiresApproval: recurringForm.requiresApproval,
          requiresHealthForm: recurringForm.requiresHealthForm,
          healthQuestions: recurringForm.healthQuestions,
          requiresRut: recurringForm.requiresRut || businessPolicies.requiresClientRut,
          renewalMessage: recurringForm.renewalMessage || undefined,
          expirationWarningDays: recurringForm.expirationWarningDays,
        });
        if (result?.error) {
          alert(result.error);
          setSaving(false);
          return;
        }
      } else if (!recurringEnabled && editingService?.recurringPlan) {
        const result = await deleteRecurringPlanAction(serviceId);
        if (result?.error) {
          alert(result.error);
          setSaving(false);
          return;
        }
      }

      setDialogOpen(false);
      await fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return;

    try {
      await fetch(`/api/dashboard/services/${id}`, { method: "DELETE" });
      await fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  }

  function toggleFixedDay(day: number) {
    setRecurringForm((prev) => ({
      ...prev,
      fixedDays: prev.fixedDays.includes(day)
        ? prev.fixedDays.filter((d) => d !== day)
        : [...prev.fixedDays, day],
    }));
  }

  function toggleDurationOption(months: number) {
    setRecurringForm((prev) => ({
      ...prev,
      durationOptions: prev.durationOptions.includes(months)
        ? prev.durationOptions.filter((m) => m !== months)
        : [...prev.durationOptions, months].sort((a, b) => a - b),
    }));
  }

  function addQuestion() {
    const q = newQuestion.trim();
    if (!q) return;
    setRecurringForm((prev) => ({ ...prev, healthQuestions: [...prev.healthQuestions, q] }));
    setNewQuestion("");
  }

  function removeQuestion(index: number) {
    setRecurringForm((prev) => ({
      ...prev,
      healthQuestions: prev.healthQuestions.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona los servicios que ofrece tu negocio.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5B21B6]"
        >
          <Plus className="h-4 w-4" /> Nuevo Servicio
        </button>
      </div>

      {/* Multi-service config */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Settings2 className="h-4 w-4 text-[#7C3AED]" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">Servicios por reserva</p>
              <p className="text-xs text-muted-foreground">Permite que tus clientes seleccionen varios servicios en una sola cita.</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                value={maxServices}
                onChange={(e) => handleSaveMaxServices(parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 appearance-none rounded-full bg-black/10 dark:bg-white/10 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7C3AED] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="rounded-lg border border-border bg-muted px-3 py-1 font-mono text-xs min-w-[3rem] text-center">
                {savingMax ? "..." : maxServices}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/70">{maxServices === 1 ? "Solo un servicio por cita (modo estándar)." : `Hasta ${maxServices} servicios por cita. Las duraciones y precios se suman automáticamente.`}</p>
          </div>
        </div>
      </div>

      {/* Dialog/Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border shrink-0">
              <h3 className="text-lg font-semibold">
                {editingService ? "Editar Servicio" : "Nuevo Servicio"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 p-6 space-y-4">

                {/* ── Base fields ── */}
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Nombre</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Consultoria Web"
                    required
                    className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Descripcion</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descripcion del servicio..."
                    rows={3}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Duracion (minutos)</label>
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="60"
                      required
                      min="1"
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">Precio (CLP)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="50000"
                      required
                      min="0"
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                    />
                  </div>
                </div>

                {depositEnabled && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Banknote className="h-3.5 w-3.5 text-[#7C3AED]" />
                      Abono / Deposito (CLP)
                    </label>
                    <input
                      type="number"
                      value={form.depositAmount}
                      onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                      placeholder="0 = sin abono"
                      min="0"
                      step="500"
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      Monto que el cliente debe pagar al reservar este servicio. Dejalo en 0 para no requerir abono.
                    </p>
                  </div>
                )}

                {/* ── RESERVAS RECURRENTES ── */}
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Header — click to expand/collapse, toggle to activate/deactivate */}
                  <div className="flex w-full items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setRecurringOpen((o) => !o)}
                      className="flex flex-1 items-center gap-2 text-sm font-medium transition-colors hover:text-[#7C3AED]"
                    >
                      <RefreshCw className="h-4 w-4 text-[#7C3AED]" />
                      <span>Reservas Recurrentes</span>
                      {recurringEnabled && (
                        <span className="rounded-full bg-[#7C3AED] px-2 py-0.5 text-[10px] font-semibold text-white">
                          Activo
                        </span>
                      )}
                      {editingService && (editingService._count?.recurringBookings ?? 0) > 0 && (
                        <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
                          {editingService._count.recurringBookings} suscripcion(es)
                        </span>
                      )}
                      {recurringOpen
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>

                    {/* Toggle switch — this is the only way to activate/deactivate */}
                    <button
                      type="button"
                      onClick={() => {
                        if (recurringEnabled) {
                          // Deactivating
                          setRecurringEnabled(false);
                          setRecurringForm({ ...DEFAULT_RECURRING });
                        } else {
                          // Activating
                          setRecurringEnabled(true);
                          setRecurringOpen(true);
                        }
                      }}
                      className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ml-3 ${
                        recurringEnabled ? "bg-[#7C3AED]" : "bg-border"
                      }`}
                      title={recurringEnabled ? "Desactivar modo recurrente" : "Activar modo recurrente"}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        recurringEnabled ? "translate-x-4" : ""
                      }`} />
                    </button>
                  </div>

                  {recurringEnabled && recurringOpen && (
                    <div className="border-t border-border p-4 space-y-4 bg-muted/20">


                      {/* Mode */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modo de dias</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["FIXED_DAYS", "DAYS_WITH_REST", "FREE_MINIMUM"] as const).map((m) => {
                            const labels = {
                              FIXED_DAYS: "Dias fijos",
                              DAYS_WITH_REST: "N dias + descanso",
                              FREE_MINIMUM: "Libre con minimo",
                            };
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setRecurringForm((p) => ({ ...p, mode: m }))}
                                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors text-center ${
                                  recurringForm.mode === m
                                    ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                                    : "border-border text-muted-foreground hover:border-[#7C3AED]/40"
                                }`}
                              >
                                {labels[m]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mode-specific fields */}
                      {recurringForm.mode === "FIXED_DAYS" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dias habilitados</label>
                          <div className="flex flex-wrap gap-2">
                            {WEEK_DAYS.map((d) => (
                              <button
                                key={d.value}
                                type="button"
                                onClick={() => toggleFixedDay(d.value)}
                                className={`h-9 w-9 rounded-lg border text-xs font-bold transition-colors ${
                                  recurringForm.fixedDays.includes(d.value)
                                    ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                                    : "border-border text-muted-foreground hover:border-[#7C3AED]/40"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {recurringForm.mode === "DAYS_WITH_REST" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Dias por semana</label>
                            <input
                              type="number"
                              min={1}
                              max={6}
                              value={recurringForm.daysPerWeek}
                              onChange={(e) => setRecurringForm((p) => ({ ...p, daysPerWeek: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Descanso minimo (dias)</label>
                            <input
                              type="number"
                              min={1}
                              value={recurringForm.minRestDays}
                              onChange={(e) => setRecurringForm((p) => ({ ...p, minRestDays: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {recurringForm.mode === "FREE_MINIMUM" && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Minimo de dias por semana</label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={recurringForm.daysPerWeek}
                            onChange={(e) => setRecurringForm((p) => ({ ...p, daysPerWeek: Number(e.target.value) }))}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                          />
                        </div>
                      )}

                      {/* Duration options */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duraciones disponibles</label>
                        <div className="flex gap-4">
                          {[1, 2, 3].map((m) => (
                            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={recurringForm.durationOptions.includes(m)}
                                onChange={() => toggleDurationOption(m)}
                                className="h-3.5 w-3.5 rounded accent-[#7C3AED]"
                              />
                              <span className="text-sm">{m} {m === 1 ? "mes" : "meses"}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Start date range */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">El cliente puede empezar hasta X dias desde hoy</label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={recurringForm.startDateRangeDays}
                          onChange={(e) => setRecurringForm((p) => ({ ...p, startDateRangeDays: Number(e.target.value) }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                        />
                      </div>

                      {/* Toggles */}
                      <div className="space-y-3">
                        {([
                          { key: "requiresApproval", label: "Requiere aprobación del negocio" },
                          { key: "requiresHealthForm", label: "Formulario de salud" },
                          { key: "requiresRut", label: "Pedir RUT al cliente" },
                        ] as const).map(({ key, label }) => {
                          // Check if this toggle is affected by a business-level policy
                          const isRutToggle = key === "requiresRut";
                          const rutForcedByPolicy = isRutToggle && businessPolicies.requiresClientRut;

                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${rutForcedByPolicy ? "text-muted-foreground" : ""}`}>{label}</span>
                                  {rutForcedByPolicy && (
                                    <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-medium">
                                      Activado globalmente
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={rutForcedByPolicy}
                                  onClick={() => setRecurringForm((p) => ({ ...p, [key]: !p[key] }))}
                                  className={`relative h-5 w-9 rounded-full transition-colors ${
                                    recurringForm[key] || rutForcedByPolicy ? "bg-[#7C3AED]" : "bg-border"
                                  } ${rutForcedByPolicy ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                    recurringForm[key] || rutForcedByPolicy ? "translate-x-4" : ""
                                  }`} />
                                </button>
                              </div>
                              {rutForcedByPolicy && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Info className="h-3 w-3" />
                                  Configurado en Ajustes → Políticas de Suscripciones
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Health questions */}
                      {recurringForm.requiresHealthForm && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preguntas del formulario de salud</label>
                          {recurringForm.healthQuestions.map((q, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs">{q}</span>
                              <button
                                type="button"
                                onClick={() => removeQuestion(i)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }}
                              placeholder="Ej: Tenes alguna enfermedad cardiovascular?"
                              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={addQuestion}
                              className="rounded-xl bg-[#7C3AED]/10 px-3 py-2 text-[#7C3AED] hover:bg-[#7C3AED]/20"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Renewal message */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Mensaje de renovacion personalizado (opcional)</label>
                        <textarea
                          value={recurringForm.renewalMessage}
                          onChange={(e) => setRecurringForm((p) => ({ ...p, renewalMessage: e.target.value }))}
                          placeholder="Ej: Contactanos para renovar tu plan con descuento especial!"
                          rows={2}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
                        />
                      </div>

                      {/* Expiration warning */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Avisar al cliente X dias antes del vencimiento</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={recurringForm.expirationWarningDays}
                          onChange={(e) => setRecurringForm((p) => ({ ...p, expirationWarningDays: Number(e.target.value) }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                        />
                      </div>

                      {/* Active subscriptions warning */}
                      {editingService && (editingService._count?.recurringBookings ?? 0) > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                          <p className="text-xs text-amber-800 dark:text-amber-400">
                            Este servicio tiene {editingService._count.recurringBookings} suscripcion(es) activa(s). Los cambios al plan no afectan suscripciones ya creadas.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="shrink-0 flex justify-end gap-3 p-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingService ? (
                    "Guardar Cambios"
                  ) : (
                    "Crear Servicio"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-lg font-semibold">Listado de Servicios</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/30" />
            </div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Wrench className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p>No hay servicios aún. Crea el primero.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Nombre</th>
                    <th className="pb-3 pr-4">Descripción</th>
                    <th className="pb-3 pr-4">Duración</th>
                    <th className="pb-3 pr-4">Precio</th>
                    {depositEnabled && <th className="pb-3 pr-4">Abono</th>}
                    <th className="pb-3 pr-4">Recurrente</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr
                      key={service.id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3.5 pr-4 font-medium">
                        {service.name}
                      </td>
                      <td className="max-w-xs truncate py-3.5 pr-4 text-muted-foreground">
                        {service.description || "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                          {service.duration} min
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-sm">
                        {formatPrice(service.price)}
                      </td>
                      {depositEnabled && (
                        <td className="py-3.5 pr-4">
                          {service.depositAmount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[#009EE3]/20 bg-[#009EE3]/10 px-2 py-0.5 text-xs font-medium text-[#009EE3]">
                              <Banknote className="h-3 w-3" />
                              {formatPrice(service.depositAmount)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin abono</span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5 pr-4">
                        {service.recurringPlan ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                            <RefreshCw className="h-3 w-3" />
                            {service._count?.recurringBookings ?? 0} activa(s)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(service)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
