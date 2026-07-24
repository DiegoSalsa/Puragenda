import { LandingLayout } from "@/components/landing/landing-layout";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { FAQSection } from "@/components/landing/faq-section";
import { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Resolvemos tus dudas sobre Puragenda: precios, funcionalidades, soporte y más.",
  alternates: { canonical: absoluteUrl("/faq") },
};

export default async function FAQPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <div className="inline-block bg-[#B28DFF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">Soporte</div>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          Preguntas Frecuentes
        </h1>
        <p className="text-xl font-bold opacity-80 max-w-3xl mx-auto">
          Todo lo que necesitas saber antes de empezar con Puragenda. Si no encuentras tu respuesta, contáctanos directamente.
        </p>
      </section>

      {/* FAQ Accordion */}
      <FAQSection />

      {/* CTA */}
      <section className="border-t-4 border-black dark:border-white py-20 bg-[#FFF5BA] dark:bg-black text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-6 text-black dark:text-white">¿Aún tienes dudas?</h2>
          <p className="text-lg font-bold opacity-80 mb-8 text-black dark:text-white">Escríbenos directamente y te responderemos lo antes posible.</p>
          <a href="/contacto">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-10 py-5 font-black uppercase text-xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] hover:translate-y-2 hover:shadow-none transition-all mx-auto">
              Ir a Contacto
            </button>
          </a>
        </div>
      </section>
    </LandingLayout>
  );
}
