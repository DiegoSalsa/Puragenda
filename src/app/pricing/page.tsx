import Link from "next/link";
import type { Metadata } from "next";
import { LandingLayout } from "@/components/landing/landing-layout";
import { createPageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { faqPageNode, jsonLdGraph, organizationRef, softwareApplicationNode } from "@/lib/json-ld";
import { PricingComparisonTable, PricingHero } from "@/components/pricing-page-sections";
import { PLUS_GROWTH_SUMMARY, PUBLIC_ANNUAL_NOTE, PUBLIC_PLAN_STARTING_PRICES, PUBLIC_PLANS_PRICE_SUMMARY, PUBLIC_TRIAL_NOTE } from "@/lib/public-plans";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Planes y precios de Puragenda",
    description: `${PUBLIC_PLAN_STARTING_PRICES} Puragenda+ incluye sitio web, Puri avanzado y Contact Flow.`,
    path: "/pricing",
  });
}

export default async function PricingPage() {
  const pricingFaq = [
    { question: "¿Qué planes ofrece Puragenda?", answer: PUBLIC_PLANS_PRICE_SUMMARY },
    { question: "¿Cómo se calcula el precio de más profesionales?", answer: "Elige la cantidad dentro de cada tarjeta para ver el total de ese plan, con IVA incluido. El recargo por profesional disminuye por tramos; no hay que cambiar de plan para sumar personas. Puedes comparar pago mensual o anual desde el control de periodo." },
    { question: "¿Qué incluye Puragenda+?", answer: `Todas las funciones de Puragenda más un sitio web personalizable, editor, hosting, SSL y reservas integradas. ${PLUS_GROWTH_SUMMARY}` },
    { question: "¿El sitio web está incluido?", answer: "Sí, en Puragenda+. El plan Puragenda incluye el enlace y el widget de reservas; el sitio web personalizable forma parte de Puragenda+. La compra de un dominio propio no está incluida." },
    { question: "¿Qué puedo probar gratis?", answer: PUBLIC_TRIAL_NOTE },
    { question: "¿Puedo pagar anualmente?", answer: PUBLIC_ANNUAL_NOTE },
    { question: "¿Cambian las condiciones de mi suscripción actual?", answer: "Tus condiciones actuales se mantienen. Cualquier cambio de plan o de un complemento existente debe confirmarse expresamente contigo." },
  ];

  return (
    <LandingLayout>
      <JsonLd data={jsonLdGraph([organizationRef(), softwareApplicationNode("Sistema de reservas online para negocios en Chile."), faqPageNode(pricingFaq)])} />
      <PricingHero />
      <div id="sitio-web" className="scroll-mt-28"><PricingComparisonTable /></div>
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6" aria-labelledby="faq-precios">
        <div className="rounded-[2rem] border-4 border-black bg-white p-7 shadow-[7px_7px_0_#000] dark:border-white dark:bg-[#111] dark:shadow-[7px_7px_0_#fff] sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6D28D9]">Preguntas frecuentes</p>
          <h2 id="faq-precios" className="mt-2 text-3xl font-black uppercase tracking-tight">Antes de comenzar</h2>
          <div className="mt-7 divide-y-2 divide-black/15 dark:divide-white/15">
            {pricingFaq.map((item) => <details key={item.question} className="py-5"><summary className="cursor-pointer pr-8 text-lg font-black focus-visible:outline-2 focus-visible:outline-[#7C3AED]">{item.question}</summary><p className="mt-3 max-w-3xl text-base font-bold leading-7 text-black/70 dark:text-white/70">{item.answer}</p></details>)}
          </div>
          <Link href="/puragenda-plus" className="mt-7 inline-flex rounded-xl border-3 border-black bg-[#E9D8FF] px-5 py-3 font-black shadow-[4px_4px_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">Conoce Puragenda+ en detalle →</Link>
        </div>
      </section>
    </LandingLayout>
  );
}
