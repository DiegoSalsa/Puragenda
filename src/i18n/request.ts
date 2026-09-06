import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, resolveInitialLocale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = resolveInitialLocale(savedLocale);

  const [siteMessages, marketplaceOnboardingMessages, dashboardMessages, dashboardClientsMessages, dashboardAnalyticsMessages, dashboardModulesMessages, legacyMessages] = await Promise.all([
    import(`../../messages/${locale}.json`).then((module) => module.default),
    import(`../../messages/marketplace-onboarding/${locale}.json`).then((module) => module.default),
    import(`../../messages/dashboard/${locale}.json`).then((module) => module.default),
    import(`../../messages/dashboard/clients/${locale}.json`).then((module) => module.default),
    import(`../../messages/dashboard/analytics/${locale}.json`).then((module) => module.default),
    import(`../../messages/dashboard/modules/${locale}.json`).then((module) => module.default),
    import(`../../messages/legacy/${locale}.json`).then((module) => module.default),
  ]);

  return {
    locale,
    messages: {
      ...siteMessages,
      register: { ...siteMessages.register, ...marketplaceOnboardingMessages.register },
      legacy: legacyMessages,
      dashboard: {
        ...dashboardMessages,
        ...dashboardModulesMessages,
        ...marketplaceOnboardingMessages.dashboard,
        clients: dashboardClientsMessages,
        analytics: dashboardAnalyticsMessages,
      },
    },
    timeZone: "America/Santiago",
    onError(error) {
      if (process.env.NODE_ENV !== "production") console.error(error);
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
