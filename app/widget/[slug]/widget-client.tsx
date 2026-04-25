"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { addDays, addMinutes, format, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Loader2, Mail, Phone, Sparkles, UserRound, Users } from "lucide-react";
import { formatPrice, capitalize } from "@/lib/utils";

interface Service { id: string; name: string; description: string | null; duration: number; price: number; }
interface BusinessHour { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean; }
interface StaffScheduleEntry { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean; }
interface StaffMember { id: string; name: string; schedule: StaffScheduleEntry[]; }
interface Props {
  business: {
    name: string; slug: string; apiKey: string; logoUrl: string | null;
    primaryColor: string; secondaryColor: string; backgroundColor: string; brandColor: string | null;
    textColor?: string; textSecondary?: string; fontSize?: number;
  };
  services: Service[];
  primaryColor: string;
  businessHours?: BusinessHour[];
  staffMembers?: StaffMember[];
}

type Step = "service" | "staff" | "datetime" | "details" | "success";
type FormState = { name: string; email: string; phone: string };
type BlockedSlot = { startTime: string; endTime: string };

function buildDays(businessHours?: BusinessHour[]) {
  const days: Date[] = [];
  let d = new Date();
  while (days.length < 10) {
    d = addDays(d, 1);
    const dow = d.getDay();
    if (businessHours && businessHours.length > 0) {
      const bh = businessHours.find((h) => h.dayOfWeek === dow);
      if (bh && !bh.isOpen) continue;
    }
    days.push(new Date(d));
  }
  return days;
}

function buildSlots(date: Date, duration: number, businessHours?: BusinessHour[], staffSchedule?: StaffScheduleEntry[]) {
  const dow = date.getDay();
  let startH = 9, startM = 0, endH = 19, endM = 0;

  if (businessHours && businessHours.length > 0) {
    const bh = businessHours.find((h) => h.dayOfWeek === dow);
    if (bh && bh.isOpen) {
      const [sh, sm] = bh.startTime.split(":").map(Number);
      const [eh, em] = bh.endTime.split(":").map(Number);
      startH = sh; startM = sm; endH = eh; endM = em;
    }
  }

  // Narrow to staff schedule if available
  if (staffSchedule && staffSchedule.length > 0) {
    const ss = staffSchedule.find((s) => s.dayOfWeek === dow);
    if (ss && ss.isWorking) {
      const [ssh, ssm] = ss.startTime.split(":").map(Number);
      const [seh, sem] = ss.endTime.split(":").map(Number);
      if (ssh * 60 + ssm > startH * 60 + startM) { startH = ssh; startM = ssm; }
      if (seh * 60 + sem < endH * 60 + endM) { endH = seh; endM = sem; }
    }
  }

  const slots: { start: Date; end: Date }[] = [];
  let current = setMinutes(setHours(date, startH), startM);
  const end = setMinutes(setHours(date, endH), endM);
  while (addMinutes(current, duration) <= end) {
    slots.push({ start: current, end: addMinutes(current, duration) });
    current = addMinutes(current, 30);
  }
  return slots;
}

function isBlocked(slot: { start: Date; end: Date }, blocked: BlockedSlot[]) {
  for (const b of blocked) {
    const bs = new Date(b.startTime), be = new Date(b.endTime);
    if (slot.start < be && slot.end > bs) return true;
  }
  return false;
}

function isStaffWorkingOnDay(staff: StaffMember, dow: number): boolean {
  if (staff.schedule.length === 0) return true; // No schedule = always available
  const entry = staff.schedule.find((s) => s.dayOfWeek === dow);
  return entry ? entry.isWorking : false;
}

export function WidgetClient({ business, services, primaryColor, businessHours, staffMembers }: Props) {
  const pc = `#${primaryColor}`;
  const bgColor = business.backgroundColor || "#0A0A0A";
  const textColor = business.textColor || "#FFFFFF";
  const textSecondary = business.textSecondary || `${textColor}66`;
  const fontSize = business.fontSize || 14;
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "" });
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({ name: false, email: false, phone: false });
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const hasMultipleStaff = staffMembers && staffMembers.length > 1;

  const days = useMemo(() => buildDays(businessHours), [businessHours]);
  const slots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const staffSched = selectedStaff?.schedule;
    return buildSlots(selectedDate, selectedService.duration, businessHours, staffSched);
  }, [selectedDate, selectedService, businessHours, selectedStaff]);

  // Filter available staff for a given day
  const availableStaff = useMemo(() => {
    if (!staffMembers || !selectedDate) return staffMembers || [];
    const dow = selectedDate.getDay();
    return staffMembers.filter((s) => isStaffWorkingOnDay(s, dow));
  }, [staffMembers, selectedDate]);

  const validation = { name: form.name.trim().length >= 3, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), phone: form.phone.length === 0 || /^\+?[0-9\s()-]{8,18}$/.test(form.phone) };
  const isFormValid = validation.name && validation.email && validation.phone;

  const fetchBlocked = useCallback(async (date: Date) => {
    setLoadingSlots(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/business/${business.slug}/appointments?date=${dateStr}`, { headers: { "x-api-key": business.apiKey } });
      if (res.ok) { const data = await res.json(); setBlockedSlots(data); }
    } catch { /* ignore */ } finally { setLoadingSlots(false); }
  }, [business.slug, business.apiKey]);

  useEffect(() => { if (selectedDate) fetchBlocked(selectedDate); }, [selectedDate, fetchBlocked]);

  function handleSelectService(s: Service) {
    setSelectedService(s); setSelectedDate(null); setSelectedSlot(null); setSelectedStaff(null);
    if (hasMultipleStaff) { setStep("staff"); } else {
      if (staffMembers && staffMembers.length === 1) setSelectedStaff(staffMembers[0]);
      setStep("datetime");
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true });
    if (!selectedService || !selectedSlot || !isFormValid) return;
    setSubmitting(true); setApiError("");
    try {
      const res = await fetch(`/api/business/${business.slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": business.apiKey },
        body: JSON.stringify({
          serviceId: selectedService.id, customerName: form.name, customerEmail: form.email,
          customerPhone: form.phone || undefined, startTime: selectedSlot.start.toISOString(),
          endTime: selectedSlot.end.toISOString(), staffId: selectedStaff?.id,
        }),
      });
      if (!res.ok) { const p = await res.json(); throw new Error(p.error || "No fue posible confirmar la reserva."); }
      setStep("success");
    } catch (err) { setApiError(err instanceof Error ? err.message : "Error inesperado."); } finally { setSubmitting(false); }
  }

  function restart() {
    setStep("service"); setSelectedService(null); setSelectedStaff(null); setSelectedDate(null); setSelectedSlot(null);
    setForm({ name: "", email: "", phone: "" }); setTouched({ name: false, email: false, phone: false }); setApiError(""); setBlockedSlots([]);
  }

  const stepLabels = hasMultipleStaff ? ["Servicio", "Profesional", "Fecha y hora", "Tus datos"] : ["Servicio", "Fecha y hora", "Tus datos"];
  const stepIdx = step === "service" ? 0 : step === "staff" ? 1 : step === "datetime" ? (hasMultipleStaff ? 2 : 1) : step === "details" ? (hasMultipleStaff ? 3 : 2) : stepLabels.length;

  return (
    <div
      className="w-full min-h-screen p-3 sm:p-5"
      style={{
        background: bgColor,
        ["--wp" as string]: pc,
        ["--wbg" as string]: bgColor,
        ["--wtext" as string]: textColor,
        ["--wtext-secondary" as string]: textSecondary,
        ["--wfont-size" as string]: `${fontSize}px`,
        fontSize: `${fontSize}px`,
        color: textColor,
      }}
    >
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.06] shadow-2xl" style={{ background: bgColor, color: textColor }}>
        {/* Header */}
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6" style={{ background: `${bgColor}CC` }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {business.logoUrl && <img src={business.logoUrl} alt={business.name} className="h-8 w-8 rounded-lg object-cover" />}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: textSecondary }}>Reserva online</p>
                <h1 className="text-lg font-bold tracking-tight" style={{ color: textColor }}>{business.name}</h1>
              </div>
            </div>
            <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}20`, color: pc }}>Paso a paso</span>
          </div>
          {step !== "success" && (
            <div className={`mt-4 grid gap-2 text-xs`} style={{ gridTemplateColumns: `repeat(${stepLabels.length}, 1fr)` }}>
              {stepLabels.map((label, i) => (
                <div key={label} className="rounded-full px-2 py-1.5 text-center transition-all duration-300" style={stepIdx >= i ? { background: `${pc}20`, color: pc } : { border: `1px solid ${textSecondary}15`, color: textSecondary }}>
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {/* Step 1: Service */}
          {step === "service" && (
            <div className="animate-fade-up space-y-4">
              <div><h2 className="text-xl font-bold">1. Selecciona un servicio</h2><p className="text-sm text-white/40">Elige el servicio que quieres reservar.</p></div>
              <div className="grid gap-3">
                {services.map((s) => (
                  <button key={s.id} type="button" onClick={() => handleSelectService(s)}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${pc}40`)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{s.name}</p>
                        {s.description && <p className="text-sm text-white/40">{s.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/40">
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] px-2 py-1"><Clock3 className="h-3 w-3" />{s.duration} min</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] px-2 py-1">{formatPrice(s.price)}</span>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1.5: Staff (only if multi-staff) */}
          {step === "staff" && selectedService && staffMembers && (
            <div className="animate-fade-up space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("service")} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70"><ChevronLeft className="h-4 w-4" />Volver</button>
                <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}>{selectedService.name}</span>
              </div>
              <div><h2 className="text-xl font-bold">2. Elige un profesional</h2><p className="text-sm text-white/40">Selecciona quién te atenderá.</p></div>
              <div className="grid gap-3">
                {staffMembers.map((staff) => (
                  <button key={staff.id} type="button" onClick={() => { setSelectedStaff(staff); setSelectedDate(null); setSelectedSlot(null); setStep("datetime"); }}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${pc}40`)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold" style={{ background: `${pc}15`, color: pc }}>
                          {staff.name.charAt(0)}
                        </div>
                        <p className="font-medium">{staff.name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/20" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: DateTime */}
          {step === "datetime" && selectedService && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep(hasMultipleStaff ? "staff" : "service")} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70"><ChevronLeft className="h-4 w-4" />Volver</button>
                <div className="flex gap-2">
                  <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}>{selectedService.name}</span>
                  {selectedStaff && <span className="rounded-lg px-2.5 py-1 text-xs font-medium border border-white/[0.06] text-white/50">{selectedStaff.name}</span>}
                </div>
              </div>
              <div><h2 className="text-xl font-bold">{hasMultipleStaff ? "3" : "2"}. Elige fecha y hora</h2><p className="text-sm text-white/40">Selecciona un día y luego una hora disponible.</p></div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/60">Días disponibles</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {days.map((day) => {
                    const sel = selectedDate?.toDateString() === day.toDateString();
                    const staffWorking = selectedStaff ? isStaffWorkingOnDay(selectedStaff, day.getDay()) : true;
                    return (
                      <button key={day.toISOString()} type="button" disabled={!staffWorking}
                        onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                        className={`rounded-xl border px-2 py-2 text-left transition-all ${!staffWorking ? "opacity-30 cursor-not-allowed" : ""}`}
                        style={sel ? { borderColor: `${pc}40`, background: `${pc}15` } : { borderColor: "rgba(255,255,255,0.06)" }}>
                        <p className="text-[11px] uppercase text-white/40">{capitalize(format(day, "EEE", { locale: es }))}</p>
                        <p className="text-lg font-bold leading-none">{format(day, "d")}</p>
                        <p className="text-xs text-white/40">{capitalize(format(day, "MMMM", { locale: es }))}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedDate && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white/60">Horas — {capitalize(format(selectedDate, "EEEE d 'de' MMMM", { locale: es }))}</p>
                  {loadingSlots ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((slot) => {
                        const blocked = isBlocked(slot, blockedSlots);
                        const active = selectedSlot?.start.getTime() === slot.start.getTime();
                        return (
                          <button key={slot.start.toISOString()} type="button" disabled={blocked} onClick={() => setSelectedSlot(slot)}
                            className={`rounded-full border px-3 py-2 text-sm transition-all ${blocked ? "cursor-not-allowed border-white/[0.03] bg-white/[0.01] text-white/15 line-through" : ""}`}
                            style={active && !blocked ? { borderColor: `${pc}50`, background: `${pc}20`, color: pc, fontWeight: 600 } : blocked ? {} : { borderColor: "rgba(255,255,255,0.06)" }}>
                            {format(slot.start, "HH:mm")}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <button type="button" disabled={!selectedSlot} onClick={() => setStep("details")}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-30" style={{ background: pc }}>
                Continuar con mis datos <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 3: Details */}
          {step === "details" && selectedService && selectedSlot && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("datetime")} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70"><ChevronLeft className="h-4 w-4" />Volver</button>
                <span className="rounded-lg px-2.5 py-1 text-xs" style={{ background: `${pc}15`, color: pc }}>Paso final</span>
              </div>
              <div><h2 className="text-xl font-bold">{hasMultipleStaff ? "4" : "3"}. Completa tus datos</h2><p className="text-sm text-white/40">Te enviaremos la confirmación.</p></div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-white/40">Servicio</span><span className="font-medium">{selectedService.name}</span></div>
                {selectedStaff && <div className="flex justify-between"><span className="text-white/40">Profesional</span><span className="font-medium">{selectedStaff.name}</span></div>}
                <div className="flex justify-between"><span className="text-white/40">Fecha</span><span className="font-medium">{capitalize(format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es }))}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Hora</span><span className="font-medium">{format(selectedSlot.start, "HH:mm")} - {format(selectedSlot.end, "HH:mm")}</span></div>
              </div>
              <form onSubmit={handleConfirm} className="space-y-4">
                {([["name", "Nombre y apellido", "Ej: Catalina Fuentes", UserRound, "text"] as const, ["email", "Correo electrónico", "ejemplo@correo.com", Mail, "email"] as const, ["phone", "Teléfono (opcional)", "+56 9 1234 5678", Phone, "tel"] as const]).map(([field, label, placeholder, Icon, type]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-white/60"><Icon className="h-3.5 w-3.5" />{label}</label>
                    <input type={type} value={form[field]} onBlur={() => setTouched((p) => ({ ...p, [field]: true }))} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
                      className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
                      style={!touched[field] ? { borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" } : validation[field] ? { borderColor: `${pc}30`, background: `${pc}08` } : { borderColor: "rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.05)" }} />
                    {touched[field] && !validation[field] && <p className="text-xs text-red-400">Campo inválido</p>}
                  </div>
                ))}
                {apiError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{apiError}</div>}
                <button type="submit" disabled={!isFormValid || submitting} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-30" style={{ background: pc }}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Confirmando...</> : <>Confirmar reserva <ChevronRight className="h-4 w-4" /></>}
                </button>
              </form>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && selectedService && selectedSlot && (
            <div className="animate-scale-in space-y-6 py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `${pc}20` }}>
                <CheckCircle2 className="h-9 w-9" style={{ color: pc }} />
              </div>
              <div><h2 className="text-2xl font-bold">Reserva confirmada</h2><p className="mx-auto mt-2 max-w-md text-sm text-white/40">Ya quedó agendada tu cita.</p></div>
              <div className="mx-auto max-w-md rounded-xl p-4 text-left text-sm" style={{ background: `${pc}10`, border: `1px solid ${pc}25` }}>
                <p className="mb-2 flex items-center gap-1 font-medium" style={{ color: pc }}><Sparkles className="h-4 w-4" />Resumen</p>
                <div className="space-y-1 text-white/70">
                  <p><span className="text-white/40">Servicio:</span> {selectedService.name}</p>
                  {selectedStaff && <p><span className="text-white/40">Profesional:</span> {selectedStaff.name}</p>}
                  <p><span className="text-white/40">Fecha:</span> {capitalize(format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es }))}</p>
                  <p><span className="text-white/40">Hora:</span> {format(selectedSlot.start, "HH:mm")}</p>
                  <p><span className="text-white/40">Cliente:</span> {form.name}</p>
                </div>
              </div>
              <button type="button" onClick={restart} className="rounded-xl border border-white/[0.06] px-5 py-2.5 text-sm text-white/60 transition-all hover:text-white">Agendar otra reserva</button>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-5 py-3 text-center text-xs" style={{ background: `${bgColor}CC`, color: textSecondary }}>
          Powered by Puragenda · integración marca blanca
        </div>
      </div>
    </div>
  );
}
