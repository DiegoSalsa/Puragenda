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
  PSYCHOLOGISTS_SOFTWARE_PATH,
  psychologistsCatalogExample,
  psychologistsCoordinationProblems,
  psychologistsSoftwareCopy,
  psychologistsSoftwareFaqs,
  psychologistsSoftwareMetadata,
  psychologistsWorkflow,
} from "@/lib/data/psychologists-software-landing";

export const revalidate = 3600;
export const metadata: Metadata = {
  ...createPageMetadata({ ...psychologistsSoftwareMetadata, path: PSYCHOLOGISTS_SOFTWARE_PATH }),
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

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-8">
        <nav aria-label="Miga de pan" className="mb-10 text-sm">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/" className={linkStyle}>Inicio</Link></li><li aria-hidden="true">/</li>
            <li><Link href="/sistema-de-agendamiento-online" className={linkStyle}>Sistema de agendamiento</Link></li><li aria-hidden="true">/</li>
            <li aria-current="page">Psicólogos</li>
          </ol>
        </nav>
        <div className="grid items-start gap-10 lg:grid-cols-[1.45fr_1fr]">
          <div>
            <p className="mb-5 inline-block border-2 border-black bg-[#BFFCC6] px-3 py-1 text-sm font-black uppercase text-black">Agenda administrativa · independiente o equipo</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{psychologistsSoftwareCopy.h1}</h1>
            <p className="mt-6 text-xl leading-8">{psychologistsSoftwareCopy.hero}</p>
            <div className="mt-8 flex flex-wrap gap-5">
              <TrackedLink href="/register" cta="register" placement="hero" className={ctaStyle}>Probar {TRIAL_DURATION_DAYS} días gratis</TrackedLink>
              <TrackedCtaAnchor href="/demo" cta="demo" placement="hero" className="inline-flex items-center border-2 border-current px-6 py-4 font-bold">Ver demo</TrackedCtaAnchor>
            </div>
          </div>
          <aside className="rounded-3xl border-4 border-black bg-[#85E3FF] p-7 text-black shadow-[8px_8px_0_#000] dark:border-white">
            <h2 className="text-2xl font-black">Servicio → profesional → horario</h2>
            <p className="mt-4 leading-7">La agenda combina el tipo de cita que eligió la persona con el profesional y el bloque disponible en su jornada.</p>
            <p className="mt-4 font-bold leading-7">Cada consulta define sus nombres, duraciones, precios y reglas de atención.</p>
            <a href="#ejemplo-configuracion" className="mt-6 inline-block font-black underline underline-offset-4">Ver un ejemplo ficticio ↓</a>
          </aside>
        </div>
      </section>

      <div className="border-y-4 border-black bg-[#E9D5FF] text-black dark:border-white">
        <Section id="que-es" title="¿Qué es un software de agenda para psicólogos?">
          <p>{psychologistsSoftwareCopy.definition}</p>
          <p>Conoce también el <Link href="/sistema-de-agendamiento-online" className={linkStyle}>sistema de agendamiento online</Link> general de Puragenda y el <Link href="/para/psicologos" className={linkStyle}>contexto para consultas de psicología</Link>.</p>
        </Section>
      </div>

      <Section id="coordinacion" title="Coordina una consulta sin convertir la agenda en una ficha clínica">
        <div className="grid gap-6 md:grid-cols-2">
          {psychologistsCoordinationProblems.map((item) => <article key={item.title} className="border-t-2 border-current pt-5">
            <h3 className="text-xl font-black">{item.title}</h3>
            <p className="mt-3">{item.description}</p>
          </article>)}
        </div>
      </Section>

      <Section id="ejemplo-configuracion" title="Ejemplo de configuración">
        <p><strong>Ejemplo completamente ficticio.</strong> “Profesional A”, los servicios, precios, horarios y bloqueos solo muestran cómo se configura una agenda. Las duraciones son ilustrativas: no son recomendaciones ni estándares profesionales.</p>
        <div className="overflow-x-auto rounded-2xl border-2 border-current">
          <table className="w-full min-w-[680px] text-left text-base leading-6">
            <caption className="bg-[#BFFCC6] p-4 text-left font-bold text-black">El servicio y la jornada determinan qué horas se pueden reservar</caption>
            <thead><tr>{["Tipo de cita", "Duración ilustrativa", "Precio de ejemplo", "Profesional", "Disponibilidad"].map((label) => <th key={label} scope="col" className="border-b-2 border-current p-4">{label}</th>)}</tr></thead>
            <tbody>{psychologistsCatalogExample.map((item) => <tr key={item.service}>
              <th scope="row" className="border-b border-current p-4">{item.service}</th>
              <td className="whitespace-nowrap border-b border-current p-4">{item.duration} min</td>
              <td className="whitespace-nowrap border-b border-current p-4">{formatLandingClp(item.price)} CLP</td>
              <td className="border-b border-current p-4">{item.professional}</td>
              <td className="border-b border-current p-4">{item.availability}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p>Si el miércoles existe un bloqueo ficticio de 13:00 a 15:00, esas horas no se ofrecen aunque formen parte de la jornada de Profesional A. La agenda aplica las reglas administrativas configuradas.</p>
      </Section>

      <Section id="flujo" title="Del tipo de cita al historial administrativo">
        <ol className="grid gap-5 md:grid-cols-2">
          {psychologistsWorkflow.map((step, index) => <li key={step.title} className="rounded-2xl border-2 border-current p-5">
            <span className="font-black text-[#7C3AED]">{index + 1}.</span> <strong>{step.title}</strong>
            <p className="mt-2">{step.description}</p>
          </li>)}
        </ol>
      </Section>

      <div className="border-y-4 border-black bg-[#FFF5BA] text-black dark:border-white">
        <Section id="integraciones" title="Reservas, recordatorios e integraciones">
          <p>Comparte la agenda desde un enlace, integra el widget mediante iframe y personaliza la presentación con la marca de tu consulta. La persona reserva desde el navegador.</p>
          <p>Puragenda envía recordatorios por email para las citas del día siguiente. La cancelación y el reagendamiento respetan las reglas configuradas; si hay un abono aprobado, el cambio requiere coordinación directa con el profesional.</p>
          <p>La <Link href="/funciones/agenda-google-calendar" className={linkStyle}>integración con Google Calendar</Link> puede crear, actualizar y cancelar eventos de citas y considerar compromisos externos como horas ocupadas según la conexión. No crea una videollamada automáticamente.</p>
          <p>Si activas los <Link href="/funciones/reservas-online-con-abono" className={linkStyle}>abonos en reservas online</Link> y conectas Mercado Pago, puedes solicitar el monto administrativo que hayas configurado para el servicio.</p>
        </Section>
      </div>

      <div className="border-y-4 border-black bg-[#BFFCC6] text-black dark:border-white">
        <Section id="alcance" title="Agenda administrativa, no ficha clínica">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border-2 border-current bg-white p-6">
              <h3 className="text-xl font-black">Puragenda organiza</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5"><li>Servicios y tipos de cita</li><li>Duraciones, precios y profesionales</li><li>Horarios, bloqueos y disponibilidad</li><li>Reservas, recordatorios y cambios</li><li>Abonos configurables</li><li>Historial administrativo de citas</li></ul>
            </article>
            <article className="rounded-2xl border-2 border-current bg-white p-6">
              <h3 className="text-xl font-black">Puragenda no sustituye</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5"><li>Ficha clínica o notas terapéuticas</li><li>Diagnóstico o evaluación profesional</li><li>Sistema médico o software clínico</li><li>Videollamada clínica integrada</li></ul>
            </article>
          </div>
          <p>La documentación clínica debe mantenerse en la herramienta o proceso que el profesional utilice para ese propósito. Consulta nuestra <Link href="/politica-de-privacidad" className={linkStyle}>política de privacidad</Link> para conocer el tratamiento general de la información necesaria para coordinar una cita; su existencia no representa una certificación sanitaria.</p>
        </Section>
      </div>

      <Section id="planes" title="Planes generales para una profesional o un equipo">
        <div className="grid gap-6 md:grid-cols-2">
          {(["INDIVIDUAL", "EQUIPO"] as const).map((plan) => <article key={plan} className="rounded-3xl border-4 border-black bg-[#E9D5FF] p-7 text-black shadow-[5px_5px_0_#000] dark:border-white">
            <h3 className="text-2xl font-black">{PRICING[plan].name}</h3>
            <p className="mt-4 text-3xl font-black">{formatLandingClp(PRICING[plan].monthly)} <span className="text-base">CLP / mes</span></p>
            <p className="mt-3">{STAFF_LIMITS[plan]} {plan === "INDIVIDUAL" ? "profesional, con disponibilidad según el horario del negocio." : "profesionales incluidos, con servicios y horarios por integrante."}</p>
            {plan === "EQUIPO" && <p className="mt-3 text-base">Profesional adicional: {formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP / mes.</p>}
          </article>)}
        </div>
        <p>La prueba dura {TRIAL_DURATION_DAYS} días. No existe un plan específico para psicólogos: son los planes generales de Puragenda. Revisa <Link href="/pricing" className={linkStyle}>Precios</Link> y la <Link href="/funciones/agenda-multiples-profesionales" className={linkStyle}>agenda para múltiples profesionales</Link>.</p>
      </Section>

      <Section id="preguntas" title="Preguntas sobre el software de agenda para psicólogos">
        <div className="divide-y-2 divide-current">{faqs.map((item) => <article key={item.question} className="py-6">
          <h3 className="text-xl font-black">{item.question}</h3>
          <p className="mt-3">{item.answer}</p>
        </article>)}</div>
      </Section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center" aria-labelledby="probar-psicologia">
        <h2 id="probar-psicologia" className={headingStyle}>Prueba la agenda con tu propia consulta</h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8">Crea tus tipos de cita, define jornadas y revisa cómo se ve una reserva. Puedes explorar la demo o configurar tu agenda durante la prueba.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-5">
          <TrackedLink href="/register" cta="register" placement="final_cta" className={ctaStyle}>Crear la agenda</TrackedLink>
          <TrackedCtaAnchor href="/demo" cta="demo" placement="final_cta" className="inline-flex items-center px-4 py-4 font-bold underline">Explorar la demo</TrackedCtaAnchor>
        </div>
        <p className="mt-8"><Link href="/para/psicologos" className={linkStyle}>Cómo organizar las citas de tu consulta con Puragenda</Link></p>
      </section>
    </LandingLayout>
  );
}
