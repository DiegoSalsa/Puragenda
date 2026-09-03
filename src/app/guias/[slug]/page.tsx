
import { LocalizedText } from "@/components/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { getGuide, guides } from "@/lib/data/guides";
import { absoluteUrl } from "@/lib/site";
import { createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import {
  articleNode,
  breadcrumbListNode,
  faqPageNode,
  jsonLdGraph,
  organizationRef,
} from "@/lib/json-ld";

type GuidePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  return createPageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guias/${guide.slug}`,
    type: "article",
    publishedTime: guide.updatedAt,
    modifiedTime: guide.updatedAt,
  });
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const guideUrl = absoluteUrl(`/guias/${guide.slug}`);
  const relatedGuides = guide.related
    .map((relatedSlug) => getGuide(relatedSlug))
    .filter((related): related is NonNullable<typeof related> => Boolean(related));

  return (
    <LandingLayout>
      <JsonLd
        data={jsonLdGraph([
          organizationRef(),
          articleNode({
            headline: guide.title,
            description: guide.description,
            url: guideUrl,
            datePublished: guide.updatedAt,
            dateModified: guide.updatedAt,
          }),
          faqPageNode(guide.faq),
          breadcrumbListNode([
            { name: "Inicio", path: "/" },
            { name: "Guías", path: "/guias" },
            { name: guide.title, path: `/guias/${guide.slug}` },
          ]),
        ])}
      />

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <Link href="/guias" className="inline-flex items-center gap-2 text-sm font-black uppercase hover:text-[#7C3AED]">
          <ArrowLeft className="h-4 w-4" />
          <LocalizedText id="yLCeyXMhIRBj" />
        </Link>

        <article className="mt-10">
          <header className="border-b-4 border-black pb-12 dark:border-white">
            <p className="inline-block border-2 border-black bg-[#FFF5BA] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
              {guide.eyebrow}
            </p>
            <h1 className="mt-7 max-w-4xl text-4xl font-black uppercase tracking-tighter sm:text-6xl">
              {guide.title}
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-bold leading-relaxed opacity-75">
              {guide.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-5 text-sm font-black uppercase opacity-65">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Actualizado <time dateTime={guide.updatedAt}>31 de agosto de 2026</time>
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {guide.readingMinutes} <LocalizedText id="40AgLH_frvYD" />
              </span>
            </div>
          </header>

          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border-2 border-black/20 bg-[#F5F3FF] p-5 text-black dark:border-white/30">
            <p className="font-black">Revisado por el Equipo Puragenda</p>
            <p className="mt-2 text-sm font-bold leading-6 opacity-75">Contenido elaborado desde la experiencia operando una plataforma de reservas para negocios chilenos. Explicamos capacidades verificables del producto y evitamos promesas de resultados garantizados.</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm font-black">
              <Link href="/sobre-nosotros" className="underline underline-offset-4">Conoce al equipo</Link>
              <Link href="/contacto" className="underline underline-offset-4">Reportar una corrección</Link>
            </div>
            {guide.slug === "como-elegir-sistema-reservas-chile" ? (
              <p className="mt-4 text-sm font-bold leading-6">
                Si ya estás comparando software, revisa también el{" "}
                <Link href="/sistema-de-agendamiento-online" className="underline underline-offset-4">
                  sistema de agendamiento online de Puragenda
                </Link>
                : qué es, cómo reserva el cliente y qué funciones están disponibles hoy.
              </p>
            ) : null}
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-14">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-3xl font-black uppercase tracking-tight">{section.heading}</h2>
                <div className="mt-5 space-y-5">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-lg font-medium leading-8 opacity-85">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.bullets && (
                  <ul className="mt-6 space-y-3 rounded-2xl border-4 border-black bg-[#FFF5BA] p-6 text-black shadow-[6px_6px_0_#000] dark:border-white">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 font-bold leading-relaxed">
                        <span aria-hidden="true">✓</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section className="mx-auto mt-16 max-w-3xl border-t-4 border-black pt-12 dark:border-white">
            <h2 className="text-3xl font-black uppercase"><LocalizedText id="o_NRzgWAdoNW" /></h2>
            <div className="mt-7 space-y-5">
              {guide.faq.map((item) => (
                <div key={item.question} className="rounded-2xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000] dark:border-white dark:bg-black">
                  <h3 className="text-lg font-black">{item.question}</h3>
                  <p className="mt-3 font-medium leading-7 opacity-80">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </article>

        <aside className="mt-20 border-t-4 border-black pt-12 dark:border-white">
          <h2 className="text-2xl font-black uppercase"><LocalizedText id="ith8agD-xiEU" /></h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {relatedGuides.map((related) => (
              <Link
                key={related.slug}
                href={`/guias/${related.slug}`}
                className="group rounded-2xl border-4 border-black bg-[#BFFCC6] p-6 text-black shadow-[5px_5px_0_#000] dark:border-white"
              >
                <p className="text-xs font-black uppercase tracking-wider">{related.eyebrow}</p>
                <p className="mt-2 text-lg font-black">{related.title}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase">
                  <LocalizedText id="9OCsCAQsmHqb" /> <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </LandingLayout>
  );
}
