"use client";

import { Clock3 } from "lucide-react";

type TimeTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  compact?: boolean;
  className?: string;
};

const VALID_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeTime(value: string) {
  if (VALID_TIME.test(value)) return value;

  const digits = value.replace(/\D/g, "").slice(0, 4);
  let candidate = "";

  if (digits.length <= 2 && digits.length > 0) {
    candidate = `${digits.padStart(2, "0")}:00`;
  } else if (digits.length === 3) {
    candidate = `0${digits[0]}:${digits.slice(1)}`;
  } else if (digits.length === 4) {
    candidate = `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  return VALID_TIME.test(candidate) ? candidate : value;
}

export function TimeTextInput({
  value,
  onChange,
  ariaLabel,
  compact = false,
  className = "",
}: TimeTextInputProps) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Clock3
        aria-hidden="true"
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7C3AED] ${
          compact ? "h-3.5 w-3.5" : "h-4 w-4"
        }`}
      />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        placeholder="HH:MM"
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d:]/g, "").slice(0, 5);
          onChange(next);
        }}
        onBlur={(event) => onChange(normalizeTime(event.target.value))}
        className={`w-full rounded-xl border border-border bg-background pr-3 font-semibold tabular-nums text-foreground outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15 ${
          compact ? "h-9 pl-9 text-xs" : "h-11 pl-10 text-sm"
        }`}
      />
    </div>
  );
}
