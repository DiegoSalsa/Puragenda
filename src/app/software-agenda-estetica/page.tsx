import Link from "next/link";
import type { Metadata } from "next";
import { LandingLayout } from "@/components/landing/landing-layout";
import { JsonLd } from "@/components/json-ld";
import {
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
  AESTHETICS_SOFTWARE_PATH,
  aestheticsCatalogExample,
  aestheticsCoordinationProblems,
  aestheticsSoftwareCopy,
  aestheticsSoftwareFaqs,
  aestheticsSoftwareMetadata,
  aestheticsWorkflow,
} from "@/lib/data/aesthetics-software-landing";
import { cn } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  ...createPageMetadata({ ...aestheticsSoftwareMetadata, path: AESTHETICS_SOFTWARE_PATH }),
  robots: { index: true, follow: true },
};

export default function AestheticsSoftwareLandingPage() {
  const faqs = aestheticsSoftwareFaqs();

  return (
    <LandingLayout>
      <JsonLd data={jsonLdGraph([
        organizationRef(),
        softwareApplicationNode(aestheticsSoftwareCopy.softwareDescription),
        faqPageNode(faqs),
        breadcrumbListNode([
          { name: "Inicio", path: "/" },
          { name: "Sistema de agendamiento online", path: "/sistema-de-agendamiento-online" },
          { name: "Software de agenda para centros de estética", path: AESTHETICS_SOFTWARE_PATH },
        ]),
      ])} />

      <LandingHero
        breadcrumbs={[
          { href: "/", label: "Inicio" },
          { href: "/sistema-de-agendamiento-online", label: "Sistema de agendamiento" },
          { label: "Centros de estética" },
        ]}
        eyebrow="Estética no clínica · individual o equipo"
        tone="mint"
        h1={aestheticsSoftwareCopy.h1}
        lead={aestheticsSoftwareCopy.hero}
        primaryCta={{ href: "/register", label: `Probar ${TRIAL_DURATION_DAYS} días gratis`, cta: "register", placement: "hero" }}
        secondaryCta={{ href: "/demo", label: "Ver demo", cta: "demo", placement: "hero" }}
        visual={
          <ProductFrame label="Catálogo del centro" caption="Catálogo completamente ficticio. No pertenece a un centro real.">
            <p className="text-lg font-black leading-tight">Tres variables para ofrecer una hora</p>
            <p className="mt-2 text-sm font-medium leading-6 text-black/70">
              Una limpieza facial, un diseño de cejas y unas extensiones de pestañas pueden requerir tiempos y profesionales diferentes.
            </p>
            <ServiceCatalogPreview
              services={aestheticsCatalogExample.map((item, index) => ({
                name: item.service,
                duration: `${item.duration} min`,
                price: `${formatLandingClp(item.price)} CLP`,
                professional: item.professional,
                note: item.schedule,
                selected: index === 0,
              }))}
            />
          </ProductFrame>
        }
      />

      <section className={seo.band} aria-labelledby="que-es">
        <div className={seo.section}>
          <SectionIntro id="que-es" title="¿Qué es un software de agenda para centros de estética?">
            <p>{aestheticsSoftwareCopy.definition}</p>
          </SectionIntro>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="coordinacion">
        <SectionIntro id="coordinacion" title="Un catálogo variado necesita reglas claras" />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {aestheticsCoordinationProblems.map((item) => (
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
            <strong>Catálogo completamente ficticio.</strong> Los nombres genéricos, precios, duraciones y profesionales solo explican cómo se configura la agenda; no pertenecen a un cliente ni representan tarifas recomendadas.
          </p>
        </SectionIntro>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.14em] text-black/50">Servicio, duración y profesional determinan qué horario se puede reservar</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {aestheticsCatalogExample.map((item) => (
            <article key={item.service} className={cn(seo.panel, "p-5")}>
              <h3 className={seo.h3}>{item.service}</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Duración</dt>
                  <dd className="mt-1 text-lg font-black">{item.duration} min</dd>
                </div>
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Precio ficticio</dt>
                  <dd className="mt-1 text-lg font-black">{formatLandingClp(item.price)} CLP</dd>
                </div>
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Profesional</dt>
                  <dd className="mt-1 font-bold">{item.professional}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Regla de agenda</dt>
                  <dd className="mt-1 font-medium leading-6">{item.schedule}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <p className={cn(seo.body, "mt-6")}>
          Si la profesional A tiene 30 minutos libres, puede aparecer una hora para diseño de cejas, pero no para una limpieza facial de 60 minutos. Las extensiones de pestañas solo se ofrecen cuando la profesional B tiene un bloque continuo de 90 minutos.
        </p>
        <p className={cn(seo.body, "mt-4")}>
          El centro define el catálogo y quién realiza cada servicio. Puragenda aplica esas configuraciones para la reserva; no evalúa qué servicio necesita la clienta ni decide qué atención debe realizarse.
        </p>
      </section>

      <section className={seo.bandWarm} aria-labelledby="recorrido">
        <div className={seo.section}>
          <SectionIntro id="recorrido" title="Del catálogo a la cita confirmada" />
          <ol className="mt-10 overflow-hidden rounded-[24px] border-2 border-black bg-white dark:border-white dark:bg-[#0c0c0c]">
            {aestheticsWorkflow.map((item, index) => (
              <li key={item.title} className="grid gap-3 border-b-2 border-black p-5 last:border-b-0 dark:border-white sm:grid-cols-[3.5rem_1fr]">
                <span aria-hidden="true" className="text-3xl font-black text-[#7C3AED]">{index + 1}.</span>
                <div>
                  <h3 className={seo.h3}>{item.title}</h3>
                  <p className={cn(seo.body, "mt-2 text-base")}>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="profesionales">
        <SectionIntro id="profesionales" title="Una profesional independiente o un equipo con catálogos distintos">
          <p>Con el plan Individual, una profesional organiza sus servicios y disponibilidad mediante el horario del negocio. Con Equipo, cada integrante puede tener servicios asignados, su propia jornada y períodos bloqueados.</p>
          <p>Esto permite que la agenda de cejas de A y la agenda de pestañas de B compartan el mismo enlace del centro sin ofrecer a una profesional para un servicio que no tiene asignado.</p>
          <p>Consulta el funcionamiento de la <Link href="/funciones/agenda-multiples-profesionales" className={seo.link}>agenda para múltiples profesionales</Link>. Si usas calendarios externos, revisa también la <Link href="/funciones/agenda-google-calendar" className={seo.link}>integración con Google Calendar</Link>.</p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="bloqueos">
        <SectionIntro id="bloqueos" title="Horarios y bloqueos antes de publicar disponibilidad">
          <p>Configura la jornada de cada profesional y marca los períodos en que no atenderá. Un bloqueo puede representar vacaciones, una pausa, una capacitación o cualquier tramo que el centro decida mantener cerrado.</p>
          <p>La disponibilidad se calcula con las citas, jornadas y bloqueos configurados. Esta lógica se aplica a la agenda de la profesional; los recursos físicos compartidos requieren otro control.</p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="abonos">
        <SectionIntro id="abonos" title="Abonos configurables mediante Mercado Pago">
          <p>Si el negocio quiere solicitar un anticipo, puede activar los abonos, definir el monto para el servicio y conectar Mercado Pago. La clienta ve el monto antes de completar el pago.</p>
          <p>Una cita con abono aprobado no se cancela ni reagenda automáticamente desde el enlace: la clienta debe contactar al centro. La gestión tampoco implica una devolución automática.</p>
          <p>Revisa los detalles de las <Link href="/funciones/reservas-online-con-abono" className={seo.link}>reservas online con abono</Link>.</p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="canales">
        <SectionIntro id="canales" title="Una reserva desde Instagram o tu sitio web">
          <p>Comparte el enlace de reservas en la biografía de Instagram o en una conversación con la clienta. Si el centro tiene un sitio, puede insertar el widget mediante iframe. El flujo se abre en el navegador y no exige instalar una aplicación.</p>
          <p>La clienta elige servicio, profesional cuando corresponde y una hora. También puedes usar tu logo y colores en la página de reservas para mantener una presentación coherente con el centro.</p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="despues">
        <SectionIntro id="despues" title="Después de reservar: email, cambios e historial">
          <p><strong>Recordatorio por email:</strong> Puragenda envía el aviso para las citas del día siguiente. No se presenta como un recordatorio por WhatsApp o SMS.</p>
          <p><strong>Cancelación y reagendamiento:</strong> los enlaces de gestión funcionan según la anticipación y las reglas que el negocio haya configurado. Una cita con abono aprobado requiere coordinación directa con el centro.</p>
          <p><strong>Historial administrativo:</strong> el panel permite consultar citas y servicios anteriores. Ese registro ayuda a administrar la agenda, pero no documenta evaluaciones profesionales ni información clínica.</p>
        </SectionIntro>
      </section>

      <section className={seo.band} aria-labelledby="alcance">
        <div className={seo.section}>
          <SectionIntro id="alcance" title="Puragenda organiza la agenda del centro">
            <ScopeComparison
              left={{
                title: "Lo que organiza",
                children: <p>Servicios, duración, precio, opciones, profesionales, disponibilidad, reservas, bloqueos, abonos e historial administrativo de citas.</p>,
              }}
              right={{
                title: "Herramientas que siguen separadas",
                children: <p>Fichas clínicas, inventario, caja, aparatología y control de cabinas, camas, salas u otros recursos físicos compartidos.</p>,
              }}
            />
            <p className="mt-6">El alcance es la organización de citas para servicios estéticos no clínicos. El centro mantiene por separado cualquier proceso médico, evaluación profesional o administración de recursos físicos.</p>
          </SectionIntro>
        </div>
      </section>

      <PricingSection
        id="precios"
        title="Planes para una profesional o un equipo"
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
            La prueba dura {TRIAL_DURATION_DAYS} días. Estos son los planes generales de Puragenda; consulta las condiciones vigentes en <Link href="/pricing" className={seo.link}>Precios</Link> y el resumen de <Link href="/caracteristicas" className={seo.link}>características</Link>.
          </p>
        }
      />

      <VerticalFaq id="preguntas" title="Preguntas sobre la agenda para centros de estética">
        {faqs.map((item) => (
          <FaqItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </VerticalFaq>

      <FinalCta
        id="probar-estetica"
        title="Prueba con tres servicios de distinta duración"
        primary={{ href: "/register", label: "Crear la agenda del centro", cta: "register", placement: "final_cta" }}
        secondary={{ href: "/demo", label: "Explorar la demo", cta: "demo", placement: "final_cta" }}
        footer={<p><Link href="/para/estetica" className={seo.link}>Cómo configurar Puragenda dentro de un centro de estética</Link></p>}
      >
        <p>Crea un catálogo pequeño, asigna quién realiza cada servicio y revisa qué horas se ofrecen. Puedes explorar la demo o configurar tu agenda durante la prueba.</p>
      </FinalCta>
    </LandingLayout>
  );
}
