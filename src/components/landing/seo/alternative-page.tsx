import { LandingLayout } from "../landing-layout";
import { JsonLd } from "@/components/json-ld";
import { LandingBreadcrumb } from "./landing-breadcrumb";
import { LandingCtaGroup } from "./landing-cta-group";
import { ExpansionFaq, ExpansionLinks, ExpansionSources, formatContentDate } from "./expansion-content";
import { seo } from "./styles";
import type { AlternativePage } from "@/lib/data/alternatives";
import { expansionSchema } from "@/lib/seo-expansion";

export function AlternativeLanding({ page }: { page: AlternativePage }) {
  const placement = page.slug;
  return <LandingLayout>
    <JsonLd data={expansionSchema({ path: "/" + page.slug, title: page.title, description: page.description, date: page.updatedAt, faq: page.faq, parent: { name: "Guías", path: "/guias" } })} />
    <div data-seo-content={page.slug} data-seo-cluster="alternative">
      <header className={seo.section}>
        <LandingBreadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Guías", href: "/guias" }, { label: "Alternativa a " + page.competitor }]} />
        <p className={seo.eyebrow + " bg-white"}>Evaluación de alternativas</p>
        <h1 className={seo.h1 + " mt-5 sm:max-w-4xl"}>{page.headline}</h1>
        <p className={seo.lead + " mt-6 max-w-3xl"}>{page.description}</p>
        <p className="mt-5 text-sm font-semibold">Revisión: <time dateTime={page.updatedAt}>{formatContentDate(page.updatedAt)}</time></p>
        <LandingCtaGroup className="mt-8" primary={{ href: "/demo", label: "Explorar la demo", cta: "demo", placement }} secondary={{ href: "/pricing", label: "Consultar planes", cta: "pricing", placement }} />
      </header>
      <section className={seo.bandQuiet}><div className={seo.section}>
        <h2 className={seo.h2}>Cuándo evaluar Puragenda</h2><p className={seo.body + " mt-5 max-w-4xl"}>{page.directAnswer}</p>
        <ul className="mt-7 grid gap-5 md:grid-cols-3">{page.audience.map((item) => <li key={item} className="min-w-0 border-l-4 border-[#7C3AED] pl-4 font-semibold leading-7">{item}</li>)}</ul>
      </div></section>
      <section className={seo.section} aria-labelledby="comparison-heading">
        <h2 id="comparison-heading" className={seo.h2}>Dimensiones comprobadas</h2>
        <p className="mt-5 max-w-4xl text-sm leading-7 opacity-75">{page.intro}</p>
        <div className="mt-8 rounded-xl border-2 border-black bg-white dark:border-white dark:bg-[#161616]">
          <table className="block w-full text-left text-sm leading-6 sm:table sm:table-fixed sm:text-base">
            <caption className="sr-only">Alcance publicado por Puragenda y {page.competitor}</caption>
            <colgroup className="hidden sm:table-column-group"><col className="w-[22%]" /><col className="w-[39%]" /><col className="w-[39%]" /></colgroup>
            <thead className="hidden bg-[#F3E8FF] text-black sm:table-header-group"><tr><th scope="col" className="break-words p-4">Dimensión</th><th scope="col" className="break-words p-4">Puragenda</th><th scope="col" className="break-words p-4">{page.competitor}</th></tr></thead>
            <tbody className="block sm:table-row-group">{page.dimensions.map((row) => <tr key={row.label} className="grid gap-4 border-t-2 border-black/15 p-5 align-top first:border-t-0 sm:table-row sm:p-0 sm:first:border-t-2 dark:border-white/20">
              <th scope="row" className="break-words text-lg font-black sm:p-4 sm:text-base">{row.label}</th>
              <td className="break-words sm:p-4"><span className="mb-1 block font-black text-[#6D28D9] sm:hidden dark:text-[#C4B5FD]">Puragenda</span>{row.puragenda}</td>
              <td className="break-words sm:p-4"><span className="mb-1 block font-black sm:hidden">{page.competitor}</span>{row.competitor}<a href={row.sourceUrl} className={seo.link + " mt-2 block text-xs"}>Fuente oficial</a></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className="mx-auto max-w-4xl space-y-12 px-6 py-10 sm:py-16">
        {page.sections.map((section) => <section key={section.heading}>
          <h2 className={seo.h2 + " text-2xl sm:text-3xl"}>{section.heading}</h2>
          <div className="mt-5 space-y-5">{section.paragraphs.map((p) => <p key={p} className={seo.body}>{p}</p>)}</div>
        </section>)}
        <ExpansionSources sources={page.sources} />
      </div>
      <ExpansionFaq items={page.faq} />
      <ExpansionLinks links={page.links} />
      <section className={seo.bandQuiet}><div className={seo.section}>
        <h2 className={seo.h2}>{page.cta.heading}</h2><p className={seo.body + " mt-5 max-w-3xl"}>{page.cta.description}</p>
        <LandingCtaGroup className="mt-7" primary={{ href: "/demo", label: "Probar el recorrido en la demo", cta: "demo", placement: placement + "_final" }} secondary={{ href: "/pricing", label: "Ver planes vigentes", cta: "pricing", placement: placement + "_final" }} />
      </div></section>
    </div>
  </LandingLayout>;
}
