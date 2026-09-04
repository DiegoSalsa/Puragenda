
import { LocalizedText } from "@/components/i18n/localized-text";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "@/components/icons/hover-icons";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { LandingLayout } from "@/components/landing/landing-layout";
import { getRelatedIndustries, industriesData } from "@/lib/data/industries";
import { caseStudyPath, getPublishedCaseStudiesByIndustry } from "@/lib/data/case-studies";
import { createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import {
  breadcrumbListNode,
  faqPageNode,
  jsonLdGraph,
  organizationRef,
  softwareApplicationNode,
} from "@/lib/json-ld";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const dynamicParams = true; // Changed to true to allow ISR fallback on Vercel
export const revalidate = 3600;

export function generateStaticParams() {
  return industriesData.map((ind) => ({
    industry: ind.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry } = await params;
  const data = industriesData.find((i) => i.slug === industry);
  if (!data) return {};

  return createPageMetadata({
    title: data.title,
    description: data.description,
    path: `/para/${data.slug}`,
    keywords: data.keywords,
  });
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  const data = industriesData.find((i) => i.slug === industry);
  if (!data) notFound();
  const relatedIndustries = getRelatedIndustries(data.slug);
  const industryCases = getPublishedCaseStudiesByIndustry(data.slug);

  const structuredData = jsonLdGraph([
    organizationRef(),
    softwareApplicationNode(data.description),
    faqPageNode(data.faq),
    breadcrumbListNode([
      { name: "Inicio", path: "/" },
      { name: "Soluciones", path: "/soluciones" },
      { name: data.name, path: `/para/${data.slug}` },
    ]),
  ]);

  // Rotate accent colors for benefit cards
  const accentColors = ["bg-[#B28DFF]", "bg-[#FFB5E8]", "bg-[#85E3FF]", "bg-[#BFFCC6]"];

  return (
    <LandingLayout>
      <JsonLd data={structuredData} />

      {/* HERO */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <div className="inline-block bg-[#B28DFF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
          {data.name}
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          {data.heroHeadline}
        </h1>
        <p className="text-xl font-bold opacity-80 max-w-3xl mx-auto mb-10">
          {data.heroSubheadline}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <TrackedLink href="/register" cta="register" placement="hero">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 hover:shadow-[3px_3px_0_#000] dark:hover:shadow-[3px_3px_0_#FFFFFF] transition-all flex items-center gap-3 mx-auto sm:mx-0">
              <LocalizedText id="NqC0Mo3B6h7f" /> <ArrowRight className="h-5 w-5" />
            </button>
          </TrackedLink>
          <a href="/demo">
            <button className="bg-white dark:bg-black text-black dark:text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 hover:shadow-[3px_3px_0_#000] dark:hover:shadow-[3px_3px_0_#FFFFFF] transition-all mx-auto sm:mx-0">
              <LocalizedText id="vP-8OnnRFj1a" />
            </button>
          </a>
        </div>
        <p className="mt-8 text-sm font-bold opacity-50"><LocalizedText id="0-9SNZCT992I" /></p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-20" aria-labelledby="respuesta-rubro">
        <div className="grid gap-8 rounded-3xl border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000] dark:border-white dark:bg-[#111] dark:shadow-[8px_8px_0_#fff] md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-[#6D28D9] dark:text-[#C4B5FD]">Respuesta rápida</p>
            <h2 id="respuesta-rubro" className="mt-3 text-3xl font-black uppercase tracking-tight">¿Cómo ayuda una agenda online a {data.name.toLowerCase()}?</h2>
            <p className="mt-5 text-lg font-bold leading-8 opacity-80">{data.description} El cliente ve solo horarios realmente disponibles y el negocio conserva el control de profesionales, servicios y reglas de reserva.</p>
            {data.softwareHub ? (
              <p className="mt-4 text-lg font-bold leading-8">
                <Link href={data.softwareHub.href} className="underline underline-offset-4">
                  {data.softwareHub.title}
                </Link>
                {": "}
                {data.softwareHub.context}
              </p>
            ) : null}
          </div>
          <div className="border-t-4 border-black pt-6 dark:border-white md:border-l-4 md:border-t-0 md:pl-8 md:pt-0">
            <h3 className="text-xl font-black uppercase">Flujo en 3 pasos</h3>
            <ol className="mt-4 space-y-3 font-bold">
              <li><span className="mr-2 text-[#7C3AED]">1.</span>Configura servicios y disponibilidad.</li>
              <li><span className="mr-2 text-[#7C3AED]">2.</span>Comparte tu enlace de reservas.</li>
              <li><span className="mr-2 text-[#7C3AED]">3.</span>Recibe y gestiona cada cita.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-t-4 border-black dark:border-white bg-[#FFF5BA] dark:bg-black py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#85E3FF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
              <LocalizedText id="J_K6wcKNmdNt" /> {data.name}
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-black dark:text-white">
              <LocalizedText id="UNzN0nO8Ud1f" />
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {data.benefits.map((benefit, i) => (
              <article key={i} className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF] hover:-translate-y-2 transition-transform">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black ${accentColors[i % accentColors.length]} text-black mb-6 shadow-[4px_4px_0_#000]`}>
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-3 text-black dark:text-white">{benefit.title}</h3>
                <p className="font-bold opacity-80 text-black dark:text-white">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="soluciones-relacionadas">
        <div className="max-w-3xl">
          <p className="font-black uppercase text-[#7C3AED]">Evalúa el flujo completo</p>
          <h2 id="soluciones-relacionadas" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Soluciones relacionadas para {data.name.toLowerCase()}
          </h2>
          <p className="mt-5 text-lg font-bold opacity-75">
            Revisa cómo Puragenda coordina al equipo, protege las horas y reduce tareas manuales antes de elegir un plan.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            ...(data.softwareHub
              ? [{
                  href: data.softwareHub.href,
                  title: data.softwareHub.title,
                  description: data.softwareHub.description,
                }]
              : []),
            {
              href: "/funciones/reservas-online-con-abono",
              title: "Reservas con abono",
              description: "Protege servicios y horarios de alta demanda con un anticipo informado.",
            },
            {
              href: "/funciones/agenda-multiples-profesionales",
              title: "Agenda para equipos",
              description: "Coordina disponibilidad, servicios y permisos de cada profesional.",
            },
            data.slug === "manicure" ? {
              href: "/guias/cobrar-abonos-reservas-online",
              title: "Configurar y comunicar un abono",
              description: "Define el monto y explica las condiciones antes de recibir una reserva.",
            } : {
              href: "/guias/reducir-inasistencias-reservas",
              title: "Reducir inasistencias",
              description: "Aplica confirmaciones, políticas claras y seguimiento de clientes.",
            },
            {
              href: "/pricing",
              title: "Planes y precios",
              description: "Compara profesionales incluidos, funciones y prueba gratuita.",
            },
          ].map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`border-4 border-black p-6 text-black shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 dark:border-white ${["bg-[#BFFCC6]", "bg-[#85E3FF]", "bg-[#FFF5BA]", "bg-[#FFB5E8]"][index % 4]}`}
            >
              <h3 className="text-xl font-black uppercase">{item.title}</h3>
              <p className="mt-3 font-bold leading-6 opacity-75">{item.description}</p>
              <span className="mt-5 inline-flex font-black uppercase text-[#5B21B6]">Ver detalle →</span>
            </Link>
          ))}
        </div>
      </section>

      {industryCases.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-6 pb-16" aria-labelledby="caso-rubro">
          <div className="max-w-3xl">
            <p className="font-black uppercase text-[#7C3AED]">Evidencia del rubro</p>
            <h2 id="caso-rubro" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Un caso de {data.name.toLowerCase()}
            </h2>
            <p className="mt-5 text-lg font-bold opacity-75">
              Solo enlazamos casos con testimonio o uso público verificable. No rellenamos esta sección con clientes pendientes.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {industryCases.map((item) => (
              <Link
                key={item.slug}
                href={caseStudyPath(item.slug)}
                className="rounded-3xl border-4 border-black bg-[#FFF5BA] p-8 text-black shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 dark:border-white"
              >
                <p className="text-xs font-black uppercase tracking-wider">{item.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black uppercase">{item.businessName}</h3>
                <p className="mt-3 font-bold leading-7 opacity-75">{item.summary}</p>
                <span className="mt-5 inline-flex font-black uppercase text-[#5B21B6]">Leer el caso →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedIndustries.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-6 pb-8" aria-labelledby="rubros-relacionados">
          <div className="max-w-3xl">
            <p className="font-black uppercase text-[#7C3AED]">Otros rubros</p>
            <h2 id="rubros-relacionados" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Otras agendas relacionadas
            </h2>
            <p className="mt-5 text-lg font-bold opacity-75">
              Si tu negocio se parece más a otro oficio, revisa la página específica antes de elegir un plan.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relatedIndustries.map((item, index) => (
              <Link
                key={item.slug}
                href={`/para/${item.slug}`}
                className={`border-4 border-black p-6 text-black shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 dark:border-white ${["bg-[#FFF5BA]", "bg-[#FFB5E8]", "bg-[#85E3FF]"][index % 3]}`}
              >
                <h3 className="text-xl font-black uppercase">{item.name}</h3>
                <p className="mt-3 font-bold leading-6 opacity-75">{data.slug === "manicure"
                  ? item.slug === "estetica"
                    ? "Contexto de otros servicios del centro: faciales, cejas y pestañas."
                    : "Si también atiendes cabello, revisa la organización de corte, color y estilistas."
                  : item.description}</p>
                <span className="mt-5 inline-flex font-black uppercase text-[#5B21B6]">Ver agenda para {item.name.toLowerCase()} →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="mx-auto w-full max-w-4xl px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-block bg-[#FFB5E8] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
            <LocalizedText id="S5pMm6glV6EC" />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl"><LocalizedText id="qxZSqw0Uc5Il" /></h2>
        </div>
        <Accordion className="w-full space-y-4">
          {data.faq.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-2xl px-6 py-2 shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_#FFFFFF] transition-all hover:-translate-y-1"
            >
              <AccordionTrigger className="text-[15px] font-black uppercase hover:no-underline py-4 text-black dark:text-white">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm font-bold opacity-80 pb-5">
                {faq.answer}
              </AccordionContent>
              <div className="sr-only" aria-hidden="true">{faq.answer}</div>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="border-t-4 border-black dark:border-white py-24 bg-[#BFFCC6] dark:bg-black text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-8 text-black dark:text-white">
            <LocalizedText id="1oAUcpw8pq5F" /> {data.singularName.toLowerCase()} <LocalizedText id="tA-ba9YWWfmH" />
          </h2>
          <Link href="/pricing">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-10 py-5 font-black uppercase text-2xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4 mx-auto">
              <LocalizedText id="i8SlbEiuwp1f" /> <ArrowRight className="h-8 w-8" />
            </button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
