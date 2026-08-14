"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { CalendarPlus, CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface AppointmentEditorService {
  id: string;
  name: string;
  duration: number;
  price: number;
  staffIds: string[];
  optionCategories: {
    id: string;
    name: string;
    isRequired: boolean;
    maxSelections: number;
    alternatives: {
      id: string;
      name: string;
      priceDelta: number;
      durationDelta: number;
    }[];
  }[];
}

export interface AppointmentEditorStaff {
  id: string;
  name: string;
}

export interface AppointmentEditorClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface EditableAppointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  clientId: string | null;
  serviceId: string;
  staffId: string | null;
  startTime: string;
  internalNotes: string | null;
  selectedOptions: { alternativeId?: string }[];
}

export function AppointmentEditor({
  appointment,
  initialStart,
  initialStaffId,
  initialServiceId,
  initialSelectedOptionIds = [],
  timeZone,
  services,
  staff,
  clients,
  currencyCode,
  onClose,
}: {
  appointment?: EditableAppointment;
  initialStart?: Date;
  initialStaffId?: string;
  initialServiceId?: string;
  initialSelectedOptionIds?: string[];
  timeZone?: string;
  services: AppointmentEditorService[];
  staff: AppointmentEditorStaff[];
  clients: AppointmentEditorClient[];
  currencyCode: string;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.editor");
  const router = useRouter();
  const initialInstant = appointment ? new Date(appointment.startTime) : initialStart ?? new Date(0);
  const initialDate = timeZone ? toZonedTime(initialInstant, timeZone) : initialInstant;
  const [clientId, setClientId] = useState(appointment?.clientId ?? "");
  const [customerName, setCustomerName] = useState(appointment?.customerName ?? "");
  const [customerEmail, setCustomerEmail] = useState(appointment?.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(appointment?.customerPhone ?? "");
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? initialServiceId ?? services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(appointment?.staffId ?? initialStaffId ?? staff[0]?.id ?? "");
  const [date, setDate] = useState(format(initialDate, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(initialDate, "HH:mm"));
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(
    appointment?.selectedOptions.flatMap((option) => option.alternativeId ? [option.alternativeId] : [])
      ?? initialSelectedOptionIds,
  );
  const [internalNotes, setInternalNotes] = useState(appointment?.internalNotes ?? "");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedService = services.find((service) => service.id === serviceId);
  const eligibleStaff = useMemo(() => {
    if (!selectedService || selectedService.staffIds.length === 0) return staff;
    return staff.filter((member) => selectedService.staffIds.includes(member.id));
  }, [selectedService, staff]);
  const selectedAlternatives = selectedService?.optionCategories.flatMap((category) =>
    category.alternatives.filter((alternative) => selectedOptionIds.includes(alternative.id))
  ) ?? [];
  const totalDuration = (selectedService?.duration ?? 0) +
    selectedAlternatives.reduce((sum, alternative) => sum + alternative.durationDelta, 0);
  const totalPrice = (selectedService?.price ?? 0) +
    selectedAlternatives.reduce((sum, alternative) => sum + alternative.priceDelta, 0);

  function chooseClient(nextId: string) {
    setClientId(nextId);
    const client = clients.find((item) => item.id === nextId);
    if (client) {
      setCustomerName(client.name);
      setCustomerEmail(client.email);
      setCustomerPhone(client.phone ?? "");
    }
  }

  function chooseService(nextServiceId: string) {
    setServiceId(nextServiceId);
    setSelectedOptionIds([]);
    const nextService = services.find((service) => service.id === nextServiceId);
    if (nextService?.staffIds.length && !nextService.staffIds.includes(staffId)) {
      setStaffId(nextService.staffIds.find((id) => staff.some((member) => member.id === id)) ?? "");
    }
  }

  function toggleOption(categoryId: string, alternativeId: string, maxSelections: number) {
    const category = selectedService?.optionCategories.find((item) => item.id === categoryId);
    const categoryIds = new Set(category?.alternatives.map((alternative) => alternative.id) ?? []);
    setSelectedOptionIds((current) => {
      if (current.includes(alternativeId)) return current.filter((id) => id !== alternativeId);
      const outsideCategory = current.filter((id) => !categoryIds.has(id));
      const insideCategory = current.filter((id) => categoryIds.has(id));
      return maxSelections === 1
        ? [...outsideCategory, alternativeId]
        : [...outsideCategory, ...insideCategory.slice(-(maxSelections - 1)), alternativeId];
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const startTime = timeZone
      ? fromZonedTime(`${date}T${time}:00`, timeZone)
      : new Date(`${date}T${time}:00`);
    if (Number.isNaN(startTime.getTime())) {
      setError(t("invalidDate"));
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        appointment ? `/api/dashboard/appointments/${appointment.id}` : "/api/dashboard/appointments",
        {
          method: appointment ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName,
            customerEmail,
            customerPhone,
            clientId: clientId || undefined,
            serviceId,
            staffId,
            selectedOptionAlternativeIds: selectedOptionIds,
            startTime: startTime.toISOString(),
            internalNotes,
            sendConfirmation,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || t("saveError"));
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/65 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center py-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#7C3AED]/10 p-2 text-[#7C3AED]"><CalendarPlus className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold">{appointment ? t("editTitle") : t("newTitle")}</h2>
                <p className="text-xs text-muted-foreground">{t("validationHint")}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("customerSection")}</p>
              <select value={clientId} onChange={(event) => chooseClient(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">{t("newCustomer")}</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={t("customerName")} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                <input required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder={t("email")} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder={t("phoneOptional")} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm sm:col-span-2" />
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("serviceSection")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <select required value={serviceId} onChange={(event) => chooseService(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
                <select required value={staffId} onChange={(event) => setStaffId(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  <option value="">{t("selectProfessional")}</option>
                  {eligibleStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </div>

              {selectedService?.optionCategories.map((category) => (
                <div key={category.id} className="rounded-xl border border-border bg-muted/25 p-3">
                  <p className="text-sm font-medium">
                    {category.name}
                    {category.isRequired && <span className="ml-1 text-red-400">*</span>}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{t("maxSelections", { count: category.maxSelections })}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {category.alternatives.map((alternative) => {
                      const checked = selectedOptionIds.includes(alternative.id);
                      return (
                        <button
                          key={alternative.id}
                          type="button"
                          onClick={() => toggleOption(category.id, alternative.id, category.maxSelections)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            checked ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border bg-background"
                          }`}
                        >
                          {alternative.name}
                          {(alternative.priceDelta > 0 || alternative.durationDelta > 0) && (
                            <span className="ml-1 text-muted-foreground">
                              {alternative.priceDelta > 0 ? `+${formatPrice(Math.round(alternative.priceDelta), currencyCode)}` : ""}
                              {alternative.durationDelta > 0 ? ` +${alternative.durationDelta} min` : ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3 border-t border-border pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dateSection")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                <input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-3 py-1.5">{t("minutes", { count: totalDuration })}</span>
                <span className="rounded-full bg-muted px-3 py-1.5">{formatPrice(Math.round(totalPrice), currencyCode)}</span>
              </div>
              <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder={t("internalNote")} rows={3} className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              <label className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-3 text-sm">
                <input type="checkbox" checked={sendConfirmation} onChange={(event) => setSendConfirmation(event.target.checked)} className="h-4 w-4 accent-[#7C3AED]" />
                <Mail className="h-4 w-4 text-[#7C3AED]" />
                {t("sendConfirmation")}
              </label>
            </section>

            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium">{t("cancel")}</button>
            <button type="submit" disabled={pending || !services.length || !staffId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {pending ? t("saving") : appointment ? t("saveChanges") : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
