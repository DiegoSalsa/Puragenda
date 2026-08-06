import es from "../../../messages/email/es.json";
import en from "../../../messages/email/en.json";
import it from "../../../messages/email/it.json";
import pt from "../../../messages/email/pt.json";
import fr from "../../../messages/email/fr.json";
import de from "../../../messages/email/de.json";
import zhCN from "../../../messages/email/zh-CN.json";
import { resolveLocale, type AppLocale } from "@/i18n/config";
import type { EmailTemplate } from "./templates";

const catalogs: Record<AppLocale, Record<string, string>> = { es, en, it, pt, fr, de, "zh-CN": zhCN };

export function localizeEmailTemplate(template: EmailTemplate, requestedLocale: string | null | undefined): EmailTemplate {
  const locale = resolveLocale(requestedLocale);
  if (locale === "es") return template;
  const source = catalogs.es;
  const target = catalogs[locale];
  const replacements = Object.keys(source)
    .map((id) => [source[id], target[id] || source[id]] as const)
    .filter(([from, to]) => from !== to)
    .sort((a, b) => b[0].length - a[0].length);

  let subject = template.subject;
  let html = template.html.replace('<html lang="es">', `<html lang="${locale}">`);
  for (const [from, to] of replacements) {
    subject = subject.split(from).join(to);
    html = html.split(from).join(to);
  }
  return { subject, html };
}
