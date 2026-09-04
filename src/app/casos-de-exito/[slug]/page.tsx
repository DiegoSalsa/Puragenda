import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { JsonLd } from "@/components/json-ld";
import { articleNode, breadcrumbListNode, jsonLdGraph, organizationRef } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import {
  CASE_STUDIES_PATH,
  caseStudyPath,
  formatCaseStudyDate,
  getCaseStudyTestimonial,
  getPublishedCaseStudies,
  getPublishedCaseStudy,
} from "@/lib/data/case-studies";
import { TRIAL_DURATION_DAYS } from "@/core/constants";

type CaseStudyPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return getPublishedCaseStudies().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getPublishedCaseStudy(slug);
  if (!item) return {};

  return createPageMetadata({
    title: item.title,
    description: item.description,
    path: caseStudyPath(item.slug),
    type: "article",
    publishedTime: item.publishedAt,
    modifiedTime: item.updatedAt,
    keywords: [`${item.businessName} Puragenda`, `caso ${item.industryLabel.toLowerCase()} Puragenda`],
  });
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const item = getPublishedCaseStudy(slug);
  if (!item) notFound();

  const testimonial = getCaseStudyTestimonial(item);
  if (!testimonial) notFound();

  const url = absoluteUrl(caseStudyPath(item.slug));

  return (
    <LandingLayout>
      <JsonLd
        data={jsonLdGraph([
          organizationRef(),
          articleNode({
            headline: item.title,
            description: item.description,
            url,
            datePublished: item.publishedAt,
            dateModified: item.updatedAt,
          }),
          breadcrumbListNode([
            { name: "Inicio", path: "/" },
            { name: "Casos de éxito", path: CASE_STUDIES_PATH },
            { name: item.businessName, path: caseStudyPath(item.slug) },
          ]),
        ])}
      />

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <Link href={CASE_STUDIES_PATH} className="inline-flex items-center gap-2 text-sm font-black uppercase hover:text-[#7C3AED]">
          <ArrowLeft className="h-4 w-4" />
          Casos de éxito
        </Link>

        <article className="mt-10">
          <header className="border-b-4 border-black pb-12 dark:border-white">
            <p className="inline-block border-2 border-black bg-[#FFF5BA] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
              {item.eyebrow}
            </p>
            <h1 className="mt-7 max-w-4xl text-4xl font-black uppercase tracking-tighter sm:text-6xl">
              {item.h1}
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-bold leading-relaxed opacity-75">{item.summary}</p>
            <p className="mt-6 text-sm font-black uppercase opacity-65">
              Publicado <time dateTime={item.publishedAt}>{formatCaseStudyDate(item.publishedAt)}</time>
              {item.updatedAt !== item.publishedAt ? (
                <>
                  {" · "}Actualizado <time dateTime={item.updatedAt}>{formatCaseStudyDate(item.updatedAt)}</time>
                </>
              ) : null}
            </p>
          </header>

          <dl className="mt-10 grid gap-4 rounded-3xl border-4 border-black bg-[#85E3FF] p-6 text-black shadow-[6px_6px_0_#000] dark:border-white sm:grid-cols-2">
            {item.verifiedFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs font-black uppercase tracking-wider opacity-70">{fact.label}</dt>
                <dd className="mt-1 text-lg font-black">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mx-auto mt-14 max-w-3xl space-y-14">
            <section>
              <h2 className="text-3xl font-black uppercase tracking-tight">Contexto</h2>
              <div className="mt-5 space-y-5">
                {item.context.map((paragraph) => (
                  <p key={paragraph} className="text-lg font-medium leading-8 opacity-85">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-3xl font-black uppercase tracking-tight">Cómo utiliza Puragenda</h2>
              <ul className="mt-6 space-y-3 rounded-2xl border-4 border-black bg-[#BFFCC6] p-6 text-black shadow-[6px_6px_0_#000] dark:border-white">
                {item.usage.map((fact) => (
                  <li key={fact} className="flex gap-3 font-bold leading-relaxed">
                    <span aria-hidden="true">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-black uppercase tracking-tight">Testimonio</h2>
              <figure className="mt-6 rounded-3xl border-4 border-black bg-[#FFF5BA] p-8 text-black shadow-[8px_8px_0_#000] dark:border-white">
                <blockquote lang="es" className="text-xl font-bold leading-8">
                  {testimonial.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t-2 border-black/20 pt-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-white text-lg font-black shadow-[2px_2px_0_#000]">
                    {testimonial.initial}
                  </div>
                  <div>
                    <p className="text-sm font-black">{testimonial.author}</p>
                    <p className="text-xs font-bold opacity-60">{testimonial.business}</p>
                  </div>
                </figcaption>
              </figure>
            </section>

            <section>
              <h2 className="text-3xl font-black uppercase tracking-tight">Resultados verificables</h2>
              <p className="mt-5 text-lg font-medium leading-8 opacity-85">
                No hay métricas cuantitativas autorizadas para este local. Lo que sí se puede citar es cualitativo:
              </p>
              <ul className="mt-6 space-y-3">
                {item.qualitativeResults.map((result) => (
                  <li key={result} className="rounded-2xl border-4 border-black bg-white p-5 font-bold leading-7 shadow-[4px_4px_0_#000] dark:border-white dark:bg-black">
                    {result}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="mx-auto mt-16 max-w-3xl border-t-4 border-black pt-12 dark:border-white">
            <h2 className="text-2xl font-black uppercase">Si evalúas Puragenda para tu local</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {item.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border-4 border-black bg-[#FFB5E8] p-5 text-black shadow-[5px_5px_0_#000] dark:border-white"
                >
                  <p className="font-black uppercase">{link.label}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-black uppercase">
                    Ver <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </article>

        <section className="mt-16 border-t-4 border-black py-16 text-center dark:border-white">
          <h2 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">
            Prueba el sistema con tu propia agenda
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-bold leading-7 opacity-75">
            {TRIAL_DURATION_DAYS} días de prueba sin tarjeta. El testimonio de {item.businessName} no es una promesa de resultado para otro negocio.
          </p>
          <TrackedLink
            href="/register"
            cta="register"
            placement="final_cta"
            className="mt-8 inline-flex items-center gap-2 border-4 border-black bg-[#7C3AED] px-8 py-4 text-lg font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white"
          >
            Crear cuenta gratis <ArrowRight className="h-5 w-5" />
          </TrackedLink>
        </section>
      </main>
    </LandingLayout>
  );
}
