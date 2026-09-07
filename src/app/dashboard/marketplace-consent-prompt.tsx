"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
} from "@/components/icons/hover-icons";
import { PuragendaMarketplaceMascot } from "@/components/marketplace/puragenda-marketplace-mascot";
import {
  MarketplacePromptDropdown,
  type MarketplacePromptDropdownGroup,
} from "@/components/marketplace/marketplace-prompt-dropdown";
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
    initialCategorySlug: string;
    initialOtherDescription: string;
    initialLocalitySlug: string;
    needsCategory: boolean;
    needsLocality: boolean;
    suggestedLocalitySlug: string | null;
    initialCityName: string;
    categories: Array<{ slug: string; name: string }>;
    localities: Array<{ slug: string; name: string; regionName: string }>;
  };
};

const MARKETPLACE_PROMPT_CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  barberias: "Barbería",
  peluquerias: "Peluquería",
};

function marketplacePromptCategoryDisplayLabel(category: { slug: string; name: string }) {
  return MARKETPLACE_PROMPT_CATEGORY_DISPLAY_LABELS[category.slug] ?? category.name;
}

export function MarketplaceConsentPrompt({ prompt }: MarketplaceConsentPromptProps) {
  const t = useTranslations("dashboard.marketplacePrompt");
  const [hidden, setHidden] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [categorySlug, setCategorySlug] = useState(prompt.initialCategorySlug);
  const [otherDescription, setOtherDescription] = useState(prompt.initialOtherDescription);
  const [localitySlug, setLocalitySlug] = useState(
    prompt.initialLocalitySlug || prompt.suggestedLocalitySlug || "",
  );
  const [cityName, setCityName] = useState(prompt.initialCityName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const localityGroups = useMemo(() => groupLocalitiesByRegion(prompt.localities), [prompt.localities]);
  const categoryDropdownGroups = useMemo<MarketplacePromptDropdownGroup[]>(() => [{
    options: [
      ...prompt.categories.map((category) => ({
        value: category.slug,
        label: marketplacePromptCategoryDisplayLabel(category),
      })),
      { value: MARKETPLACE_OTHER_CATEGORY_SLUG, label: t("other") },
    ],
  }], [prompt.categories, t]);
  const localityDropdownGroups = useMemo<MarketplacePromptDropdownGroup[]>(() => [
    ...localityGroups.map(([region, localities]) => ({
      label: region,
      options: localities.map((locality) => ({ value: locality.slug, label: locality.name })),
    })),
    {
      options: [{ value: MARKETPLACE_LOCALITY_NOT_FOUND, label: t("localityNotFound") }],
    },
  ], [localityGroups, t]);
  const localityNotFound = localitySlug === MARKETPLACE_LOCALITY_NOT_FOUND;
  const publicItems = [
    t("publicBusinessName"),
    t("publicCategory"),
    t("publicCity"),
    t("publicLogo"),
    t("publicServices"),
    t("publicBookingLink"),
  ];

  if (hidden) return null;

  if (completed) {
    return (
      <section
        className="relative overflow-hidden rounded-[28px] border-2 border-[#1A1E24] bg-[#F0FFF2] p-5 text-[#1A1E24] shadow-[5px_5px_0_#1A1E24] dark:border-white dark:bg-emerald-950/30 dark:text-white dark:shadow-[5px_5px_0_#34D399] sm:p-6"
        aria-live="polite"
      >
        <div className="absolute -right-7 -top-8 h-28 w-28 rounded-full bg-[#BFFCC6] dark:bg-emerald-500/20" aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#1A1E24] bg-[#BFFCC6] shadow-[3px_3px_0_#1A1E24] dark:border-white dark:text-[#1A1E24]">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight">{t("successTitle")}</h2>
            <p className="mt-1 text-sm text-[#52525B] dark:text-zinc-300">{t("successDescription")}</p>
          </div>
        </div>
      </section>
    );
  }

  function submitAuthorization(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await acceptExistingBusinessMarketplacePromptAction({
        categorySlug,
        otherDescription: categorySlug === MARKETPLACE_OTHER_CATEGORY_SLUG
          ? otherDescription
          : undefined,
        localitySlug: prompt.countryCode === "CL" && !localityNotFound
          ? localitySlug
          : undefined,
        localityNotFound: prompt.countryCode === "CL" && localityNotFound,
        cityName: prompt.countryCode !== "CL" || localityNotFound
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
    <section
      className="group relative isolate overflow-hidden rounded-[28px] border-2 border-[#1A1E24] bg-[#FFFAEB] text-[#1A1E24] shadow-[6px_6px_0_#1A1E24] dark:border-white dark:bg-[#17131F] dark:text-white dark:shadow-[6px_6px_0_#7C3AED]"
      aria-labelledby="marketplace-prompt-title"
    >
      <div className="pointer-events-none absolute -left-14 -top-14 h-44 w-44 rounded-full bg-[#FFF5BA] dark:bg-[#7C3AED]/20" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-[-4.5rem] right-[-3rem] h-52 w-52 rounded-full bg-[#FFB5E8]/70 blur-[1px] dark:bg-[#E91E8C]/15" aria-hidden="true" />

      <div className="relative grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-5 sm:p-7 lg:pr-4">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#1A1E24] bg-[#BFFCC6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] shadow-[3px_3px_0_#1A1E24] dark:border-white dark:text-[#1A1E24]">
              <Search className="h-3.5 w-3.5" />
              Puragenda Marketplace
            </div>
            <PuragendaMarketplaceMascot className="-mb-12 -mr-2 -mt-4 w-24 shrink-0 rotate-3 drop-shadow-[0_5px_0_rgba(26,30,36,0.12)] lg:hidden" />
          </div>

          <h2
            id="marketplace-prompt-title"
            className="mt-5 max-w-2xl text-2xl font-black leading-[1.08] tracking-[-0.03em] sm:text-3xl"
          >
            {t("title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52525B] dark:text-zinc-300 sm:text-[15px]">
            {t("description")}
          </p>

          <form onSubmit={submitAuthorization}>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MarketplacePromptDropdown
                id="promptMarketplaceCategory"
                label={t("categoryLabel")}
                value={categorySlug}
                placeholder={t("selectCategory")}
                groups={categoryDropdownGroups}
                onChange={setCategorySlug}
                tone="category"
                optionsLabel={t("options")}
              />

              {prompt.countryCode === "CL" ? (
                <MarketplacePromptDropdown
                  id="promptMarketplaceLocality"
                  label={t("localityLabel")}
                  value={localitySlug}
                  placeholder={t("selectLocality")}
                  groups={localityDropdownGroups}
                  onChange={setLocalitySlug}
                  tone="locality"
                  searchable
                  searchPlaceholder={t("searchLocality")}
                  noResultsLabel={t("noResults")}
                  optionsLabel={t("options")}
                />
              ) : (
                <label className="relative flex min-w-0 items-center gap-2 rounded-full border-2 border-[#1A1E24] bg-white py-1.5 pl-3 pr-4 text-sm font-bold shadow-[2px_2px_0_#1A1E24] focus-within:ring-4 focus-within:ring-[#FFB5E8]/60 dark:border-white/80 dark:bg-white/10 dark:shadow-[2px_2px_0_#E91E8C] sm:min-w-64">
                  <MapPin className="h-4 w-4 shrink-0 text-[#E91E8C] dark:text-[#FFB5E8]" />
                  <span className="shrink-0 text-[#71717A] dark:text-zinc-400">{t("localityLabel")}:</span>
                  <input
                    value={cityName}
                    onChange={(event) => setCityName(event.target.value)}
                    maxLength={100}
                    required
                    aria-label={t("cityLabel")}
                    className="min-w-0 flex-1 bg-transparent font-black text-[#1A1E24] outline-none dark:text-white"
                  />
                </label>
              )}
            </div>

            {categorySlug === MARKETPLACE_OTHER_CATEGORY_SLUG ? (
              <div className="mt-3 space-y-1.5">
                <label htmlFor="promptMarketplaceOther" className="text-sm font-bold">{t("otherQuestion")}</label>
                <input
                  id="promptMarketplaceOther"
                  value={otherDescription}
                  onChange={(event) => setOtherDescription(event.target.value)}
                  maxLength={200}
                  required
                  className="block w-full rounded-xl border-2 border-[#1A1E24] bg-white px-4 py-3 text-sm text-[#1A1E24] shadow-[3px_3px_0_#1A1E24] outline-none focus:ring-4 focus:ring-[#B28DFF]/40 dark:border-white dark:bg-[#17131F] dark:text-white dark:shadow-[3px_3px_0_#7C3AED] sm:max-w-md"
                />
              </div>
            ) : null}

            {prompt.countryCode === "CL" && localityNotFound ? (
              <div className="mt-3 space-y-1.5">
                <label htmlFor="promptMarketplaceCity" className="text-sm font-bold">{t("cityLabel")}</label>
                <input
                  id="promptMarketplaceCity"
                  value={cityName}
                  onChange={(event) => setCityName(event.target.value)}
                  maxLength={100}
                  required
                  className="block w-full rounded-xl border-2 border-[#1A1E24] bg-white px-4 py-3 text-sm text-[#1A1E24] shadow-[3px_3px_0_#1A1E24] outline-none focus:ring-4 focus:ring-[#FFB5E8]/60 dark:border-white dark:bg-[#17131F] dark:text-white dark:shadow-[3px_3px_0_#E91E8C] sm:max-w-md"
                />
              </div>
            ) : null}

          <div className="mt-5 rounded-2xl border-2 border-[#1A1E24] bg-white/85 p-4 shadow-[3px_3px_0_#1A1E24] dark:border-white/80 dark:bg-white/[0.07] dark:shadow-[3px_3px_0_#7C3AED]">
            <p className="text-sm font-black">{t("publicDataTitle")}</p>
            <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm text-[#52525B] dark:text-zinc-300 sm:grid-cols-2">
              {publicItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#BFFCC6] text-[#1A1E24]" aria-hidden="true">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex items-start gap-2 text-sm text-[#52525B] dark:text-zinc-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7C3AED] dark:text-[#B28DFF]" />
            <p>{t("optional")}</p>
          </div>

            {error ? <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl border-2 border-[#1A1E24] bg-[#7C3AED] px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_#1A1E24] transition-all hover:-translate-y-0.5 hover:bg-[#6D28D9] hover:shadow-[5px_5px_0_#1A1E24] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B28DFF]/50 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-50 dark:border-white dark:shadow-[4px_4px_0_#FFFFFF] dark:hover:shadow-[5px_5px_0_#FFFFFF]"
              >
                {pending ? t("saving") : t("appear")}
              </button>
              <button
                type="button"
                onClick={dismiss}
                disabled={pending}
                className="rounded-xl border-2 border-[#1A1E24] bg-white px-5 py-3 text-sm font-black shadow-[3px_3px_0_#1A1E24] transition-all hover:-translate-y-0.5 hover:bg-[#FFF5BA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B28DFF]/50 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-50 dark:border-white dark:bg-white/10 dark:shadow-[3px_3px_0_#FFFFFF] dark:hover:bg-white/15"
              >
                {t("notNow")}
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#71717A] dark:text-zinc-400">{t("disclaimer")}</p>
          </form>
        </div>

        <div className="relative hidden min-h-full items-end justify-center overflow-hidden border-l-2 border-[#1A1E24] bg-[#B28DFF] px-5 pt-2 dark:border-white lg:flex" aria-hidden="true">
          <div className="absolute left-5 top-5 h-5 w-5 rotate-12 rounded-sm border-2 border-[#1A1E24] bg-[#FFF5BA]" />
          <div className="absolute right-7 top-8 h-8 w-8 rounded-full border-2 border-[#1A1E24] bg-[#85E3FF]" />
          <div className="absolute bottom-7 left-6 h-7 w-7 -rotate-12 rounded-full border-2 border-[#1A1E24] bg-[#FFB5E8]" />
          <PuragendaMarketplaceMascot className="relative -mb-1 w-56 drop-shadow-[0_8px_0_rgba(26,30,36,0.12)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-1 lg:w-64" />
        </div>
      </div>

    </section>
  );
}
