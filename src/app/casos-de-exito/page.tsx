import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbListNode, collectionPageNode, jsonLdGraph, organizationRef } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { NOT_FOUND_ROBOTS } from "@/lib/crawler-policy";
import {
  CASE_STUDIES_PATH,
  caseStudyPath,
  getPublishedCaseStudies,
} from "@/lib/data/case-studies";
import { TRIAL_DURATION_DAYS } from "@/core/constants";

export const revalidate = 3600;

const publishedCases = getPublishedCaseStudies();
const hubIsIndexable = publishedCases.length > 0;

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Casos de éxito de Puragenda",
    description:
      "Casos verificables de negocios que usan Puragenda. Publicamos solo evidencia autorizada, sin métricas inventadas.",
    path: CASE_STUDIES_PATH,
    keywords: ["casos de éxito Puragenda", "clientes Puragenda", "barbería Puragenda"],
  }),
  ...(hubIsIndexable ? {} : { robots: NOT_FOUND_ROBOTS }),
};

export default async function CaseStudiesHubPage() {
  return (
    <LandingLayout>
      {hubIsIndexable ? (
        <JsonLd
          data={jsonLdGraph([
            organizationRef(),
            collectionPageNode({
              name: "Casos de éxito de Puragenda",
              url: absoluteUrl(CASE_STUDIES_PATH),
              parts: publishedCases.map((item) => ({
                headline: item.title,
                url: absoluteUrl(caseStudyPath(item.slug)),
                dateModified: item.updatedAt,
              })),
            }),
            breadcrumbListNode([
              { name: "Inicio", path: "/" },
              { name: "Casos de éxito", path: CASE_STUDIES_PATH },
            ]),
          ])}
        />
      ) : null}

      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <nav aria-label="Miga de pan" className="mb-8 text-sm font-bold">
          <ol className="flex flex-wrap items-center gap-2 opacity-70">
            <li>
              <Link href="/" className="underline underline-offset-4 hover:text-[#7C3AED]">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Casos de éxito</li>
          </ol>
        </nav>

        <header className="max-w-3xl">
          <p className="inline-block border-2 border-black bg-[#FFF5BA] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
            Evidencia de clientes
          </p>
          <h1 className="mt-6 text-4xl font-black uppercase tracking-tighter sm:text-6xl">
            Casos de éxito de Puragenda
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-bold leading-8 opacity-80">
            Publicamos solo negocios reales con evidencia verificable. Si no hay un dato medido y autorizado, no aparece aquí como resultado.
          </p>
        </header>

        <section className="mt-16" aria-label="Casos publicados">
          {publishedCases.length === 0 ? (
            <p className="max-w-2xl font-bold leading-7 opacity-75">
              Todavía no hay casos con evidencia suficiente para publicarse.
            </p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {publishedCases.map((item, index) => (
                <article
                  key={item.slug}
                  className={`flex flex-col rounded-3xl border-4 border-black p-8 text-black shadow-[8px_8px_0_#000] dark:border-white ${
                    ["bg-[#FFF5BA]", "bg-[#BFFCC6]", "bg-[#FFB5E8]", "bg-[#85E3FF]"][index % 4]
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-[0.16em]">{item.eyebrow}</p>
                  <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">{item.businessName}</h2>
                  <p className="mt-2 text-sm font-black uppercase opacity-70">{item.industryLabel}</p>
                  <p className="mt-4 flex-1 font-bold leading-relaxed opacity-75">{item.summary}</p>
                  <Link
                    href={caseStudyPath(item.slug)}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-black uppercase shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5"
                  >
                    Leer el caso <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto mt-20 max-w-4xl border-t-4 border-black pt-12 text-center dark:border-white">
          <h2 className="text-3xl font-black uppercase">Prueba Puragenda en tu local</h2>
          <p className="mx-auto mt-4 max-w-2xl font-bold opacity-75">
            {TRIAL_DURATION_DAYS} días de prueba sin tarjeta. El caso de un cliente no promete el mismo resultado para otro negocio.
          </p>
          <TrackedLink
            href="/register"
            cta="register"
            placement="final_cta"
            className="mt-8 inline-flex items-center gap-2 border-4 border-black bg-[#7C3AED] px-7 py-4 font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white"
          >
            Crear cuenta gratis <ArrowRight className="h-5 w-5" />
          </TrackedLink>
        </section>
      </main>
    </LandingLayout>
  );
}
