"use client";

import { FormEvent, useState, useRef } from "react";
import { registrationIntent } from "@/websites/commercial";
import { COMMERCIAL_CATALOG_VERSION, quoteCommercialContract } from "@/core/commercial-catalog";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, UserPlus, Gift } from "@/components/icons/hover-icons";
import { STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { REGISTRATION_COUNTRY, REGISTRATION_CURRENCY, REGISTRATION_TIMEZONES } from "@/core/registration-market";
import { useLocale, useTranslations } from "next-intl";
import { track } from "@/lib/analytics/client";
import {
  MARKETPLACE_LOCALITY_NOT_FOUND,
  MARKETPLACE_OTHER_CATEGORY_SLUG,
  groupLocalitiesByRegion,
} from "@/lib/marketplace";

export function RegisterForm({
  categoryOptions,
  localityOptions,
}: {
  categoryOptions: Array<{ slug: string; name: string }>;
  localityOptions: Array<{ slug: string; name: string; regionName: string }>;
}) {
  const legacy = useTranslations("legacy");
  const t = useTranslations("register");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const wantsPlan = searchParams.get("plan"); // legacy backend plan; public V2 intent is kept separately
  const selected = registrationIntent(searchParams);
  const commercialPlan = selected.commercialPlan ?? (selected.website ? "PURAGENDA_PLUS" : "PURAGENDA");
  const professionalTotal = selected.professionalTotal ?? (wantsPlan === "EQUIPO" ? Math.min(20, STAFF_LIMITS.EQUIPO + selected.extraStaff) : 1);
  const commercialQuoteSelection = quoteCommercialContract({ catalogVersion: COMMERCIAL_CATALOG_VERSION, plan: commercialPlan, professionalTotal, billingCycle: selected.cycle === "annual" ? "ANNUAL" : "MONTHLY" });
  const submitBusy = useRef(false);
  const countryCode = REGISTRATION_COUNTRY;
  const currencyCode = REGISTRATION_CURRENCY;

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState<string>(REGISTRATION_TIMEZONES[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketplaceCategorySlug, setMarketplaceCategorySlug] = useState("");
  const [marketplaceOtherDescription, setMarketplaceOtherDescription] = useState("");
  const [marketplaceLocalitySlug, setMarketplaceLocalitySlug] = useState("");
  const [marketplaceCityName, setMarketplaceCityName] = useState("");
  const [marketplaceAuthorized, setMarketplaceAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const localityGroups = groupLocalitiesByRegion(localityOptions);
  const localityNotFound = marketplaceLocalitySlug === MARKETPLACE_LOCALITY_NOT_FOUND;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitBusy.current) return;
    setError(null);

    if (!termsAccepted) {
      setError(t("errors.acceptTerms"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    submitBusy.current = true;
    setLoading(true);

    try {
      // Registration creates the free trial without starting a checkout.
      track("registration_started", {
        plan: commercialPlan,
        intent: "trial",
        extra_staff: Math.max(0, professionalTotal - 1),
        website_intent: false,
      });
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
          planIntent: commercialPlan,
          commercialPlanIntent: commercialPlan,
          professionalTotal,
          websiteIntent: false,
          billingCycle: selected.cycle === "annual" ? "ANNUAL" : "MONTHLY",
          termsAccepted,
          marketplaceCategorySlug,
          marketplaceOtherDescription: marketplaceCategorySlug === MARKETPLACE_OTHER_CATEGORY_SLUG
            ? marketplaceOtherDescription.trim()
            : undefined,
          marketplaceLocalitySlug: !localityNotFound
            ? marketplaceLocalitySlug
            : undefined,
          marketplaceLocalityNotFound: localityNotFound,
          marketplaceCityName: localityNotFound
            ? marketplaceCityName.trim()
            : undefined,
          marketplaceAuthorized,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data.error || t("errors.createAccount");
        const details = data.details?.length ? `: ${data.details.join(", ")}` : "";
        setError(`${message}${details}`);
        return;
      }
      if (!data.user) return;

      track("registration_completed", {
        plan: commercialPlan,
        intent: "trial",
        country: countryCode,
        website_intent: false,
      });

      window.location.href = "/dashboard";
    } finally {
      submitBusy.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up">
      <div className="mb-6 space-y-1.5">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <div className="space-y-2 rounded-xl border-2 border-black bg-[#E9D8FF] p-3 text-sm font-bold text-black">
          <p className="font-black">{t("selectedPlan", { plan: commercialPlan === "PURAGENDA_PLUS" ? "Puragenda+" : "Puragenda", count: professionalTotal })}</p>
          <p>{t("selectedPrice", { price: new Intl.NumberFormat(locale).format(commercialQuoteSelection.cycleTotal), cycle: t(selected.cycle === "annual" ? "annualCycle" : "monthlyCycle") })}</p>
          <p>{t("freeTrial", { days: TRIAL_DURATION_DAYS })}</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm text-muted-foreground">{t("name")}</label>
          <input
            id="name"
            type="text"
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="businessName" className="text-sm text-muted-foreground">{t("businessName")}</label>
          <input
            id="businessName"
            type="text"
            placeholder={t("businessPlaceholder")}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-semibold">{t("businessData")}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="countryCode" className="text-sm text-muted-foreground">{t("country")}</label>
          <input id="countryCode" value={new Intl.DisplayNames([locale], { type: "region" }).of(countryCode)} readOnly aria-describedby="registration-market-help"
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm" />
          <p id="registration-market-help" className="text-xs text-muted-foreground">{t("chileOnly")}</p>
        </div>


          <div className="space-y-1.5">
            <label htmlFor="marketplaceLocalitySlug" className="text-sm text-muted-foreground">
              {t("locality")}
            </label>
            <select
              id="marketplaceLocalitySlug"
              value={marketplaceLocalitySlug}
              onChange={(event) => {
                setMarketplaceLocalitySlug(event.target.value);
                setMarketplaceCityName("");
              }}
              required
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
            >
              <option value="" disabled>{t("selectLocality")}</option>
              {localityGroups.map(([region, localities]) => (
                <optgroup key={region} label={region}>
                  {localities.map((locality) => (
                    <option key={locality.slug} value={locality.slug}>{locality.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value={MARKETPLACE_LOCALITY_NOT_FOUND}>{t("localityNotFound")}</option>
            </select>
            <p id="marketplace-locality-help" className="text-xs text-muted-foreground">
              {t("localityHelp")}
            </p>
          </div>

        {localityNotFound ? (
          <div className="space-y-1.5">
            <label htmlFor="marketplaceCityName" className="text-sm text-muted-foreground">{t("city")}</label>
            <input
              id="marketplaceCityName"
              value={marketplaceCityName}
              onChange={(event) => setMarketplaceCityName(event.target.value)}
              placeholder={t("cityPlaceholder")}
              maxLength={100}
              required
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
            />
            <p className="text-xs text-muted-foreground">{t("pendingLocalityHelp")}</p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="marketplaceCategorySlug" className="text-sm text-muted-foreground">{t("businessCategory")}</label>
          <select
            id="marketplaceCategorySlug"
            value={marketplaceCategorySlug}
            onChange={(event) => {
              setMarketplaceCategorySlug(event.target.value);
              if (event.target.value !== MARKETPLACE_OTHER_CATEGORY_SLUG) setMarketplaceOtherDescription("");
            }}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          >
            <option value="" disabled>{t("selectBusinessCategory")}</option>
            {categoryOptions.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
            <option value={MARKETPLACE_OTHER_CATEGORY_SLUG}>{t("otherCategory")}</option>
          </select>
        </div>

        {marketplaceCategorySlug === MARKETPLACE_OTHER_CATEGORY_SLUG ? (
          <div className="space-y-1.5">
            <label htmlFor="marketplaceOtherDescription" className="text-sm text-muted-foreground">
              {t("otherCategoryQuestion")}
            </label>
            <input
              id="marketplaceOtherDescription"
              value={marketplaceOtherDescription}
              onChange={(event) => setMarketplaceOtherDescription(event.target.value)}
              maxLength={200}
              required
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
            />
            <p className="text-xs text-muted-foreground">{t("otherCategoryHelp")}</p>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <input
            type="checkbox"
            id="marketplaceAuthorized"
            checked={marketplaceAuthorized}
            onChange={(event) => setMarketplaceAuthorized(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border bg-muted text-[#7C3AED] focus:ring-[#7C3AED]"
          />
          <label htmlFor="marketplaceAuthorized" className="space-y-1 text-sm leading-snug">
            <span className="block font-medium">{t("marketplaceAuthorization")}</span>
            <span className="block text-muted-foreground">{t("marketplaceAuthorizationDetails")}</span>
            <span className="block text-xs text-muted-foreground">{t("marketplaceAuthorizationDisclaimer")}</span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="timezone" className="text-sm text-muted-foreground">{t("timezone")}</label>
            <select id="timezone" value={timezone} onChange={event => setTimezone(event.target.value)} required
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30">
              {REGISTRATION_TIMEZONES.map(zone => <option key={zone} value={zone}>{t("timezones." + zone.replaceAll("/", "_"))}</option>)}
            </select>
          </div>
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="currencyCode" className="text-sm text-muted-foreground">{t("currency")}</label>
            <input id="currencyCode" value={currencyCode} readOnly
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-muted-foreground">{t("email")}</label>
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
          <label htmlFor="password" className="text-sm text-muted-foreground">{t("password")}</label>
          <input
            id="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
            {t("confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder={t("confirmPasswordPlaceholder")}
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
            {t("referralCode")} <span className="text-muted-foreground/50">({t("optional")})</span>
          </label>
          <input
            id="referralCode"
            type="text"
            placeholder={legacy("y9N5m2QP3-PU")}
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            maxLength={20}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-mono uppercase tracking-wider outline-none transition-colors focus:border-[#7C3AED]/30 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          />
        </div>

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
            {t.rich("termsConsent", {
              terms: (chunks) => <Link href="/terminos-y-condiciones" className="text-[#7C3AED] hover:underline">{chunks}</Link>,
              privacy: (chunks) => <Link href="/politica-de-privacidad" className="text-[#7C3AED] hover:underline">{chunks}</Link>,
            })}
          </label>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />{t("creating")}</> : <><UserPlus className="h-4 w-4" />{t("create")}</>}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("alreadyAccount")} {" "}
        <Link href="/login" className="text-[#7C3AED] hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
