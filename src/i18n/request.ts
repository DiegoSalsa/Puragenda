import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale } from "./config";

function localeFromAcceptLanguage(value: string | null) {
  if (!value) return DEFAULT_LOCALE;
  const candidates = value
    .split(",")
    .map((entry) => entry.trim().split(";")[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = resolveLocale(candidate);
    if (locale !== DEFAULT_LOCALE || candidate.toLowerCase().startsWith("es")) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const savedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = savedLocale
    ? resolveLocale(savedLocale)
    : localeFromAcceptLanguage(headerStore.get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "America/Santiago",
    onError(error) {
      if (process.env.NODE_ENV !== "production") console.error(error);
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
