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
  ScopeComparison,
  SectionIntro,
  ServiceCatalogPreview,
  VerticalFaq,
  seo,
} from "@/components/landing/seo";
import { breadcrumbListNode, faqPageNode, jsonLdGraph, organizationRef, softwareApplicationNode } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import {
  PSYCHOLOGISTS_SOFTWARE_PATH,
  psychologistsCatalogExample,
  psychologistsCoordinationProblems,
  psychologistsSoftwareCopy,
  psychologistsSoftwareFaqs,
  psychologistsSoftwareMetadata,
  psychologistsWorkflow,
} from "@/lib/data/psychologists-software-landing";
import { cn } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  ...createPageMetadata({ ...psychologistsSoftwareMetadata, path: PSYCHOLOGISTS_SOFTWARE_PATH }),
  robots: { index: true, follow: true },
};

export default function PsychologistsSoftwareLandingPage() {
  const faqs = psychologistsSoftwareFaqs();

  return (
    <LandingLayout>
      <JsonLd data={jsonLdGraph([
        organizationRef(),
        softwareApplicationNode(psychologistsSoftwareCopy.softwareDescription),
        faqPageNode(faqs),
        breadcrumbListNode([
          { name: "Inicio", path: "/" },
          { name: "Sistema de agendamiento online", path: "/sistema-de-agendamiento-online" },
          { name: "Software de agenda para psicólogos", path: PSYCHOLOGISTS_SOFTWARE_PATH },
        ]),
      ])} />

      <LandingHero
        breadcrumbs={[
          { href: "/", label: "Inicio" },
          { href: "/sistema-de-agendamiento-online", label: "Sistema de agendamiento" },
          { label: "Psicólogos" },
        ]}
        eyebrow="Agenda administrativa · independiente o equipo"
        tone="sober"
        h1={psychologistsSoftwareCopy.h1}
        lead={psychologistsSoftwareCopy.hero}
        primaryCta={{ href: "/register", label: `Probar ${TRIAL_DURATION_DAYS} días gratis`, cta: "register", placement: "hero" }}
        secondaryCta={{ href: "/demo", label: "Ver demo", cta: "demo", placement: "hero" }}
        visual={
          <ProductFrame label="Agenda de la consulta" caption="Ejemplo ilustrativo. No representa una consulta real." tone="sober">
            <p className="text-lg font-black leading-tight">Servicio → profesional → horario</p>
            <p className="mt-2 text-sm font-medium leading-6 text-black/70">
              La agenda combina el tipo de cita que eligió la persona con el profesional y el bloque disponible en su jornada.
            </p>
            <ServiceCatalogPreview
              services={psychologistsCatalogExample.map((item, index) => ({
                name: item.service,
                duration: `${item.duration} min`,
                price: `${formatLandingClp(item.price)} CLP`,
                professional: item.professional,
                note: item.availability,
                selected: index === 0,
              }))}
            />
            <div className="mt-4 border-t-2 border-black/10 pt-4">
              <ExampleSchedule
                title="Miércoles · Profesional A"
                badge="Jornada"
                slots={[
                  { time: "10:00", label: "Primera cita", person: "A", state: "busy" },
                  { time: "11:00", label: "Seguimiento", person: "A", state: "free" },
                  { time: "13:00", label: "Bloqueo", person: "A", state: "blocked" },
                  { time: "15:00", label: "Disponible", person: "A", state: "free" },
                ]}
                footer="El bloqueo ficticio de 13:00 a 15:00 no se ofrece aunque esté dentro de la jornada."
              />
            </div>
          </ProductFrame>
        }
      />

      <section className={seo.band} aria-labelledby="que-es">
        <div className={seo.section}>
          <SectionIntro id="que-es" title="¿Qué es un software de agenda para psicólogos?">
            <p>{psychologistsSoftwareCopy.definition}</p>
            <p>Conoce también el <Link href="/sistema-de-agendamiento-online" className={seo.link}>sistema de agendamiento online</Link> general de Puragenda y el <Link href="/para/psicologos" className={seo.link}>contexto para consultas de psicología</Link>.</p>
          </SectionIntro>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="coordinacion">
        <SectionIntro id="coordinacion" title="Coordina una consulta sin convertir la agenda en una ficha clínica" />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {psychologistsCoordinationProblems.map((item) => (
            <article key={item.title} className="border-t-2 border-black/15 pt-5 dark:border-white/20">
              <h3 className={seo.h3}>{item.title}</h3>
              <p className={cn(seo.body, "mt-3 text-base")}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={seo.section} aria-labelledby="ejemplo-configuracion">
        <SectionIntro id="ejemplo-configuracion" title="Ejemplo de configuración">
          <p>
            <strong>Ejemplo completamente ficticio.</strong> “Profesional A”, los servicios, precios, horarios y bloqueos solo muestran cómo se configura una agenda. Las duraciones son ilustrativas: no son recomendaciones ni estándares profesionales.
          </p>
        </SectionIntro>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.14em] text-black/50">El servicio y la jornada determinan qué horas se pueden reservar</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {psychologistsCatalogExample.map((item) => (
            <article key={item.service} className={cn(seo.panel, "p-6")}>
              <h3 className={seo.h3}>{item.service}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Duración ilustrativa</dt>
                  <dd className="mt-1 text-lg font-black">{item.duration} min</dd>
                </div>
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Precio de ejemplo</dt>
                  <dd className="mt-1 text-lg font-black">{formatLandingClp(item.price)} CLP</dd>
                </div>
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Profesional</dt>
                  <dd className="mt-1 font-bold">{item.professional}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Disponibilidad</dt>
                  <dd className="mt-1 font-bold">{item.availability}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <p className={cn(seo.body, "mt-6")}>
          Si el miércoles existe un bloqueo ficticio de 13:00 a 15:00, esas horas no se ofrecen aunque formen parte de la jornada de Profesional A. La agenda aplica las reglas administrativas configuradas.
        </p>
      </section>

      <section className={seo.section} aria-labelledby="flujo">
        <SectionIntro id="flujo" title="Del tipo de cita al historial administrativo" />
        <ol className="mt-10 grid gap-5 md:grid-cols-2">
          {psychologistsWorkflow.map((step, index) => (
            <li key={step.title} className="border-t-2 border-black/15 pt-5 dark:border-white/20">
              <span className="font-black text-[#7C3AED]">{index + 1}.</span>{" "}
              <strong>{step.title}</strong>
              <p className={cn(seo.body, "mt-2 text-base")}>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={seo.bandQuiet} aria-labelledby="integraciones">
        <div className={seo.section}>
          <SectionIntro id="integraciones" title="Reservas, recordatorios e integraciones">
            <p>Comparte la agenda desde un enlace, integra el widget mediante iframe y personaliza la presentación con la marca de tu consulta. La persona reserva desde el navegador.</p>
            <p>Puragenda envía recordatorios por email para las citas del día siguiente. La cancelación y el reagendamiento respetan las reglas configuradas; si hay un abono aprobado, el cambio requiere coordinación directa con el profesional.</p>
            <p>La <Link href="/funciones/agenda-google-calendar" className={seo.link}>integración con Google Calendar</Link> puede crear, actualizar y cancelar eventos de citas y considerar compromisos externos como horas ocupadas según la conexión. No crea una videollamada automáticamente.</p>
            <p>Si activas los <Link href="/funciones/reservas-online-con-abono" className={seo.link}>abonos en reservas online</Link> y conectas Mercado Pago, puedes solicitar el monto administrativo que hayas configurado para el servicio.</p>
          </SectionIntro>
        </div>
      </section>

      <section className={seo.band} aria-labelledby="alcance">
        <div className={seo.section}>
          <SectionIntro id="alcance" title="Agenda administrativa, no ficha clínica">
            <ScopeComparison
              left={{
                title: "Puragenda organiza",
                children: (
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Servicios y tipos de cita</li>
                    <li>Duraciones, precios y profesionales</li>
                    <li>Horarios, bloqueos y disponibilidad</li>
                    <li>Reservas, recordatorios y cambios</li>
                    <li>Abonos configurables</li>
                    <li>Historial administrativo de citas</li>
                  </ul>
                ),
              }}
              right={{
                title: "Puragenda no sustituye",
                children: (
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Ficha clínica o notas terapéuticas</li>
                    <li>Diagnóstico o evaluación profesional</li>
                    <li>Sistema médico o software clínico</li>
                    <li>Videollamada clínica integrada</li>
                  </ul>
                ),
              }}
            />
            <p className="mt-6">
              La documentación clínica debe mantenerse en la herramienta o proceso que el profesional utilice para ese propósito. Consulta nuestra <Link href="/politica-de-privacidad" className={seo.link}>política de privacidad</Link> para conocer el tratamiento general de la información necesaria para coordinar una cita; su existencia no representa una certificación sanitaria.
            </p>
          </SectionIntro>
        </div>
      </section>

      <PricingSection
        id="planes"
        title="Planes generales para una profesional o un equipo"
        individual={{
          name: PRICING.INDIVIDUAL.name,
          price: formatLandingClp(PRICING.INDIVIDUAL.monthly),
          detail: `${STAFF_LIMITS.INDIVIDUAL} profesional, con disponibilidad según el horario del negocio.`,
        }}
        team={{
          name: PRICING.EQUIPO.name,
          price: formatLandingClp(PRICING.EQUIPO.monthly),
          detail: (
            <>
              <p>{STAFF_LIMITS.EQUIPO} profesionales incluidos, con servicios y horarios por integrante.</p>
              <p className="mt-3">Profesional adicional: {formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP / mes.</p>
            </>
          ),
        }}
        footer={
          <p>
            La prueba dura {TRIAL_DURATION_DAYS} días. No existe un plan específico para psicólogos: son los planes generales de Puragenda. Revisa <Link href="/pricing" className={seo.link}>Precios</Link> y la <Link href="/funciones/agenda-multiples-profesionales" className={seo.link}>agenda para múltiples profesionales</Link>.
          </p>
        }
      />

      <VerticalFaq id="preguntas" title="Preguntas sobre el software de agenda para psicólogos">
        {faqs.map((item) => (
          <FaqItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </VerticalFaq>

      <FinalCta
        id="probar-psicologia"
        title="Prueba la agenda con tu propia consulta"
        primary={{ href: "/register", label: "Crear la agenda", cta: "register", placement: "final_cta" }}
        secondary={{ href: "/demo", label: "Explorar la demo", cta: "demo", placement: "final_cta" }}
        footer={<p><Link href="/para/psicologos" className={seo.link}>Cómo organizar las citas de tu consulta con Puragenda</Link></p>}
      >
        <p>Crea tus tipos de cita, define jornadas y revisa cómo se ve una reserva. Puedes explorar la demo o configurar tu agenda durante la prueba.</p>
      </FinalCta>
    </LandingLayout>
  );
}
