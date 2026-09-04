import Link from "next/link";
import type { Metadata } from "next";
import { LandingLayout } from "@/components/landing/landing-layout";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { JsonLd } from "@/components/json-ld";
import {
  FaqItem,
  FinalCta,
  LandingHero,
  PricingSection,
  ProductFrame,
  SectionIntro,
  ServiceCatalogPreview,
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
import { cn } from "@/lib/utils";

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

      <LandingHero
        breadcrumbs={[
          { href: "/", label: "Inicio" },
          { href: "/sistema-de-agendamiento-online", label: "Sistema de agendamiento" },
          { label: "Software de agenda para peluquerías" },
        ]}
        eyebrow={salonSoftwareCopy.eyebrow}
        tone="pink"
        h1={salonSoftwareCopy.h1}
        lead={salonSoftwareCopy.heroLead}
        note={salonSoftwareCopy.heroNote}
        primaryCta={{ href: "/register", label: `Probar ${TRIAL_DURATION_DAYS} días gratis`, cta: "register", placement: "hero" }}
        secondaryCta={{ href: "/demo", label: "Ver demo", cta: "demo", placement: "hero" }}
        visual={
          <ProductFrame label="Catálogo del salón" caption="Ejemplos de uso, no el catálogo de un salón cliente." tone="pink">
            <ServiceCatalogPreview
              services={salonDurationExamples.map((item, index) => ({
                name: item.name,
                duration: item.duration,
                price: index === 1 ? "Servicio largo" : "Bloque propio",
                professional: index === 2 ? "Otra categoría" : "Estilista asignada",
                note: item.note,
                selected: index === 1,
              }))}
            />
            <div className="mt-4 border-t-2 border-black/10 pt-4">
              <StaffAvailabilityPreview
                staff={[
                  { name: "Estilista 1", selected: true, meta: "color" },
                  { name: "Estilista 2", meta: "corte" },
                ]}
                times={[
                  { time: "11:00", available: false },
                  { time: "13:00", available: true },
                  { time: "15:30", available: true },
                ]}
              />
            </div>
          </ProductFrame>
        }
      />

      <section className={seo.band} aria-labelledby="que-es-puragenda-peluqueria">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <p className={seo.kicker}>Respuesta rápida</p>
          <h2 id="que-es-puragenda-peluqueria" className={cn(seo.h2, "mt-3")}>
            {salonSoftwareCopy.definitionHeading}
          </h2>
          <p className={cn(seo.body, "mt-5")}>{salonSoftwareCopy.definition}</p>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="problemas-salon">
        <SectionIntro id="problemas-salon" kicker="Operación del salón" title="Dónde se traba una peluquería que agenda a mano" />
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {salonProblems.map((item) => (
            <article key={item.title} className="border-t-2 border-black/15 pt-5 dark:border-white/20">
              <h3 className={seo.h3}>{item.title}</h3>
              <p className={cn(seo.body, "mt-3 text-base")}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={seo.bandWarm} aria-labelledby="como-funciona-salon">
        <div className={seo.section}>
          <h2 id="como-funciona-salon" className={seo.h2}>Del catálogo a la silla ocupada</h2>
          <ol className="mt-10 grid gap-0 overflow-hidden rounded-[24px] border-2 border-black bg-white dark:border-white dark:bg-[#0c0c0c] md:grid-cols-2 lg:grid-cols-4">
            {salonSteps.map((step, index) => (
              <li key={step.title} className="border-black p-6 dark:border-white md:border-r-2 md:last:border-r-0 max-md:border-b-2 max-md:last:border-b-0">
                <span className="text-3xl font-black text-[#7C3AED]">{index + 1}</span>
                <h3 className={cn(seo.h3, "mt-3")}>{step.title}</h3>
                <p className={cn(seo.body, "mt-3 text-base")}>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="funciones-salon">
        <SectionIntro id="funciones-salon" kicker="Qué usa el salón" title="Catálogo, equipo y clientas fijas">
          <p>
            El listado general del producto está en{" "}
            <Link href="/caracteristicas" className={seo.link}>características</Link>
            . Aquí importan las piezas que un salón usa todos los días.
          </p>
        </SectionIntro>
        <div className="mt-12 divide-y-2 divide-black/10 border-y-2 border-black/10 dark:divide-white/15 dark:border-white/15">
          {salonFeatures.map((feature) => (
            <article key={feature.title} className="grid gap-3 py-6 lg:grid-cols-2">
              <h3 className={seo.h3}>{feature.title}</h3>
              <div>
                <p className={cn(seo.body, "text-base")}>{feature.description}</p>
                <Link href={feature.href} className={cn(seo.link, "mt-3 inline-flex")}>{feature.hrefLabel} →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={seo.band} aria-labelledby="abonos-salon">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className={seo.kicker}>Servicios largos</p>
            <h2 id="abonos-salon" className={cn(seo.h2, "mt-3")}>El abono protege el bloque, no garantiza la asistencia</h2>
            <p className={cn(seo.body, "mt-5")}>
              Una coloración reserva más tiempo que un corte. Si el salón pide anticipo en esos servicios, la clienta ve el monto y el saldo antes de pagar. Puragenda no cobra comisión por reserva.
            </p>
            <div className="mt-6 flex flex-wrap gap-5 font-black">
              <Link href="/funciones/reservas-online-con-abono" className={seo.link}>Reservas con abono</Link>
              <Link href="/guias/reducir-inasistencias-reservas" className={seo.link}>Cómo reducir inasistencias</Link>
              <Link href="/funciones/agenda-google-calendar" className={seo.link}>Google Calendar</Link>
            </div>
          </div>
          <article className={cn(seo.panel, "p-7 sm:p-8")}>
            <h3 className={cn(seo.h3, "text-2xl")}>Qué hace la clienta</h3>
            <ol className="mt-6 space-y-3">
              {salonCustomerSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-base font-medium leading-7">
                  <span className="font-black text-[#5B21B6]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm font-semibold text-black/60">Reserva de la clienta del salón, no una búsqueda de “peluquería cerca”.</p>
          </article>
        </div>
      </section>

      <PricingSection
        id="precios-salon"
        title="Cuánto cuesta el sistema para un salón"
        intro={
          <p>
            Un profesional usa el plan {PRICING.INDIVIDUAL.name}. Un equipo de estilistas, el plan {PRICING.EQUIPO.name} ({STAFF_LIMITS.EQUIPO} incluidos). Detalle en{" "}
            <Link href="/pricing" className={seo.link}>precios</Link>.
          </p>
        }
        individual={{ name: "Estilista independiente", price: individualPrice, detail: `Plan ${PRICING.INDIVIDUAL.name}.` }}
        team={{ name: "Salón con equipo", price: teamPrice, detail: `Plan ${PRICING.EQUIPO.name}.` }}
      />

      <section className={seo.bandWarm} aria-labelledby="prueba-salon">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
          <h2 id="prueba-salon" className={seo.h2}>Pruébalo en tu propia peluquería</h2>
          <p className={cn(seo.body, "mt-5")}>
            Configura tus servicios, profesionales y horarios y prueba Puragenda durante {TRIAL_DURATION_DAYS} días con tu propio catálogo. Así puedes comprobar cómo encaja el sistema en la operación real de tu salón antes de decidir.
          </p>
          <TrackedLink
            href="/register"
            cta="register"
            placement="trial_invite"
            className={cn(seo.primaryCta, "mt-8")}
          >
            Probar {TRIAL_DURATION_DAYS} días gratis
          </TrackedLink>
        </div>
      </section>

      <VerticalFaq id="faq-salon" title="Preguntas de quien administra el salón">
        {faqs.map((item) => (
          <FaqItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </VerticalFaq>

      <FinalCta
        id="cierre-salon"
        title="Carga un corte y un color, y reserva como tu clienta"
        primary={{ href: "/register", label: "Crear cuenta gratis", cta: "register", placement: "final_cta" }}
        secondary={{ href: "/para/peluquerias", label: "Ver página de rubro", tracked: false }}
      >
        <p>
          Si solo quieres la ficha corta del rubro, está en Soluciones o en la{" "}
          <Link href="/para/peluquerias" className={seo.link}>página de peluquerías</Link>.
        </p>
      </FinalCta>
    </LandingLayout>
  );
}
