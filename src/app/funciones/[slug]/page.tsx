import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { featureSolutions, getFeatureSolution } from "@/lib/data/feature-solutions";
import { absoluteUrl } from "@/lib/site";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";
import { TrackedLink } from "@/components/analytics/tracked-link";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return featureSolutions.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const solution = getFeatureSolution((await params).slug);
  if (!solution) return {};
  return createPageMetadata({
    title: solution.title,
    description: solution.description,
    path: `/funciones/${solution.slug}`,
    keywords: solution.keywords,
  });
}

export default async function FeatureSolutionPage({ params }: Props) {
  const solution = getFeatureSolution((await params).slug);
  if (!solution) notFound();
  const url = absoluteUrl(`/funciones/${solution.slug}`);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Puragenda",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url,
      description: solution.description,
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "12990",
        highPrice: "29990",
        priceCurrency: "CLP",
        offerCount: 2,
        url: absoluteUrl("/pricing"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: solution.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Características", item: absoluteUrl("/caracteristicas") },
        { "@type": "ListItem", position: 3, name: solution.title, item: url },
      ],
    },
  ];

  return (
    <LandingLayout>
      {structuredData.map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }} />
      ))}

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="inline-block border-2 border-black bg-[#85E3FF] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">{solution.eyebrow}</p>
        <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-black uppercase tracking-tighter sm:text-7xl">{solution.headline}</h1>
        <p className="mx-auto mt-6 max-w-3xl text-xl font-bold leading-relaxed opacity-80">{solution.description}</p>
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
          <TrackedLink href="/register?trial=1" cta="register" placement={`feature_${solution.slug}`} className="border-4 border-black bg-[#7C3AED] px-8 py-4 text-lg font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white">Probar 30 días gratis <ArrowRight className="ml-2 inline h-5 w-5" /></TrackedLink>
          <TrackedLink href="/pricing" cta="pricing" placement={`feature_${solution.slug}`} className="border-4 border-black bg-white px-8 py-4 text-lg font-black uppercase text-black shadow-[6px_6px_0_#000] dark:border-white">Ver planes</TrackedLink>
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#FFF5BA] py-16 text-black dark:border-white">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-black uppercase">Respuesta rápida</h2>
          <p className="mt-5 text-xl font-bold leading-9">{solution.directAnswer}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-4xl font-black uppercase tracking-tight">Qué resuelve</h2>
        <div className="mt-12 grid gap-7 md:grid-cols-3">
          {solution.benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-3xl border-4 border-black bg-white p-7 text-black shadow-[7px_7px_0_#000] dark:border-white dark:bg-black dark:text-white">
              <CheckCircle2 className="h-9 w-9 text-[#7C3AED]" />
              <h3 className="mt-5 text-2xl font-black uppercase">{benefit.title}</h3>
              <p className="mt-3 font-bold leading-7 opacity-75">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#BFFCC6] py-20 text-black dark:border-white">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-4xl font-black uppercase">Cómo funciona</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {solution.steps.map((step, index) => (
              <li key={step.title} className="border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000]">
                <span className="text-4xl font-black text-[#7C3AED]">{index + 1}</span>
                <h3 className="mt-3 text-xl font-black uppercase">{step.title}</h3>
                <p className="mt-3 font-bold leading-7 opacity-75">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center text-4xl font-black uppercase">Preguntas frecuentes</h2>
        <div className="mt-10 space-y-5">
          {solution.faq.map((item) => (
            <article key={item.question} className="rounded-2xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000] dark:border-white dark:bg-black">
              <h3 className="text-xl font-black">{item.question}</h3>
              <p className="mt-3 font-medium leading-7 opacity-80">{item.answer}</p>
            </article>
          ))}
        </div>
        <p className="mt-12 text-center font-bold">¿Quieres validar este flujo con tu negocio? <Link href="/contacto" className="text-[#7C3AED] underline">Cuéntanos cómo trabajas</Link>.</p>
      </section>
    </LandingLayout>
  );
}
