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
import {
  AESTHETICS_SOFTWARE_PATH,
  aestheticsCatalogExample,
  aestheticsCoordinationProblems,
  aestheticsSoftwareCopy,
  aestheticsSoftwareFaqs,
  aestheticsSoftwareMetadata,
  aestheticsWorkflow,
} from "@/lib/data/aesthetics-software-landing";

export const revalidate = 3600;
export const metadata: Metadata = {
  ...createPageMetadata({ ...aestheticsSoftwareMetadata, path: AESTHETICS_SOFTWARE_PATH }),
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

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-8">
        <nav aria-label="Miga de pan" className="mb-10 text-sm">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/" className={linkStyle}>Inicio</Link></li><li aria-hidden="true">/</li>
            <li><Link href="/sistema-de-agendamiento-online" className={linkStyle}>Sistema de agendamiento</Link></li><li aria-hidden="true">/</li>
            <li aria-current="page">Centros de estética</li>
          </ol>
        </nav>
        <div className="grid items-start gap-10 lg:grid-cols-[1.45fr_1fr]">
          <div>
            <p className="mb-5 inline-block border-2 border-black bg-[#BFFCC6] px-3 py-1 text-sm font-black uppercase text-black">Estética no clínica · individual o equipo</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{aestheticsSoftwareCopy.h1}</h1>
            <p className="mt-6 text-xl leading-8">{aestheticsSoftwareCopy.hero}</p>
            <div className="mt-8 flex flex-wrap gap-5">
              <TrackedLink href="/register" cta="register" placement="hero" className={ctaStyle}>Probar {TRIAL_DURATION_DAYS} días gratis</TrackedLink>
              <TrackedCtaAnchor href="/demo" cta="demo" placement="hero" className="inline-flex items-center border-2 border-current px-6 py-4 font-bold">Ver demo</TrackedCtaAnchor>
            </div>
          </div>
          <aside className="rounded-3xl border-4 border-black bg-[#85E3FF] p-7 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <h2 className="text-2xl font-black">Tres variables para ofrecer una hora</h2>
            <p className="mt-4 leading-7">Una limpieza facial, un diseño de cejas y unas extensiones de pestañas pueden requerir tiempos y profesionales diferentes.</p>
            <p className="mt-4 font-bold leading-7">Servicio → profesional que lo realiza → bloque disponible en su jornada.</p>
            <a href="#ejemplo-configuracion" className="mt-6 inline-block font-black underline underline-offset-4">Ver un catálogo ficticio ↓</a>
          </aside>
        </div>
      </section>

      <div className="border-y-4 border-black bg-[#E9D5FF] text-black dark:border-white">
        <Section id="que-es" title="¿Qué es un software de agenda para centros de estética?">
          <p>{aestheticsSoftwareCopy.definition}</p>
        </Section>
      </div>

      <Section id="coordinacion" title="Un catálogo variado necesita reglas claras">
        <div className="grid gap-6 md:grid-cols-2">
          {aestheticsCoordinationProblems.map((item) => <article key={item.title} className="border-t-2 border-current pt-5">
            <h3 className="text-xl font-black">{item.title}</h3>
            <p className="mt-3">{item.description}</p>
          </article>)}
        </div>
      </Section>

      <Section id="ejemplo-configuracion" title="Ejemplo de configuración">
        <p><strong>Catálogo completamente ficticio.</strong> Los nombres genéricos, precios, duraciones y profesionales solo explican cómo se configura la agenda; no pertenecen a un cliente ni representan tarifas recomendadas.</p>
        <div className="overflow-x-auto rounded-2xl border-2 border-current">
          <table className="w-full min-w-[720px] text-left text-base leading-6">
            <caption className="bg-[#BFFCC6] p-4 text-left font-bold text-black">Servicio, duración y profesional determinan qué horario se puede reservar</caption>
            <thead><tr>{["Servicio", "Duración", "Precio ficticio", "Profesional", "Regla de agenda"].map((label) => <th key={label} scope="col" className="border-b-2 border-current p-4">{label}</th>)}</tr></thead>
            <tbody>{aestheticsCatalogExample.map((item) => <tr key={item.service}>
              <th scope="row" className="border-b border-current p-4">{item.service}</th>
              <td className="whitespace-nowrap border-b border-current p-4">{item.duration} min</td>
              <td className="whitespace-nowrap border-b border-current p-4">{formatLandingClp(item.price)} CLP</td>
              <td className="border-b border-current p-4">{item.professional}</td>
              <td className="border-b border-current p-4">{item.schedule}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p>Si la profesional A tiene 30 minutos libres, puede aparecer una hora para diseño de cejas, pero no para una limpieza facial de 60 minutos. Las extensiones de pestañas solo se ofrecen cuando la profesional B tiene un bloque continuo de 90 minutos.</p>
        <p>El centro define el catálogo y quién realiza cada servicio. Puragenda aplica esas configuraciones para la reserva; no evalúa qué servicio necesita la clienta ni decide qué atención debe realizarse.</p>
      </Section>

      <div className="border-y-4 border-black bg-[#FFF5BA] text-black dark:border-white">
        <Section id="recorrido" title="Del catálogo a la cita confirmada">
          <ol className="space-y-7">{aestheticsWorkflow.map((item, index) => <li key={item.title} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
            <span aria-hidden="true" className="text-3xl font-black">{index + 1}.</span>
            <div><h3 className="text-xl font-black">{item.title}</h3><p className="mt-2">{item.description}</p></div>
          </li>)}</ol>
        </Section>
      </div>

      <Section id="profesionales" title="Una profesional independiente o un equipo con catálogos distintos">
        <p>Con el plan Individual, una profesional organiza sus servicios y disponibilidad mediante el horario del negocio. Con Equipo, cada integrante puede tener servicios asignados, su propia jornada y períodos bloqueados.</p>
        <p>Esto permite que la agenda de cejas de A y la agenda de pestañas de B compartan el mismo enlace del centro sin ofrecer a una profesional para un servicio que no tiene asignado.</p>
        <p>Consulta el funcionamiento de la <Link href="/funciones/agenda-multiples-profesionales" className={linkStyle}>agenda para múltiples profesionales</Link>. Si usas calendarios externos, revisa también la <Link href="/funciones/agenda-google-calendar" className={linkStyle}>integración con Google Calendar</Link>.</p>
      </Section>

      <Section id="bloqueos" title="Horarios y bloqueos antes de publicar disponibilidad">
        <p>Configura la jornada de cada profesional y marca los períodos en que no atenderá. Un bloqueo puede representar vacaciones, una pausa, una capacitación o cualquier tramo que el centro decida mantener cerrado.</p>
        <p>La disponibilidad se calcula con las citas, jornadas y bloqueos configurados. Esta lógica se aplica a la agenda de la profesional; los recursos físicos compartidos requieren otro control.</p>
      </Section>

      <Section id="abonos" title="Abonos configurables mediante Mercado Pago">
        <p>Si el negocio quiere solicitar un anticipo, puede activar los abonos, definir el monto para el servicio y conectar Mercado Pago. La clienta ve el monto antes de completar el pago.</p>
        <p>Una cita con abono aprobado no se cancela ni reagenda automáticamente desde el enlace: la clienta debe contactar al centro. La gestión tampoco implica una devolución automática.</p>
        <p>Revisa los detalles de las <Link href="/funciones/reservas-online-con-abono" className={linkStyle}>reservas online con abono</Link>.</p>
      </Section>

      <Section id="canales" title="Una reserva desde Instagram o tu sitio web">
        <p>Comparte el enlace de reservas en la biografía de Instagram o en una conversación con la clienta. Si el centro tiene un sitio, puede insertar el widget mediante iframe. El flujo se abre en el navegador y no exige instalar una aplicación.</p>
        <p>La clienta elige servicio, profesional cuando corresponde y una hora. También puedes usar tu logo y colores en la página de reservas para mantener una presentación coherente con el centro.</p>
      </Section>

      <Section id="despues" title="Después de reservar: email, cambios e historial">
        <p><strong>Recordatorio por email:</strong> Puragenda envía el aviso para las citas del día siguiente. No se presenta como un recordatorio por WhatsApp o SMS.</p>
        <p><strong>Cancelación y reagendamiento:</strong> los enlaces de gestión funcionan según la anticipación y las reglas que el negocio haya configurado. Una cita con abono aprobado requiere coordinación directa con el centro.</p>
        <p><strong>Historial administrativo:</strong> el panel permite consultar citas y servicios anteriores. Ese registro ayuda a administrar la agenda, pero no documenta evaluaciones profesionales ni información clínica.</p>
      </Section>

      <div className="border-y-4 border-black bg-[#BFFCC6] text-black dark:border-white">
        <Section id="alcance" title="Puragenda organiza la agenda del centro">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border-2 border-current bg-white p-6">
              <h3 className="text-xl font-black">Lo que organiza</h3>
              <p className="mt-3">Servicios, duración, precio, opciones, profesionales, disponibilidad, reservas, bloqueos, abonos e historial administrativo de citas.</p>
            </article>
            <article className="rounded-2xl border-2 border-current bg-white p-6">
              <h3 className="text-xl font-black">Herramientas que siguen separadas</h3>
              <p className="mt-3">Fichas clínicas, inventario, caja, aparatología y control de cabinas, camas, salas u otros recursos físicos compartidos.</p>
            </article>
          </div>
          <p>El alcance es la organización de citas para servicios estéticos no clínicos. El centro mantiene por separado cualquier proceso médico, evaluación profesional o administración de recursos físicos.</p>
        </Section>
      </div>

      <Section id="precios" title="Planes para una profesional o un equipo">
        <div className="grid gap-6 md:grid-cols-2">
          {(["INDIVIDUAL", "EQUIPO"] as const).map((plan) => <article key={plan} className="rounded-3xl border-4 border-black bg-[#E9D5FF] p-7 text-black shadow-[5px_5px_0_#000] dark:border-white">
            <h3 className="text-2xl font-black">{PRICING[plan].name}</h3>
            <p className="mt-4 text-3xl font-black">{formatLandingClp(PRICING[plan].monthly)} <span className="text-base">CLP / mes</span></p>
            <p className="mt-3">{STAFF_LIMITS[plan]} {plan === "INDIVIDUAL" ? "profesional, con disponibilidad según el horario del negocio." : "profesionales incluidos, con servicios y horarios por integrante."}</p>
            {plan === "EQUIPO" && <p className="mt-3 text-base">Profesional adicional: {formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP / mes.</p>}
          </article>)}
        </div>
        <p>La prueba dura {TRIAL_DURATION_DAYS} días. Estos son los planes generales de Puragenda; consulta las condiciones vigentes en <Link href="/pricing" className={linkStyle}>Precios</Link> y el resumen de <Link href="/caracteristicas" className={linkStyle}>características</Link>.</p>
      </Section>

      <Section id="preguntas" title="Preguntas sobre la agenda para centros de estética">
        <div className="divide-y-2 divide-current">{faqs.map((item) => <article key={item.question} className="py-6">
          <h3 className="text-xl font-black">{item.question}</h3>
          <p className="mt-3">{item.answer}</p>
        </article>)}</div>
      </Section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center" aria-labelledby="probar-estetica">
        <h2 id="probar-estetica" className={headingStyle}>Prueba con tres servicios de distinta duración</h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8">Crea un catálogo pequeño, asigna quién realiza cada servicio y revisa qué horas se ofrecen. Puedes explorar la demo o configurar tu agenda durante la prueba.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-5">
          <TrackedLink href="/register" cta="register" placement="final_cta" className={ctaStyle}>Crear la agenda del centro</TrackedLink>
          <TrackedCtaAnchor href="/demo" cta="demo" placement="final_cta" className="inline-flex items-center px-4 py-4 font-bold underline">Explorar la demo</TrackedCtaAnchor>
        </div>
        <p className="mt-8"><Link href="/para/estetica" className={linkStyle}>Cómo configurar Puragenda dentro de un centro de estética</Link></p>
      </section>
    </LandingLayout>
  );
}
