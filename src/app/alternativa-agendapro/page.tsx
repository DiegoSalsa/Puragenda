import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, SearchCheck } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Alternativa a AgendaPro: guía de comparación",
  description:
    "Compara Puragenda con AgendaPro usando precio total, flujo de reserva, pagos, exportación, soporte y necesidades reales de tu negocio.",
  alternates: { canonical: absoluteUrl("/alternativa-agendapro") },
  openGraph: {
    title: "Alternativa a AgendaPro: guía de comparación",
    description:
      "Una comparación transparente para elegir software de reservas en Chile sin depender de afirmaciones difíciles de verificar.",
    url: absoluteUrl("/alternativa-agendapro"),
    type: "article",
  },
};

const criteria = [
  {
    label: "Precio publicado",
    puragenda: "Individual $12.990 CLP/mes y Equipo $29.990 CLP/mes.",
    competitor: "Revisar los planes y la cotización vigente directamente con AgendaPro.",
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

export default function AlternativaAgendaProPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Alternativa a AgendaPro: guía de comparación",
    description:
      "Criterios verificables para comparar Puragenda, AgendaPro y otras plataformas de reservas.",
    datePublished: "2026-07-23",
    dateModified: "2026-07-23",
    inLanguage: "es-CL",
    mainEntityOfPage: absoluteUrl("/alternativa-agendapro"),
    author: {
      "@type": "Organization",
      name: "Equipo Puragenda",
      url: absoluteUrl("/sobre-nosotros"),
    },
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-32 md:pt-40">
        <header className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 border-2 border-black bg-[#FFF5BA] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white">
            <SearchCheck className="h-4 w-4" />
            Comparación actualizada el 23 de julio de 2026
          </div>
          <h1 className="mt-8 text-4xl font-black uppercase tracking-tighter sm:text-6xl">
            ¿Buscas una alternativa a AgendaPro?
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-bold leading-relaxed opacity-75">
            La respuesta depende de tu operación. Esta página separa lo que Puragenda publica y puede demostrar de lo que debes verificar directamente en cada proveedor.
          </p>
        </header>

        <section className="mt-16" aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className="text-3xl font-black uppercase tracking-tight">
            Comparación para una evaluación real
          </h2>
          <div className="mt-7 overflow-x-auto rounded-3xl border-4 border-black shadow-[8px_8px_0_#000] dark:border-white dark:shadow-[8px_8px_0_#fff]">
            <table className="min-w-[760px] w-full border-collapse bg-white text-left dark:bg-black">
              <caption className="sr-only">
                Aspectos que un negocio debe verificar al comparar Puragenda con AgendaPro
              </caption>
              <thead>
                <tr className="border-b-4 border-black bg-[#85E3FF] text-black dark:border-white">
                  <th className="p-5 font-black uppercase">Criterio</th>
                  <th className="border-l-4 border-black p-5 font-black uppercase dark:border-white">Puragenda</th>
                  <th className="border-l-4 border-black p-5 font-black uppercase dark:border-white">Qué verificar en AgendaPro</th>
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
            AgendaPro es una marca de su respectivo titular. Sus funciones, precios y condiciones pueden cambiar. Esta comparación no atribuye características que no podamos comprobar y recomienda validar la información en su sitio oficial.
          </p>
        </section>

        <section className="mx-auto mt-20 max-w-4xl">
          <h2 className="text-3xl font-black uppercase">Prueba estas seis tareas</h2>
          <p className="mt-5 text-lg font-medium leading-8 opacity-80">
            Antes de migrar, crea servicios reales y realiza una reserva desde el teléfono. Intenta ocupar el mismo horario dos veces, cobrar un abono, reprogramar, cancelar y exportar clientes. Anota cuántos pasos requiere cada tarea y qué costos adicionales aparecen para tu cantidad de profesionales.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Link
              href="/guias/como-elegir-sistema-reservas-chile"
              className="rounded-2xl border-4 border-black bg-[#BFFCC6] p-6 text-black shadow-[5px_5px_0_#000] dark:border-white"
            >
              <p className="text-sm font-black uppercase">Guía neutral</p>
              <p className="mt-2 text-xl font-black">Cómo elegir un sistema de reservas en Chile</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase">
                Leer criterios <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <a
              href="https://www.agendapro.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border-4 border-black bg-[#FFF5BA] p-6 text-black shadow-[5px_5px_0_#000] dark:border-white"
            >
              <p className="text-sm font-black uppercase">Fuente externa</p>
              <p className="mt-2 text-xl font-black">Revisar la información oficial de AgendaPro</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase">
                Abrir sitio <ExternalLink className="h-4 w-4" />
              </span>
            </a>
          </div>
        </section>

        <section className="mt-20 border-t-4 border-black pt-14 text-center dark:border-white">
          <h2 className="text-3xl font-black uppercase">Compruébalo con tu propio negocio</h2>
          <p className="mx-auto mt-4 max-w-2xl font-bold opacity-75">
            Configura el mismo catálogo que usas hoy y evalúa el recorrido completo durante la prueba.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/pricing" className="inline-flex items-center gap-2 border-4 border-black bg-[#7C3AED] px-7 py-4 font-black uppercase text-white shadow-[6px_6px_0_#000] dark:border-white">
              Ver planes <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/contacto" className="inline-flex items-center border-4 border-black bg-white px-7 py-4 font-black uppercase text-black shadow-[6px_6px_0_#000] dark:border-white">
              Pedir una demostración
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
