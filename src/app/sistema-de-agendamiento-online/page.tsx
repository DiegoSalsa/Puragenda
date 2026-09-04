import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  LayoutTemplate,
  Users,
} from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { TrackedCtaAnchor, TrackedLink } from "@/components/analytics/tracked-link";
import { JsonLd } from "@/components/json-ld";
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

const featureIcons = [CalendarClock, CheckCircle2, Users, CreditCard, Bell, LayoutTemplate];

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

      <section className="mx-auto w-full max-w-6xl px-6 pt-8 pb-16">
        <nav aria-label="Miga de pan" className="mb-8 text-sm font-bold">
          <ol className="flex flex-wrap items-center gap-2 opacity-70">
            <li>
              <Link href="/" className="underline underline-offset-4 hover:text-[#7C3AED]">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Sistema de agendamiento online</li>
          </ol>
        </nav>

        <div className="text-center">
          <p className="inline-block border-2 border-black bg-[#85E3FF] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
            {schedulingSystemCopy.eyebrow}
          </p>
          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-black uppercase tracking-tighter sm:text-6xl lg:text-7xl">
            {schedulingSystemCopy.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl font-bold leading-relaxed opacity-80">
            {schedulingSystemCopy.heroLead}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <TrackedLink
              href="/register"
              cta="register"
              placement="hero"
              className="border-4 border-black bg-[#7C3AED] px-8 py-4 text-lg font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white"
            >
              Probar {TRIAL_DURATION_DAYS} días gratis <ArrowRight className="ml-2 inline h-5 w-5" />
            </TrackedLink>
            <TrackedCtaAnchor
              href="/demo"
              cta="demo"
              placement="hero"
              className="border-4 border-black bg-white px-8 py-4 text-lg font-black uppercase text-black shadow-[6px_6px_0_#000] dark:border-white dark:bg-black dark:text-white"
            >
              Ver demo
            </TrackedCtaAnchor>
          </div>
          <p className="mt-6 text-sm font-bold opacity-60">{schedulingSystemCopy.heroNote}</p>
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#FFF5BA] py-16 text-black dark:border-white" aria-labelledby="que-es-agendamiento">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm font-black uppercase tracking-wider text-[#6D28D9]">Respuesta rápida</p>
          <h2 id="que-es-agendamiento" className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {schedulingSystemCopy.definitionHeading}
          </h2>
          <p className="mt-5 text-xl font-bold leading-9">{schedulingSystemCopy.definition}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="como-funciona-puragenda">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-black uppercase text-[#7C3AED]">Flujo real</p>
          <h2 id="como-funciona-puragenda" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Cómo funciona Puragenda
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 opacity-75">
            El sistema conecta dos lados: el negocio que publica su capacidad y el cliente que reserva. No hay que coordinar cada hora a mano.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {schedulingSystemSteps.map((step, index) => (
            <li key={step.title} className="rounded-3xl border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] dark:border-white dark:bg-black">
              <span className="text-4xl font-black text-[#7C3AED]">{index + 1}</span>
              <h3 className="mt-3 text-xl font-black uppercase">{step.title}</h3>
              <p className="mt-3 font-bold leading-7 opacity-75">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y-4 border-black bg-white py-20 dark:border-white dark:bg-[#111]" aria-labelledby="funcionalidades-agendamiento">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-black uppercase text-[#7C3AED]">Qué incluye</p>
            <h2 id="funcionalidades-agendamiento" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Funciones de agendamiento que sí están en el producto
            </h2>
            <p className="mt-5 text-lg font-bold leading-8 opacity-75">
              Esta página cubre el flujo de reservas. El catálogo completo está en{" "}
              <Link href="/caracteristicas" className="underline underline-offset-4">
                características
              </Link>
              .
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {schedulingSystemFeatures.map((feature, index) => {
              const Icon = featureIcons[index] ?? CheckCircle2;
              return (
                <article
                  key={feature.title}
                  className="flex flex-col rounded-3xl border-4 border-black bg-[#FFFAEB] p-7 shadow-[6px_6px_0_#000] dark:border-white dark:bg-black"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-black bg-[#B28DFF] text-black shadow-[3px_3px_0_#000]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">{feature.title}</h3>
                  <p className="mt-3 flex-1 font-bold leading-7 opacity-75">{feature.description}</p>
                  <Link href={feature.href} className="mt-5 inline-flex font-black uppercase text-[#5B21B6] underline underline-offset-4">
                    {feature.hrefLabel} <span aria-hidden="true">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="para-quien-sirve">
        <div className="max-w-3xl">
          <p className="font-black uppercase text-[#7C3AED]">Para quién es</p>
          <h2 id="para-quien-sirve" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Un software de agendamiento para negocios de servicios
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 opacity-75">
            Puragenda encaja cuando vendes horas de atención y hoy coordinas por mensajes. Si tu rubro ya tiene una página propia, úsala para ver el flujo específico.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {schedulingSystemAudiences.map((audience, index) => (
            <Link
              key={audience.slug}
              href={`/para/${audience.slug}`}
              className={`rounded-3xl border-4 border-black p-6 text-black shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 dark:border-white ${["bg-[#FFF5BA]", "bg-[#FFB5E8]", "bg-[#85E3FF]", "bg-[#BFFCC6]"][index]}`}
            >
              <h3 className="text-xl font-black uppercase">{audience.name}</h3>
              <p className="mt-3 font-bold leading-6 opacity-75">{audience.description}</p>
              <span className="mt-5 inline-flex font-black uppercase text-[#5B21B6]">Ver agenda para {audience.name.toLowerCase()} →</span>
            </Link>
          ))}
        </div>
        <p className="mt-8 font-bold">
          Si evalúas un{" "}
          <Link href="/software-agenda-barberias" className="font-black text-[#7C3AED] underline underline-offset-4">
            software de agenda para barberías
          </Link>{" "}
          o un{" "}
          <Link href="/software-agenda-peluquerias" className="font-black text-[#7C3AED] underline underline-offset-4">
            software de agenda para peluquerías
          </Link>
          , esas páginas cubren el flujo de cada local. Para un catálogo de uñas con esmaltado y retiro, consulta el{" "}
          <Link href="/software-agenda-manicure" className="font-black text-[#7C3AED] underline underline-offset-4">
            software de agenda para manicure
          </Link>
          . También hay páginas para clínicas, kinesiólogos y tatuadores en{" "}
          <Link href="/soluciones" className="font-black text-[#7C3AED] underline underline-offset-4">
            soluciones
          </Link>
          .
        </p>
      </section>

      <section className="border-y-4 border-black bg-[#BFFCC6] py-20 text-black dark:border-white" aria-labelledby="beneficios-operativos">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-black uppercase text-[#6D28D9]">Resultado operativo</p>
            <h2 id="beneficios-operativos" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Qué cambia en el día a día
            </h2>
            <p className="mt-5 text-lg font-bold leading-8 opacity-75">
              Relacionamos cada función con un efecto concreto. No publicamos métricas de usuarios ni de reservas que no estén verificadas.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {schedulingSystemBenefits.map((item) => (
              <article key={item.feature} className="rounded-3xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000]">
                <h3 className="text-xl font-black uppercase">{item.feature}</h3>
                <p className="mt-3 font-bold leading-7 opacity-80">{item.result}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="experiencia-cliente">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-black uppercase text-[#7C3AED]">Dos usuarios distintos</p>
          <h2 id="experiencia-cliente" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            El cliente reserva. El negocio administra.
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 opacity-75">
            Puragenda no es una app para que el cliente “tenga una cuenta”. Es una agenda pública del negocio y un panel privado para quien atiende.
          </p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <article className="rounded-3xl border-4 border-black bg-[#85E3FF] p-8 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <p className="text-sm font-black uppercase">Cliente que reserva</p>
            <h3 className="mt-3 text-3xl font-black uppercase">Cómo toma una hora</h3>
            <ol className="mt-6 space-y-3">
              {schedulingSystemCustomerSteps.map((step, index) => (
                <li key={step} className="flex gap-3 font-bold leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="rounded-3xl border-4 border-black bg-[#FFB5E8] p-8 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <p className="text-sm font-black uppercase">Usuario negocio</p>
            <h3 className="mt-3 text-3xl font-black uppercase">Cómo opera la agenda</h3>
            <ol className="mt-6 space-y-3">
              {schedulingSystemBusinessSteps.map((step, index) => (
                <li key={step} className="flex gap-3 font-bold leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#E9D5FF] py-20 text-black dark:border-white" aria-labelledby="precios-agendamiento">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="text-center">
            <p className="font-black uppercase text-[#6D28D9]">Precios vigentes</p>
            <h2 id="precios-agendamiento" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Cuánto cuesta este software de agendamiento
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg font-bold leading-8 opacity-80">
              Los valores salen de los planes publicados. Puragenda no cobra comisión por cada reserva. El detalle de funciones por plan está en{" "}
              <Link href="/pricing" className="underline underline-offset-4">
                precios
              </Link>
              .
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border-4 border-black bg-white p-8 shadow-[7px_7px_0_#000]">
              <h3 className="text-2xl font-black uppercase">Plan {PRICING.INDIVIDUAL.name}</h3>
              <p className="mt-4 text-4xl font-black">{individualPrice} <span className="text-lg">CLP / mes</span></p>
              <p className="mt-4 font-bold leading-7 opacity-75">
                Para un profesional. Incluye reservas ilimitadas y el widget de reservas.
              </p>
            </article>
            <article className="rounded-3xl border-4 border-black bg-white p-8 shadow-[7px_7px_0_#000]">
              <h3 className="text-2xl font-black uppercase">Plan {PRICING.EQUIPO.name}</h3>
              <p className="mt-4 text-4xl font-black">{teamPrice} <span className="text-lg">CLP / mes</span></p>
              <p className="mt-4 font-bold leading-7 opacity-75">
                Incluye {STAFF_LIMITS.EQUIPO} profesionales, roles de acceso y la misma reserva online para todo el equipo.
              </p>
            </article>
          </div>
          <p className="mt-8 text-center font-bold">
            Prueba de {TRIAL_DURATION_DAYS} días sin tarjeta.{" "}
            <Link href="/pricing" className="font-black underline underline-offset-4">
              Comparar planes
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="clientes-reales">
        <div className="text-center">
          <p className="font-black uppercase text-[#7C3AED]">Clientes reales</p>
          <h2 id="clientes-reales" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Lo que dicen negocios que ya usan Puragenda
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg font-bold leading-8 opacity-75">
            Solo mostramos testimonios de clientes verificables. No inventamos puntuaciones, cantidad de usuarios ni logos.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {customerTestimonials.map((item, index) => (
            <figure
              key={item.author}
              className={`flex flex-col gap-4 rounded-2xl border-4 border-black p-7 shadow-[8px_8px_0_#000] dark:border-white dark:bg-black ${["bg-[#FFF5BA]", "bg-[#BFFCC6]", "bg-[#85E3FF]"][index]}`}
            >
              <blockquote lang="es" className="text-base font-bold leading-relaxed text-black dark:text-white">
                {item.quote}
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t-2 border-black/20 pt-4 dark:border-white/20">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-white text-lg font-black text-black shadow-[2px_2px_0_#000]">
                  {item.initial}
                </div>
                <div>
                  <p className="text-sm font-black text-black dark:text-white">{item.author}</p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">{item.business}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
        {publishedCases.length > 0 ? (
          <p className="mx-auto mt-8 max-w-3xl text-center font-bold leading-7 opacity-75">
            {publishedSoccerbarberCase ? (
              <>
                El{" "}
                <Link href={caseStudyPath(publishedSoccerbarberCase.slug)} className="font-black underline underline-offset-4">
                  caso de {publishedSoccerbarberCase.businessName}
                </Link>{" "}
                describe cómo una barbería usa Puragenda, con el testimonio de Nicolás.{" "}
              </>
            ) : null}
            El resto de casos publicados está en{" "}
            <Link href={CASE_STUDIES_PATH} className="font-black underline underline-offset-4">
              casos de éxito
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-20" aria-labelledby="faq-agendamiento">
        <div className="text-center">
          <p className="font-black uppercase text-[#7C3AED]">Preguntas frecuentes</p>
          <h2 id="faq-agendamiento" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Dudas habituales sobre el agendamiento
          </h2>
        </div>
        <div className="mt-10 space-y-5">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-2xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000] dark:border-white dark:bg-black">
              <h3 className="text-xl font-black">{item.question}</h3>
              <p className="mt-3 font-medium leading-7 opacity-80">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t-4 border-black bg-[#FFF5BA] py-24 text-center dark:border-white dark:bg-black">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-black dark:text-white sm:text-5xl">
            Prueba el sistema de agendamiento con tu propio catálogo
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-bold leading-8 opacity-75">
            Crea la cuenta, carga un servicio y reserva como si fueras tu cliente. Si quieres orientación, también puedes escribirnos.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <TrackedLink
              href="/register"
              cta="register"
              placement="final_cta"
              className="border-4 border-black bg-[#7C3AED] px-8 py-4 text-lg font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white"
            >
              Crear cuenta gratis <ArrowRight className="ml-2 inline h-5 w-5" />
            </TrackedLink>
            <TrackedLink
              href="/pricing"
              cta="pricing"
              placement="final_cta"
              className="border-4 border-black bg-white px-8 py-4 text-lg font-black uppercase text-black shadow-[6px_6px_0_#000] dark:border-white dark:bg-black dark:text-white"
            >
              Ver planes
            </TrackedLink>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
