import Link from "next/link";
import type { Metadata } from "next";
import { LandingLayout } from "@/components/landing/landing-layout";
import { JsonLd } from "@/components/json-ld";
import {
  ExampleSchedule,
  FaqItem,
  FinalCta,
  LandingHero,
  PricingSection,
  ProductFrame,
  QuoteProof,
  SectionIntro,
  StaffAvailabilityPreview,
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
import { caseStudyPath, getPublishedCaseStudy } from "@/lib/data/case-studies";
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
import { cn } from "@/lib/utils";

export const revalidate = 3600;

const faqs = barbershopSoftwareFaqs();
const individualPrice = formatLandingClp(PRICING.INDIVIDUAL.monthly);
const teamPrice = formatLandingClp(PRICING.EQUIPO.monthly);
const barbershopTestimonial = customerTestimonials.find((item) => item.business === "Soccerbarber");
const publishedBarbershopCase = getPublishedCaseStudy("soccerbarber");

export const metadata: Metadata = createPageMetadata({
  title: barbershopSoftwareMetadata.title,
  description: barbershopSoftwareMetadata.description,
  path: BARBERSHOP_SOFTWARE_PATH,
  keywords: [...barbershopSoftwareMetadata.keywords],
});

const mockSlots = [
  { time: "10:00", label: "Corte clásico", person: "Diego", state: "busy" as const },
  { time: "10:30", label: "Corte + barba", person: "Diego", state: "busy" as const },
  { time: "11:00", label: "Disponible", person: "Diego", state: "free" as const },
  { time: "11:00", label: "Afeitado", person: "Camila", state: "busy" as const },
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

      <LandingHero
        breadcrumbs={[
          { href: "/", label: "Inicio" },
          { href: "/sistema-de-agendamiento-online", label: "Sistema de agendamiento" },
          { label: "Software de agenda para barberías" },
        ]}
        eyebrow={barbershopSoftwareCopy.eyebrow}
        tone="cream"
        h1={barbershopSoftwareCopy.h1}
        lead={barbershopSoftwareCopy.heroLead}
        note={barbershopSoftwareCopy.heroNote}
        primaryCta={{ href: "/register", label: `Probar ${TRIAL_DURATION_DAYS} días gratis`, cta: "register", placement: "hero" }}
        secondaryCta={{ href: "/demo", label: "Ver demo", cta: "demo", placement: "hero" }}
        visual={
          <ProductFrame label="Agenda del local" caption="Ilustración del panel. No es un dato de un local real.">
            <StaffAvailabilityPreview
              staff={[
                { name: "Diego", selected: true },
                { name: "Camila" },
              ]}
              times={[
                { time: "10:00", available: false },
                { time: "10:30", available: false },
                { time: "11:00", available: true },
              ]}
            />
            <div className="mt-4 border-t-2 border-black/10 pt-4">
              <ExampleSchedule title="Sábado" badge="Abono en combo" slots={mockSlots} />
            </div>
          </ProductFrame>
        }
      />

      <section className={seo.band} aria-labelledby="que-es-puragenda-barberia">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <p className={seo.kicker}>Respuesta rápida</p>
          <h2 id="que-es-puragenda-barberia" className={cn(seo.h2, "mt-3")}>
            {barbershopSoftwareCopy.definitionHeading}
          </h2>
          <p className={cn(seo.body, "mt-5")}>{barbershopSoftwareCopy.definition}</p>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="problemas-barberia">
        <SectionIntro id="problemas-barberia" kicker="El día a día del local" title="Qué suele fallar cuando la barbería agenda a mano">
          <p>No hay una cifra universal de horas perdidas. Estos son problemas operativos que el software está hecho para absorber, no slogans de mercado.</p>
        </SectionIntro>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {barbershopProblems.map((item, index) => (
            <article key={item.title} className="border-t-2 border-black/15 pt-5 dark:border-white/20">
              <p className="text-sm font-black text-[#7C3AED]">{String(index + 1).padStart(2, "0")}</p>
              <h3 className={cn(seo.h3, "mt-2")}>{item.title}</h3>
              <p className={cn(seo.body, "mt-3 text-base")}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={seo.bandWarm} aria-labelledby="como-funciona-barberia">
        <div className={seo.section}>
          <h2 id="como-funciona-barberia" className={seo.h2}>Cómo queda organizada la barbería</h2>
          <ol className="mt-10 overflow-hidden rounded-[24px] border-2 border-black bg-white dark:border-white dark:bg-[#0c0c0c]">
            {barbershopSteps.map((step, index) => (
              <li key={step.title} className="grid gap-4 border-b-2 border-black p-5 last:border-b-0 dark:border-white md:grid-cols-[4.5rem_1fr]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black bg-[#E9D5FF] text-xl font-black">{index + 1}</span>
                <div>
                  <h3 className={seo.h3}>{step.title}</h3>
                  <p className={cn(seo.body, "mt-2 text-base")}>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="funciones-barberia">
        <SectionIntro id="funciones-barberia" kicker="Del problema a la función" title="Qué usa una barbería dentro de Puragenda">
          <p>
            No es el catálogo completo. El listado general está en{" "}
            <Link href="/caracteristicas" className={seo.link}>características</Link>.
          </p>
        </SectionIntro>
        <div className="mt-12 divide-y-2 divide-black/10 border-y-2 border-black/10 dark:divide-white/15 dark:border-white/15">
          {barbershopFeatures.map((feature) => (
            <article key={feature.title} className="grid gap-3 py-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-[#6D28D9]">{feature.problem}</p>
              <div>
                <h3 className={seo.h3}>{feature.title}</h3>
                <p className={cn(seo.body, "mt-3 text-base")}>{feature.description}</p>
                <Link href={feature.href} className={cn(seo.link, "mt-3 inline-flex")}>{feature.hrefLabel} →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={seo.band} aria-labelledby="varios-barberos">
        <div className={seo.section}>
          <SectionIntro id="varios-barberos" kicker="Equipo del local" title="Varios barberos, una sola reserva pública">
            <p>
              El cliente entra por un enlace. Por detrás, cada barbero mantiene su propia disponibilidad. El plan Equipo incluye {STAFF_LIMITS.EQUIPO} profesionales; el Individual cubre a un barbero.
            </p>
          </SectionIntro>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {barbershopTeamPoints.map((item) => (
              <article key={item.title} className="border-t-2 border-black/15 pt-5 dark:border-white/20">
                <h3 className={seo.h3}>{item.title}</h3>
                <p className={cn(seo.body, "mt-3 text-base")}>{item.description}</p>
              </article>
            ))}
          </div>
          <p className="mt-8">
            <Link href="/funciones/agenda-multiples-profesionales" className={seo.link}>Cómo funciona la agenda para múltiples profesionales</Link>
          </p>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="abonos-barberia">
        <div className="grid gap-10 lg:grid-cols-2">
          <SectionIntro id="abonos-barberia" kicker="Abonos e inasistencias" title="Un abono no borra los no-shows">
            <p>Puedes pedir un anticipo en los servicios que lo justifiquen. El cliente ve el monto antes de pagar. Eso no garantiza asistencia: ayuda a filtrar reservas poco comprometidas y deja el saldo visible.</p>
            <ul className="mt-6 space-y-3 text-base font-medium leading-7">
              <li>El abono se configura por servicio, no como una regla única del local.</li>
              <li>Hay recordatorio por correo el día anterior, con enlaces para gestionar la cita.</li>
              <li>El historial muestra inasistencias; no publicamos una tasa de reducción inventada.</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-5 font-black">
              <Link href="/funciones/reservas-online-con-abono" className={seo.link}>Reservas con abono</Link>
              <Link href="/guias/reducir-inasistencias-reservas" className={seo.link}>Guía para reducir inasistencias</Link>
            </div>
          </SectionIntro>
          <article className={cn(seo.panel, "p-7 sm:p-8")}>
            <h3 className={cn(seo.h3, "text-2xl")}>Cómo reserva el cliente</h3>
            <ol className="mt-6 space-y-3">
              {barbershopCustomerSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-base font-medium leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm font-semibold text-black/60">
              Esta reserva es del cliente de la barbería, no una búsqueda de “barbería cerca”. El marketplace de locales se trabaja aparte.
            </p>
          </article>
        </div>
      </section>

      <div className={seo.bandWarm}>
        <PricingSection
          id="precios-barberia"
          title="Cuánto cuesta el sistema para una barbería"
          intro={
            <p>
              Los valores salen de los planes publicados. Compara el detalle en{" "}
              <Link href="/pricing" className={seo.link}>precios</Link>.
            </p>
          }
          individual={{
            name: "Un barbero",
            price: individualPrice,
            detail: `Plan ${PRICING.INDIVIDUAL.name}: una agenda, reservas ilimitadas y el enlace de reserva.`,
          }}
          team={{
            name: "Equipo del local",
            price: teamPrice,
            detail: `Plan ${PRICING.EQUIPO.name}: ${STAFF_LIMITS.EQUIPO} profesionales incluidos y roles de acceso.`,
          }}
        />
      </div>

      {barbershopTestimonial ? (
        <section className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20" aria-labelledby="prueba-barberia">
          <p className={seo.kicker}>Cliente de barbería</p>
          <h2 id="prueba-barberia" className={cn(seo.h2, "mt-3")}>Un local que ya usa Puragenda</h2>
          <div className="mt-8">
            <QuoteProof quote={barbershopTestimonial.quote} author={barbershopTestimonial.author} business={barbershopTestimonial.business} initial={barbershopTestimonial.initial} />
          </div>
          <p className="mt-6 text-sm font-semibold text-black/60">
            Solo citamos este testimonio aquí porque el negocio es una barbería. No usamos clientes de otros rubros como si lo fueran.
            {publishedBarbershopCase ? (
              <>
                {" "}El{" "}
                <Link href={caseStudyPath(publishedBarbershopCase.slug)} className={seo.link}>
                  caso de {publishedBarbershopCase.businessName}
                </Link>{" "}
                reúne esa evidencia pública, sin métricas inventadas.
              </>
            ) : null}
          </p>
        </section>
      ) : null}

      <VerticalFaq id="faq-barberia" title="Preguntas de dueños de barbería">
        {faqs.map((item) => (
          <FaqItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </VerticalFaq>

      <FinalCta
        id="probar-barberia"
        title="Prueba el software con los servicios de tu barbería"
        primary={{ href: "/register", label: "Crear cuenta gratis", cta: "register", placement: "final_cta" }}
        secondary={{ href: "/para/barberias", label: "Ver página de rubro", tracked: false }}
      >
        <p>
          Carga un corte, un barbero y reserva como si fueras tu cliente. Si tu local ya está descrito en la{" "}
          <Link href="/para/barberias" className={seo.link}>página de rubro</Link>, parte de ahí.
        </p>
      </FinalCta>
    </LandingLayout>
  );
}
