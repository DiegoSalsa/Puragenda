export const SUPPORTED_LOCALES = ["es", "en", "it", "pt", "fr", "de", "zh-CN"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "es";
export const LOCALE_COOKIE = "puragenda_locale";
export const LOCALE_CHANGED_EVENT = "puragenda:locale-change";

export const LOCALE_LABELS: Record<AppLocale, { native: string; short: string; flag: string }> = {
  es: { native: "Español", short: "ES", flag: "🇨🇱" },
  en: { native: "English", short: "EN", flag: "🇺🇸" },
  it: { native: "Italiano", short: "IT", flag: "🇮🇹" },
  pt: { native: "Português", short: "PT", flag: "🇧🇷" },
  fr: { native: "Français", short: "FR", flag: "🇫🇷" },
  de: { native: "Deutsch", short: "DE", flag: "🇩🇪" },
  "zh-CN": { native: "简体中文", short: "中文", flag: "🇨🇳" },
};

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as AppLocale));
}

export function resolveLocale(value: string | null | undefined): AppLocale {
  if (!value) return DEFAULT_LOCALE;
  const normalized = value.trim().replace("_", "-");
  if (isSupportedLocale(normalized)) return normalized;

  const language = normalized.split("-")[0]?.toLowerCase();
  if (language === "zh") return "zh-CN";
  return SUPPORTED_LOCALES.find((locale) => locale === language) ?? DEFAULT_LOCALE;
}

/**
 * Puragenda always opens in Spanish. A different locale is used only after
 * the visitor deliberately selects and saves it in the language switcher.
 */
export function resolveInitialLocale(savedLocale: string | null | undefined): AppLocale {
  return savedLocale ? resolveLocale(savedLocale) : DEFAULT_LOCALE;
}
