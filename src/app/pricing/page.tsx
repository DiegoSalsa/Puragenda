import Link from "next/link";
import { LandingLayout } from "@/components/landing/landing-layout";
import { createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { faqPageNode, jsonLdGraph, organizationRef, softwareApplicationNode } from "@/lib/json-ld";
import { PricingComparisonTable, PricingHero } from "@/components/pricing-page-sections";

export const revalidate = 3600;

export async function generateMetadata() {
  return createPageMetadata({
    title: "Precios de Puragenda: planes de agenda online",
    description: "Planes desde $12.990 CLP al mes, reservas ilimitadas y 30 días gratis sin tarjeta. Compara funciones para profesionales y equipos en Chile.",
    path: "/pricing",
  });
}

export default async function PricingPage() {
  const pricingFaq = [
    { question: "¿Cuánto cuesta un sistema de reservas online en Chile?", answer: "Puragenda cuesta $12.990 CLP al mes para un profesional y $29.990 CLP al mes para equipos, con reservas ilimitadas y 30 días de prueba sin tarjeta." },
    { question: "¿Puragenda cobra comisión por cada reserva?", answer: "No. Los planes publicados no agregan una comisión por cada reserva recibida." },
    { question: "¿Puedo probar la agenda antes de pagar?", answer: "Sí. Puedes usar Puragenda durante 30 días sin ingresar una tarjeta y decidir después si activas un plan." },
  ];
  return (
    <LandingLayout>
      <JsonLd
        data={jsonLdGraph([
          organizationRef(),
          softwareApplicationNode(),
          faqPageNode(pricingFaq),
        ])}
      />
      <PricingHero />

      <section className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6" aria-labelledby="precio-reservas">
        <div className="rounded-3xl border-4 border-black bg-[#E9D5FF] p-7 text-black shadow-[7px_7px_0_#000] dark:border-white sm:p-9">
          <p className="text-sm font-black uppercase tracking-wider">Precio transparente</p>
          <h2 id="precio-reservas" className="mt-2 text-3xl font-black uppercase tracking-tight">¿Cuánto cuesta un sistema de reservas online?</h2>
          <p className="mt-4 text-lg font-bold leading-8">En Puragenda, el plan para un profesional cuesta <strong>$12.990 CLP al mes</strong> y el plan para equipos <strong>$29.990 CLP al mes</strong>. Ambos incluyen reservas ilimitadas y puedes probarlos 30 días sin tarjeta.</p>
          <div className="mt-6 flex flex-wrap gap-5 font-black">
            <Link href="/alternativa-agendapro" className="underline decoration-2 underline-offset-4">Comparar con AgendaPro</Link>
            <Link href="/contacto" className="underline decoration-2 underline-offset-4">Pedir orientación</Link>
          </div>
        </div>
      </section>

      <PricingComparisonTable />

      <section className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6" aria-labelledby="faq-precios">
        <h2 id="faq-precios" className="text-center text-3xl font-black uppercase tracking-tight">Preguntas sobre precios</h2>
        <div className="mt-8 grid gap-5">
          {pricingFaq.map((item) => (
            <article key={item.question} className="rounded-2xl border-4 border-black bg-white p-6 text-black shadow-[5px_5px_0_#000] dark:border-white">
              <h3 className="text-xl font-black">{item.question}</h3>
              <p className="mt-3 font-bold leading-7 opacity-75">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
      
    </LandingLayout>
  );
}
