import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { WebsiteCommercialSection } from "@/components/website-commercial-section";
import { PricingComparisonTable } from "@/components/pricing-page-sections";
import { createPageMetadata } from "@/lib/seo";
import { commercialRegisterUrl } from "@/websites/commercial";
import { formatPublicClp, PLUS_GROWTH_SUMMARY, PUBLIC_ANNUAL_NOTE, PUBLIC_TRIAL_NOTE, publicMonthlyQuote } from "@/lib/public-plans";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbListNode, jsonLdGraph, organizationRef, softwareApplicationNode } from "@/lib/json-ld";

export const revalidate = 3600;

const startingPrice = formatPublicClp(publicMonthlyQuote("PURAGENDA_PLUS").monthlyTotal);
export const metadata: Metadata = createPageMetadata({
  title: "Puragenda+ | Agenda, sitio web y crecimiento inteligente",
  description: `Agenda, sitio web con reservas, Puri avanzado y automatizaciones Contact Flow desde ${startingPrice} CLP/mes, IVA incluido. Prueba Puragenda+ durante 30 días.`,
  path: "/puragenda-plus",
});

const faqs = [
  ["¿Qué incluye Puragenda+?", `Todo Puragenda más tu sitio web personalizable, editor, hosting, SSL y reservas integradas. ${PLUS_GROWTH_SUMMARY}`],
  ["¿Puedo sumar profesionales?", "Sí. Parte con un profesional y suma los que necesites. En Precios, el selector de cada tarjeta muestra el total de ese plan con su escala progresiva."],
  ["¿Qué puedo probar gratis?", PUBLIC_TRIAL_NOTE],
  ["¿Puedo pagar anualmente?", PUBLIC_ANNUAL_NOTE],
  ["¿Qué aporta Puri avanzado frente a Puri?", "Puri permite consultar agenda, cobros y disponibilidad en ambos planes. Puragenda+ amplía el mismo asistente con inteligencia comercial, análisis y recomendaciones, y añade Contact Flow para convertir oportunidades en acciones de recuperación y reactivación de clientes."],
  ["¿Qué pasa si ya pago el complemento web?", "Tu suscripción y sus condiciones se mantienen. Cualquier cambio a Puragenda+ se acuerda contigo antes de modificar o cancelar un servicio."],
] as const;

export default function PuragendaPlusPage() {
  const signupUrl = commercialRegisterUrl("PURAGENDA_PLUS", "monthly", 1, false, true);
  return (
    <LandingLayout>
      <JsonLd data={jsonLdGraph([
        organizationRef(),
        softwareApplicationNode("Puragenda y Puragenda+: agenda online, clientes, sitio web, inteligencia comercial con Puri avanzado y automatizaciones Contact Flow."),
        breadcrumbListNode([{ name: "Puragenda", path: "/" }, { name: "Puragenda+", path: "/puragenda-plus" }]),
      ])} />
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-12 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border-3 border-black bg-[#E9D8FF] px-4 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[3px_3px_0_#000]"><Sparkles className="h-4 w-4" aria-hidden="true" /> Puragenda+</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-none tracking-[-.06em] sm:text-7xl">Tu agenda y tu sitio web, juntos.</h1>
          <p className="mt-6 max-w-xl text-xl font-bold leading-8 text-black/70 dark:text-white/70">Organiza reservas, presenta tu negocio con tu sitio web y hazlo crecer con la inteligencia comercial de Puri avanzado y las automatizaciones Contact Flow.</p>
          <p className="mt-7 text-3xl font-black">Desde {startingPrice} <span className="text-base">CLP/mes</span></p>
          <p className="mt-2 text-sm font-bold">IVA incluido · 1 profesional · Facturación mensual.</p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link href={signupUrl} className="inline-flex min-h-14 items-center gap-2 rounded-xl border-4 border-black bg-[#FFB5E8] px-5 py-3 font-black uppercase text-black shadow-[5px_5px_0_#000] transition hover:translate-y-1 hover:shadow-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]">Comenzar prueba <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
            <Link href="/pricing" className="font-black text-[#6D28D9] underline underline-offset-4 dark:text-[#C4B5FD]">Calcular para mi equipo</Link>
          </div>
          <p className="mt-5 max-w-xl text-sm font-bold leading-6 text-black/65 dark:text-white/65">{PUBLIC_TRIAL_NOTE}</p>
        </div>
        <div className="rounded-3xl border-4 border-black bg-[#E9D8FF] p-6 text-black shadow-[7px_7px_0_#000] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6D28D9]">La base que comparten ambos planes</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Todo parte con Puragenda.</h2>
          <ul className="mt-6 space-y-4 font-bold">
            {["Reservas online y agenda por profesional", "Clientes, servicios y cobro de abonos", "Puri para consultar la información de tu negocio", "Fidelización, gift cards y estadísticas operativas"].map((feature) => <li key={feature} className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#6D28D9]" aria-hidden="true" />{feature}</li>)}
          </ul>
          <p className="mt-6 border-t-2 border-black/20 pt-5 font-black">Puragenda+ suma sitio web con editor y hosting, Puri avanzado y Contact Flow.</p>
        </div>
      </section>

      <WebsiteCommercialSection />

      <section className="mx-auto w-full max-w-6xl px-6 py-12" aria-labelledby="plus-growth-title">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6D28D9] dark:text-[#C4B5FD]">Herramientas de crecimiento incluidas</p>
        <h2 id="plus-growth-title" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Entiende tu negocio y convierte oportunidades en nuevas reservas.</h2>
        <p className="mt-4 max-w-3xl font-bold leading-7 text-black/70 dark:text-white/70">Puri avanzado te ayuda a detectar oportunidades. Contact Flow permite actuar sobre ellas con automatizaciones para recuperar y reactivar clientes.</p>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border-3 border-black bg-white p-6 text-black shadow-[4px_4px_0_#000]"><h3 className="text-xl font-black">Puri avanzado</h3><p className="mt-3 font-bold leading-7 text-black/70">Inteligencia comercial, análisis de demanda, capacidad y clientes, y recomendaciones para detectar oportunidades dentro del mismo asistente.</p><p className="mt-4 text-sm font-black text-[#6D28D9]">Incluido en Puragenda+</p></article>
          <article className="rounded-2xl border-3 border-black bg-white p-6 text-black shadow-[4px_4px_0_#000]"><h3 className="text-xl font-black">Automatizaciones Contact Flow</h3><p className="mt-3 font-bold leading-7 text-black/70">Recupera clientes, reactívalos y fomenta nuevas reservas con campañas automatizadas, consentimiento de los clientes y autorización del negocio.</p><p className="mt-4 text-sm font-black text-[#6D28D9]">Incluido en Puragenda+</p></article>
        </div>
      </section>

      <PricingComparisonTable />

      <section className="mx-auto w-full max-w-4xl px-6 py-12" aria-labelledby="plus-faq-title">
        <h2 id="plus-faq-title" className="text-3xl font-black tracking-tight sm:text-4xl">Antes de elegir Puragenda+</h2>
        <div className="mt-7 divide-y-2 divide-black/20 border-y-2 border-black/20 dark:divide-white/20 dark:border-white/20">
          {faqs.map(([question, answer]) => <details key={question} className="py-5"><summary className="cursor-pointer pr-4 text-lg font-black focus-visible:outline-2 focus-visible:outline-[#7C3AED]">{question}</summary><p className="mt-3 text-base font-bold leading-7 text-black/70 dark:text-white/70">{answer}</p></details>)}
        </div>
        <Link href={signupUrl} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl border-3 border-black bg-[#FFB5E8] px-5 py-3 font-black text-black shadow-[4px_4px_0_#000]">Comenzar prueba <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
      </section>
    </LandingLayout>
  );
}
