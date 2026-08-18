"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useTransition } from "react";
import { updateBusinessPoliciesAction } from "@/server/actions/dashboard.actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  initialAllowRescheduling: boolean;
  initialRescheduleHoursLimit: number;
  initialIncludeAppointmentActionsInConfirmationEmail: boolean;
  initialRequiresClientRut: boolean;
  initialAllowSameDayBookings: boolean;
  initialSlotInterval: number;
  initialMinAdvanceBookingMinutes: number;
  taxIdLabel: string;
}

const SLOT_INTERVAL_OPTIONS = [
  { value: 5, label: "5 minutos" },
  { value: 10, label: "10 minutos" },
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "60 minutos" },
  { value: 90, label: "90 minutos" },
  { value: 120, label: "120 minutos" },
];

export function BusinessPoliciesEditor({
  initialAllowRescheduling,
  initialRescheduleHoursLimit,
  initialIncludeAppointmentActionsInConfirmationEmail,
  initialRequiresClientRut,
  initialAllowSameDayBookings,
  initialSlotInterval,
  initialMinAdvanceBookingMinutes,
  taxIdLabel,
}: Props) {
  const legacy = useTranslations("legacy");
  const [allowRescheduling, setAllowRescheduling] = useState(initialAllowRescheduling);
  const [rescheduleHoursLimit, setRescheduleHoursLimit] = useState(initialRescheduleHoursLimit);
  const [includeAppointmentActionsInConfirmationEmail, setIncludeAppointmentActionsInConfirmationEmail] =
    useState(initialIncludeAppointmentActionsInConfirmationEmail);
  const [requiresClientRut, setRequiresClientRut] = useState(initialRequiresClientRut);
  const [allowSameDayBookings, setAllowSameDayBookings] = useState(initialAllowSameDayBookings);
  const [slotInterval, setSlotInterval] = useState(initialSlotInterval);
  const [minAdvanceBookingMinutes, setMinAdvanceBookingMinutes] = useState(initialMinAdvanceBookingMinutes);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleSave() {
    setResult(null);
    startTransition(async () => {
      const res = await updateBusinessPoliciesAction({
        allowRescheduling,
        rescheduleHoursLimit,
        includeAppointmentActionsInConfirmationEmail,
        requiresClientRut,
        allowSameDayBookings,
        slotInterval,
        minAdvanceBookingMinutes,
      });
      if ("error" in res && res.error) {
        setResult({ ok: false, msg: res.error as string });
      } else {
        setResult({ ok: true, msg: "Politicas guardadas correctamente" });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Allow rescheduling toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium"><LocalizedText id="RaDYMVMgv01B" /></p>
          <p className="mt-0.5 text-xs text-muted-foreground"><LocalizedText id="2PD7KhsxHCZx" /></p>
        </div>
        <button
          type="button"
          onClick={() => setAllowRescheduling((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
            allowRescheduling ? "bg-[#7C3AED]" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              allowRescheduling ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Hours limit (visible only when rescheduling is enabled) */}
      {allowRescheduling && (
        <div className="ml-0 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground"><LocalizedText id="PpOF8SB50REJ" /></label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={168}
              value={rescheduleHoursLimit}
              onChange={(e) => setRescheduleHoursLimit(parseInt(e.target.value) || 24)}
              className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
            />
            <span className="text-sm text-muted-foreground"><LocalizedText id="o9R1Nw01_GOm" /></span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium"><LocalizedText id="GZPd3XCz7Cr7" /></p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              <LocalizedText id="VhDEyNmX9V9l" />
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeAppointmentActionsInConfirmationEmail}
            aria-label={legacy("oANGujn3ko-E")}
            onClick={() => setIncludeAppointmentActionsInConfirmationEmail((value) => !value)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              includeAppointmentActionsInConfirmationEmail ? "bg-[#7C3AED]" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                includeAppointmentActionsInConfirmationEmail ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Require RUT toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium"><LocalizedText id="inzlqYF3MxjU" /> {taxIdLabel} <LocalizedText id="fMy7ndmqk39C" /></p>
          <p className="mt-0.5 text-xs text-muted-foreground"><LocalizedText id="-aCXyrCOrzx5" /> {taxIdLabel} <LocalizedText id="8TuWstYTrvl8" /></p>
        </div>
        <button
          type="button"
          onClick={() => setRequiresClientRut((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
            requiresClientRut ? "bg-[#7C3AED]" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              requiresClientRut ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* ── Booking Policies Divider ── */}
      <div className="border-t border-border pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4"><LocalizedText id="larH9Mi8jQX0" /></p>
      </div>

      {/* Allow same-day bookings toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium"><LocalizedText id="ejCdUlPNZYzK" /></p>
          <p className="mt-0.5 text-xs text-muted-foreground"><LocalizedText id="SV2yfMjIZ-cq" /></p>
        </div>
        <button
          type="button"
          onClick={() => setAllowSameDayBookings((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
            allowSameDayBookings ? "bg-[#7C3AED]" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              allowSameDayBookings ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Min advance booking minutes (visible only when same-day is enabled) */}
      {allowSameDayBookings && (
        <div className="ml-0 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground"><LocalizedText id="3O1TCNCVYSDb" /></label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={1440}
              value={minAdvanceBookingMinutes}
              onChange={(e) => setMinAdvanceBookingMinutes(parseInt(e.target.value) || 0)}
              className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
            />
            <span className="text-sm text-muted-foreground"><LocalizedText id="rrYYPjIsjWlx" /></span>
          </div>
          <p className="text-xs text-muted-foreground"><LocalizedText id="P5qLmmtJdrzI" /></p>
        </div>
      )}

      {/* Slot interval select */}
      <div className="space-y-1.5">
        <div>
          <p className="text-sm font-medium"><LocalizedText id="x3n2NNkGcI7c" /></p>
          <p className="mt-0.5 text-xs text-muted-foreground"><LocalizedText id="JNaaIExxD7t5" /></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SLOT_INTERVAL_OPTIONS.map((opt) => (
            <button type="button" key={opt.value} onClick={() => setSlotInterval(opt.value)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${slotInterval === opt.value ? "border-[#7C3AED] bg-[#7C3AED]/10 text-brand-foreground" : "border-border text-muted-foreground"}`}>{opt.label}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground"><LocalizedText id="Thfy7F5U46Ug" /></span>
          <input type="number" min={5} max={240} step={5} value={slotInterval} onChange={(e) => setSlotInterval(Math.max(5, Math.min(240, parseInt(e.target.value) || 5)))} className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30" />
          <span className="text-muted-foreground"><LocalizedText id="H2-m9p0YXmCG" /></span>
        </label>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="rounded-xl bg-[#7C3AED] px-5 py-2 text-sm font-bold text-white hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
        >
          {pending ? "Guardando..." : legacy("SrRqWzSQqoBT")}
        </button>
        {result && (
          <span className={`flex items-center gap-1.5 text-sm ${result.ok ? "text-emerald-500" : "text-red-500"}`}>
            {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {result.msg}
          </span>
        )}
      </div>
    </div>
  );
}
