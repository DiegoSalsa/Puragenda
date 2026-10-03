import Link from "next/link";
import { LandingLayout } from "../landing-layout";
import { JsonLd } from "@/components/json-ld";
import { LandingBreadcrumb } from "./landing-breadcrumb";
import { LandingCtaGroup } from "./landing-cta-group";
import { seo } from "./styles";
import { ExpansionFaq, ExpansionLinks, ExpansionSources, formatContentDate } from "./expansion-content";
import type { Guide } from "@/lib/data/guides";
import type { GuideDetail } from "@/lib/data/expansion-guides";
import { expansionSchema } from "@/lib/seo-expansion";

export function ExpansionGuidePage({ guide, detail }: { guide: Guide; detail: GuideDetail }) {
  const path = "/guias/" + guide.slug;
  return <LandingLayout>
    <JsonLd data={expansionSchema({ path, title: guide.title, description: guide.description, date: guide.updatedAt, faq: guide.faq, parent: { name: "Guías", path: "/guias" }, article: true })} />
    <article data-seo-content={guide.slug} data-seo-cluster="guide">
      <header className={seo.section + " pb-8"}>
        <LandingBreadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Guías", href: "/guias" }, { label: guide.title }]} />
        <p className={seo.eyebrow + " bg-[#FFF5BA]"}>{guide.eyebrow}</p>
        <h1 className={seo.h1 + " mt-5 sm:max-w-4xl"}>{guide.title}</h1>
        <p className={seo.lead + " mt-6 max-w-3xl"}>{guide.description}</p>
        <p className="mt-6 text-sm font-semibold leading-6 opacity-70">Equipo Puragenda · Revisado <time dateTime={guide.updatedAt}>{formatContentDate(guide.updatedAt)}</time> · {guide.readingMinutes} min de lectura</p>
        <section className="mt-8 max-w-4xl rounded-2xl border-l-4 border-[#7C3AED] bg-[#F3E8FF] p-6 text-black" aria-labelledby="answer-heading">
          <h2 id="answer-heading" className="text-xl font-black">Respuesta breve</h2><p className="mt-4 text-lg font-medium leading-8">{detail.directAnswer}</p>
        </section>
      </header>
      <div className={seo.section + " grid items-start gap-12 pt-0 lg:grid-cols-[230px_minmax(0,1fr)]"}>
        <nav aria-label="Contenido de la guía" className="min-w-0 rounded-xl border-2 border-black/15 p-5 lg:sticky lg:top-28 dark:border-white/20">
          <p className="font-black">En esta guía</p><ol className="mt-4 space-y-4 text-sm leading-6">
            {guide.sections.map((section, i) => <li key={section.heading}><a className={seo.link} href={"#section-" + i}>{section.heading}</a></li>)}
          </ol>
        </nav>
        <div className="min-w-0 max-w-3xl">
          <div className="space-y-12">{guide.sections.map((section, i) => <section id={"section-" + i} key={section.heading} className="scroll-mt-28">
            <h2 className={seo.h2 + " text-2xl sm:text-3xl"}>{section.heading}</h2>
            <div className="mt-5 space-y-5">{section.paragraphs.map((p) => <p key={p} className={seo.body}>{p}</p>)}</div>
            {section.bullets ? <ul className="mt-6 list-disc space-y-3 rounded-xl bg-[#FFF5BA] py-5 pr-5 pl-10 text-base font-semibold leading-7 text-black">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul> : null}
          </section>)}</div>
          <p className="mt-10 text-sm leading-6 opacity-70">Guía del Equipo Puragenda. Los ejemplos son ilustrativos. <Link href="/sobre-nosotros" className={seo.link}>Conoce al equipo</Link> o <Link href="/contacto" className={seo.link}>reporta una corrección</Link>.</p>
          {detail.sources ? <ExpansionSources sources={detail.sources} /> : null}
        </div>
      </div>
      <ExpansionFaq items={guide.faq} />
      <ExpansionLinks links={detail.links} />
      <section className={seo.bandWarm}><div className={seo.section}>
        <h2 className={seo.h2}>{detail.cta.heading}</h2><p className={seo.body + " mt-5 max-w-3xl"}>{detail.cta.description}</p>
        <LandingCtaGroup className="mt-7" primary={{ href: detail.cta.href, label: detail.cta.label, cta: "learn_more", placement: "guide_" + guide.slug }} />
      </div></section>
    </article>
  </LandingLayout>;
}
