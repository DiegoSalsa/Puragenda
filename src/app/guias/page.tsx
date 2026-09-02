
import { LocalizedText } from "@/components/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3 } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { guides } from "@/lib/data/guides";
import { absoluteUrl } from "@/lib/site";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Guías de reservas, abonos y agenda online",
  description: "Contenido práctico para elegir un sistema de reservas en Chile, cobrar abonos, reducir inasistencias y organizar encargos y equipos.",
  path: "/guias",
});

export const revalidate = 3600;

export default async function GuidesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guías de reservas y gestión de agenda",
    url: absoluteUrl("/guias"),
    hasPart: guides.map((guide) => ({
      "@type": "Article",
      headline: guide.title,
      url: absoluteUrl(`/guias/${guide.slug}`),
      dateModified: guide.updatedAt,
    })),
  };

  return (
    <LandingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <header className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 border-2 border-black bg-[#85E3FF] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
            <BookOpen className="h-4 w-4" />
            <LocalizedText id="LUeR3_CU1l8s" />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl">
            <LocalizedText id="U5gbA7C93cOu" />
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-bold opacity-75">
            <LocalizedText id="iZw_89OGupgq" />
          </p>
        </header>

        <section className="mt-16 grid gap-8 md:grid-cols-2" aria-label="Guías disponibles">
          {guides.map((guide, index) => (
            <article
              key={guide.slug}
              className={`flex flex-col rounded-3xl border-4 border-black p-8 text-black shadow-[8px_8px_0_#000] dark:border-white ${
                ["bg-[#FFF5BA]", "bg-[#BFFCC6]", "bg-[#FFB5E8]", "bg-[#85E3FF]"][index % 4]
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.16em]">{guide.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">{guide.title}</h2>
              <p className="mt-4 flex-1 font-bold leading-relaxed opacity-75">{guide.description}</p>
              <div className="mt-8 flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-xs font-black uppercase">
                  <Clock3 className="h-4 w-4" />
                  {guide.readingMinutes} <LocalizedText id="H2-m9p0YXmCG" />
                </span>
                <Link
                  href={`/guias/${guide.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-black uppercase shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5"
                >
                  <LocalizedText id="JpF7xFX9W7cW" /> <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-20 max-w-4xl border-t-4 border-black pt-12 text-center dark:border-white">
          <h2 className="text-3xl font-black uppercase"><LocalizedText id="1gktyGn4SBwd" /></h2>
          <p className="mx-auto mt-4 max-w-2xl font-bold opacity-75">
            <LocalizedText id="U1NR2bZMBG5E" />
          </p>
          <Link
            href="/contacto"
            className="mt-8 inline-flex items-center gap-2 border-4 border-black bg-[#7C3AED] px-7 py-4 font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white"
          >
            <LocalizedText id="vMuWeVfzosRe" /> <ArrowRight className="h-5 w-5" />
          </Link>
        </section>
      </main>
    </LandingLayout>
  );
}
