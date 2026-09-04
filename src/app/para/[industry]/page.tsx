import { LocalizedText } from "@/components/i18n/localized-text";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@/components/icons/hover-icons";
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
import { seo } from "@/components/landing/seo";
import { cn } from "@/lib/utils";

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

  return (
    <LandingLayout>
      <JsonLd data={structuredData} />

      <section className="mx-auto w-full max-w-3xl px-6 pb-10 pt-8 text-center sm:pb-12">
        <p className={cn(seo.eyebrow, "bg-[#E9D5FF]")}>{data.name}</p>
        <h1 className={cn(seo.h1, "mx-auto mt-5")}>{data.heroHeadline}</h1>
        <p className={cn(seo.lead, "mx-auto mt-5")}>{data.heroSubheadline}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <TrackedLink href="/register" cta="register" placement="hero" className={seo.primaryCta}>
            <LocalizedText id="NqC0Mo3B6h7f" /> <ArrowRight className="h-4 w-4" />
          </TrackedLink>
          <a href="/demo" className={seo.secondaryCta}>
            <LocalizedText id="vP-8OnnRFj1a" />
          </a>
        </div>
        <p className={cn(seo.note, "mx-auto mt-5")}><LocalizedText id="0-9SNZCT992I" /></p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16" aria-labelledby="respuesta-rubro">
        <div className="grid gap-8 rounded-[24px] border-2 border-black bg-white p-7 shadow-[6px_6px_0_#000] dark:border-white dark:bg-[#0c0c0c] md:grid-cols-[1.4fr_1fr] md:p-9">
          <div>
            <p className={seo.kicker}>Respuesta rápida</p>
            <h2 id="respuesta-rubro" className={cn(seo.h2, "mt-3")}>¿Cómo ayuda una agenda online a {data.name.toLowerCase()}?</h2>
            <p className={cn(seo.body, "mt-5")}>{data.description} El cliente ve solo horarios realmente disponibles y el negocio conserva el control de profesionales, servicios y reglas de reserva.</p>
            {data.softwareHub ? (
              <p className={cn(seo.body, "mt-4")}>
                <Link href={data.softwareHub.href} className={seo.link}>
                  {data.softwareHub.title}
                </Link>
                {": "}
                {data.softwareHub.context}
              </p>
            ) : null}
          </div>
          <div className="border-t-2 border-black pt-6 dark:border-white md:border-l-2 md:border-t-0 md:pl-8 md:pt-0">
            <h3 className={seo.h3}>Flujo en 3 pasos</h3>
            <ol className="mt-4 space-y-3 text-base font-medium leading-7">
              <li><span className="mr-2 font-black text-[#7C3AED]">1.</span>Configura servicios y disponibilidad.</li>
              <li><span className="mr-2 font-black text-[#7C3AED]">2.</span>Comparte tu enlace de reservas.</li>
              <li><span className="mr-2 font-black text-[#7C3AED]">3.</span>Recibe y gestiona cada cita.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className={seo.bandWarm}>
        <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className={cn(seo.eyebrow, "bg-[#85E3FF]")}>
              <LocalizedText id="J_K6wcKNmdNt" /> {data.name}
            </p>
            <h2 className={cn(seo.h2, "mx-auto mt-5 text-black dark:text-white")}>
              <LocalizedText id="UNzN0nO8Ud1f" />
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {data.benefits.map((benefit, i) => (
              <article key={i} className="border-t-2 border-black/20 pt-5">
                <h3 className={seo.h3}>{benefit.title}</h3>
                <p className={cn(seo.body, "mt-3 text-base")}>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20" aria-labelledby="soluciones-relacionadas">
        <div className="max-w-3xl">
          <p className={seo.kicker}>Evalúa el flujo completo</p>
          <h2 id="soluciones-relacionadas" className={cn(seo.h2, "mt-3")}>
            Soluciones relacionadas para {data.name.toLowerCase()}
          </h2>
          <p className={cn(seo.body, "mt-5")}>
            {data.slug === "psicologos"
              ? "Revisa cómo se configuran los tipos de cita, las jornadas y los bloqueos antes de evaluar el software completo."
              : "Revisa cómo Puragenda coordina al equipo, protege las horas y reduce tareas manuales antes de elegir un plan."}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              description: data.slug === "psicologos"
                ? "Configura un monto visible durante la reserva cuando corresponda."
                : "Protege servicios y horarios de alta demanda con un anticipo informado.",
            },
            {
              href: "/funciones/agenda-multiples-profesionales",
              title: "Agenda para equipos",
              description: "Coordina disponibilidad, servicios y permisos de cada profesional.",
            },
            data.slug === "manicure"
              ? {
                  href: "/guias/cobrar-abonos-reservas-online",
                  title: "Configurar y comunicar un abono",
                  description: "Define el monto y explica las condiciones antes de recibir una reserva.",
                }
              : data.slug === "psicologos"
                ? {
                    href: "/funciones/agenda-google-calendar",
                    title: "Google Calendar",
                    description: "Conecta la agenda y revisa el alcance exacto de los eventos y la disponibilidad.",
                  }
                : {
                    href: "/guias/reducir-inasistencias-reservas",
                    title: "Reducir inasistencias",
                    description: "Aplica confirmaciones, políticas claras y seguimiento de clientes.",
                  },
            {
              href: "/pricing",
              title: "Planes y precios",
              description: "Compara profesionales incluidos, funciones y prueba gratuita.",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(seo.panel, "p-5 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0")}
            >
              <h3 className="text-lg font-black tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-black/70 dark:text-white/70">{item.description}</p>
              <span className="mt-4 inline-flex text-sm font-black text-[#5B21B6]">Ver detalle →</span>
            </Link>
          ))}
        </div>
      </section>

      {industryCases.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-6 pb-16" aria-labelledby="caso-rubro">
          <div className="max-w-3xl">
            <p className={seo.kicker}>Evidencia del rubro</p>
            <h2 id="caso-rubro" className={cn(seo.h2, "mt-3")}>
              Un caso de {data.name.toLowerCase()}
            </h2>
            <p className={cn(seo.body, "mt-5")}>
              Solo enlazamos casos con testimonio o uso público verificable. No rellenamos esta sección con clientes pendientes.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {industryCases.map((item) => (
              <Link
                key={item.slug}
                href={caseStudyPath(item.slug)}
                className={cn(seo.panel, "bg-[#FFF6C8] p-7 text-black transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0")}
              >
                <p className="text-xs font-black uppercase tracking-wider">{item.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black">{item.businessName}</h3>
                <p className="mt-3 font-medium leading-7 opacity-75">{item.summary}</p>
                <span className="mt-5 inline-flex font-black text-[#5B21B6]">Leer el caso →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedIndustries.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-6 pb-8" aria-labelledby="rubros-relacionados">
          <div className="max-w-3xl">
            <p className={seo.kicker}>Otros rubros</p>
            <h2 id="rubros-relacionados" className={cn(seo.h2, "mt-3")}>
              Otras agendas relacionadas
            </h2>
            <p className={cn(seo.body, "mt-5")}>
              Si tu negocio se parece más a otro oficio, revisa la página específica antes de elegir un plan.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {relatedIndustries.map((item) => (
              <Link
                key={item.slug}
                href={`/para/${item.slug}`}
                className={cn(seo.panel, "p-5 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0")}
              >
                <h3 className="text-lg font-black tracking-tight">{item.name}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-black/70 dark:text-white/70">{data.slug === "manicure"
                  ? item.slug === "estetica"
                    ? "Contexto de otros servicios del centro: faciales, cejas y pestañas."
                    : "Si también atiendes cabello, revisa la organización de corte, color y estilistas."
                  : item.description}</p>
                <span className="mt-4 inline-flex text-sm font-black text-[#5B21B6]">Ver agenda para {item.name.toLowerCase()} →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-4xl px-6 py-14 sm:py-20">
        <div className="mb-8 text-center">
          <p className={cn(seo.eyebrow, "bg-[#FFB5E8]")}>
            <LocalizedText id="S5pMm6glV6EC" />
          </p>
          <h2 className={cn(seo.h2, "mx-auto mt-5")}><LocalizedText id="qxZSqw0Uc5Il" /></h2>
        </div>
        <Accordion className="w-full">
          {data.faq.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-b-2 border-black/10 px-0 dark:border-white/15"
            >
              <AccordionTrigger className="py-4 text-left text-[15px] font-black hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm font-medium leading-7 opacity-80 pb-5">
                {faq.answer}
              </AccordionContent>
              <div className="sr-only" aria-hidden="true">{faq.answer}</div>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="border-t-2 border-black bg-[#FFF6C8] py-16 text-center dark:border-white dark:bg-black">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className={cn(seo.h2, "mx-auto mb-8 text-black dark:text-white")}>
            <LocalizedText id="1oAUcpw8pq5F" /> {data.singularName.toLowerCase()} <LocalizedText id="tA-ba9YWWfmH" />
          </h2>
          <Link href="/pricing" className={seo.primaryCta}>
            <LocalizedText id="i8SlbEiuwp1f" /> <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
