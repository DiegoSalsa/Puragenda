
import { LocalizedText } from "@/components/i18n/localized-text";
import { LandingLayout } from "@/components/landing/landing-layout";
import { CalendarClock, LayoutTemplate, Mail, Users, ArrowRight, Bell, BarChart3, Database, Gift, Stamp, PackageCheck } from "@/components/icons/hover-icons";
import { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Características del sistema de reservas Puragenda",
  description: "Reservas 24/7, abonos, múltiples profesionales, Google Calendar, recordatorios, CRM, fidelización y encargos para negocios en Chile.",
  path: "/caracteristicas",
});

export const revalidate = 3600;

const bentoFeatures = [
  { title: "Reservas 24/7", description: "Tus clientes agendan solos, incluso cuando duermes.", icon: CalendarClock, bg: "bg-[#B28DFF]", colSpan: "md:col-span-2", size: "text-2xl" },
  { title: "Widget Marca Blanca", description: "Se adapta a tus colores.", icon: LayoutTemplate, bg: "bg-[#FFF5BA]", colSpan: "md:col-span-1", size: "text-xl" },
  { title: "Multi-Staff", description: "Agendas separadas por profesional.", icon: Users, bg: "bg-[#85E3FF]", colSpan: "md:col-span-1", size: "text-xl" },
  { title: "Marketing Win-Back", description: "Recupera clientes perdidos con recordatorios.", icon: Mail, bg: "bg-[#FFB5E8]", colSpan: "md:col-span-2", size: "text-2xl" },
  { title: "Encargos", description: "Cupos futuros, abonos, archivos y entrega estimada. Se activa solo si tu negocio lo necesita.", icon: PackageCheck, bg: "bg-[#BFFCC6]", colSpan: "md:col-span-3", size: "text-2xl" },
];

export default async function CaracteristicasPage() {
  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Puragenda",
    url: absoluteUrl("/"),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Sistema de reservas online para negocios en Chile con abonos, múltiples profesionales, Google Calendar, recordatorios y gestión de clientes.",
    featureList: [
      "Reservas online 24/7",
      "Abonos por servicio",
      "Agenda para múltiples profesionales",
      "Integración con Google Calendar",
      "Recordatorios y marketing de reactivación",
      "CRM e historial de clientes",
      "Encargos con cupos de producción",
    ],
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "12990",
      highPrice: "29990",
      priceCurrency: "CLP",
      offerCount: "2",
      url: absoluteUrl("/pricing"),
    },
  };

  return (
    <LandingLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdSoftware) }} />
      {/* Hero Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <div className="inline-block bg-[#85E3FF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]"><LocalizedText id="7DshHJgBsagU" /></div>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          <LocalizedText id="fnnS9IbA0RvN" />
        </h1>
        <p className="text-xl font-bold opacity-80 max-w-3xl mx-auto">
          <LocalizedText id="vl1iR-Xzs5bN" />
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-12" aria-labelledby="respuesta-caracteristicas">
        <div className="rounded-3xl border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000] dark:border-white dark:bg-[#111] dark:shadow-[8px_8px_0_#fff] md:p-10">
          <p className="text-sm font-black uppercase tracking-wider text-[#6D28D9] dark:text-[#C4B5FD]">Respuesta rápida</p>
          <h2 id="respuesta-caracteristicas" className="mt-3 text-3xl font-black uppercase tracking-tight">
            ¿Qué incluye el sistema de reservas Puragenda?
          </h2>
          <p className="mt-5 max-w-4xl text-lg font-bold leading-8 opacity-80">
            Puragenda reúne reservas online 24/7, cobro de abonos, agendas por profesional, Google Calendar, recordatorios, CRM y encargos en un solo panel. Cada negocio activa las funciones que necesita y comparte su agenda mediante un enlace o un widget.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/funciones/reservas-online-con-abono" className="font-black text-[#6D28D9] underline underline-offset-4">Ver reservas con abono</Link>
            <Link href="/funciones/agenda-multiples-profesionales" className="font-black text-[#6D28D9] underline underline-offset-4">Ver agenda para equipos</Link>
            <Link href="/funciones/agenda-google-calendar" className="font-black text-[#6D28D9] underline underline-offset-4">Ver integración con Google Calendar</Link>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bentoFeatures.map((f, i) => (
            <article key={i} className={`${f.colSpan} bg-white dark:bg-black border-4 border-black dark:border-white rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF] hover:-translate-y-2 transition-transform flex flex-col justify-between`}>
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black ${f.bg} text-black mb-8 shadow-[4px_4px_0_#000]`}>
                <f.icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className={`${f.size} font-black uppercase mb-3`}>{f.title}</h3>
                <p className="font-bold opacity-80">{f.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Fidelización Deep Dive */}
      <section className="border-t-4 border-black dark:border-white bg-[#BFFCC6] dark:bg-black py-20 overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#FFC9DE] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]"><LocalizedText id="lxXSFM7QEL_e" /></div>
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl dark:text-white text-black"><LocalizedText id="yhYqVTz7mQ5e" /></h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Tarjeta de timbres */}
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#BFFCC6] text-black mb-6 shadow-[4px_4px_0_#000]">
                <Stamp className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 text-black dark:text-white"><LocalizedText id="6OEdZaLJj5V9" /></h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80"><LocalizedText id="iiIVFE3C41nI" /> <strong className="opacity-100"><LocalizedText id="sUhZDAsLj9kJ" /></strong> <LocalizedText id="vsDlpEZhwVC-" /></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80"><LocalizedText id="-g-aGH0LeBdx" /> <strong className="opacity-100"><LocalizedText id="yEmZcjGwRI2g" /></strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80"><LocalizedText id="wdT-2zGprJCm" /> <strong className="opacity-100"><LocalizedText id="Nuj0ae1yfPk2" /></strong> <LocalizedText id="-XVrIxkEiZSE" /></span>
                </li>
              </ul>
            </div>

            {/* Programa de referidos */}
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#FFC9DE] text-black mb-6 shadow-[4px_4px_0_#000]">
                <Gift className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 text-black dark:text-white"><LocalizedText id="guhn1ujzXsRE" /></h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80"><LocalizedText id="McXHiejB5jM2" /> <strong className="opacity-100"><LocalizedText id="TVWRiZnvTHlS" /></strong> <LocalizedText id="o8wo7WFMFhY4" /></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80"><LocalizedText id="cNYH-P54ciO1" /> <strong className="opacity-100"><LocalizedText id="vl0LKp3tsZBd" /></strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80"><LocalizedText id="9gCyOZ4PUBu3" /> <strong className="opacity-100"><LocalizedText id="V3WshjMvT-w3" /></strong> <LocalizedText id="WlKsettNWyfR" /></span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step by Step */}
      <section className="border-t-4 border-black dark:border-white bg-[#FFF5BA] dark:bg-black py-20 overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center mb-16 dark:text-white text-black"><LocalizedText id="Th8TqSkxybtS" /></h2>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-20 right-20 h-2 bg-black dark:bg-white z-0 border-y-2 border-transparent border-dashed"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-black bg-[#B28DFF] flex items-center justify-center text-black text-3xl font-black shadow-[6px_6px_0_#000] mb-6">1</div>
              <h3 className="text-2xl font-black uppercase mb-3 dark:text-white text-black"><LocalizedText id="_YKGMzKZqhIN" /></h3>
              <p className="font-bold opacity-80 dark:text-white text-black"><LocalizedText id="b1jvq7GAyWnq" /></p>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-black bg-[#FFB5E8] flex items-center justify-center text-black text-3xl font-black shadow-[6px_6px_0_#000] mb-6">2</div>
              <h3 className="text-2xl font-black uppercase mb-3 dark:text-white text-black"><LocalizedText id="7i-lr3mu7w3U" /></h3>
              <p className="font-bold opacity-80 dark:text-white text-black"><LocalizedText id="yJlifq5Lze3T" /></p>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-black bg-[#85E3FF] flex items-center justify-center text-black text-3xl font-black shadow-[6px_6px_0_#000] mb-6">3</div>
              <h3 className="text-2xl font-black uppercase mb-3 dark:text-white text-black"><LocalizedText id="XSyKjfEWn1w7" /></h3>
              <p className="font-bold opacity-80 dark:text-white text-black"><LocalizedText id="njL4SL8MHBdm" /></p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations & Data */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl"><LocalizedText id="WHoiy7Xtvls7" /></h2>
            <p className="text-lg font-bold opacity-80">
              <LocalizedText id="g1XMOWbV71E4" />
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-4">
                <div className="bg-[#FFF5BA] border-2 border-black p-2 shadow-[2px_2px_0_#000]"><Database className="h-6 w-6 text-black" /></div>
                <span className="font-bold"><LocalizedText id="VUrmQfVUNilp" /></span>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-[#FFB5E8] border-2 border-black p-2 shadow-[2px_2px_0_#000]"><BarChart3 className="h-6 w-6 text-black" /></div>
                <span className="font-bold"><LocalizedText id="HY86f_-OqzVM" /></span>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-[#85E3FF] border-2 border-black p-2 shadow-[2px_2px_0_#000]"><Bell className="h-6 w-6 text-black" /></div>
                <span className="font-bold"><LocalizedText id="FqMkocein-za" /></span>
              </li>
            </ul>
          </div>
          <div className="bg-black dark:bg-white rounded-3xl p-8 border-4 border-black dark:border-white shadow-[12px_12px_0_rgba(0,0,0,1)] dark:shadow-[12px_12px_0_#FFF5BA] transform rotate-2">
             {/* Fake dashboard snippet */}
             <div className="bg-white dark:bg-[#111] rounded-xl p-4 border-4 border-black dark:border-white">
                <div className="flex justify-between items-center border-b-4 border-black dark:border-white pb-4 mb-4">
                  <div className="font-black uppercase dark:text-white text-black"><LocalizedText id="oD9trLpGywEr" /></div>
                  <div className="bg-[#BFFCC6] text-black px-2 py-1 font-black text-xs border-2 border-black"><LocalizedText id="Uh7T7DpKqd5l" /></div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold opacity-80"><LocalizedText id="7jHx46OZQ4k9" /></span>
                    <span className="font-black text-xl">+12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold opacity-80"><LocalizedText id="_anO1IuU3rA8" /></span>
                    <span className="font-black text-xl text-[#7C3AED] dark:text-[#B28DFF]">$450.000</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Big CTA */}
      <section className="border-t-4 border-black dark:border-white py-24 bg-[#FFF5BA] dark:bg-black text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-8 text-black dark:text-white"><LocalizedText id="KSXIZISGP7RI" /></h2>
          <Link href="/pricing">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-10 py-5 font-black uppercase text-2xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4 mx-auto">
              <LocalizedText id="HrD5OWVvbmr_" /> <ArrowRight className="h-8 w-8" />
            </button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
