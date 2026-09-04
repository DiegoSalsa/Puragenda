import Link from "next/link";
import type { Metadata } from "next";
import { LandingLayout } from "@/components/landing/landing-layout";
import { JsonLd } from "@/components/json-ld";
import {
  BookingWidgetPreview,
  FaqItem,
  FinalCta,
  LandingHero,
  PricingSection,
  ProductFlow,
  ProductFrame,
  QuoteProof,
  SectionIntro,
  VerticalFaq,
  seo,
} from "@/components/landing/seo";
import {
  breadcrumbListNode,
  faqPageNode,
  jsonLdGraph,
  organizationRef,
  softwareApplicationNode,
} from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo";
import { PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { customerTestimonials } from "@/lib/data/testimonials";
import { CASE_STUDIES_PATH, caseStudyPath, getPublishedCaseStudies, getPublishedCaseStudy } from "@/lib/data/case-studies";
import {
  SCHEDULING_SYSTEM_PATH,
  formatLandingClp,
  schedulingSystemAudiences,
  schedulingSystemBenefits,
  schedulingSystemBusinessSteps,
  schedulingSystemCopy,
  schedulingSystemCustomerSteps,
  schedulingSystemFaqs,
  schedulingSystemFeatures,
  schedulingSystemMetadata,
  schedulingSystemSteps,
} from "@/lib/data/scheduling-system-landing";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

const faqs = schedulingSystemFaqs();
const publishedCases = getPublishedCaseStudies();
const publishedSoccerbarberCase = getPublishedCaseStudy("soccerbarber");
const individualPrice = formatLandingClp(PRICING.INDIVIDUAL.monthly);
const teamPrice = formatLandingClp(PRICING.EQUIPO.monthly);

export const metadata: Metadata = createPageMetadata({
  title: schedulingSystemMetadata.title,
  description: schedulingSystemMetadata.description,
  path: SCHEDULING_SYSTEM_PATH,
  keywords: [...schedulingSystemMetadata.keywords],
});

export default async function SchedulingSystemLandingPage() {
  return (
    <LandingLayout>
      <JsonLd
        data={jsonLdGraph([
          organizationRef(),
          softwareApplicationNode(schedulingSystemCopy.softwareDescription),
          faqPageNode(faqs),
          breadcrumbListNode([
            { name: "Inicio", path: "/" },
            { name: "Sistema de agendamiento online", path: SCHEDULING_SYSTEM_PATH },
          ]),
        ])}
      />

      <LandingHero
        breadcrumbs={[
          { href: "/", label: "Inicio" },
          { label: "Sistema de agendamiento online" },
        ]}
        eyebrow={schedulingSystemCopy.eyebrow}
        tone="cyan"
        h1={schedulingSystemCopy.h1}
        lead={schedulingSystemCopy.heroLead}
        note={schedulingSystemCopy.heroNote}
        primaryCta={{ href: "/register", label: `Probar ${TRIAL_DURATION_DAYS} días gratis`, cta: "register", placement: "hero" }}
        secondaryCta={{ href: "/demo", label: "Ver demo", cta: "demo", placement: "hero" }}
        visual={
          <div className="space-y-4">
            <ProductFlow />
            <ProductFrame label="Reserva del cliente" caption="Ilustración del flujo. No es la agenda de un cliente real.">
              <BookingWidgetPreview />
            </ProductFrame>
          </div>
        }
      />

      <section className={seo.bandWarm} aria-labelledby="que-es-agendamiento">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <p className={seo.kicker}>Respuesta rápida</p>
          <h2 id="que-es-agendamiento" className={cn(seo.h2, "mt-3")}>
            {schedulingSystemCopy.definitionHeading}
          </h2>
          <p className={cn(seo.body, "mt-5 text-lg")}>{schedulingSystemCopy.definition}</p>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="como-funciona-puragenda">
        <SectionIntro id="como-funciona-puragenda" kicker="Flujo real" title="Cómo funciona Puragenda" align="center">
          <p>
            El sistema conecta dos lados: el negocio que publica su capacidad y el cliente que reserva. No hay que coordinar cada hora a mano.
          </p>
        </SectionIntro>
        <ol className="mt-12 grid gap-0 overflow-hidden rounded-[24px] border-2 border-black bg-white shadow-[6px_6px_0_#000] dark:border-white dark:bg-[#0c0c0c] md:grid-cols-2 lg:grid-cols-4">
          {schedulingSystemSteps.map((step, index) => (
            <li key={step.title} className="border-black p-6 dark:border-white md:border-r-2 md:last:border-r-0 max-md:border-b-2 max-md:last:border-b-0">
              <span className="text-3xl font-black text-[#7C3AED]">{index + 1}</span>
              <h3 className={cn(seo.h3, "mt-3")}>{step.title}</h3>
              <p className={cn(seo.body, "mt-3 text-base")}>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={seo.bandQuiet} aria-labelledby="funcionalidades-agendamiento">
        <div className={seo.section}>
          <SectionIntro id="funcionalidades-agendamiento" kicker="Qué incluye" title="Funciones de agendamiento que sí están en el producto">
            <p>
              Esta página cubre el flujo de reservas. El catálogo completo está en{" "}
              <Link href="/caracteristicas" className={seo.link}>
                características
              </Link>
              .
            </p>
          </SectionIntro>
          <div className="mt-12 divide-y-2 divide-black/10 border-y-2 border-black/10 dark:divide-white/15 dark:border-white/15">
            {schedulingSystemFeatures.map((feature) => (
              <article key={feature.title} className="grid gap-3 py-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-8">
                <h3 className={seo.h3}>{feature.title}</h3>
                <div>
                  <p className={cn(seo.body, "text-base")}>{feature.description}</p>
                  <Link href={feature.href} className={cn(seo.link, "mt-3 inline-flex")}>
                    {feature.hrefLabel} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="para-quien-sirve">
        <SectionIntro id="para-quien-sirve" kicker="Para quién es" title="Un software de agendamiento para negocios de servicios">
          <p>Puragenda encaja cuando vendes horas de atención y hoy coordinas por mensajes. Si tu rubro ya tiene una página propia, úsala para ver el flujo específico.</p>
        </SectionIntro>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {schedulingSystemAudiences.map((audience) => (
            <Link
              key={audience.slug}
              href={`/para/${audience.slug}`}
              className={cn(seo.panel, "p-6 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0")}
            >
              <h3 className={seo.h3}>{audience.name}</h3>
              <p className={cn(seo.body, "mt-3 text-base")}>{audience.description}</p>
              <span className="mt-4 inline-flex font-black text-[#5B21B6]">Ver agenda para {audience.name.toLowerCase()} →</span>
            </Link>
          ))}
        </div>
        <p className={cn(seo.body, "mt-8 text-base")}>
          Si evalúas un{" "}
          <Link href="/software-agenda-barberias" className={seo.link}>
            software de agenda para barberías
          </Link>{" "}
          o un{" "}
          <Link href="/software-agenda-peluquerias" className={seo.link}>
            software de agenda para peluquerías
          </Link>
          , esas páginas cubren el flujo de cada local. Para un catálogo de uñas con esmaltado y retiro, consulta el{" "}
          <Link href="/software-agenda-manicure" className={seo.link}>
            software de agenda para manicure
          </Link>
          . Para coordinar faciales, cejas y pestañas por profesional, revisa el{" "}
          <Link href="/software-agenda-estetica" className={seo.link}>
            software de agenda para centros de estética
          </Link>
          . Para organizar citas de una consulta de psicología, revisa el{" "}
          <Link href="/software-agenda-psicologos" className={seo.link}>
            software de agenda para psicólogos
          </Link>
          . También hay páginas para clínicas, kinesiólogos y tatuadores en{" "}
          <Link href="/soluciones" className={seo.link}>
            soluciones
          </Link>
          .
        </p>
      </section>

      <section className={seo.band} aria-labelledby="beneficios-operativos">
        <div className={seo.section}>
          <SectionIntro id="beneficios-operativos" kicker="Resultado operativo" title="Qué cambia en el día a día" align="center">
            <p>Relacionamos cada función con un efecto concreto. No publicamos métricas de usuarios ni de reservas que no estén verificadas.</p>
          </SectionIntro>
          <dl className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {schedulingSystemBenefits.map((item) => (
              <div key={item.feature} className="border-t-2 border-black/15 pt-5 dark:border-white/20">
                <dt className={seo.h3}>{item.feature}</dt>
                <dd className={cn(seo.body, "mt-2 text-base")}>{item.result}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="experiencia-cliente">
        <SectionIntro id="experiencia-cliente" kicker="Dos usuarios distintos" title="El cliente reserva. El negocio administra." align="center">
          <p>Puragenda no es una app para que el cliente “tenga una cuenta”. Es una agenda pública del negocio y un panel privado para quien atiende.</p>
        </SectionIntro>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className={cn(seo.panel, "p-7 sm:p-8")}>
            <p className={seo.kicker}>Cliente que reserva</p>
            <h3 className={cn(seo.h3, "mt-3 text-2xl")}>Cómo toma una hora</h3>
            <ol className="mt-6 space-y-3">
              {schedulingSystemCustomerSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-base font-medium leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className={cn(seo.panel, "bg-[#F3E8FF] p-7 sm:p-8 dark:bg-[#251830]")}>
            <p className={seo.kicker}>Usuario negocio</p>
            <h3 className={cn(seo.h3, "mt-3 text-2xl")}>Cómo opera la agenda</h3>
            <ol className="mt-6 space-y-3">
              {schedulingSystemBusinessSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-base font-medium leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <div className={seo.bandWarm}>
        <PricingSection
          id="precios-agendamiento"
          title="Cuánto cuesta este software de agendamiento"
          intro={
            <p>
              Los valores salen de los planes publicados. Puragenda no cobra comisión por cada reserva. El detalle de funciones por plan está en{" "}
              <Link href="/pricing" className={seo.link}>
                precios
              </Link>
              .
            </p>
          }
          individual={{
            name: `Plan ${PRICING.INDIVIDUAL.name}`,
            price: individualPrice,
            detail: "Para un profesional. Incluye reservas ilimitadas y el widget de reservas.",
          }}
          team={{
            name: `Plan ${PRICING.EQUIPO.name}`,
            price: teamPrice,
            detail: `Incluye ${STAFF_LIMITS.EQUIPO} profesionales, roles de acceso y la misma reserva online para todo el equipo.`,
          }}
          footer={
            <p>
              Prueba de {TRIAL_DURATION_DAYS} días sin tarjeta.{" "}
              <Link href="/pricing" className={seo.link}>
                Comparar planes
              </Link>
            </p>
          }
        />
      </div>

      <section className={seo.section} aria-labelledby="clientes-reales">
        <SectionIntro id="clientes-reales" kicker="Clientes reales" title="Lo que dicen negocios que ya usan Puragenda" align="center">
          <p>Solo mostramos testimonios de clientes verificables. No inventamos puntuaciones, cantidad de usuarios ni logos.</p>
        </SectionIntro>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {customerTestimonials.map((item) => (
            <QuoteProof key={item.author} quote={item.quote} author={item.author} business={item.business} initial={item.initial} />
          ))}
        </div>
        {publishedCases.length > 0 ? (
          <p className={cn(seo.body, "mx-auto mt-8 max-w-3xl text-center text-base")}>
            {publishedSoccerbarberCase ? (
              <>
                El{" "}
                <Link href={caseStudyPath(publishedSoccerbarberCase.slug)} className={seo.link}>
                  caso de {publishedSoccerbarberCase.businessName}
                </Link>{" "}
                describe cómo una barbería usa Puragenda, con el testimonio de Nicolás.{" "}
              </>
            ) : null}
            El resto de casos publicados está en{" "}
            <Link href={CASE_STUDIES_PATH} className={seo.link}>
              casos de éxito
            </Link>
            .
          </p>
        ) : null}
      </section>

      <VerticalFaq id="faq-agendamiento" title="Dudas habituales sobre el agendamiento">
        {faqs.map((item) => (
          <FaqItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </VerticalFaq>

      <FinalCta
        id="probar-sistema"
        title="Prueba el sistema de agendamiento con tu propio catálogo"
        primary={{ href: "/register", label: "Crear cuenta gratis", cta: "register", placement: "final_cta" }}
        secondary={{ href: "/pricing", label: "Ver planes", cta: "pricing", placement: "final_cta" }}
      >
        <p>Crea la cuenta, carga un servicio y reserva como si fueras tu cliente. Si quieres orientación, también puedes escribirnos.</p>
      </FinalCta>
    </LandingLayout>
  );
}
