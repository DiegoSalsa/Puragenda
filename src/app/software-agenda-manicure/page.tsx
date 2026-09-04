import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LandingLayout } from "@/components/landing/landing-layout";
import { TrackedCtaAnchor, TrackedLink } from "@/components/analytics/tracked-link";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbListNode, faqPageNode, jsonLdGraph, organizationRef, softwareApplicationNode } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import { MANICURE_SOFTWARE_PATH, manicureCatalogExample, manicureProblems, manicureSoftwareCopy, manicureSoftwareFaqs, manicureSoftwareMetadata, manicureWorkflow } from "@/lib/data/manicure-software-landing";

export const revalidate = 3600;
export const metadata: Metadata = {
  ...createPageMetadata({ ...manicureSoftwareMetadata, path: MANICURE_SOFTWARE_PATH }),
  robots: { index: true, follow: true },
};

const linkStyle = "font-bold text-[#5B21B6] underline underline-offset-4 dark:text-[#C4B5FD]";
const headingStyle = "text-3xl font-black tracking-tight sm:text-4xl";
const ctaStyle = "inline-flex items-center justify-center border-4 border-black bg-[#7C3AED] px-6 py-4 font-black text-white shadow-[5px_5px_0_#000] dark:border-white";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section aria-labelledby={id} className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
    <h2 id={id} className={headingStyle}>{title}</h2>
    <div className="mt-6 space-y-5 text-lg leading-8">{children}</div>
  </section>;
}

export default function ManicureSoftwareLandingPage() {
  const faqs = manicureSoftwareFaqs();
  return (
    <LandingLayout>
      <JsonLd data={jsonLdGraph([
        organizationRef(), softwareApplicationNode(manicureSoftwareCopy.softwareDescription), faqPageNode(faqs),
        breadcrumbListNode([{ name: "Inicio", path: "/" }, { name: "Sistema de agendamiento online", path: "/sistema-de-agendamiento-online" }, { name: "Software de agenda para manicure", path: MANICURE_SOFTWARE_PATH }]),
      ])} />

      <section className="mx-auto max-w-6xl px-6 pt-8 pb-14">
        <nav aria-label="Miga de pan" className="mb-10 text-sm">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/" className={linkStyle}>Inicio</Link></li><li aria-hidden="true">/</li>
            <li><Link href="/sistema-de-agendamiento-online" className={linkStyle}>Sistema de agendamiento</Link></li><li aria-hidden="true">/</li>
            <li aria-current="page">Manicure</li>
          </ol>
        </nav>
        <div className="grid items-start gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="mb-5 inline-block border-2 border-black bg-[#FFB5E8] px-3 py-1 text-sm font-black uppercase text-black">Para manicuristas y estudios de uñas</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{manicureSoftwareCopy.h1}</h1>
            <p className="mt-6 text-xl leading-8">{manicureSoftwareCopy.hero}</p>
            <div className="mt-8 flex flex-wrap gap-5">
              <TrackedLink href="/register" cta="register" placement="hero" className={ctaStyle}>Probar {TRIAL_DURATION_DAYS} días gratis</TrackedLink>
              <TrackedCtaAnchor href="/demo" cta="demo" placement="hero" className="inline-flex items-center border-2 border-current px-6 py-4 font-bold">Ver demo</TrackedCtaAnchor>
            </div>
          </div>
          <aside className="rounded-3xl border-4 border-black bg-[#FFF5BA] p-7 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <h2 className="text-2xl font-black">¿El retiro está incluido?</h2>
            <p className="mt-4 leading-7">Esa pregunta cambia el servicio que la clienta debe reservar. Ponla en el catálogo antes de ofrecerle una hora.</p>
            <p className="mt-4 font-bold leading-7">Servicio → duración y precio → profesional → horario disponible.</p>
            <a href="#ejemplo-configuracion" className="mt-6 inline-block font-black underline underline-offset-4">Ver el ejemplo de configuración ↓</a>
          </aside>
        </div>
      </section>

      <div className="border-y-4 border-black bg-[#E9D5FF] text-black dark:border-white">
        <Section id="que-es" title="¿Qué es un software de agenda para manicure?">
          <p>{manicureSoftwareCopy.definition}</p>
        </Section>
      </div>

      <Section id="dia-a-dia" title="Lo que conviene resolver antes de dar una hora">
        <div className="grid gap-6 md:grid-cols-2">
          {manicureProblems.map((item) => <article key={item.title} className="border-t-2 border-current pt-5">
            <h3 className="text-xl font-black">{item.title}</h3><p className="mt-3">{item.description}</p>
          </article>)}
        </div>
      </Section>

      <Section id="ejemplo-configuracion" title="Ejemplo de configuración">
        <p><strong>Catálogo ficticio para explicar el funcionamiento.</strong> Los precios, tiempos y profesionales de este ejemplo no pertenecen a un cliente real ni son tarifas recomendadas para tu negocio.</p>
        <div className="overflow-x-auto rounded-2xl border-2 border-current">
          <table className="w-full min-w-[660px] text-left text-base leading-6">
            <caption className="bg-[#FFB5E8] p-4 text-left font-bold text-black">Dos servicios separados: el retiro cambia el bloque necesario</caption>
            <thead><tr>{["Servicio", "Duración", "Precio ficticio", "Profesional asignada", "Disponibilidad"].map((label) => <th key={label} scope="col" className="border-b-2 border-current p-4">{label}</th>)}</tr></thead>
            <tbody>{manicureCatalogExample.map((item) => <tr key={item.service}>
              <th scope="row" className="border-b border-current p-4">{item.service}</th>
              <td className="border-b border-current p-4 whitespace-nowrap">{item.duration} min</td>
              <td className="border-b border-current p-4 whitespace-nowrap">{formatLandingClp(item.price)} CLP</td>
              <td className="border-b border-current p-4">{item.professional}</td>
              <td className="border-b border-current p-4">{item.availability}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p>Supongamos que B tiene un espacio libre de 10:00 a 11:00 y otra cita después. Allí cabe el esmaltado de 60 minutos, pero no el servicio con retiro de 90. Para reservar este último, la clienta necesita un bloque más largo dentro del horario de B.</p>
        <p><strong>¿Y las opciones?</strong> Puedes configurar, por ejemplo, una alternativa de acabado con un precio adicional si mantiene el tiempo del servicio. Si un retiro, mantenimiento o diseño cambia el tiempo necesario, crea otro servicio con su duración completa, como en la tabla. El estudio define estas diferencias; Puragenda no evalúa el estado de las uñas ni elige la técnica por la clienta.</p>
      </Section>

      <div className="border-y-4 border-black bg-[#BFFCC6] text-black dark:border-white">
        <Section id="recorrido" title="Del catálogo de uñas a una cita en tu panel">
          <ol className="space-y-7">{manicureWorkflow.map((item, index) => <li key={item.title} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
            <span aria-hidden="true" className="text-3xl font-black">{index + 1}.</span>
            <div><h3 className="text-xl font-black">{item.title}</h3><p className="mt-2">{item.description}</p></div>
          </li>)}</ol>
        </Section>
      </div>

      <Section id="individual-equipo" title="Tu mesa de trabajo o un nail studio con equipo">
        <p>Si atiendes sola, organiza el catálogo y los bloques disponibles con el horario del negocio. Si trabajan varias manicuristas, asigna a cada una los servicios que realiza y su jornada en el plan Equipo. Una profesional que hace esmaltado no tiene por qué ofrecer también todos los mantenimientos o diseños.</p>
        <p>Los <strong>bloqueos</strong> marcan períodos sin atención. Si necesitas reservar tiempo para preparar tu mesa o dejar un descanso, configúralo; no depende de que la clienta lo recuerde al elegir su hora.</p>
        <p>Consulta cómo funciona la <Link href="/funciones/agenda-multiples-profesionales" className={linkStyle}>agenda para múltiples profesionales</Link>. También puedes <Link href="/funciones/agenda-google-calendar" className={linkStyle}>conectar Google Calendar</Link> según la configuración disponible para tu cuenta.</p>
      </Section>

      <Section id="abonos" title="Abonos para el servicio que vas a reservar">
        <p>Un retiro más esmaltado puede ocupar un bloque largo de tu jornada. Si decides pedir un anticipo, activa los abonos, define el monto del servicio y conecta Mercado Pago para cobrarlo por ese medio. La clienta ve cuánto debe abonar antes del pago.</p>
        <p>Cuando una cita tiene un abono aprobado, los cambios y la cancelación requieren contactar al negocio. El enlace no hace esa gestión automáticamente ni implica una devolución automática.</p>
        <p>Revisa la función de <Link href="/funciones/reservas-online-con-abono" className={linkStyle}>reservas online con abono</Link> y la guía para <Link href="/guias/cobrar-abonos-reservas-online" className={linkStyle}>configurar y comunicar un abono</Link>.</p>
      </Section>

      <Section id="enlace" title="De tu Instagram al catálogo reservable">
        <p>Comparte tu enlace en la biografía de Instagram. Si tienes una web, inserta el widget mediante iframe. La clienta reserva desde el navegador: servicio, opciones disponibles, profesional cuando corresponde, hora y datos de contacto.</p>
        <p>Personaliza la marca de tu página de reservas con tu logo y colores. El catálogo debe explicar qué incluye el esmaltado, cuándo elegir retiro y qué diseños requieren consultar antes; esas aclaraciones las escribe el estudio.</p>
      </Section>

      <Section id="gestion-citas" title="Después de reservar: email, cambios e historial">
        <p><strong>Recordatorios por email:</strong> Puragenda envía avisos para las citas del día siguiente. La clienta necesita proporcionar su correo correctamente al reservar.</p>
        <p><strong>Cancelación y reagendamiento:</strong> los enlaces de gestión permiten actuar cuando la cita lo admite. Para reagendar, el negocio debe habilitarlo y la solicitud debe respetar el plazo de anticipación y la disponibilidad. Con un abono aprobado, la clienta debe contactar al negocio para cancelar o cambiar la hora.</p>
        <p><strong>Historial administrativo:</strong> revisa las citas anteriores y el servicio que se reservó. Para un mantenimiento, ese contexto puede servir para conversar con la clienta; no sustituye confirmar qué trabajo necesita ahora.</p>
      </Section>

      <Section id="comparacion" title="Anotar una hora o reservar tu catálogo de uñas">
        <dl className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-current p-6"><dt className="text-xl font-black">Una anotación genérica</dt><dd className="mt-3">“Manicure a las 10:00” deja por aclarar si hay retiro, cuánto dura el diseño y quién realiza esa técnica. Esos detalles se coordinan por separado.</dd></div>
          <div className="rounded-2xl border-2 border-current p-6"><dt className="text-xl font-black">Una reserva con el catálogo configurado</dt><dd className="mt-3">“Esmaltado con retiro, 90 minutos, profesional B” parte de un servicio con tiempo y precio definidos. La disponibilidad se evalúa para ese bloque y esa profesional.</dd></div>
        </dl>
        <p>La diferencia depende de cómo configures el catálogo. Si publicas un único servicio sin distinguir trabajos, el sistema no puede deducir que la clienta necesita un retiro o un diseño más largo.</p>
      </Section>

      <Section id="precios" title="Planes de Puragenda para tu forma de trabajar">
        <div className="grid gap-6 md:grid-cols-2">
          {(["INDIVIDUAL", "EQUIPO"] as const).map((plan) => {
            return <article key={plan} className="rounded-3xl border-4 border-black bg-[#FFF5BA] p-7 text-black shadow-[5px_5px_0_#000] dark:border-white">
              <h3 className="text-2xl font-black">{PRICING[plan].name}</h3>
              <p className="mt-4 text-3xl font-black">{formatLandingClp(PRICING[plan].monthly)} <span className="text-base">CLP / mes</span></p>
              <p className="mt-3">{STAFF_LIMITS[plan]} {plan === "INDIVIDUAL" ? "profesional. Disponibilidad con el horario del negocio." : "profesionales incluidos, con horarios por integrante."}</p>
              {plan === "EQUIPO" && <p className="mt-3 text-base">Profesional adicional: {formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP / mes.</p>}
            </article>;
          })}
        </div>
        <p>Prueba de {TRIAL_DURATION_DAYS} días. Son los planes generales de Puragenda; consulta las condiciones vigentes y opciones de contratación en <Link href="/pricing" className={linkStyle}>Precios</Link>.</p>
      </Section>

      <Section id="preguntas" title="Preguntas sobre la agenda para manicuristas">
        <div className="divide-y-2 divide-current">{faqs.map((item) => <article key={item.question} className="py-6">
          <h3 className="text-xl font-black">{item.question}</h3><p className="mt-3">{item.answer}</p>
        </article>)}</div>
      </Section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center" aria-labelledby="probar-catalogo">
        <h2 id="probar-catalogo" className={headingStyle}>Empieza por un esmaltado y un servicio con retiro</h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8">Configura los tiempos de tu estudio y revisa cómo se ofrece cada cita. Puedes explorar primero la demo o crear tu catálogo durante la prueba.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-5">
          <TrackedLink href="/register" cta="register" placement="final_cta" className={ctaStyle}>Crear mi agenda de manicure</TrackedLink>
          <TrackedCtaAnchor href="/demo" cta="demo" placement="final_cta" className="inline-flex items-center px-4 py-4 font-bold underline">Explorar la demo</TrackedCtaAnchor>
        </div>
        <p className="mt-8"><Link href="/para/manicure" className={linkStyle}>Cómo aplicar Puragenda al día a día de tu nail studio</Link></p>
      </section>
    </LandingLayout>
  );
}
