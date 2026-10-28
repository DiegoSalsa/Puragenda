
import { LocalizedText } from "@/components/i18n/localized-text";
import { LandingLayout } from "@/components/landing/landing-layout";
import { FAQSection } from "@/components/landing/faq-section";
import { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { PLUS_GROWTH_SUMMARY, PUBLIC_PLANS_PRICE_SUMMARY, PUBLIC_TRIAL_NOTE } from "@/lib/public-plans";

export const metadata: Metadata = createPageMetadata({
  title: "Preguntas frecuentes sobre Puragenda",
  description: "Respuestas directas sobre precios, reservas, abonos, múltiples profesionales, Google Calendar, soporte y prueba gratis de Puragenda.",
  path: "/faq",
});

export const revalidate = 3600;

export default async function FAQPage() {
  return (
    <LandingLayout>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <div className="inline-block bg-[#B28DFF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]"><LocalizedText id="EEugEQcKJy4G" /></div>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          <LocalizedText id="qxZSqw0Uc5Il" />
        </h1>
        <p className="text-xl font-bold opacity-80 max-w-3xl mx-auto">
          <LocalizedText id="6S0uszxuAMKl" />
        </p>
      </section>

      {/* FAQ Accordion */}
      <FAQSection />

      <section className="mx-auto w-full max-w-4xl px-6 py-12" aria-labelledby="faq-plus-title">
        <div className="rounded-[2rem] border-4 border-black bg-[#E9D8FF] p-7 text-black shadow-[7px_7px_0_#000] sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6D28D9]">Planes y funciones</p>
          <h2 id="faq-plus-title" className="mt-2 text-3xl font-black uppercase tracking-tight">Preguntas sobre Puragenda+</h2>
          <div className="mt-6 divide-y-2 divide-black/20">
            {[
              ["¿Cuánto cuestan los planes?", PUBLIC_PLANS_PRICE_SUMMARY],
              ["¿Incluye sitio web?", "Sí. Incluye el mismo editor, hosting e infraestructura de Sitio Web Puragenda. La compra de un dominio propio no está incluida."],
              ["¿Qué hacen Puri avanzado y Contact Flow?", PLUS_GROWTH_SUMMARY],
              ["¿Qué incluye la prueba de Puragenda+?", PUBLIC_TRIAL_NOTE],
              ["¿Qué pasa con mi suscripción actual?", "Tus condiciones se mantienen. Cualquier cambio de plan o de un complemento existente se acuerda contigo antes de aplicarse."],
            ].map(([question, answer]) => <details key={question} className="py-4"><summary className="cursor-pointer pr-8 font-black focus-visible:outline-2 focus-visible:outline-[#7C3AED]">{question}</summary><p className="mt-2 font-bold leading-7 text-black/70">{answer}</p></details>)}
          </div>
          <a href="/puragenda-plus" className="mt-6 inline-flex rounded-xl border-3 border-black bg-[#FFB5E8] px-5 py-3 font-black shadow-[4px_4px_0_#000]">Ver Puragenda+ en detalle →</a>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-4 border-black dark:border-white py-20 bg-[#FFF5BA] dark:bg-black text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-6 text-black dark:text-white"><LocalizedText id="cbKZRzHEqPbW" /></h2>
          <p className="text-lg font-bold opacity-80 mb-8 text-black dark:text-white"><LocalizedText id="g-vkbJlOudNh" /></p>
          <a href="/contacto">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-10 py-5 font-black uppercase text-xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] hover:translate-y-2 hover:shadow-none transition-all mx-auto">
              <LocalizedText id="IgYYYPanfcEa" />
            </button>
          </a>
        </div>
      </section>
    </LandingLayout>
  );
}
