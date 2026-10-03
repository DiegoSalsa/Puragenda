import Link from "next/link";
import { FaqItem, VerticalFaq } from "./vertical-faq";
import { seo } from "./styles";
import type { ContentLink, ContentSource } from "@/lib/data/seo-expansion";

export function ExpansionFaq({ items }: { items: { question: string; answer: string }[] }) {
  return <VerticalFaq id="faq" title="Preguntas sobre este recorrido">
    <div data-seo-faq>{items.map((item) => <FaqItem key={item.question} {...item} />)}</div>
  </VerticalFaq>;
}

export function ExpansionLinks({ links }: { links: ContentLink[] }) {
  return <aside className={seo.section} aria-labelledby="related-heading">
    <h2 id="related-heading" className={seo.h2}>Para seguir revisando</h2>
    <ul className="mt-7 grid gap-4 sm:grid-cols-2">
      {links.map((link) => <li key={link.href} className="min-w-0 rounded-xl border-2 border-black/15 bg-white p-5 dark:border-white/20 dark:bg-[#222]">
        <Link className={seo.link} href={link.href}>{link.label}</Link>
        {link.description ? <p className="mt-2 text-sm leading-6">{link.description}</p> : null}
      </li>)}
    </ul>
  </aside>;
}

export function ExpansionSources({ sources }: { sources: ContentSource[] }) {
  return <section className="mt-10 border-t-2 border-black/15 pt-6 dark:border-white/20" aria-labelledby="sources-heading">
    <h2 id="sources-heading" className="text-xl font-black">Fuentes oficiales consultadas</h2>
    <ul className="mt-4 space-y-3 text-sm leading-6">
      {sources.map((source) => <li key={source.url}>
        <a href={source.url} className={seo.link}>{source.label}</a>
        <span className="block">Consulta: <time dateTime={source.consultedAt}>{formatContentDate(source.consultedAt)}</time>.</span>
      </li>)}
    </ul>
  </section>;
}

export function formatContentDate(date: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}
