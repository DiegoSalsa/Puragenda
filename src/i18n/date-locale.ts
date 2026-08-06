import { de, enUS, es, fr, it, ptBR, zhCN, type Locale } from "date-fns/locale";
import type { AppLocale } from "./config";

const DATE_LOCALES: Record<AppLocale, Locale> = {
  es,
  en: enUS,
  it,
  pt: ptBR,
  fr,
  de,
  "zh-CN": zhCN,
};

export function getDateLocale(locale: string): Locale {
  return DATE_LOCALES[locale as AppLocale] ?? es;
}
