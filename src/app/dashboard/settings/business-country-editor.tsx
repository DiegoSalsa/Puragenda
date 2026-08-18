"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCountryConfig, getTimezoneOptions } from "@/core/countries";
import { updateBusinessCountryAction } from "@/server/actions/dashboard.actions";

interface Props {
  initialCountryCode: string;
  initialTimezone: string;
  initialCurrencyCode: string;
  countryOptions: Array<{ code: string; name: string }>;
  initialTimezoneOptions: Array<{ value: string; label: string; preferred: boolean }>;
  currencyOptions: Array<{ value: string; label: string }>;
}

export function BusinessCountryEditor({
  initialCountryCode,
  initialTimezone,
  initialCurrencyCode,
  countryOptions,
  initialTimezoneOptions,
  currencyOptions,
}: Props) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [timezoneOptions, setTimezoneOptions] = useState(initialTimezoneOptions);
  const [currencyCode, setCurrencyCode] = useState(initialCurrencyCode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const unchanged = countryCode === initialCountryCode && timezone === initialTimezone && currencyCode === initialCurrencyCode;

  function applyCountry(next: string) {
    const defaults = getCountryConfig(next);
    setCountryCode(next);
    setTimezoneOptions(getTimezoneOptions(next));
    setTimezone(defaults.timezone);
    setCurrencyCode(defaults.currency);
  }

  async function handleSave() {
    if (unchanged) return;
    const confirmed = window.confirm(
      legacy("oEaGa6IfuovK"),
    );
    if (!confirmed) return;
    setSaving(true);
    setMessage(null);
    const result = await updateBusinessCountryAction({ countryCode, timezone, currencyCode }, true);
    setMessage(result.error
      ? { type: "error", text: result.error }
      : { type: "success", text: legacy("X_9vFGXQT-Wz") });
    if (!result.error) router.refresh();
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="business-country" className="text-xs text-muted-foreground"><LocalizedText id="u4khNiQT1Htd" /></label>
          <select
            id="business-country"
            value={countryCode}
            onInput={(event) => applyCountry(event.currentTarget.value)}
            onChange={(event) => applyCountry(event.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]/30"
          >
            {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="business-timezone" className="text-xs text-muted-foreground"><LocalizedText id="Q7IoZUu59-y5" /></label>
          <select
            id="business-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]/30"
          >
            <optgroup label="Zonas recomendadas para el país">
              {timezoneOptions.filter((option) => option.preferred).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </optgroup>
            <optgroup label="Otras zonas horarias">
              {timezoneOptions.filter((option) => !option.preferred).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="business-currency" className="text-xs text-muted-foreground"><LocalizedText id="C42wtXfxvNTl" /></label>
          <select
            id="business-currency"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm uppercase outline-none focus:border-[#7C3AED]/30"
          >
            {currencyOptions.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          <LocalizedText id="f9-BrGUa14gF" />
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || unchanged}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <LocalizedText id="E-UaIQ9F7RsJ" />
        </button>
      </div>
      {message && <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>}
    </div>
  );
}
