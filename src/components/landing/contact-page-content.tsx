"use client";

import { useTranslations } from "next-intl";
import { LocalizedText } from "@/components/i18n/localized-text";
import { Mail, Phone } from "@/components/icons/hover-icons";
import { ContactForm } from "@/components/landing/contact-form";

export function ContactPageContent() {
  const t = useTranslations("contact");

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="mb-6 text-center text-4xl font-black uppercase tracking-tighter sm:text-6xl">{t("title")}</h1>
      <p className="mb-16 text-center text-xl font-bold opacity-80">{t("subtitle")}</p>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <a href="mailto:contacto@purocode.com" className="block rounded-2xl border-4 border-black bg-[#BFFCC6] p-6 text-black shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 dark:border-white dark:bg-black dark:text-white dark:shadow-[6px_6px_0_#BFFCC6]">
            <div className="mb-2 flex items-center gap-4"><Mail className="h-6 w-6" /><h3 className="text-xl font-black uppercase"><LocalizedText id="lpzL089jAOzV" /></h3></div>
            <p className="font-bold opacity-80">contacto@purocode.com</p>
          </a>
          <a href="https://wa.me/56949255006" target="_blank" rel="noopener noreferrer" className="block rounded-2xl border-4 border-black bg-[#FFF5BA] p-6 text-black shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 dark:border-white dark:bg-black dark:text-white dark:shadow-[6px_6px_0_#FFF5BA]">
            <div className="mb-2 flex items-center gap-4"><Phone className="h-6 w-6" /><h3 className="text-xl font-black uppercase"><LocalizedText id="akDt8fyHop8k" /></h3></div>
            <p className="font-bold opacity-80">+56 9 4925 5006</p>
          </a>
        </div>
        <ContactForm />
      </div>

      <div className="mt-24 border-t-4 border-black pt-16 dark:border-white">
        <h2 className="mb-12 text-center text-3xl font-black uppercase">{t("commitment")}</h2>
        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border-4 border-black bg-[#BFFCC6] p-6 text-black shadow-[6px_6px_0_#000]">
              <h3 className="mb-2 text-xl font-black uppercase">{t("responseTimes")}</h3><p className="font-bold opacity-80">{t("responseTimesDescription")}</p>
            </div>
            <div className="rounded-2xl border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] dark:border-white dark:bg-black dark:shadow-[6px_6px_0_#FFFFFF]">
              <h3 className="mb-2 text-xl font-black uppercase">{t("migration")}</h3><p className="font-bold opacity-80">{t("migrationDescription")}</p>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="mb-4 text-2xl font-black uppercase">{t("commonQuestions")}</h3>
            <div className="space-y-4">
              {[["contractQuestion", "contractAnswer"], ["technicalQuestion", "technicalAnswer"], ["trialQuestion", "trialAnswer"]].map(([question, answer]) => (
                <div key={question} className="border-b-2 border-black pb-4 dark:border-white/20">
                  <h4 className="mb-1 font-black uppercase">{t(question)}</h4><p className="text-sm font-bold opacity-80">{t(answer)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
