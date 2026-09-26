import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Lock, Shield } from "@/components/icons/hover-icons";
import { PuriMascot } from "@/components/brand/puri-mascot";
import { LandingLayout } from "@/components/landing/landing-layout";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbListNode, faqPageNode, jsonLdGraph, organizationRef, softwareApplicationNode } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("puri");
  const title = t("metaTitle");
  return {
    ...createPageMetadata({ title, description: t("metaDescription"), path: "/puri" }),
    title: { absolute: title },
  };
}

export default async function PuriPage() {
  const t = await getTranslations("puri");
  const faq = [
    { question: t("faqWhat"), answer: t("faqWhatAnswer") },
    { question: t("faqCanAsk"), answer: t("faqCanAskAnswer") },
    { question: t("faqChange"), answer: t("faqChangeAnswer") },
    { question: t("faqPermissions"), answer: t("faqPermissionsAnswer") },
  ];
  const questions = [t("questionOne"), t("questionTwo"), t("questionThree"), t("questionFour")];
  const steps = [
    ["01", t("flowOneTitle"), t("flowOneBody")],
    ["02", t("flowTwoTitle"), t("flowTwoBody")],
    ["03", t("flowThreeTitle"), t("flowThreeBody")],
  ] as const;

  return (
    <LandingLayout>
      <JsonLd data={jsonLdGraph([
        organizationRef(),
        softwareApplicationNode(t("pageWhatBody")),
        breadcrumbListNode([{ name: "Puragenda", path: "/" }, { name: "Puri", path: "/puri" }]),
        faqPageNode(faq),
      ])} />

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-8 sm:pt-16 lg:grid-cols-[1fr_.9fr] lg:gap-16 lg:pb-24">
        <div>
          <p className="inline-flex border-2 border-black bg-[#FFD84D] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff]">{t("eyebrow")}</p>
          <h1 className="mt-6 max-w-2xl text-[clamp(3rem,7vw,6.5rem)] font-black leading-[.9] tracking-[-.08em]">{t("homeTitle")}</h1>
          <p className="mt-6 max-w-xl text-lg font-bold leading-8 text-black/70 dark:text-white/70">{t("pageSubtitle")}</p>
          <TrackedLink href="/register" cta="register" placement="puri_hero" className="mt-7 inline-flex min-h-12 items-center gap-2 border-4 border-black bg-[#FFB5E8] px-6 py-3 text-base font-black uppercase text-black shadow-[5px_5px_0_#000] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED] dark:border-white dark:shadow-[5px_5px_0_#fff]">
            {t("secondaryCta")} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </TrackedLink>
        </div>
        <div className="relative flex min-h-[23rem] items-center justify-center bg-[#E9D8FF] px-8 py-10 dark:bg-[#261b3c] sm:min-h-[30rem]">
          <span className="absolute left-5 top-5 h-5 w-5 rounded-full border-2 border-black bg-[#FFD84D] dark:border-white" aria-hidden="true" />
          <span className="absolute bottom-8 right-8 h-14 w-14 rotate-12 border-4 border-black bg-[#FFB5E8] shadow-[4px_4px_0_#000] dark:border-white dark:shadow-[4px_4px_0_#fff]" aria-hidden="true" />
          <PuriMascot variant="greeting" className="relative z-10 h-72 w-72 motion-safe:animate-[puri-bob_4s_ease-in-out_infinite] motion-reduce:animate-none sm:h-[23rem] sm:w-[23rem]" />
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#FFFAEB] py-16 dark:border-white dark:bg-[#111] sm:py-20" aria-labelledby="puri-questions-title">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div className="relative flex justify-center lg:justify-start">
            <PuriMascot variant="thinking" className="h-56 w-56 sm:h-72 sm:w-72" />
            <span className="absolute right-[15%] top-0 rounded-full border-3 border-black bg-[#FFF5BA] px-3 py-1 text-xs font-black text-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff]">PURI</span>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#7C3AED]">{t("eyebrow")}</p>
            <h2 id="puri-questions-title" className="mt-3 max-w-2xl scroll-mt-28 text-4xl font-black leading-none tracking-[-.06em] sm:text-6xl">{t("questionsTitle")}</h2>
            <div className="mt-8 flex max-w-2xl flex-wrap gap-3">
              {questions.map((question, index) => <span key={question} className={`rounded-full border-3 border-black px-4 py-3 text-base font-black text-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff] ${index % 2 === 0 ? "bg-[#E9D8FF]" : "bg-[#FFF5BA]"}`}>{question}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24" aria-labelledby="puri-demo-title">
        <div className="mb-8 max-w-2xl">
          <h2 id="puri-demo-title" className="scroll-mt-28 text-4xl font-black leading-none tracking-[-.06em] sm:text-6xl">{t("demoTitle")}</h2>
          <p className="mt-4 text-lg font-bold leading-7 text-black/65 dark:text-white/65">{t("demoLead")}</p>
        </div>
        <div className="relative overflow-hidden border-4 border-black bg-[#E9D8FF] p-4 shadow-[9px_9px_0_#000] dark:border-white dark:bg-[#261b3c] dark:shadow-[9px_9px_0_#fff] sm:p-8">
          <div className="mx-auto max-w-4xl border-4 border-black bg-[#FFFAEB] p-4 text-black shadow-[5px_5px_0_#000] dark:border-white dark:bg-[#111] dark:shadow-[5px_5px_0_#fff] sm:p-7">
            <div className="flex items-center gap-3 border-b-2 border-black/15 pb-4 dark:border-white/15"><PuriMascot variant="greeting" className="h-16 w-16" /><div><p className="text-xs font-black uppercase tracking-[0.16em]">PURI</p><p className="text-sm font-bold text-black/60 dark:text-white/60">{t("assistantLabel")}</p></div></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-[.8fr_1.2fr] sm:items-start"><p className="rounded-2xl rounded-br-md border-3 border-black bg-[#E9D8FF] p-4 text-lg font-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff]">{t("mockQuestion")}</p><p className="rounded-2xl rounded-bl-md border-3 border-black bg-white p-4 text-lg font-bold leading-8 shadow-[3px_3px_0_#000] dark:border-white">{t("mockAnswer")}</p></div>
          </div>
          <PuriMascot variant="success" className="absolute -bottom-5 -right-4 hidden h-40 w-40 sm:block lg:h-52 lg:w-52" />
        </div>
      </section>

      <section className="bg-[#FFF5BA] py-16 text-black sm:py-20" aria-labelledby="puri-flow-title">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 id="puri-flow-title" className="max-w-2xl scroll-mt-28 text-4xl font-black leading-none tracking-[-.06em] sm:text-6xl">{t("flowTitle")}</h2>
          <div className="mt-10 grid divide-y-3 divide-black border-y-3 border-black lg:grid-cols-3 lg:divide-x-3 lg:divide-y-0">
            {steps.map(([number, title, body]) => <article key={number} className="py-6 lg:px-7 lg:py-5 first:lg:pl-0 last:lg:pr-0"><p className="text-6xl font-black leading-none text-[#7C3AED]">{number}</p><h3 className="mt-4 text-2xl font-black">{title}</h3><p className="mt-2 max-w-xs text-base font-bold leading-6 text-black/65">{body}</p></article>)}
          </div>
          <p className="mt-8 max-w-2xl border-l-4 border-black pl-4 text-base font-bold leading-7">{t("readOnlyNote")}</p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <div className="flex items-center gap-3"><Shield className="h-8 w-8 text-[#7C3AED]" aria-hidden="true" /><p className="text-sm font-black uppercase tracking-[0.18em] text-[#7C3AED]">{t("pageSecurityTitle")}</p></div>
          <h2 className="mt-4 max-w-2xl text-4xl font-black leading-none tracking-[-.06em] sm:text-6xl">{t("permissionHeadline")}</h2>
          <p className="mt-5 max-w-xl text-lg font-bold leading-8 text-black/65 dark:text-white/65">{t("permissionBody")}</p>
        </div>
        <div className="flex items-center justify-center"><PuriMascot variant="attention" className="h-56 w-56 sm:h-72 sm:w-72" /><Lock className="-ml-12 mt-24 h-14 w-14 rounded-full border-3 border-black bg-[#FFD84D] p-2 text-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff]" aria-hidden="true" /></div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-10" aria-labelledby="puri-faq-title">
        <h2 id="puri-faq-title" className="scroll-mt-28 text-3xl font-black tracking-[-.04em] sm:text-5xl">{t("pageQuestionsTitle")}</h2>
        <div className="mt-5 border-t-3 border-black dark:border-white">{faq.map((item) => <details key={item.question} className="border-b-3 border-black py-5 dark:border-white"><summary className="scroll-mt-28 cursor-pointer list-none pr-8 text-lg font-black marker:hidden hover:text-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7C3AED] dark:hover:text-[#C4B5FD] [&::-webkit-details-marker]:hidden">{item.question}</summary><p className="mt-3 max-w-3xl text-base font-bold leading-7 text-black/65 dark:text-white/65">{item.answer}</p></details>)}</div>
      </section>

      <section className="relative mt-12 overflow-hidden border-y-4 border-black bg-[#7C3AED] px-6 pb-44 pt-20 text-white dark:border-white sm:py-24">
        <PuriMascot variant="success" viewBox="0 0 160 190" preserveAspectRatio="xMidYMin meet" className="pointer-events-none absolute -bottom-[4.25rem] right-2 h-[14.25rem] w-[14.25rem] sm:-bottom-[5.75rem] sm:right-[10%] sm:h-[19rem] sm:w-[19rem]" />
        <div className="relative z-10 mx-auto w-full max-w-6xl"><h2 className="max-w-2xl text-4xl font-black leading-none tracking-[-.06em] sm:text-6xl">{t("pageCtaTitle")}</h2><p className="mt-5 max-w-xl text-lg font-bold leading-7 text-white/80">{t("pageCtaBody")}</p><TrackedLink href="/register" cta="register" placement="puri_final_cta" className="mt-7 inline-flex min-h-12 items-center gap-2 border-4 border-black bg-[#FFF5BA] px-6 py-3 text-base font-black uppercase text-black shadow-[5px_5px_0_#000] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{t("secondaryCta")} <ArrowRight className="h-5 w-5" aria-hidden="true" /></TrackedLink></div>
      </section>
    </LandingLayout>
  );
}
