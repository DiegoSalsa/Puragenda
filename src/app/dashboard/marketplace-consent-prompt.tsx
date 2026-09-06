"use client";

import { FormEvent, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "@/components/icons/hover-icons";
import {
  MARKETPLACE_LOCALITY_NOT_FOUND,
  MARKETPLACE_OTHER_CATEGORY_SLUG,
  groupLocalitiesByRegion,
} from "@/lib/marketplace";
import {
  acceptExistingBusinessMarketplacePromptAction,
  dismissExistingBusinessMarketplacePromptAction,
} from "@/server/actions/marketplace-prompt.actions";

type MarketplaceConsentPromptProps = {
  prompt: {
    businessName: string;
    countryCode: string;
    categoryLabel: string | null;
    localityLabel: string | null;
    needsCategory: boolean;
    needsLocality: boolean;
    suggestedLocalitySlug: string | null;
    initialCityName: string;
    categories: Array<{ slug: string; name: string }>;
    localities: Array<{ slug: string; name: string; regionName: string }>;
  };
};

export function MarketplaceConsentPrompt({ prompt }: MarketplaceConsentPromptProps) {
  const t = useTranslations("dashboard.marketplacePrompt");
  const [formOpen, setFormOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [categorySlug, setCategorySlug] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  const [localitySlug, setLocalitySlug] = useState(prompt.suggestedLocalitySlug ?? "");
  const [cityName, setCityName] = useState(prompt.initialCityName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstFieldRef = useRef<HTMLSelectElement | HTMLInputElement | null>(null);
  const localityGroups = useMemo(() => groupLocalitiesByRegion(prompt.localities), [prompt.localities]);
  const localityNotFound = localitySlug === MARKETPLACE_LOCALITY_NOT_FOUND;

  if (hidden) return null;

  if (completed) {
    return (
      <section
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"
        aria-live="polite"
      >
        <h2 className="text-lg font-bold text-foreground">{t("successTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("successDescription")}</p>
      </section>
    );
  }

  function openFormOrAccept() {
    if (prompt.needsCategory || prompt.needsLocality) {
      setFormOpen(true);
      setError(null);
      requestAnimationFrame(() => firstFieldRef.current?.focus());
      return;
    }
    submitAuthorization();
  }

  function submitAuthorization(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await acceptExistingBusinessMarketplacePromptAction({
        categorySlug: prompt.needsCategory ? categorySlug : undefined,
        otherDescription: prompt.needsCategory && categorySlug === MARKETPLACE_OTHER_CATEGORY_SLUG
          ? otherDescription
          : undefined,
        localitySlug: prompt.countryCode === "CL" && prompt.needsLocality && !localityNotFound
          ? localitySlug
          : undefined,
        localityNotFound: prompt.countryCode === "CL" && prompt.needsLocality && localityNotFound,
        cityName: prompt.needsLocality && (prompt.countryCode !== "CL" || localityNotFound)
          ? cityName
          : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCompleted(true);
    });
  }

  function dismiss() {
    setError(null);
    startTransition(async () => {
      const result = await dismissExistingBusinessMarketplacePromptAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setHidden(true);
    });
  }

  return (
    <section className="rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-5 shadow-sm" aria-labelledby="marketplace-prompt-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-xl bg-[#7C3AED] p-2 text-white" aria-hidden="true">
              <Eye className="h-5 w-5" />
            </span>
            <div>
              <h2 id="marketplace-prompt-title" className="text-xl font-bold">{t("title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {prompt.categoryLabel ? (
              <p><span className="font-semibold">{t("categoryLabel")}:</span> {prompt.categoryLabel}</p>
            ) : null}
            {prompt.localityLabel ? (
              <p><span className="font-semibold">{t("localityLabel")}:</span> {prompt.localityLabel}</p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold">{t("publicDataTitle")}</p>
            <ul className="mt-1 grid list-inside list-disc gap-x-6 text-sm text-muted-foreground sm:grid-cols-2">
              <li>{t("publicBusinessName")}</li>
              <li>{t("publicCategory")}</li>
              <li>{t("publicCity")}</li>
              <li>{t("publicLogo")}</li>
              <li>{t("publicServices")}</li>
              <li>{t("publicBookingLink")}</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">{t("optional")}</p>
          <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
        </div>

        {!formOpen ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={openFormOrAccept}
              disabled={pending}
              className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50"
            >
              {pending ? t("saving") : t("appear")}
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={pending}
              className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              {t("notNow")}
            </button>
          </div>
        ) : null}
      </div>

      {formOpen ? (
        <form onSubmit={submitAuthorization} className="mt-5 space-y-4 border-t border-[#7C3AED]/20 pt-5">
          {prompt.needsCategory ? (
            <div className="space-y-1.5">
              <label htmlFor="promptMarketplaceCategory" className="text-sm font-medium">{t("categoryLabel")}</label>
              <select
                ref={(element) => { if (prompt.needsCategory) firstFieldRef.current = element; }}
                id="promptMarketplaceCategory"
                value={categorySlug}
                onChange={(event) => setCategorySlug(event.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm sm:max-w-md"
              >
                <option value="" disabled>{t("selectCategory")}</option>
                {prompt.categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
                <option value={MARKETPLACE_OTHER_CATEGORY_SLUG}>{t("other")}</option>
              </select>
            </div>
          ) : null}

          {prompt.needsCategory && categorySlug === MARKETPLACE_OTHER_CATEGORY_SLUG ? (
            <div className="space-y-1.5">
              <label htmlFor="promptMarketplaceOther" className="text-sm font-medium">{t("otherQuestion")}</label>
              <input
                id="promptMarketplaceOther"
                value={otherDescription}
                onChange={(event) => setOtherDescription(event.target.value)}
                maxLength={200}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm sm:max-w-md"
              />
            </div>
          ) : null}

          {prompt.needsLocality && prompt.countryCode === "CL" ? (
            <div className="space-y-1.5">
              <label htmlFor="promptMarketplaceLocality" className="text-sm font-medium">{t("localityLabel")}</label>
              <select
                ref={(element) => { if (!prompt.needsCategory) firstFieldRef.current = element; }}
                id="promptMarketplaceLocality"
                value={localitySlug}
                onChange={(event) => setLocalitySlug(event.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm sm:max-w-md"
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
            </div>
          ) : null}

          {prompt.needsLocality && (prompt.countryCode !== "CL" || localityNotFound) ? (
            <div className="space-y-1.5">
              <label htmlFor="promptMarketplaceCity" className="text-sm font-medium">{t("cityLabel")}</label>
              <input
                ref={(element) => { if (!prompt.needsCategory && prompt.countryCode !== "CL") firstFieldRef.current = element; }}
                id="promptMarketplaceCity"
                value={cityName}
                onChange={(event) => setCityName(event.target.value)}
                maxLength={100}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm sm:max-w-md"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50"
            >
              {pending ? t("saving") : t("appear")}
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={pending}
              className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              {t("notNow")}
            </button>
          </div>
        </form>
      ) : error ? (
        <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>
      ) : null}
    </section>
  );
}
