import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Scissors } from "@/components/icons/hover-icons";
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
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import {
  BARBERSHOP_SOFTWARE_PATH,
  barbershopCustomerSteps,
  barbershopFeatures,
  barbershopProblems,
  barbershopSoftwareCopy,
  barbershopSoftwareFaqs,
  barbershopSoftwareMetadata,
  barbershopSteps,
  barbershopTeamPoints,
} from "@/lib/data/barbershop-software-landing";

export const revalidate = 3600;

const faqs = barbershopSoftwareFaqs();
const individualPrice = formatLandingClp(PRICING.INDIVIDUAL.monthly);
const teamPrice = formatLandingClp(PRICING.EQUIPO.monthly);
const barbershopTestimonial = customerTestimonials.find((item) => item.business === "Soccerbarber");

export const metadata: Metadata = createPageMetadata({
  title: barbershopSoftwareMetadata.title,
  description: barbershopSoftwareMetadata.description,
  path: BARBERSHOP_SOFTWARE_PATH,
  keywords: [...barbershopSoftwareMetadata.keywords],
});

const mockSlots = [
  { time: "10:00", service: "Corte clásico", barber: "Diego", state: "ocupado" },
  { time: "10:30", service: "Corte + barba", barber: "Diego", state: "ocupado" },
  { time: "11:00", service: "Disponible", barber: "Diego", state: "libre" },
  { time: "11:00", service: "Afeitado", barber: "Camila", state: "ocupado" },
];

export default async function BarbershopSoftwareLandingPage() {
  return (
    <LandingLayout>
      <JsonLd
        data={jsonLdGraph([
          organizationRef(),
          softwareApplicationNode(barbershopSoftwareCopy.softwareDescription),
          faqPageNode(faqs),
          breadcrumbListNode([
            { name: "Inicio", path: "/" },
            { name: "Sistema de agendamiento online", path: "/sistema-de-agendamiento-online" },
            { name: "Software de agenda para barberías", path: BARBERSHOP_SOFTWARE_PATH },
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
            <li>
              <Link href="/sistema-de-agendamiento-online" className="underline underline-offset-4 hover:text-[#7C3AED]">
                Sistema de agendamiento
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Software de agenda para barberías</li>
          </ol>
        </nav>

        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-block border-2 border-black bg-[#FFF5BA] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
              {barbershopSoftwareCopy.eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-black uppercase tracking-tighter sm:text-6xl">
              {barbershopSoftwareCopy.h1}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-bold leading-8 opacity-80 sm:text-xl">
              {barbershopSoftwareCopy.heroLead}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <TrackedLink
                href="/register"
                cta="register"
                placement="hero"
                className="border-4 border-black bg-[#7C3AED] px-8 py-4 text-center text-lg font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white"
              >
                Probar {TRIAL_DURATION_DAYS} días gratis <ArrowRight className="ml-2 inline h-5 w-5" />
              </TrackedLink>
              <TrackedCtaAnchor
                href="/demo"
                cta="demo"
                placement="hero"
                className="border-4 border-black bg-white px-8 py-4 text-center text-lg font-black uppercase text-black shadow-[6px_6px_0_#000] dark:border-white dark:bg-black dark:text-white"
              >
                Ver demo
              </TrackedCtaAnchor>
            </div>
            <p className="mt-5 text-sm font-bold opacity-60">{barbershopSoftwareCopy.heroNote}</p>
          </div>

          <div className="rounded-3xl border-4 border-black bg-[#FFB5E8] p-5 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <div className="rounded-2xl border-4 border-black bg-white p-4">
              <div className="mb-4 flex items-center justify-between border-b-4 border-black pb-3">
                <p className="text-sm font-black uppercase">Agenda del local</p>
                <span className="border-2 border-black bg-[#BFFCC6] px-2 py-1 text-[10px] font-black uppercase">Sábado</span>
              </div>
              <ul className="space-y-2">
                {mockSlots.map((slot) => (
                  <li
                    key={`${slot.barber}-${slot.time}-${slot.service}`}
                    className={`flex items-center justify-between rounded-xl border-2 border-black px-3 py-2 text-sm font-black ${slot.state === "libre" ? "bg-[#BFFCC6]" : "bg-[#FFF5BA]"}`}
                  >
                    <span>{slot.time}</span>
                    <span className="opacity-80">{slot.service}</span>
                    <span>{slot.barber}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-center text-[11px] font-bold opacity-50">Ilustración del panel. No es un dato de un local real.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#85E3FF] py-16 text-black dark:border-white" aria-labelledby="que-es-puragenda-barberia">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm font-black uppercase tracking-wider text-[#6D28D9]">Respuesta rápida</p>
          <h2 id="que-es-puragenda-barberia" className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {barbershopSoftwareCopy.definitionHeading}
          </h2>
          <p className="mt-5 text-xl font-bold leading-9">{barbershopSoftwareCopy.definition}</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="problemas-barberia">
        <div className="max-w-3xl">
          <p className="font-black uppercase text-[#7C3AED]">El día a día del local</p>
          <h2 id="problemas-barberia" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Qué suele fallar cuando la barbería agenda a mano
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 opacity-75">
            No hay una cifra universal de horas perdidas. Estos son problemas operativos que el software está hecho para absorber, no slogans de mercado.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {barbershopProblems.map((item, index) => (
            <article key={item.title} className="rounded-3xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000] dark:border-white dark:bg-black">
              <p className="text-sm font-black text-[#7C3AED]">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-xl font-black uppercase">{item.title}</h3>
              <p className="mt-3 font-bold leading-7 opacity-75">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#FFF5BA] py-20 text-black dark:border-white" aria-labelledby="como-funciona-barberia">
        <div className="mx-auto w-full max-w-5xl px-6">
          <h2 id="como-funciona-barberia" className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Cómo queda organizada la barbería
          </h2>
          <ol className="mt-12 space-y-4">
            {barbershopSteps.map((step, index) => (
              <li key={step.title} className="grid gap-4 rounded-2xl border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000] md:grid-cols-[4.5rem_1fr] md:items-start">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-black bg-[#B28DFF] text-2xl font-black">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-xl font-black uppercase">{step.title}</h3>
                  <p className="mt-2 font-bold leading-7 opacity-75">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="funciones-barberia">
        <div className="max-w-3xl">
          <p className="font-black uppercase text-[#7C3AED]">Del problema a la función</p>
          <h2 id="funciones-barberia" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Qué usa una barbería dentro de Puragenda
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 opacity-75">
            No es el catálogo completo. El listado general está en{" "}
            <Link href="/caracteristicas" className="underline underline-offset-4">
              características
            </Link>
            .
          </p>
        </div>
        <div className="mt-12 space-y-4">
          {barbershopFeatures.map((feature) => (
            <article key={feature.title} className="grid gap-4 rounded-3xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000] dark:border-white dark:bg-black md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <p className="text-sm font-black uppercase text-[#6D28D9]">{feature.problem}</p>
              <div>
                <h3 className="text-2xl font-black uppercase">{feature.title}</h3>
                <p className="mt-3 font-bold leading-7 opacity-75">{feature.description}</p>
                <Link href={feature.href} className="mt-4 inline-flex font-black uppercase text-[#5B21B6] underline underline-offset-4">
                  {feature.hrefLabel} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#BFFCC6] py-20 text-black dark:border-white" aria-labelledby="varios-barberos">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="font-black uppercase text-[#6D28D9]">Equipo del local</p>
            <h2 id="varios-barberos" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Varios barberos, una sola reserva pública
            </h2>
            <p className="mt-5 text-lg font-bold leading-8 opacity-80">
              El cliente entra por un enlace. Por detrás, cada barbero mantiene su propia disponibilidad. El plan Equipo incluye {STAFF_LIMITS.EQUIPO} profesionales; el Individual cubre a un barbero.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {barbershopTeamPoints.map((item) => (
              <article key={item.title} className="rounded-3xl border-4 border-black bg-white p-6 shadow-[5px_5px_0_#000]">
                <h3 className="text-xl font-black uppercase">{item.title}</h3>
                <p className="mt-3 font-bold leading-7 opacity-75">{item.description}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 font-bold">
            <Link href="/funciones/agenda-multiples-profesionales" className="underline underline-offset-4">
              Cómo funciona la agenda para múltiples profesionales
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="abonos-barberia">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="font-black uppercase text-[#7C3AED]">Abonos e inasistencias</p>
            <h2 id="abonos-barberia" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Un abono no borra los no-shows
            </h2>
            <p className="mt-5 text-lg font-bold leading-8 opacity-80">
              Puedes pedir un anticipo en los servicios que lo justifiquen. El cliente ve el monto antes de pagar. Eso no garantiza asistencia: ayuda a filtrar reservas poco comprometidas y deja el saldo visible.
            </p>
            <ul className="mt-6 space-y-3 font-bold leading-7">
              <li>El abono se configura por servicio, no como una regla única del local.</li>
              <li>Hay recordatorio por correo el día anterior, con enlaces para gestionar la cita.</li>
              <li>El historial muestra inasistencias; no publicamos una tasa de reducción inventada.</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-5 font-black">
              <Link href="/funciones/reservas-online-con-abono" className="underline underline-offset-4">
                Reservas con abono
              </Link>
              <Link href="/guias/reducir-inasistencias-reservas" className="underline underline-offset-4">
                Guía para reducir inasistencias
              </Link>
            </div>
          </div>
          <article className="rounded-3xl border-4 border-black bg-[#FFF5BA] p-8 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <h3 className="text-2xl font-black uppercase">Cómo reserva el cliente</h3>
            <ol className="mt-6 space-y-3">
              {barbershopCustomerSteps.map((step, index) => (
                <li key={step} className="flex gap-3 font-bold leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm font-bold opacity-70">
              Esta reserva es del cliente de la barbería, no una búsqueda de “barbería cerca”. El marketplace de locales se trabaja aparte.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y-4 border-black bg-[#E9D5FF] py-20 text-black dark:border-white" aria-labelledby="precios-barberia">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="text-center">
            <p className="font-black uppercase text-[#6D28D9]">Precios vigentes</p>
            <h2 id="precios-barberia" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Cuánto cuesta el sistema para una barbería
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg font-bold leading-8 opacity-80">
              Los valores salen de los planes publicados. Compara el detalle en{" "}
              <Link href="/pricing" className="underline underline-offset-4">
                precios
              </Link>
              .
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border-4 border-black bg-white p-8 shadow-[7px_7px_0_#000]">
              <h3 className="text-2xl font-black uppercase">Un barbero</h3>
              <p className="mt-4 text-4xl font-black">
                {individualPrice} <span className="text-lg">CLP / mes</span>
              </p>
              <p className="mt-4 font-bold leading-7 opacity-75">
                Plan {PRICING.INDIVIDUAL.name}: una agenda, reservas ilimitadas y el enlace de reserva.
              </p>
            </article>
            <article className="rounded-3xl border-4 border-black bg-white p-8 shadow-[7px_7px_0_#000]">
              <h3 className="text-2xl font-black uppercase">Equipo del local</h3>
              <p className="mt-4 text-4xl font-black">
                {teamPrice} <span className="text-lg">CLP / mes</span>
              </p>
              <p className="mt-4 font-bold leading-7 opacity-75">
                Plan {PRICING.EQUIPO.name}: {STAFF_LIMITS.EQUIPO} profesionales incluidos y roles de acceso.
              </p>
            </article>
          </div>
        </div>
      </section>

      {barbershopTestimonial ? (
        <section className="mx-auto w-full max-w-3xl px-6 py-20" aria-labelledby="prueba-barberia">
          <p className="font-black uppercase text-[#7C3AED]">Cliente de barbería</p>
          <h2 id="prueba-barberia" className="mt-3 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
            Un local que ya usa Puragenda
          </h2>
          <figure className="mt-10 rounded-3xl border-4 border-black bg-[#FFF5BA] p-8 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <blockquote lang="es" className="text-xl font-bold leading-8">
              {barbershopTestimonial.quote}
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t-2 border-black/20 pt-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-white text-lg font-black shadow-[2px_2px_0_#000]">
                {barbershopTestimonial.initial}
              </div>
              <div>
                <p className="text-sm font-black">{barbershopTestimonial.author}</p>
                <p className="text-xs font-bold opacity-60">{barbershopTestimonial.business}</p>
              </div>
            </figcaption>
          </figure>
          <p className="mt-6 text-sm font-bold opacity-70">
            Solo citamos este testimonio aquí porque el negocio es una barbería. No usamos clientes de otros rubros como si lo fueran.
          </p>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-4xl px-6 py-20" aria-labelledby="faq-barberia">
        <h2 id="faq-barberia" className="text-center text-4xl font-black uppercase tracking-tighter sm:text-5xl">
          Preguntas de dueños de barbería
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

      <section className="border-t-4 border-black bg-[#FFF5BA] py-24 text-center dark:border-white dark:bg-black">
        <div className="mx-auto max-w-4xl px-6">
          <Scissors className="mx-auto h-10 w-10" />
          <h2 className="mt-6 text-4xl font-black uppercase tracking-tighter text-black dark:text-white sm:text-5xl">
            Prueba el software con los servicios de tu barbería
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-bold leading-8 opacity-75">
            Carga un corte, un barbero y reserva como si fueras tu cliente. Si tu local ya está descrito en la página de rubro, parte de ahí.
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
              href="/para/barberias"
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
