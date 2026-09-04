import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "@/components/icons/hover-icons";
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
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import {
  SALON_SOFTWARE_PATH,
  salonCustomerSteps,
  salonDurationExamples,
  salonFeatures,
  salonProblems,
  salonSoftwareCopy,
  salonSoftwareFaqs,
  salonSoftwareMetadata,
  salonSteps,
} from "@/lib/data/salon-software-landing";

export const revalidate = 3600;

const faqs = salonSoftwareFaqs();
const individualPrice = formatLandingClp(PRICING.INDIVIDUAL.monthly);
const teamPrice = formatLandingClp(PRICING.EQUIPO.monthly);

export const metadata: Metadata = createPageMetadata({
  title: salonSoftwareMetadata.title,
  description: salonSoftwareMetadata.description,
  path: SALON_SOFTWARE_PATH,
  keywords: [...salonSoftwareMetadata.keywords],
});

export default async function SalonSoftwareLandingPage() {
  return (
    <LandingLayout>
      <JsonLd
        data={jsonLdGraph([
          organizationRef(),
          softwareApplicationNode(salonSoftwareCopy.softwareDescription),
          faqPageNode(faqs),
          breadcrumbListNode([
            { name: "Inicio", path: "/" },
            { name: "Sistema de agendamiento online", path: "/sistema-de-agendamiento-online" },
            { name: "Software de agenda para peluquerías", path: SALON_SOFTWARE_PATH },
          ]),
        ])}
      />

      <section className="mx-auto w-full max-w-5xl px-6 pt-8 pb-14 text-center">
        <nav aria-label="Miga de pan" className="mb-8 text-left text-sm font-bold">
          <ol className="flex flex-wrap items-center gap-2 opacity-70">
            <li>
              <Link href="/" className="underline underline-offset-4 hover:text-[#7C3AED]">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/sistema-de-agendamiento-online" className="underline underline-offset-4 hover:text-[#7C3AED]">
                Sistema de agendamiento
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Software de agenda para peluquerías</li>
          </ol>
        </nav>
        <p className="inline-block border-2 border-black bg-[#FFB5E8] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
          {salonSoftwareCopy.eyebrow}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black uppercase tracking-tighter sm:text-6xl">
          {salonSoftwareCopy.h1}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg font-bold leading-8 opacity-80 sm:text-xl">
          {salonSoftwareCopy.heroLead}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
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
        <p className="mt-5 text-sm font-bold opacity-60">{salonSoftwareCopy.heroNote}</p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16" aria-labelledby="catalogo-ejemplo">
        <h2 id="catalogo-ejemplo" className="sr-only">
          Ejemplo de catálogo con distinta duración
        </h2>
        <p className="mb-4 text-center text-sm font-bold opacity-60">
          Ejemplos de uso, no el catálogo de un salón cliente.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {salonDurationExamples.map((item, index) => (
            <article
              key={item.name}
              className={`rounded-3xl border-4 border-black p-6 text-black shadow-[6px_6px_0_#000] dark:border-white ${["bg-[#FFF5BA]", "bg-[#B28DFF]", "bg-[#BFFCC6]"][index]}`}
            >
              <p className="text-sm font-black uppercase opacity-70">{item.name}</p>
              <p className="mt-2 text-4xl font-black">{item.duration}</p>
              <p className="mt-3 font-bold leading-6 opacity-80">{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#E9D5FF] py-16 text-black dark:border-white" aria-labelledby="que-es-puragenda-peluqueria">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm font-black uppercase tracking-wider text-[#6D28D9]">Respuesta rápida</p>
          <h2 id="que-es-puragenda-peluqueria" className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {salonSoftwareCopy.definitionHeading}
          </h2>
          <p className="mt-5 text-xl font-bold leading-9">{salonSoftwareCopy.definition}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="problemas-salon">
        <div className="max-w-3xl">
          <p className="font-black uppercase text-[#7C3AED]">Operación del salón</p>
          <h2 id="problemas-salon" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Dónde se traba una peluquería que agenda a mano
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {salonProblems.map((item) => (
            <article key={item.title} className="rounded-3xl border-4 border-black bg-white p-7 shadow-[6px_6px_0_#000] dark:border-white dark:bg-black">
              <h3 className="text-2xl font-black uppercase">{item.title}</h3>
              <p className="mt-3 font-bold leading-7 opacity-75">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#85E3FF] py-20 text-black dark:border-white" aria-labelledby="como-funciona-salon">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 id="como-funciona-salon" className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Del catálogo a la silla ocupada
          </h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {salonSteps.map((step, index) => (
              <li key={step.title} className="rounded-3xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000]">
                <span className="text-4xl font-black text-[#7C3AED]">{index + 1}</span>
                <h3 className="mt-3 text-xl font-black uppercase">{step.title}</h3>
                <p className="mt-3 font-bold leading-7 opacity-75">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="funciones-salon">
        <div className="max-w-3xl">
          <p className="font-black uppercase text-[#7C3AED]">Qué usa el salón</p>
          <h2 id="funciones-salon" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Catálogo, equipo y clientas fijas
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 opacity-75">
            El listado general del producto está en{" "}
            <Link href="/caracteristicas" className="underline underline-offset-4">
              características
            </Link>
            . Aquí importan las piezas que un salón usa todos los días.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {salonFeatures.map((feature) => (
            <article key={feature.title} className="rounded-3xl border-4 border-black bg-[#FFFAEB] p-7 shadow-[6px_6px_0_#000] dark:border-white dark:bg-black">
              <h3 className="text-2xl font-black uppercase">{feature.title}</h3>
              <p className="mt-3 font-bold leading-7 opacity-75">{feature.description}</p>
              <Link href={feature.href} className="mt-5 inline-flex font-black uppercase text-[#5B21B6] underline underline-offset-4">
                {feature.hrefLabel} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#BFFCC6] py-20 text-black dark:border-white" aria-labelledby="abonos-salon">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-black uppercase text-[#6D28D9]">Servicios largos</p>
            <h2 id="abonos-salon" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              El abono protege el bloque, no garantiza la asistencia
            </h2>
            <p className="mt-5 text-lg font-bold leading-8 opacity-80">
              Una coloración reserva más tiempo que un corte. Si el salón pide anticipo en esos servicios, la clienta ve el monto y el saldo antes de pagar. Puragenda no cobra comisión por reserva.
            </p>
            <div className="mt-6 flex flex-wrap gap-5 font-black">
              <Link href="/funciones/reservas-online-con-abono" className="underline underline-offset-4">
                Reservas con abono
              </Link>
              <Link href="/guias/reducir-inasistencias-reservas" className="underline underline-offset-4">
                Cómo reducir inasistencias
              </Link>
              <Link href="/funciones/agenda-google-calendar" className="underline underline-offset-4">
                Google Calendar
              </Link>
            </div>
          </div>
          <article className="rounded-3xl border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000]">
            <h3 className="text-2xl font-black uppercase">Qué hace la clienta</h3>
            <ol className="mt-6 space-y-3">
              {salonCustomerSteps.map((step, index) => (
                <li key={step} className="flex gap-3 font-bold leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm font-bold opacity-70">
              Reserva de la clienta del salón, no una búsqueda de “peluquería cerca”.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-20" aria-labelledby="precios-salon">
        <div className="text-center">
          <p className="font-black uppercase text-[#7C3AED]">Precios vigentes</p>
          <h2 id="precios-salon" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Cuánto cuesta el sistema para un salón
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg font-bold leading-8 opacity-80">
            Un profesional usa el plan {PRICING.INDIVIDUAL.name}. Un equipo de estilistas, el plan {PRICING.EQUIPO.name} ({STAFF_LIMITS.EQUIPO} incluidos). Detalle en{" "}
            <Link href="/pricing" className="underline underline-offset-4">
              precios
            </Link>
            .
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border-4 border-black bg-white p-8 shadow-[7px_7px_0_#000] dark:border-white dark:bg-black">
            <h3 className="text-2xl font-black uppercase">Estilista independiente</h3>
            <p className="mt-4 text-4xl font-black">
              {individualPrice} <span className="text-lg">CLP / mes</span>
            </p>
          </article>
          <article className="rounded-3xl border-4 border-black bg-white p-8 shadow-[7px_7px_0_#000] dark:border-white dark:bg-black">
            <h3 className="text-2xl font-black uppercase">Salón con equipo</h3>
            <p className="mt-4 text-4xl font-black">
              {teamPrice} <span className="text-lg">CLP / mes</span>
            </p>
          </article>
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#FFF5BA] py-16 text-black dark:border-white" aria-labelledby="prueba-salon">
        <div className="mx-auto max-w-3xl px-6">
          <h2 id="prueba-salon" className="text-3xl font-black uppercase tracking-tight">
            Qué sí podemos afirmar sobre prueba social
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 opacity-80">
            No tenemos publicado un testimonio de una peluquería. No vamos a presentar un centro de estética o una barbería como si fueran un salón. La prueba disponible hoy es usar el producto {TRIAL_DURATION_DAYS} días con tu propio catálogo.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-20" aria-labelledby="faq-salon">
        <h2 id="faq-salon" className="text-center text-4xl font-black uppercase tracking-tighter sm:text-5xl">
          Preguntas de quien administra el salón
        </h2>
        <div className="mt-10 space-y-5">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-2xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000] dark:border-white dark:bg-black">
              <h3 className="text-xl font-black">{item.question}</h3>
              <p className="mt-3 font-medium leading-7 opacity-80">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t-4 border-black bg-[#FFB5E8] py-24 text-center dark:border-white dark:bg-black">
        <div className="mx-auto max-w-4xl px-6">
          <Sparkles className="mx-auto h-10 w-10" />
          <h2 className="mt-6 text-4xl font-black uppercase tracking-tighter text-black dark:text-white sm:text-5xl">
            Carga un corte y un color, y reserva como tu clienta
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-bold leading-8 opacity-75">
            Si solo quieres la ficha corta del rubro, está en Soluciones.
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
            <Link
              href="/para/peluquerias"
              className="border-4 border-black bg-white px-8 py-4 text-lg font-black uppercase text-black shadow-[6px_6px_0_#000] dark:border-white dark:bg-black dark:text-white"
            >
              Ver página de rubro
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
