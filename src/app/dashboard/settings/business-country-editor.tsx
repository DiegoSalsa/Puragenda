"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCountryConfig, getCountryOptions } from "@/core/countries";
import { updateBusinessCountryAction } from "@/server/actions/dashboard.actions";

const countryOptions = getCountryOptions("es");

interface Props {
  initialCountryCode: string;
  initialTimezone: string;
  initialCurrencyCode: string;
}

export function BusinessCountryEditor({ initialCountryCode, initialTimezone, initialCurrencyCode }: Props) {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [currencyCode, setCurrencyCode] = useState(initialCurrencyCode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const unchanged = countryCode === initialCountryCode && timezone === initialTimezone && currencyCode === initialCurrencyCode;

  function applyCountry(next: string) {
    const defaults = getCountryConfig(next);
    setCountryCode(next);
    setTimezone(defaults.timezone);
    setCurrencyCode(defaults.currency);
  }

  async function handleSave() {
    if (unchanged) return;
    const confirmed = window.confirm(
      "Cambiar país, zona horaria o moneda no convertirá precios ni moverá automáticamente citas existentes. ¿Quieres continuar?",
    );
    if (!confirmed) return;
    setSaving(true);
    setMessage(null);
    const result = await updateBusinessCountryAction({ countryCode, timezone, currencyCode }, true);
    setMessage(result.error
      ? { type: "error", text: result.error }
      : { type: "success", text: "País, zona horaria y moneda actualizados" });
    if (!result.error) router.refresh();
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="business-country" className="text-xs text-muted-foreground">País</label>
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
          <label htmlFor="business-timezone" className="text-xs text-muted-foreground">Zona horaria</label>
          <input
            id="business-timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="Ej: America/Argentina/Buenos_Aires"
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-[#7C3AED]/30"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="business-currency" className="text-xs text-muted-foreground">Moneda de reservas</label>
          <input
            id="business-currency"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value.toUpperCase().slice(0, 3))}
            pattern="[A-Z]{3}"
            maxLength={3}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm uppercase outline-none focus:border-[#7C3AED]/30"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Las citas se guardan en UTC y se muestran con la hora local del negocio. En países con varias zonas horarias, selecciona la ciudad correcta.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || unchanged}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>
      </div>
      {message && <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>}
    </div>
  );
}
