"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, UserPlus, Gift, Crown, CreditCard, Sparkles } from "lucide-react";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { getCountryConfig } from "@/core/countries";
import { startBillingCheckout } from "@/components/paddle/checkout";

export function RegisterForm({
  countryOptions,
  paymentSimulatorEnabled,
  initialCountryCode = "",
}: {
  countryOptions: Array<{ code: string; name: string }>;
  paymentSimulatorEnabled: boolean;
  initialCountryCode?: string;
}) {
  const searchParams = useSearchParams();
  const wantsPlan = searchParams.get("plan"); // "EQUIPO", "INDIVIDUAL", "TEST" or null
  const wantsTrial = searchParams.get("trial") === "1";
  const extraStaffCount = wantsPlan === "EQUIPO"
    ? Math.max(0, Math.min(20, Number(searchParams.get("extraStaff") || 0) || 0))
    : 0;
  const isDirectSubscription = (wantsPlan === "EQUIPO" || wantsPlan === "INDIVIDUAL" || wantsPlan === "TEST") && !wantsTrial;
  const planLabel = wantsPlan === "EQUIPO" ? "Equipo" : wantsPlan === "INDIVIDUAL" ? "Individual" : wantsPlan === "TEST" ? "Test" : null;
  const planPrice = wantsPlan === "EQUIPO" ? PRICING.EQUIPO.monthly + extraStaffCount * EXTRA_STAFF_COST.EQUIPO : wantsPlan === "INDIVIDUAL" ? PRICING.INDIVIDUAL.monthly : wantsPlan === "TEST" ? PRICING.TEST.monthly : 0;
  const totalEquipoStaff = STAFF_LIMITS.EQUIPO + extraStaffCount;

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const detectedCountry = getCountryConfig(initialCountryCode);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [timezone, setTimezone] = useState(initialCountryCode ? detectedCountry.timezone : "");
  const [currencyCode, setCurrencyCode] = useState(initialCountryCode ? detectedCountry.currency : "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [discountCode, setDiscountCode] = useState(searchParams.get("discount")?.toUpperCase() || "");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<"register" | "payment" | null>(null);

  function applyCountry(nextCountry: string) {
    const defaults = getCountryConfig(nextCountry);
    setCountryCode(nextCountry);
    setTimezone(defaults.timezone);
    setCurrencyCode(defaults.currency);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

        if (!termsAccepted) {
      setError("Debes aceptar los Términos de Servicio y Políticas de Privacidad");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create account
      setLoadingStep("register");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          countryCode,
          timezone,
          currencyCode,
          email: email.trim(),
          password,
          referralCode: referralCode.trim() || undefined,
          planIntent: wantsPlan || undefined,
          extraStaffCount,
          termsAccepted,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.error || "No se pudo crear la cuenta";
        const details = data.details?.length ? `: ${data.details.join(", ")}` : "";
        setError(`${message}${details}`);
        return;
      }

      // Step 2: Start the provider selected by the business country.
      if (isDirectSubscription) {
        setLoadingStep("payment");
        const billingRes = await fetch("/api/billing/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: wantsPlan, extraStaffCount, discountCode: discountCode.trim() || undefined }),
        });

        const billingData = await billingRes.json();

        if (billingRes.ok && (billingData.init_point || billingData.provider === "paddle")) {
          await startBillingCheckout(billingData);
          return;
        }

        console.error("[register] Billing error:", billingData.error);
        setError(billingData.error || "La cuenta fue creada, pero no se pudo iniciar el pago. Intenta desde Configuracion.");
        return;
      }

      // Step 3: Normal flow (trial or individual) → go to dashboard
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up">
      <div className="mb-6 space-y-1.5">
        <h2 className="text-2xl font-bold">Crear cuenta</h2>
        {isDirectSubscription ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Registra tu negocio y activa el Plan {planLabel}.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2">
              <Crown className="h-4 w-4 text-[#7C3AED]" />
              <span className="text-sm font-medium text-[#A78BFA]">
                {countryCode && countryCode !== "CL"
                  ? paymentSimulatorEnabled
                    ? `Plan ${planLabel} — prueba local en ${currencyCode}`
                    : `Plan ${planLabel} — USD ${wantsPlan === "EQUIPO" ? (32.99 + extraStaffCount * 3.49).toFixed(2) : wantsPlan === "INDIVIDUAL" ? "13.99" : "0.00"}/mes base`
                  : `Plan ${planLabel} — $${planPrice.toLocaleString("es-CL")} CLP/mes`}
              </span>
            </div>
            {wantsPlan === "EQUIPO" && (
              <p className="text-xs text-muted-foreground">
                Incluye {STAFF_LIMITS.EQUIPO} profesionales. Total seleccionado: {totalEquipoStaff} profesional(es).
              </p>
            )}
          </div>
        ) : wantsTrial ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Registra tu negocio y empieza tu prueba gratis.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                {TRIAL_DURATION_DAYS} días gratis · Plan {planLabel || "Equipo"}
              </span>
            </div>
            {(wantsPlan === "EQUIPO" || !wantsPlan) && (
              <p className="text-xs text-muted-foreground">
                Plan Equipo incluye {STAFF_LIMITS.EQUIPO} profesionales{extraStaffCount > 0 ? ` + ${extraStaffCount} extra(s)` : ""}.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Registra tu negocio y empieza a recibir reservas hoy.
          </p>
        )}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm text-muted-foreground">Nombre</label>
          <input
            id="name"
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="businessName" className="text-sm text-muted-foreground">Nombre del Negocio</label>
          <input
            id="businessName"
            type="text"
            placeholder="Ej: Barbería El Corte"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="countryCode" className="text-sm text-muted-foreground">País del negocio</label>
          <select
            id="countryCode"
            value={countryCode}
            onInput={(event) => applyCountry(event.currentTarget.value)}
            onChange={(event) => applyCountry(event.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          >
            <option value="" disabled>Selecciona tu país</option>
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>{country.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Configura la zona horaria y la moneda de tus reservas. Podrás cambiarlo después.
          </p>
        </div>

        {countryCode && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="timezone" className="text-sm text-muted-foreground">Zona horaria</label>
              <input
                id="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="Ej: America/Argentina/Buenos_Aires"
                required
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="currencyCode" className="text-sm text-muted-foreground">Moneda de reservas</label>
              <input
                id="currencyCode"
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value.toUpperCase().slice(0, 3))}
                pattern="[A-Z]{3}"
                maxLength={3}
                required
                className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm uppercase outline-none transition-colors focus:border-[#7C3AED]/30"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-muted-foreground">Email</label>
          <input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-muted-foreground">Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        {/* Referral Code (Optional) */}
        <div className="space-y-1.5">
          <label htmlFor="referralCode" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Gift className="h-3.5 w-3.5 text-[#7C3AED]" />
            Código de Referido <span className="text-muted-foreground/50">(opcional)</span>
          </label>
          <input
            id="referralCode"
            type="text"
            placeholder="Ej: PG-ABC123"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            maxLength={20}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-mono uppercase tracking-wider outline-none transition-colors focus:border-[#7C3AED]/30 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          />
        </div>

        {isDirectSubscription && (
          <div className="space-y-1.5">
            <label htmlFor="discountCode" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Gift className="h-3.5 w-3.5 text-[#7C3AED]" />
              Codigo de descuento <span className="text-muted-foreground/50">(opcional)</span>
            </label>
            <input
              id="discountCode"
              type="text"
              placeholder="Ej: LANZAMIENTO50"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              maxLength={32}
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-mono uppercase tracking-wider outline-none transition-colors focus:border-[#7C3AED]/30 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
            />
          </div>
        )}

                {/* Terms and Conditions */}
        <div className="flex items-start gap-2 pt-2">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border bg-muted text-[#7C3AED] focus:ring-[#7C3AED]"
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug">
            He leído y acepto los <a href="#" className="text-[#7C3AED] hover:underline">Términos de Servicio</a> y las <a href="#" className="text-[#7C3AED] hover:underline">Políticas de Privacidad</a>.
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50 ${
            isDirectSubscription
              ? "bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] shadow-lg shadow-[#7C3AED]/25 hover:shadow-xl hover:shadow-[#7C3AED]/30"
              : "bg-[#7C3AED] hover:bg-[#5B21B6]"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingStep === "register" ? "Creando cuenta..." : "Redirigiendo al pago..."}
            </>
          ) : isDirectSubscription ? (
            <>
              <CreditCard className="h-4 w-4" /> Crear cuenta y pagar
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Crear cuenta
            </>
          )}
        </button>

        {isDirectSubscription && (
          <p className="text-center text-xs text-muted-foreground">
            {countryCode !== "CL"
              ? paymentSimulatorEnabled
                ? "Seras redirigido al simulador local. No se cobra dinero real."
                : "Paddle mostrará el importe en tu moneda cuando esté disponible. El precio base está en USD y los impuestos locales se calculan en Checkout."
              : "Seras redirigido a Mercado Pago para completar el pago."}
          </p>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[#7C3AED] hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
