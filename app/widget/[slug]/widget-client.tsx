"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMinutes,
  format,
  setHours,
  setMinutes,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
}

interface Props {
  business: { name: string; slug: string; apiKey: string };
  services: Service[];
}

type Step = "service" | "datetime" | "details" | "success";

type FormState = {
  name: string;
  email: string;
  phone: string;
};

function toTitleCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildDays() {
  return Array.from({ length: 10 }, (_, index) => addDays(new Date(), index + 1));
}

function buildSlots(date: Date, duration: number) {
  const slots: { start: Date; end: Date }[] = [];
  const workdayStart = 9;
  const workdayEnd = 19;

  let current = setMinutes(setHours(date, workdayStart), 0);
  const end = setMinutes(setHours(date, workdayEnd), 0);

  while (addMinutes(current, duration) <= end) {
    slots.push({
      start: current,
      end: addMinutes(current, duration),
    });
    current = addMinutes(current, 30);
  }

  return slots;
}

export function WidgetClient({ business, services }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
  });
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    name: false,
    email: false,
    phone: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const availableDays = useMemo(() => buildDays(), []);
  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return buildSlots(selectedDate, selectedService.duration);
  }, [selectedDate, selectedService]);

  const validation = {
    name: form.name.trim().length >= 3,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    phone: /^\+?[0-9\s()-]{8,18}$/.test(form.phone),
  };

  const isFormValid = validation.name && validation.email && validation.phone;

  function formatPrice(price: number) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  }

  function markTouched(field: keyof FormState) {
    setTouched((previous) => ({ ...previous, [field]: true }));
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function getInputClass(isValid: boolean, isTouched: boolean) {
    if (!isTouched) return "bg-background/70 border-border/70";
    return isValid
      ? "bg-violet-500/10 border-violet-300/45"
      : "bg-red-500/5 border-red-300/40";
  }

  async function handleConfirmBooking(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ name: true, email: true, phone: true });

    if (!selectedService || !selectedSlot || !isFormValid) return;

    setSubmitting(true);
    setApiError("");

    try {
      const response = await fetch(`/api/business/${business.slug}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": business.apiKey,
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          customerName: form.name,
          customerEmail: form.email,
          startTime: selectedSlot.start.toISOString(),
          endTime: selectedSlot.end.toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "No fue posible confirmar la reserva.");
      }

      setStep("success");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Ocurrio un error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  function restartWizard() {
    setStep("service");
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setForm({ name: "", email: "", phone: "" });
    setTouched({ name: false, email: false, phone: false });
    setApiError("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-purple-900/20 p-3 sm:p-5">
      <Card className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-card/85 shadow-lg shadow-black/20">
        <div className="border-b border-border/60 bg-background/70 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/80">Reserva online</p>
              <h1 className="text-xl font-semibold tracking-tight">{business.name}</h1>
            </div>
            <Badge className="bg-violet-700/30 text-white">Paso a paso</Badge>
          </div>

          {step !== "success" && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              {[
                { id: "service", label: "Servicio" },
                { id: "datetime", label: "Fecha y hora" },
                { id: "details", label: "Tus datos" },
              ].map((item) => {
                const stepOrder: Record<Step, number> = {
                  service: 1,
                  datetime: 2,
                  details: 3,
                  success: 4,
                };
                const itemOrder =
                  item.id === "service" ? 1 : item.id === "datetime" ? 2 : 3;
                const active = stepOrder[step] >= itemOrder;

                return (
                  <div
                    key={item.id}
                    className={
                      active
                        ? "rounded-full bg-violet-700/35 px-3 py-1.5 text-center text-white"
                        : "rounded-full border border-border/70 px-3 py-1.5 text-center"
                    }
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <CardContent className="p-5 sm:p-6">
          {step === "service" && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-4 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Paso 1. Selecciona un servicio</h2>
                <p className="text-sm text-muted-foreground">
                  Elige el servicio que quieres reservar. Puedes cambiarlo mas adelante.
                </p>
              </div>

              <div className="grid gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setSelectedService(service);
                      setSelectedDate(null);
                      setSelectedSlot(null);
                      setStep("datetime");
                    }}
                    className="group rounded-2xl border border-border/70 bg-background/65 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300/55 hover:shadow-md hover:shadow-purple-950/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground group-hover:text-white">{service.name}</p>
                        {service.description && (
                          <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {service.duration} min
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1">
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "datetime" && selectedService && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-5 duration-300">
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1 px-2"
                  onClick={() => setStep("service")}
                >
                  <ChevronLeft className="h-4 w-4" /> Volver
                </Button>
                <Badge variant="outline" className="border-white/40 text-white">
                  {selectedService.name}
                </Badge>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Paso 2. Elige fecha y hora</h2>
                <p className="text-sm text-muted-foreground">
                  Selecciona un dia y luego una hora disponible para completar tu reserva.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Dias disponibles</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {availableDays.map((day) => {
                    const isSelected = selectedDate?.toDateString() === day.toDateString();
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedDate(day);
                          setSelectedSlot(null);
                        }}
                        className={
                          isSelected
                            ? "rounded-xl border border-violet-300/55 bg-violet-700/30 px-2 py-2 text-left"
                            : "rounded-xl border border-border/70 bg-background/65 px-2 py-2 text-left transition-colors hover:border-white/35"
                        }
                      >
                        <p className="text-[11px] uppercase text-muted-foreground">
                          {toTitleCase(format(day, "EEE", { locale: es }))}
                        </p>
                        <p className="text-lg font-semibold leading-none">{format(day, "d")}</p>
                        <p className="text-xs text-muted-foreground">{toTitleCase(format(day, "MMMM", { locale: es }))}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDate && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Horas para {toTitleCase(format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }))}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableSlots.map((slot) => {
                      const active = selectedSlot?.start.getTime() === slot.start.getTime();
                      return (
                        <button
                          key={slot.start.toISOString()}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={
                            active
                              ? "rounded-full border border-violet-300/60 bg-violet-700/30 px-3 py-2 text-sm font-medium text-white"
                              : "rounded-full border border-border/70 bg-background/65 px-3 py-2 text-sm text-foreground transition-colors hover:border-white/35"
                          }
                        >
                          {format(slot.start, "HH:mm")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                type="button"
                className="w-full gap-2 bg-gradient-to-r from-violet-900 to-purple-700 text-white hover:from-violet-800 hover:to-purple-600"
                disabled={!selectedSlot}
                onClick={() => setStep("details")}
              >
                Continuar con mis datos <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "details" && selectedService && selectedSlot && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-5 duration-300">
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1 px-2"
                  onClick={() => setStep("datetime")}
                >
                  <ChevronLeft className="h-4 w-4" /> Volver
                </Button>
                <Badge variant="outline" className="border-white/35 text-white">
                  Paso final
                </Badge>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Paso 3. Completa tus datos</h2>
                <p className="text-sm text-muted-foreground">
                  Te enviaremos la confirmacion de tu reserva con estos datos.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/65 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Servicio</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">
                    {toTitleCase(format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es }))}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Hora</span>
                  <span className="font-medium">
                    {format(selectedSlot.start, "HH:mm")} - {format(selectedSlot.end, "HH:mm")}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="widget-name" className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" /> Nombre y apellido
                  </Label>
                  <Input
                    id="widget-name"
                    value={form.name}
                    onBlur={() => markTouched("name")}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Ej: Catalina Fuentes"
                    className={getInputClass(validation.name, touched.name)}
                  />
                  {touched.name && !validation.name && (
                    <p className="text-xs text-red-300">Ingresa un nombre valido (minimo 3 caracteres).</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widget-email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Correo electronico
                  </Label>
                  <Input
                    id="widget-email"
                    type="email"
                    value={form.email}
                    onBlur={() => markTouched("email")}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="ejemplo@correo.com"
                    className={getInputClass(validation.email, touched.email)}
                  />
                  {touched.email && !validation.email && (
                    <p className="text-xs text-red-300">Ingresa un email con formato valido.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widget-phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Telefono de contacto
                  </Label>
                  <Input
                    id="widget-phone"
                    type="tel"
                    value={form.phone}
                    onBlur={() => markTouched("phone")}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="+56 9 1234 5678"
                    className={getInputClass(validation.phone, touched.phone)}
                  />
                  {touched.phone && !validation.phone && (
                    <p className="text-xs text-red-300">Ingresa un telefono valido para confirmar tu reserva.</p>
                  )}
                </div>

                {apiError && (
                  <div className="rounded-xl border border-red-300/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {apiError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="w-full gap-2 bg-gradient-to-r from-violet-900 to-purple-700 text-white hover:from-violet-800 hover:to-purple-600"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Confirmando reserva...
                    </>
                  ) : (
                    <>
                      Confirmar reserva <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {step === "success" && selectedService && selectedSlot && (
            <div className="animate-in fade-in-0 zoom-in-95 space-y-6 py-4 text-center duration-300">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-700/30">
                <CheckCircle2 className="h-9 w-9 text-white" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Reserva confirmada</h2>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                  Ya quedo agendada tu cita. En breve recibiras la confirmacion en tu correo y telefono.
                </p>
              </div>

              <div className="mx-auto max-w-md rounded-2xl border border-violet-300/40 bg-violet-700/20 p-4 text-left text-sm">
                <p className="mb-2 inline-flex items-center gap-1 text-white">
                  <Sparkles className="h-4 w-4" /> Resumen de tu reserva
                </p>
                <div className="space-y-1.5 text-white/90">
                  <p>
                    <span className="text-white/70">Servicio:</span> {selectedService.name}
                  </p>
                  <p>
                    <span className="text-white/70">Fecha:</span>{" "}
                    {toTitleCase(format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: es }))}
                  </p>
                  <p>
                    <span className="text-white/70">Hora:</span> {format(selectedSlot.start, "HH:mm")}
                  </p>
                  <p>
                    <span className="text-white/70">Cliente:</span> {form.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border/70"
                  onClick={restartWizard}
                >
                  Agendar otra reserva
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t border-border/60 bg-background/65 px-5 py-3 text-center text-xs text-muted-foreground">
          Powered by AgendaPro · integración marca blanca
        </div>
      </Card>

      <div className="mt-4 text-center text-xs text-muted-foreground/70">
        <p className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> Compatible con moviles y listo para iframe.
        </p>
      </div>
    </div>
  );
}
