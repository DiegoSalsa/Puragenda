"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { addDays, addMinutes, format, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Gift, Loader2, Mail, Phone, Sparkles, UserRound, Users } from "lucide-react";
import { formatPrice, capitalize } from "@/lib/utils";

interface Service { id: string; name: string; description: string | null; duration: number; price: number; }
interface BusinessHour { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean; }
interface StaffScheduleEntry { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean; }
interface StaffMember { id: string; name: string; schedule: StaffScheduleEntry[]; serviceIds: string[]; }
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
  maxServicesPerBooking?: number;
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

/**
 * Returns '#000000' or '#FFFFFF' depending on which contrasts better against the given hex color.
 * Uses the YIQ formula for perceptual brightness.
 */
function getContrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#FFFFFF";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#000000" : "#FFFFFF";
}

export function WidgetClient({ business, services, primaryColor, businessHours, staffMembers, maxServicesPerBooking = 1 }: Props) {
  const pc = `#${primaryColor}`;
  const bgColor = business.backgroundColor || "#0A0A0A";
  const textColor = business.textColor || "#FFFFFF";
  const textSecondary = business.textSecondary || `${textColor}66`;
  const fontSize = business.fontSize || 14;
  const isMultiService = maxServicesPerBooking > 1;
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "" });
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({ name: false, email: false, phone: false });
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ── Reward / Discount code state ──
  const [rewardCode, setRewardCode] = useState("");
  const [rewardStatus, setRewardStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [rewardError, setRewardError] = useState("");
  const [rewardDiscount, setRewardDiscount] = useState<{ type: string; value: number } | null>(null);

  const totalDuration = isMultiService ? selectedServices.reduce((s, sv) => s + sv.duration, 0) : (selectedService?.duration || 0);
  const rawTotalPrice = isMultiService ? selectedServices.reduce((s, sv) => s + sv.price, 0) : (selectedService?.price || 0);

  // Apply discount if a valid reward code is present
  const totalPrice = useMemo(() => {
    if (!rewardDiscount) return rawTotalPrice;
    if (rewardDiscount.type === "PERCENTAGE") {
      return Math.max(0, rawTotalPrice - Math.round(rawTotalPrice * rewardDiscount.value / 100));
    }
    // FIXED discount
    return Math.max(0, rawTotalPrice - rewardDiscount.value);
  }, [rawTotalPrice, rewardDiscount]);

  const hasMultipleStaff = staffMembers && staffMembers.length > 1;

  // Filter staff who can perform the selected service(s)
  const filteredStaff = useMemo(() => {
    if (!staffMembers) return [];
    const selectedServiceIds = isMultiService
      ? selectedServices.map((s) => s.id)
      : selectedService ? [selectedService.id] : [];
    if (selectedServiceIds.length === 0) return staffMembers;
    return staffMembers.filter((staff) => {
      // Staff with no services assigned = available for all (backwards-compatible)
      if (!staff.serviceIds || staff.serviceIds.length === 0) return true;
      return selectedServiceIds.some((sid) => staff.serviceIds.includes(sid));
    });
  }, [staffMembers, selectedService, selectedServices, isMultiService]);

  const hasMultipleFilteredStaff = filteredStaff.length > 1;

  const days = useMemo(() => buildDays(businessHours), [businessHours]);
  const slots = useMemo(() => {
    const dur = isMultiService ? totalDuration : selectedService?.duration;
    if (!selectedDate || !dur) return [];
    const staffSched = selectedStaff?.schedule;
    return buildSlots(selectedDate, dur, businessHours, staffSched);
  }, [selectedDate, selectedService, businessHours, selectedStaff, totalDuration, isMultiService]);

  // Filter available staff for a given day
  const availableStaff = useMemo(() => {
    if (!staffMembers || !selectedDate) return staffMembers || [];
    const dow = selectedDate.getDay();
    return staffMembers.filter((s) => isStaffWorkingOnDay(s, dow));
  }, [staffMembers, selectedDate]);

  const validation = { name: form.name.trim().length >= 3, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), phone: form.phone.length === 0 || /^\+?[0-9\s()-]{8,18}$/.test(form.phone) };
  const isFormValid = validation.name && validation.email && validation.phone;

  const fetchBlocked = useCallback(async (date: Date, staffId?: string) => {
    setLoadingSlots(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const staffParam = staffId ? `&staffId=${staffId}` : "";
      const res = await fetch(`/api/business/${business.slug}/appointments?date=${dateStr}${staffParam}`, { headers: { "x-api-key": business.apiKey } });
      if (res.ok) { const data = await res.json(); setBlockedSlots(data); }
    } catch { /* ignore */ } finally { setLoadingSlots(false); }
  }, [business.slug, business.apiKey]);

  useEffect(() => { if (selectedDate) fetchBlocked(selectedDate, selectedStaff?.id); }, [selectedDate, selectedStaff, fetchBlocked]);

  // Helper: filter staff for a given set of service IDs (avoids stale useMemo)
  function getStaffForServices(serviceIds: string[]): StaffMember[] {
    if (!staffMembers) return [];
    if (serviceIds.length === 0) return staffMembers;
    return staffMembers.filter((staff) => {
      if (!staff.serviceIds || staff.serviceIds.length === 0) return true;
      return serviceIds.some((sid) => staff.serviceIds.includes(sid));
    });
  }

  function handleSelectService(s: Service) {
    if (isMultiService) {
      setSelectedServices((prev) => {
        const exists = prev.find((x) => x.id === s.id);
        if (exists) return prev.filter((x) => x.id !== s.id);
        if (prev.length >= maxServicesPerBooking) return prev;
        return [...prev, s];
      });
      return;
    }
    setSelectedService(s); setSelectedDate(null); setSelectedSlot(null); setSelectedStaff(null);
    const nowFiltered = getStaffForServices([s.id]);
    if (nowFiltered.length > 1) { setStep("staff"); } else {
      if (nowFiltered.length === 1) setSelectedStaff(nowFiltered[0]);
      setStep("datetime");
    }
  }

  function handleMultiServiceContinue() {
    if (selectedServices.length === 0) return;
    setSelectedService(selectedServices[0]);
    setSelectedDate(null); setSelectedSlot(null); setSelectedStaff(null);
    const svcIds = selectedServices.map((sv) => sv.id);
    const nowFiltered = getStaffForServices(svcIds);
    if (nowFiltered.length > 1) { setStep("staff"); } else {
      if (nowFiltered.length === 1) setSelectedStaff(nowFiltered[0]);
      setStep("datetime");
    }
  }

  async function handleValidateReward() {
    const code = rewardCode.trim().toUpperCase();
    if (!code || !form.email) return;
    setRewardStatus("loading");
    setRewardError("");
    try {
      const res = await fetch(`/api/business/${business.slug}/validate-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": business.apiKey },
        body: JSON.stringify({ code, email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatus("invalid");
        setRewardError(data.error || "Código inválido.");
        setRewardDiscount(null);
      } else {
        setRewardStatus("valid");
        setRewardDiscount({ type: data.discountType, value: data.discountValue });
      }
    } catch {
      setRewardStatus("invalid");
      setRewardError("Error al validar el código.");
      setRewardDiscount(null);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true });
    if (!selectedService || !selectedSlot || !isFormValid) return;
    setSubmitting(true); setApiError("");
    try {
      const serviceIds = isMultiService && selectedServices.length > 0
        ? selectedServices.map((s) => s.id)
        : [selectedService.id];
      const res = await fetch(`/api/business/${business.slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": business.apiKey },
        body: JSON.stringify({
          serviceId: serviceIds[0], serviceIds,
          customerName: form.name, customerEmail: form.email,
          customerPhone: form.phone || undefined, startTime: selectedSlot.start.toISOString(),
          endTime: selectedSlot.end.toISOString(), staffId: selectedStaff?.id,
          rewardCode: rewardStatus === "valid" ? rewardCode.trim().toUpperCase() : undefined,
        }),
      });
      if (!res.ok) { const p = await res.json(); throw new Error(p.error || "No fue posible confirmar la reserva."); }
      setStep("success");
    } catch (err) { setApiError(err instanceof Error ? err.message : "Error inesperado."); } finally { setSubmitting(false); }
  }

  function restart() {
    setStep("service"); setSelectedService(null); setSelectedServices([]); setSelectedStaff(null); setSelectedDate(null); setSelectedSlot(null);
    setForm({ name: "", email: "", phone: "" }); setTouched({ name: false, email: false, phone: false }); setApiError(""); setBlockedSlots([]);
    setRewardCode(""); setRewardStatus("idle"); setRewardError(""); setRewardDiscount(null);
  }

  const stepLabels = hasMultipleFilteredStaff ? ["Servicio", "Profesional", "Fecha y hora", "Tus datos"] : ["Servicio", "Fecha y hora", "Tus datos"];
  const stepIdx = step === "service" ? 0 : step === "staff" ? 1 : step === "datetime" ? (hasMultipleFilteredStaff ? 2 : 1) : step === "details" ? (hasMultipleFilteredStaff ? 3 : 2) : stepLabels.length;

  return (
    <div
      className="w-full min-h-screen p-3 sm:p-5 flex justify-center"
      style={{
        background: bgColor,
        ["--wp" as string]: pc,
        ["--wbg" as string]: bgColor,
        ["--wtext" as string]: textColor,
        ["--wtext-secondary" as string]: textSecondary,
        ["--wborder" as string]: `${textColor}1A`,
        ["--wsubtle" as string]: `${textColor}08`,
        ["--wfont-size" as string]: `${fontSize}px`,
        fontSize: `${fontSize}px`,
        color: textColor,
      }}
    >
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[1.25rem] border shadow-2xl transition-all duration-500 flex flex-col" style={{ background: bgColor, color: textColor, borderColor: "var(--wborder)" }}>
        {/* Header */}
        <div className="border-b px-5 py-4 sm:px-6 relative overflow-hidden" style={{ background: `${bgColor}F2`, borderColor: "var(--wborder)", backdropFilter: "blur(12px)" }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `linear-gradient(135deg, ${pc}00 0%, ${pc}40 100%)` }} />
          <div className="relative flex items-center justify-between gap-2">
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
            <div className={`mt-4 grid gap-2 text-[10px] sm:text-xs`} style={{ gridTemplateColumns: `repeat(${stepLabels.length}, 1fr)` }}>
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
              <div><h2 className="text-xl font-bold">1. {isMultiService ? "Selecciona servicios" : "Selecciona un servicio"}</h2><p className="text-sm" style={{ color: textSecondary }}>{isMultiService ? `Elige hasta ${maxServicesPerBooking} servicios para tu reserva.` : "Elige el servicio que quieras reservar."}</p></div>
              <div className="grid gap-3">
                {services.map((s) => {
                  const isSelected = isMultiService && selectedServices.some((x) => x.id === s.id);
                  return (
                  <button key={s.id} type="button" onClick={() => handleSelectService(s)}
                    className="group rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
                    style={{ borderColor: isSelected ? `${pc}60` : "var(--wborder)", background: isSelected ? `${pc}08` : "var(--wsubtle)" }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = `${pc}40`; }} onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "var(--wborder)"; }}>
                    {isSelected && <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `linear-gradient(135deg, ${pc}00 0%, ${pc} 100%)` }} />}
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{s.name}</p>
                        {s.description && <p className="text-sm" style={{ color: textSecondary }}>{s.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: textSecondary }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wbg)" }}><Clock3 className="h-3.5 w-3.5" />{s.duration} min</span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wbg)" }}>{formatPrice(s.price)}</span>
                        </div>
                      </div>
                      {isMultiService ? (
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 shadow-sm" style={isSelected ? { borderColor: pc, background: pc } : { borderColor: "var(--wborder)", background: "var(--wbg)" }}>
                          {isSelected && <span className="text-sm text-white font-bold drop-shadow-md">✓</span>}
                        </div>
                      ) : (
                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 opacity-40 transition-transform group-hover:translate-x-1" style={{ color: textColor }} />
                      )}
                    </div>
                  </button>
                  );
                })}
              </div>
              {isMultiService && selectedServices.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl border p-4 text-sm space-y-1.5 shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                    <div className="flex justify-between" style={{ color: textSecondary }}><span>Servicios:</span><span className="font-medium" style={{ color: textColor }}>{selectedServices.length}</span></div>
                    <div className="flex justify-between" style={{ color: textSecondary }}><span>Duración total:</span><span className="font-medium" style={{ color: textColor }}>{totalDuration} min</span></div>
                    <div className="flex justify-between" style={{ color: textSecondary }}><span>Precio total:</span><span className="font-medium" style={{ color: textColor }}>{formatPrice(totalPrice)}</span></div>
                  </div>
                  <button type="button" onClick={handleMultiServiceContinue}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98]" style={{ background: pc, color: getContrastColor(pc) }}>
                    Continuar <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 1.5: Staff (only if multi-staff) */}
          {step === "staff" && selectedService && filteredStaff.length > 0 && (
            <div className="animate-fade-up space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("service")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" />Volver</button>
                <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}>{selectedService.name}</span>
              </div>
              <div><h2 className="text-xl font-bold">2. Elige un profesional</h2><p className="text-sm" style={{ color: textSecondary }}>Selecciona quién te atenderá.</p></div>
              <div className="grid gap-3">
                {filteredStaff.map((staff) => (
                  <button key={staff.id} type="button" onClick={() => { setSelectedStaff(staff); setSelectedDate(null); setSelectedSlot(null); setStep("datetime"); }}
                    className="group rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${pc}40`)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--wborder)")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold" style={{ background: `${pc}15`, color: pc }}>
                          {staff.name.charAt(0)}
                        </div>
                        <p className="font-medium">{staff.name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-25" style={{ color: textColor }} />
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
                <button type="button" onClick={() => setStep(hasMultipleFilteredStaff ? "staff" : "service")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" />Volver</button>
                <div className="flex gap-2">
                  <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}>{selectedService.name}</span>
                  {selectedStaff && <span className="rounded-lg px-2.5 py-1 text-xs font-medium border opacity-60" style={{ color: textColor, borderColor: `${textColor}15` }}>{selectedStaff.name}</span>}
                </div>
              </div>
              <div><h2 className="text-xl font-bold">{hasMultipleFilteredStaff ? "3" : "2"}. Elige fecha y hora</h2><p className="text-sm" style={{ color: textSecondary }}>Selecciona un día y luego una hora disponible.</p></div>
              <div className="space-y-3">
                <p className="text-sm font-medium opacity-70" style={{ color: textColor }}>Días disponibles</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {days.map((day) => {
                    const sel = selectedDate?.toDateString() === day.toDateString();
                    const staffWorking = selectedStaff ? isStaffWorkingOnDay(selectedStaff, day.getDay()) : true;
                    return (
                      <button key={day.toISOString()} type="button" disabled={!staffWorking}
                        onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                        className={`rounded-2xl border px-2 py-3 text-center transition-all duration-200 ${!staffWorking ? "opacity-30 cursor-not-allowed" : "hover:-translate-y-1 hover:shadow-md"}`}
                        style={sel ? { borderColor: `${pc}60`, background: `${pc}15` } : { borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                        <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: textSecondary }}>{capitalize(format(day, "EEE", { locale: es }))}</p>
                        <p className="text-lg font-bold leading-none">{format(day, "d")}</p>
                        <p className="text-xs" style={{ color: textSecondary }}>{capitalize(format(day, "MMMM", { locale: es }))}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedDate && (
                <div className="space-y-3">
                  <p className="text-sm font-medium opacity-70" style={{ color: textColor }}>Horas — {capitalize(format(selectedDate, "EEEE d 'de' MMMM", { locale: es }))}</p>
                  {loadingSlots ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin opacity-40" style={{ color: textColor }} /></div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {slots.map((slot) => {
                        const blocked = isBlocked(slot, blockedSlots);
                        const active = selectedSlot?.start.getTime() === slot.start.getTime();
                        return (
                          <button key={slot.start.toISOString()} type="button" disabled={blocked} onClick={() => setSelectedSlot(slot)}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${blocked ? "cursor-not-allowed opacity-20 line-through" : "hover:border-brand/40 hover:shadow-sm hover:-translate-y-0.5"}`}
                            style={active && !blocked ? { borderColor: `${pc}60`, background: `${pc}20`, color: pc, fontWeight: 700 } : blocked ? { borderColor: "var(--wborder)" } : { borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                            {format(slot.start, "HH:mm")}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <button type="button" disabled={!selectedSlot} onClick={() => setStep("details")}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none mt-6" style={{ background: pc, color: getContrastColor(pc) }}>
                Continuar con mis datos <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 3: Details */}
          {step === "details" && selectedService && selectedSlot && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("datetime")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" />Volver</button>
                <span className="rounded-lg px-2.5 py-1 text-xs" style={{ background: `${pc}15`, color: pc }}>Paso final</span>
              </div>
              <div><h2 className="text-xl font-bold">{hasMultipleFilteredStaff ? "4" : "3"}. Completa tus datos</h2><p className="text-sm" style={{ color: textSecondary }}>Te enviaremos la confirmación.</p></div>
              <div className="rounded-2xl border p-5 text-sm space-y-3 shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "var(--wborder)" }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${pc}15`, color: pc }}>
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{capitalize(format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es }))}</p>
                    <p style={{ color: textSecondary }}>{format(selectedSlot.start, "HH:mm")} - {format(selectedSlot.end, "HH:mm")}</p>
                  </div>
                </div>
                <div className="flex justify-between pt-1"><span style={{ color: textSecondary }}>Servicio</span><span className="font-medium text-right max-w-[60%] truncate">{selectedService.name}</span></div>
                {selectedStaff && <div className="flex justify-between"><span style={{ color: textSecondary }}>Profesional</span><span className="font-medium">{selectedStaff.name}</span></div>}

                <div className="flex justify-between items-center">
                  <span style={{ color: textSecondary }}>Total</span>
                  <span className="font-medium">
                    {rewardDiscount ? (
                      <span className="flex items-center gap-2">
                        <span className="line-through opacity-40">{formatPrice(rawTotalPrice)}</span>
                        <span style={{ color: pc }}>{totalPrice === 0 ? "GRATIS" : formatPrice(totalPrice)}</span>
                      </span>
                    ) : formatPrice(rawTotalPrice)}
                  </span>
                </div>
              </div>
              <form onSubmit={handleConfirm} className="space-y-4">
                {([["name", "Nombre y apellido", "Ej: Catalina Fuentes", UserRound, "text"] as const, ["email", "Correo electrónico", "ejemplo@correo.com", Mail, "email"] as const, ["phone", "Teléfono (opcional)", "+56 9 1234 5678", Phone, "tel"] as const]).map(([field, label, placeholder, Icon, type]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm opacity-70" style={{ color: textColor }}><Icon className="h-3.5 w-3.5" />{label}</label>
                    <input type={type} value={form[field]} onBlur={() => setTouched((p) => ({ ...p, [field]: true }))} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 focus:shadow-md"
                      style={!touched[field] ? { borderColor: "var(--wborder)", background: "var(--wsubtle)" } : validation[field] ? { borderColor: `${pc}50`, background: `${pc}08` } : { borderColor: "rgba(220,38,38,0.5)", background: "rgba(220,38,38,0.05)" }} />
                    {touched[field] && !validation[field] && <p className="text-xs text-red-400">Campo inválido</p>}
                  </div>
                ))}
                {/* ── Reward Code Input ── */}
                <div className="space-y-2 rounded-2xl border p-4 transition-all" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                  <label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: textColor }}>
                    <Gift className="h-3.5 w-3.5" />¿Tienes un código de premio?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rewardCode}
                      onChange={(e) => { setRewardCode(e.target.value.toUpperCase()); if (rewardStatus !== "idle") { setRewardStatus("idle"); setRewardError(""); setRewardDiscount(null); } }}
                      placeholder="PREMIO-XXXXXX"
                      className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-mono tracking-wider uppercase outline-none transition-colors"
                      style={rewardStatus === "valid" ? { borderColor: "#22c55e60", background: "#22c55e0A" } : rewardStatus === "invalid" ? { borderColor: "rgba(220,38,38,0.5)", background: "rgba(220,38,38,0.05)" } : { borderColor: "var(--wborder)", background: "var(--wbg)" }}
                    />
                    <button
                      type="button"
                      disabled={!rewardCode.trim() || !form.email || rewardStatus === "loading" || rewardStatus === "valid"}
                      onClick={handleValidateReward}
                      className="shrink-0 rounded-xl px-5 py-2.5 min-h-[44px] text-sm font-semibold transition-all disabled:opacity-30 hover:opacity-90 active:scale-95"
                      style={{ background: `${pc}20`, color: pc }}
                    >
                      {rewardStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : rewardStatus === "valid" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : "Aplicar"}
                    </button>
                  </div>
                  {rewardStatus === "valid" && rewardDiscount && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      ¡Código aplicado! Descuento de {rewardDiscount.type === "PERCENTAGE" ? `${rewardDiscount.value}%` : formatPrice(rewardDiscount.value)}
                    </p>
                  )}
                  {rewardStatus === "invalid" && rewardError && (
                    <p className="text-xs text-red-400">{rewardError}</p>
                  )}
                  {!form.email && rewardCode.trim() && (
                    <p className="text-xs text-amber-400/70">Ingresa tu correo electrónico primero para validar el código.</p>
                  )}
                </div>
                {apiError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 font-medium">{apiError}</div>}
                <button type="submit" disabled={!isFormValid || submitting} className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 mt-2 text-sm font-bold transition-all hover:opacity-90 hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none" style={{ background: pc, color: getContrastColor(pc) }}>
                  {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Confirmando...</> : <>Confirmar reserva <ChevronRight className="h-5 w-5" /></>}
                </button>
              </form>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && selectedService && selectedSlot && (
            <div className="animate-scale-in space-y-6 py-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${pc}15` }}>
                <CheckCircle2 className="h-10 w-10" style={{ color: pc }} />
              </div>
              <div><h2 className="text-2xl font-bold tracking-tight">¡Reserva confirmada!</h2><p className="mx-auto mt-2 max-w-md text-sm" style={{ color: textSecondary }}>Tu cita ha sido agendada con éxito.</p></div>
              <div className="mx-auto max-w-md rounded-2xl p-5 text-left text-sm shadow-sm" style={{ background: "var(--wsubtle)", borderColor: "var(--wborder)", borderWidth: "1px" }}>
                <p className="mb-3 flex items-center gap-1.5 font-semibold text-base" style={{ color: pc }}><Sparkles className="h-4 w-4" />Resumen de tu cita</p>
                <div className="space-y-1 opacity-80" style={{ color: textColor }}>
                  <p><span style={{ color: textSecondary }}>Servicio:</span> {selectedService.name}</p>
                  {selectedStaff && <p><span style={{ color: textSecondary }}>Profesional:</span> {selectedStaff.name}</p>}
                  <p><span style={{ color: textSecondary }}>Fecha:</span> {capitalize(format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es }))}</p>
                  <p><span style={{ color: textSecondary }}>Hora:</span> {format(selectedSlot.start, "HH:mm")}</p>
                  <p><span style={{ color: textSecondary }}>Cliente:</span> {form.name}</p>
                </div>
              </div>
              <button type="button" onClick={restart} className="rounded-xl border px-6 py-3 text-sm font-medium transition-all hover:opacity-100 hover:shadow-md active:scale-95" style={{ color: textColor, borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>Agendar otra cita</button>
            </div>
          )}
        </div>

        <div className="mt-auto border-t px-5 py-3 flex items-center justify-center gap-1.5 text-xs font-medium" style={{ background: `${bgColor}F2`, color: textSecondary, borderColor: "var(--wborder)" }}>
          <span>Gestionado con</span>
          <a href="https://www.puragenda.cl" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <span style={{ color: pc, fontWeight: 700, letterSpacing: "-0.02em" }}>Puragenda</span>
            <Sparkles className="h-3 w-3" style={{ color: pc }} />
          </a>
        </div>
      </div>
    </div>
  );
}
