
import { LocalizedText } from "@/components/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, SearchCheck } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { absoluteUrl } from "@/lib/site";
import { createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { articleNode, faqPageNode, jsonLdGraph, organizationRef } from "@/lib/json-ld";
import { ContentSectionExtras } from "@/components/landing/seo/content-section-extras";
import { formatContentDate } from "@/components/landing/seo/expansion-content";
import { AGENDAPRO_PLANS_URL, BOOKING_COMPARISON_REVIEWED_AT, agendaproPlansTable } from "@/lib/data/booking-system-comparison";

export const metadata: Metadata = createPageMetadata({
  title: "AgendaPro: precios y alternativa para reservas",
  description:
    "Consulta los planes y precios publicados de AgendaPro en Chile, con IVA y profesionales incluidos. Compara reservas, abonos y costo total con Puragenda.",
  path: "/alternativa-agendapro",
  keywords: ["AgendaPro precios", "cuánto cuesta AgendaPro", "alternativa AgendaPro", "AgendaPro Chile"],
  type: "article",
  publishedTime: "2026-07-23",
  modifiedTime: BOOKING_COMPARISON_REVIEWED_AT,
});

export const revalidate = 3600;

const criteria = [
  {
    label: "Precio publicado",
    puragenda: "Individual $12.990 CLP/mes y Equipo $29.990 CLP/mes.",
    competitor: "Individual $15.900 CLP/mes + IVA para un profesional, según la página oficial revisada el 14 de octubre de 2026. Otros planes varían con el equipo.",
  },
  {
    label: "Prueba del producto",
    puragenda: "30 días sin tarjeta para validar el flujo con tu propio catálogo.",
    competitor: "Confirmar modalidad y condiciones vigentes en su sitio oficial.",
  },
  {
    label: "Reserva del cliente",
    puragenda: "Flujo web desde un enlace o iframe; el cliente no administra una contraseña.",
    competitor: "Probar el recorrido vigente desde un teléfono antes de decidir.",
  },
  {
    label: "Encargos y cupos futuros",
    puragenda: "Modo opcional con abono, archivos, capacidad por período y entrega estimada.",
    competitor: "Confirmar si el flujo requerido está disponible en el plan evaluado.",
  },
  {
    label: "Soporte",
    puragenda: "Atención directa en español por el equipo de PuroCode en Chile.",
    competitor: "Verificar canales, horarios y tiempos de respuesta ofrecidos al contratar.",
  },
  {
    label: "Salida y datos",
    puragenda: "Solicita una demostración de la exportación antes de contratar.",
    competitor: "Solicita la misma demostración y compara los formatos entregados.",
  },
];

const faq = [
  {
    question: "¿Cuánto cuesta AgendaPro?",
    answer: "En Chile, la página oficial de AgendaPro revisada el 14 de octubre de 2026 publica Individual a $15.900 CLP/mes + IVA para un profesional; Básico a $34.900 para la selección de dos; Premium a $54.900 para cinco; y Pro a $249.900 para diez. El precio puede cambiar al modificar profesionales, periodicidad o productos adicionales. Confirma la configuración al contratar.",
  },
  {
    question: "¿Qué alternativa a AgendaPro existe en Chile?",
    answer: "Puragenda es una alternativa chilena para profesionales y equipos que necesitan reservas online, abonos, personalización y soporte directo en español, con 30 días de prueba sin tarjeta.",
  },
  {
    question: "¿Qué debería comparar además del precio mensual?",
    answer: "Compara el costo total, cantidad de profesionales, experiencia móvil del cliente, pagos o abonos, recordatorios, exportación de datos, soporte y facilidad de migración.",
  },
];

export default function AlternativaAgendaProPage() {
  return (
    <LandingLayout>
      <JsonLd
        data={jsonLdGraph([
          organizationRef(),
          articleNode({
            headline: "Alternativa a AgendaPro: guía de comparación",
            description:
              "Criterios verificables para comparar Puragenda, AgendaPro y otras plataformas de reservas.",
            url: absoluteUrl("/alternativa-agendapro"),
            datePublished: "2026-07-23",
            dateModified: BOOKING_COMPARISON_REVIEWED_AT,
          }),
          faqPageNode(faq),
        ])}
      />

      <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-8 md:pt-16">
        <header className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 border-2 border-black bg-[#FFF5BA] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
            <SearchCheck className="h-4 w-4" />
            Comparación revisada el <time dateTime={BOOKING_COMPARISON_REVIEWED_AT}>{formatContentDate(BOOKING_COMPARISON_REVIEWED_AT)}</time>
          </div>
          <h1 className="mt-8 text-4xl font-black uppercase tracking-tighter sm:text-6xl">
            <LocalizedText id="g4b57whrUrpi" />
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-bold leading-relaxed opacity-75">
            <LocalizedText id="Zd1r5e2CNA7Z" />
          </p>
        </header>

        <section className="mx-auto mt-14 max-w-4xl rounded-3xl border-4 border-black bg-[#E9D5FF] p-7 text-black shadow-[7px_7px_0_#000] dark:border-white sm:p-9" aria-labelledby="precio-agendapro">
          <p className="text-sm font-black uppercase tracking-wider">Respuesta breve</p>
          <h2 id="precio-agendapro" className="mt-2 text-3xl font-black uppercase tracking-tight">¿Cuánto cuesta AgendaPro?</h2>
          <p className="mt-4 text-lg font-bold leading-8">
            AgendaPro publica el plan Individual en Chile a <strong>$15.900 CLP al mes + IVA</strong> para un profesional, según su página oficial revisada el 14 de octubre de 2026. Los demás planes cambian según el equipo y la configuración. Puragenda publica planes desde <strong>$12.990 CLP al mes</strong>, con 30 días de prueba sin tarjeta y reservas ilimitadas.
          </p>
          <Link href="/pricing" className="mt-6 inline-flex items-center gap-2 font-black underline decoration-2 underline-offset-4">
            Ver precios publicados de Puragenda <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mx-auto mt-16 min-w-0 max-w-4xl" aria-labelledby="planes-agendapro">
          <h2 id="planes-agendapro" className="text-3xl font-black uppercase tracking-tight">Planes de AgendaPro en Chile: precios y profesionales incluidos</h2>
          <p className="mt-5 text-lg font-medium leading-8 opacity-80">Estos valores corresponden a la modalidad mensual y a las selecciones de profesionales mostradas en la fuente. Revisa el importe al cambiar la cantidad de integrantes; los productos adicionales y el procesamiento de pagos pueden sumar otros cargos.</p>
          <ContentSectionExtras section={{ heading: "Planes de AgendaPro", paragraphs: [], table: agendaproPlansTable, links: [{ href: AGENDAPRO_PLANS_URL, label: "Consultar los planes oficiales de AgendaPro en Chile" }] }} />
          <p className="mt-6 font-medium leading-7 opacity-80">Para comparar el costo total, utiliza la misma cantidad de profesionales y el mismo período de pago. Confirma el tratamiento de impuestos, los mensajes necesarios y las tarifas de cobro antes de calcular una diferencia entre proveedores.</p>
        </section>

        <section className="mt-16" aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className="text-3xl font-black uppercase tracking-tight">
            <LocalizedText id="tJca4miZeGXd" />
          </h2>
          <div className="mt-7 overflow-x-auto rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] dark:border-white dark:shadow-[8px_8px_0_#fff]">
            <table className="min-w-[760px] w-full border-collapse bg-white text-left dark:bg-black">
              <caption className="sr-only">
                <LocalizedText id="HzoDPPx88iX-" />
              </caption>
              <thead>
                <tr className="border-b-4 border-black bg-[#85E3FF] text-black dark:border-white">
                  <th className="p-5 font-black uppercase"><LocalizedText id="W03nWeFJRSfo" /></th>
                  <th className="border-l-4 border-black p-5 font-black uppercase dark:border-white">Puragenda</th>
                  <th className="border-l-4 border-black p-5 font-black uppercase dark:border-white"><LocalizedText id="R06NJJTE2k4A" /></th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((criterion) => (
                  <tr key={criterion.label} className="border-b-2 border-black/20 last:border-b-0 dark:border-white/20">
                    <th scope="row" className="p-5 align-top text-base font-black">{criterion.label}</th>
                    <td className="border-l-2 border-black/20 p-5 align-top font-medium dark:border-white/20">
                      <span className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                        {criterion.puragenda}
                      </span>
                    </td>
                    <td className="border-l-2 border-black/20 p-5 align-top font-medium opacity-80 dark:border-white/20">
                      {criterion.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm font-bold leading-relaxed opacity-65">
            <LocalizedText id="w5i8i4pc2Gml" />
          </p>
        </section>

        <section className="mx-auto mt-20 max-w-4xl">
          <h2 className="text-3xl font-black uppercase"><LocalizedText id="-uojIkY8tDDO" /></h2>
          <p className="mt-5 text-lg font-medium leading-8 opacity-80">
            <LocalizedText id="BU82Fgd5B_oS" />
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Link
              href="/guias/como-elegir-sistema-reservas-chile"
              className="rounded-2xl border-4 border-black bg-[#BFFCC6] p-6 text-black shadow-[5px_5px_0_#000] dark:border-white"
            >
              <p className="text-sm font-black uppercase"><LocalizedText id="k_SuAKBA6Lgv" /></p>
              <p className="mt-2 text-xl font-black"><LocalizedText id="FVHax1TRyRbe" /></p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase">
                <LocalizedText id="geQUdwd2Hhtz" /> <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <a
              href="https://agendapro.com/cl"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border-4 border-black bg-[#FFF5BA] p-6 text-black shadow-[5px_5px_0_#000] dark:border-white"
            >
              <p className="text-sm font-black uppercase"><LocalizedText id="VAhlwkTkJMXG" /></p>
              <p className="mt-2 text-xl font-black"><LocalizedText id="ELDBZQHIDJlT" /></p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase">
                <LocalizedText id="2L7icG6B0ZJi" /> <ExternalLink className="h-4 w-4" />
              </span>
            </a>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-4xl" aria-labelledby="faq-comparacion">
          <h2 id="faq-comparacion" className="text-3xl font-black uppercase">Preguntas frecuentes</h2>
          <div className="mt-7 space-y-5">
            {faq.map((item) => (
              <article key={item.question} className="rounded-2xl border-4 border-black bg-white p-6 text-black shadow-[5px_5px_0_#000] dark:border-white">
                <h3 className="text-xl font-black">{item.question}</h3>
                <p className="mt-3 font-medium leading-7 opacity-80">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t-4 border-black pt-14 text-center dark:border-white">
          <h2 className="text-3xl font-black uppercase"><LocalizedText id="YYqZ2YHVEw7O" /></h2>
          <p className="mx-auto mt-4 max-w-2xl font-bold opacity-75">
            <LocalizedText id="tpJbf1kUMbtj" />
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/pricing" className="inline-flex items-center gap-2 border-4 border-black bg-[#7C3AED] px-7 py-4 font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white">
              <LocalizedText id="B0rydBFNOg1_" /> <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/contacto" className="inline-flex items-center border-4 border-black bg-white px-7 py-4 font-black uppercase text-black shadow-[6px_6px_0_#000] dark:border-white">
              <LocalizedText id="8E4L8d1N3hiN" />
            </Link>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}
