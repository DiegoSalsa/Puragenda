"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "@/components/icons/hover-icons";
import { PuriMascot } from "@/components/brand/puri-mascot";
import { TrackedLink } from "@/components/analytics/tracked-link";

/** Compact home teaser. The full narrative lives on /puri. */
export function PuriPublicSection() {
  const t = useTranslations("puri");

  return (
    <section id="puri" className="scroll-mt-28 mx-auto w-full max-w-6xl px-6 py-12 sm:py-16" aria-labelledby="puri-teaser-title">
      <div className="relative overflow-hidden rounded-[1.75rem] border-4 border-black bg-[#E9D8FF] p-5 text-black shadow-[7px_7px_0_#000] dark:border-white dark:bg-[#261b3c] dark:text-white dark:shadow-[7px_7px_0_#E9D8FF] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full border-[18px] border-[#FFD84D]" aria-hidden="true" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[auto_1fr] sm:gap-8 lg:grid-cols-[12rem_1fr_auto]">
          <PuriMascot variant="greeting" className="mx-auto h-36 w-36 motion-safe:animate-[puri-bob_4s_ease-in-out_infinite] motion-reduce:animate-none sm:h-40 sm:w-40 lg:h-44 lg:w-44" />
          <div className="min-w-0 text-center sm:text-left">
            <p className="inline-flex border-2 border-black bg-[#FFD84D] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000] dark:border-white dark:shadow-[2px_2px_0_#fff]">{t("newBadge")}</p>
            <h2 id="puri-teaser-title" className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-black leading-none tracking-[-.06em]">{t("teaserTitle")}</h2>
            <p className="mt-3 max-w-xl text-base font-bold leading-6 text-black/70 dark:text-white/70">{t("teaserBody")}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <TrackedLink href="/puri" cta="puri" placement="home_puri" className="inline-flex min-h-11 items-center gap-2 border-3 border-black bg-[#FFB5E8] px-4 py-2 text-sm font-black uppercase text-black shadow-[3px_3px_0_#000] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none dark:border-white dark:shadow-[3px_3px_0_#fff]">
                {t("cta")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[18rem] rounded-2xl border-3 border-black bg-[#FFFAEB] p-3 text-black shadow-[4px_4px_0_#000] dark:border-white dark:bg-[#111] dark:shadow-[4px_4px_0_#fff] sm:col-span-2 lg:col-span-1" aria-label={t("demoLabel")}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/60">PURI</p>
            <p className="mt-2 rounded-xl rounded-br-sm border-2 border-black bg-[#E9D8FF] p-2.5 text-xs font-black shadow-[2px_2px_0_#000]">{t("mockQuestion")}</p>
            <p className="mt-2 text-xs font-bold leading-5 text-black/70">{t("mockAnswerShort")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
