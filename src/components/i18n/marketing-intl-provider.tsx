"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NextIntlClientProvider,
  type AbstractIntlMessages,
} from "next-intl";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_CHANGED_EVENT,
  LOCALE_COOKIE,
  type AppLocale,
} from "@/i18n/config";
import { buildMarketingMessages } from "@/i18n/marketing-messages";

const siteLoaders: Record<AppLocale, () => Promise<{ default: unknown }>> = {
  es: () => import("../../../messages/es.json"),
  en: () => import("../../../messages/en.json"),
  it: () => import("../../../messages/it.json"),
  pt: () => import("../../../messages/pt.json"),
  fr: () => import("../../../messages/fr.json"),
  de: () => import("../../../messages/de.json"),
  "zh-CN": () => import("../../../messages/zh-CN.json"),
};

const legacyLoaders: Record<AppLocale, () => Promise<{ default: Record<string, string> }>> = {
  es: () => import("../../../messages/legacy/es.json"),
  en: () => import("../../../messages/legacy/en.json"),
  it: () => import("../../../messages/legacy/it.json"),
  pt: () => import("../../../messages/legacy/pt.json"),
  fr: () => import("../../../messages/legacy/fr.json"),
  de: () => import("../../../messages/legacy/de.json"),
  "zh-CN": () => import("../../../messages/legacy/zh-CN.json"),
};

const dashboardLoaders: Record<AppLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  es: () => import("../../../messages/dashboard/es.json"),
  en: () => import("../../../messages/dashboard/en.json"),
  it: () => import("../../../messages/dashboard/it.json"),
  pt: () => import("../../../messages/dashboard/pt.json"),
  fr: () => import("../../../messages/dashboard/fr.json"),
  de: () => import("../../../messages/dashboard/de.json"),
  "zh-CN": () => import("../../../messages/dashboard/zh-CN.json"),
};

function savedLocale(): AppLocale {
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  const decoded = value ? decodeURIComponent(value) : null;
  return isSupportedLocale(decoded) ? decoded : DEFAULT_LOCALE;
}

export function MarketingIntlProvider({
  children,
  initialMessages,
}: {
  children: React.ReactNode;
  initialMessages: AbstractIntlMessages;
}) {
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState(initialMessages);
  const requestId = useRef(0);

  const loadLocale = useCallback(async (nextLocale: AppLocale) => {
    const currentRequest = ++requestId.current;
    if (nextLocale === DEFAULT_LOCALE) {
      setLocale(DEFAULT_LOCALE);
      setMessages(initialMessages);
      document.documentElement.lang = DEFAULT_LOCALE;
      return;
    }

    const [siteModule, legacyModule, dashboardModule] = await Promise.all([
      siteLoaders[nextLocale](),
      legacyLoaders[nextLocale](),
      dashboardLoaders[nextLocale](),
    ]);
    if (currentRequest !== requestId.current) return;

    setMessages(buildMarketingMessages(siteModule.default, legacyModule.default, dashboardModule.default));
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, [initialMessages]);

  useEffect(() => {
    const initialLocaleTimer = window.setTimeout(() => {
      void loadLocale(savedLocale());
    }, 0);
    const handleLocaleChange = (event: Event) => {
      const nextLocale = (event as CustomEvent<AppLocale>).detail;
      if (isSupportedLocale(nextLocale)) void loadLocale(nextLocale);
    };
    window.addEventListener(LOCALE_CHANGED_EVENT, handleLocaleChange);
    return () => {
      window.clearTimeout(initialLocaleTimer);
      window.removeEventListener(LOCALE_CHANGED_EVENT, handleLocaleChange);
    };
  }, [loadLocale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="America/Santiago"
    >
      {children}
    </NextIntlClientProvider>
  );
}
