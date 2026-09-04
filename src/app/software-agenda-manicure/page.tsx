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
import { MANICURE_SOFTWARE_PATH, manicureCatalogExample, manicureProblems, manicureSoftwareCopy, manicureSoftwareFaqs, manicureSoftwareMetadata, manicureWorkflow } from "@/lib/data/manicure-software-landing";
import { cn } from "@/lib/utils";

export const revalidate = 3600;
export const metadata: Metadata = {
  ...createPageMetadata({ ...manicureSoftwareMetadata, path: MANICURE_SOFTWARE_PATH }),
  robots: { index: true, follow: true },
};

function ManicureHeroVisual() {
  const [shortService, longService] = manicureCatalogExample;
  return (
    <ProductFrame
      label="Catálogo del estudio"
      caption="Catálogo ficticio para explicar el funcionamiento. No es un nail studio real."
      tone="pink"
    >
      <p className="text-lg font-black leading-tight">¿El retiro está incluido?</p>
      <p className="mt-2 text-sm font-medium leading-6 text-black/70">
        Esa pregunta cambia el servicio que la clienta debe reservar. Ponla en el catálogo antes de ofrecerle una hora.
      </p>
      <ServiceCatalogPreview
        services={[
          {
            name: shortService.service,
            duration: `${shortService.duration} min`,
            price: `${formatLandingClp(shortService.price)} CLP`,
            professional: shortService.professional,
            note: shortService.availability,
            selected: true,
          },
          {
            name: longService.service,
            duration: `${longService.duration} min`,
            price: `${formatLandingClp(longService.price)} CLP`,
            professional: longService.professional,
            note: longService.availability,
          },
        ]}
      />
      <div className="mt-4 rounded-2xl border-2 border-black bg-white p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Hueco de Profesional B</p>
        <p className="mt-1 font-black">10:00 a 11:00</p>
        <ul className="mt-2 space-y-1 text-sm font-medium">
          <li className="flex justify-between gap-3">
            <span>Esmaltado 60 min</span>
            <span className="font-black text-emerald-800">Cabe</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Con retiro 90 min</span>
            <span className="font-black text-[#9F1239]">No cabe</span>
          </li>
        </ul>
      </div>
    </ProductFrame>
  );
}

export default function ManicureSoftwareLandingPage() {
  const faqs = manicureSoftwareFaqs();
  return (
    <LandingLayout>
      <JsonLd data={jsonLdGraph([
        organizationRef(), softwareApplicationNode(manicureSoftwareCopy.softwareDescription), faqPageNode(faqs),
        breadcrumbListNode([{ name: "Inicio", path: "/" }, { name: "Sistema de agendamiento online", path: "/sistema-de-agendamiento-online" }, { name: "Software de agenda para manicure", path: MANICURE_SOFTWARE_PATH }]),
      ])} />

      <LandingHero
        breadcrumbs={[
          { href: "/", label: "Inicio" },
          { href: "/sistema-de-agendamiento-online", label: "Sistema de agendamiento" },
          { label: "Manicure" },
        ]}
        eyebrow="Para manicuristas y estudios de uñas"
        tone="pink"
        h1={manicureSoftwareCopy.h1}
        lead={manicureSoftwareCopy.hero}
        primaryCta={{ href: "/register", label: `Probar ${TRIAL_DURATION_DAYS} días gratis`, cta: "register", placement: "hero" }}
        secondaryCta={{ href: "/demo", label: "Ver demo", cta: "demo", placement: "hero" }}
        visual={<ManicureHeroVisual />}
      />

      <section className={seo.band} aria-labelledby="que-es">
        <div className={seo.section}>
          <SectionIntro id="que-es" title="¿Qué es un software de agenda para manicure?">
            <p>{manicureSoftwareCopy.definition}</p>
          </SectionIntro>
        </div>
      </section>

      <section className={seo.section} aria-labelledby="dia-a-dia">
        <SectionIntro id="dia-a-dia" title="Lo que conviene resolver antes de dar una hora" />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {manicureProblems.map((item) => (
            <article key={item.title} className="border-t-2 border-black/15 pt-5 dark:border-white/20">
              <h3 className={seo.h3}>{item.title}</h3>
              <p className={cn(seo.body, "mt-3 text-base")}>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={seo.section} aria-labelledby="ejemplo-configuracion">
        <SectionIntro id="ejemplo-configuracion" kicker="Servicio · duración · precio · profesional" title="Ejemplo de configuración">
          <p>
            <strong>Catálogo ficticio para explicar el funcionamiento.</strong> Los precios, tiempos y profesionales de este ejemplo no pertenecen a un cliente real ni son tarifas recomendadas para tu negocio.
          </p>
        </SectionIntro>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.14em] text-black/50">Dos servicios separados: el retiro cambia el bloque necesario</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {manicureCatalogExample.map((item, index) => (
            <article key={item.service} className={cn(seo.panel, "p-6", index === 1 && "bg-[#F3E8FF] dark:bg-[#251830]")}>
              <h3 className={seo.h3}>{item.service}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Duración</dt>
                  <dd className="mt-1 text-lg font-black">{item.duration} min</dd>
                </div>
                <div>
                  <dt className="font-black uppercase tracking-wide text-black/45">Precio ficticio</dt>
                  <dd className="mt-1 text-lg font-black">{formatLandingClp(item.price)} CLP</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-black uppercase tracking-wide text-black/45">Profesional asignada</dt>
                  <dd className="mt-1 font-bold">{item.professional}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-black uppercase tracking-wide text-black/45">Disponibilidad</dt>
                  <dd className="mt-1 font-medium leading-6">{item.availability}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <p className={cn(seo.body, "mt-6")}>
          Supongamos que B tiene un espacio libre de 10:00 a 11:00 y otra cita después. Allí cabe el esmaltado de 60 minutos, pero no el servicio con retiro de 90. Para reservar este último, la clienta necesita un bloque más largo dentro del horario de B.
        </p>
        <p className={cn(seo.body, "mt-4")}>
          <strong>¿Y las opciones?</strong> Puedes configurar, por ejemplo, una alternativa de acabado con un precio adicional si mantiene el tiempo del servicio. Si un retiro, mantenimiento o diseño cambia el tiempo necesario, crea otro servicio con su duración completa, como en este ejemplo. El estudio define estas diferencias; Puragenda no evalúa el estado de las uñas ni elige la técnica por la clienta.
        </p>
      </section>

      <section className={seo.bandWarm} aria-labelledby="recorrido">
        <div className={seo.section}>
          <SectionIntro id="recorrido" title="Del catálogo de uñas a una cita en tu panel" />
          <ol className="mt-10 space-y-0 overflow-hidden rounded-[24px] border-2 border-black bg-white dark:border-white dark:bg-[#0c0c0c]">
            {manicureWorkflow.map((item, index) => (
              <li key={item.title} className="grid gap-3 border-b-2 border-black p-5 last:border-b-0 dark:border-white sm:grid-cols-[3.5rem_1fr] sm:items-start">
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

      <section className={seo.section} aria-labelledby="individual-equipo">
        <SectionIntro id="individual-equipo" title="Tu mesa de trabajo o un nail studio con equipo">
          <p>
            Si atiendes sola, organiza el catálogo y los bloques disponibles con el horario del negocio. Si trabajan varias manicuristas, asigna a cada una los servicios que realiza y su jornada en el plan Equipo. Una profesional que hace esmaltado no tiene por qué ofrecer también todos los mantenimientos o diseños.
          </p>
          <p>
            Los <strong>bloqueos</strong> marcan períodos sin atención. Si necesitas reservar tiempo para preparar tu mesa o dejar un descanso, configúralo; no depende de que la clienta lo recuerde al elegir su hora.
          </p>
          <p>
            Consulta cómo funciona la <Link href="/funciones/agenda-multiples-profesionales" className={seo.link}>agenda para múltiples profesionales</Link>. También puedes <Link href="/funciones/agenda-google-calendar" className={seo.link}>conectar Google Calendar</Link> según la configuración disponible para tu cuenta.
          </p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="abonos">
        <SectionIntro id="abonos" title="Abonos para el servicio que vas a reservar">
          <p>
            Un retiro más esmaltado puede ocupar un bloque largo de tu jornada. Si decides pedir un anticipo, activa los abonos, define el monto del servicio y conecta Mercado Pago para cobrarlo por ese medio. La clienta ve cuánto debe abonar antes del pago.
          </p>
          <p>
            Cuando una cita tiene un abono aprobado, los cambios y la cancelación requieren contactar al negocio. El enlace no hace esa gestión automáticamente ni implica una devolución automática.
          </p>
          <p>
            Revisa la función de <Link href="/funciones/reservas-online-con-abono" className={seo.link}>reservas online con abono</Link> y la guía para <Link href="/guias/cobrar-abonos-reservas-online" className={seo.link}>configurar y comunicar un abono</Link>.
          </p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="enlace">
        <SectionIntro id="enlace" title="De tu Instagram al catálogo reservable">
          <p>
            Comparte tu enlace en la biografía de Instagram. Si tienes una web, inserta el widget mediante iframe. La clienta reserva desde el navegador: servicio, opciones disponibles, profesional cuando corresponde, hora y datos de contacto.
          </p>
          <p>
            Personaliza la marca de tu página de reservas con tu logo y colores. El catálogo debe explicar qué incluye el esmaltado, cuándo elegir retiro y qué diseños requieren consultar antes; esas aclaraciones las escribe el estudio.
          </p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="gestion-citas">
        <SectionIntro id="gestion-citas" title="Después de reservar: email, cambios e historial">
          <p>
            <strong>Recordatorios por email:</strong> Puragenda envía avisos para las citas del día siguiente. La clienta necesita proporcionar su correo correctamente al reservar.
          </p>
          <p>
            <strong>Cancelación y reagendamiento:</strong> los enlaces de gestión permiten actuar cuando la cita lo admite. Para reagendar, el negocio debe habilitarlo y la solicitud debe respetar el plazo de anticipación y la disponibilidad. Con un abono aprobado, la clienta debe contactar al negocio para cancelar o cambiar la hora.
          </p>
          <p>
            <strong>Historial administrativo:</strong> revisa las citas anteriores y el servicio que se reservó. Para un mantenimiento, ese contexto puede servir para conversar con la clienta; no sustituye confirmar qué trabajo necesita ahora.
          </p>
        </SectionIntro>
      </section>

      <section className={seo.section} aria-labelledby="comparacion">
        <SectionIntro id="comparacion" title="Anotar una hora o reservar tu catálogo de uñas">
          <ScopeComparison
            left={{
              title: "Una anotación genérica",
              children: <p>“Manicure a las 10:00” deja por aclarar si hay retiro, cuánto dura el diseño y quién realiza esa técnica. Esos detalles se coordinan por separado.</p>,
            }}
            right={{
              title: "Una reserva con el catálogo configurado",
              children: <p>“Esmaltado con retiro, 90 minutos, profesional B” parte de un servicio con tiempo y precio definidos. La disponibilidad se evalúa para ese bloque y esa profesional.</p>,
            }}
          />
          <p className="mt-6">
            La diferencia depende de cómo configures el catálogo. Si publicas un único servicio sin distinguir trabajos, el sistema no puede deducir que la clienta necesita un retiro o un diseño más largo.
          </p>
        </SectionIntro>
      </section>

      <PricingSection
        id="precios"
        title="Planes de Puragenda para tu forma de trabajar"
        individual={{
          name: PRICING.INDIVIDUAL.name,
          price: formatLandingClp(PRICING.INDIVIDUAL.monthly),
          detail: `${STAFF_LIMITS.INDIVIDUAL} profesional. Disponibilidad con el horario del negocio.`,
        }}
        team={{
          name: PRICING.EQUIPO.name,
          price: formatLandingClp(PRICING.EQUIPO.monthly),
          detail: (
            <>
              <p>{STAFF_LIMITS.EQUIPO} profesionales incluidos, con horarios por integrante.</p>
              <p className="mt-3">Profesional adicional: {formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP / mes.</p>
            </>
          ),
        }}
        footer={
          <p>
            Prueba de {TRIAL_DURATION_DAYS} días. Son los planes generales de Puragenda; consulta las condiciones vigentes y opciones de contratación en <Link href="/pricing" className={seo.link}>Precios</Link>.
          </p>
        }
      />

      <VerticalFaq id="preguntas" title="Preguntas sobre la agenda para manicuristas">
        {faqs.map((item) => (
          <FaqItem key={item.question} question={item.question} answer={item.answer} />
        ))}
      </VerticalFaq>

      <FinalCta
        id="probar-catalogo"
        title="Empieza por un esmaltado y un servicio con retiro"
        primary={{ href: "/register", label: "Crear mi agenda de manicure", cta: "register", placement: "final_cta" }}
        secondary={{ href: "/demo", label: "Explorar la demo", cta: "demo", placement: "final_cta" }}
        footer={
          <p>
            <Link href="/para/manicure" className={seo.link}>Cómo aplicar Puragenda al día a día de tu nail studio</Link>
          </p>
        }
      >
        <p>Configura los tiempos de tu estudio y revisa cómo se ofrece cada cita. Puedes explorar primero la demo o crear tu catálogo durante la prueba.</p>
      </FinalCta>
    </LandingLayout>
  );
}
