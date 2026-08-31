import Link from "next/link";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { PricingCards } from "@/components/pricing-cards";
import { LandingLayout } from "@/components/landing/landing-layout";
import { STAFF_LIMITS } from "@/core/constants";
import { getTranslations } from "next-intl/server";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return createPageMetadata({
    title: "Precios de Puragenda: planes de agenda online",
    description: "Planes desde $12.990 CLP al mes, reservas ilimitadas y 30 días gratis sin tarjeta. Compara funciones para profesionales y equipos en Chile.",
    path: "/pricing",
  });
}

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const compare = await getTranslations("pricingComparison");
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;
  const pricingFaq = [
    { question: "¿Cuánto cuesta un sistema de reservas online en Chile?", answer: "Puragenda cuesta $12.990 CLP al mes para un profesional y $29.990 CLP al mes para equipos, con reservas ilimitadas y 30 días de prueba sin tarjeta." },
    { question: "¿Puragenda cobra comisión por cada reserva?", answer: "No. Los planes publicados no agregan una comisión por cada reserva recibida." },
    { question: "¿Puedo probar la agenda antes de pagar?", answer: "Sí. Puedes usar Puragenda durante 30 días sin ingresar una tarjeta y decidir después si activas un plan." },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Puragenda",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: [
          { "@type": "Offer", name: "Plan Individual", price: "12990", priceCurrency: "CLP", url: "https://puragenda.cl/pricing" },
          { "@type": "Offer", name: "Plan Equipo", price: "29990", priceCurrency: "CLP", url: "https://puragenda.cl/pricing" },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: pricingFaq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
      },
    ],
  };

  return (
    <LandingLayout user={user} business={business}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">{t("pageTitle")}</h1>
        <p className="mx-auto mb-4 mt-4 max-w-xl text-balance text-center font-bold text-black/70 dark:text-gray-400">{t("pageSubtitle")}</p>
        <PricingCards mode="landing" />
      </section>

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

      {/* Comparison Table */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="mb-12 text-center text-2xl font-black uppercase tracking-tighter sm:text-3xl">{compare("title")}</h2>
        <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-2xl overflow-hidden shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF]">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-[#FFF5BA] dark:bg-black border-b-4 border-black dark:border-white text-black dark:text-white">
                <th className="p-4 font-black uppercase border-r-4 border-black dark:border-white">{compare("feature")}</th>
                <th className="p-4 font-black uppercase border-r-4 border-black dark:border-white text-center">{compare("individual")}</th>
                <th className="p-4 font-black uppercase text-center">{compare("team")}</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("unlimitedBookings")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center">{compare("unlimited")}</td>
                <td className="p-4 text-center">{compare("unlimited")}</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("bookingWidget")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("adminPanel")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("whiteLabel")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("winBack")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("includedStaff")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center">{STAFF_LIMITS.INDIVIDUAL}</td>
                <td className="p-4 text-center">{STAFF_LIMITS.EQUIPO}</td>
              </tr>
              <tr>
                <td className="p-4 border-r-2 border-black dark:border-white/20">{compare("roles")}</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-red-500">✗</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

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
      



      {user && (
        <div className="text-center pb-12">
          <Link href="/dashboard" className="inline-block border-4 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_#FFFFFF] hover:translate-y-1 transition-all">
            ← {compare("backDashboard")}
          </Link>
        </div>
      )}
    </LandingLayout>
  );
}
