import { LandingLayout } from "@/components/landing/landing-layout";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { CalendarClock, LayoutTemplate, Mail, Users, ArrowRight, Bell, BarChart3, Database, Gift, Stamp, PackageCheck } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Características del sistema de reservas",
  description: "Descubre todas las funcionalidades de Puragenda para tu negocio.",
  alternates: { canonical: absoluteUrl("/caracteristicas") },
};

const bentoFeatures = [
  { title: "Reservas 24/7", description: "Tus clientes agendan solos, incluso cuando duermes.", icon: CalendarClock, bg: "bg-[#B28DFF]", colSpan: "md:col-span-2", size: "text-2xl" },
  { title: "Widget Marca Blanca", description: "Se adapta a tus colores.", icon: LayoutTemplate, bg: "bg-[#FFF5BA]", colSpan: "md:col-span-1", size: "text-xl" },
  { title: "Multi-Staff", description: "Agendas separadas por profesional.", icon: Users, bg: "bg-[#85E3FF]", colSpan: "md:col-span-1", size: "text-xl" },
  { title: "Marketing Win-Back", description: "Recupera clientes perdidos con recordatorios.", icon: Mail, bg: "bg-[#FFB5E8]", colSpan: "md:col-span-2", size: "text-2xl" },
  { title: "Encargos", description: "Cupos futuros, abonos, archivos y entrega estimada. Se activa solo si tu negocio lo necesita.", icon: PackageCheck, bg: "bg-[#BFFCC6]", colSpan: "md:col-span-3", size: "text-2xl" },
];

export default async function CaracteristicasPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      {/* Hero Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <div className="inline-block bg-[#85E3FF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">Funcionalidades Core</div>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          Todo lo que necesitas para crecer
        </h1>
        <p className="text-xl font-bold opacity-80 max-w-3xl mx-auto">
          Puragenda no es solo un calendario. Es una plataforma completa diseñada para automatizar tareas manuales y enfocarte en lo que mejor sabes hacer.
        </p>
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
            <div className="inline-block bg-[#FFC9DE] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">Retención de clientes</div>
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl dark:text-white text-black">Fideliza sin esfuerzo</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Tarjeta de timbres */}
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#BFFCC6] text-black mb-6 shadow-[4px_4px_0_#000]">
                <Stamp className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 text-black dark:text-white">Tarjetas de Timbres</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80">Cada cita <strong className="opacity-100">Completada</strong> otorga un timbre automáticamente.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80">Al llegar a la meta, se genera un <strong className="opacity-100">código de descuento único</strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80">Los clientes ven su progreso desde un <strong className="opacity-100">portal público</strong> sin crear cuenta.</span>
                </li>
              </ul>
            </div>

            {/* Programa de referidos */}
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#FFC9DE] text-black mb-6 shadow-[4px_4px_0_#000]">
                <Gift className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-4 text-black dark:text-white">Programa de Referidos</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80">Comparte tu <strong className="opacity-100">código único</strong> con otros negocios.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80">Cada referido que paga su suscripción te da <strong className="opacity-100">fichas canjeables</strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-[#7C3AED] border-2 border-black shrink-0" />
                  <span className="font-bold text-black dark:text-white opacity-80">Gira la <strong className="opacity-100">ruleta de recompensas</strong> y gana descuentos en tu propia suscripción.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step by Step */}
      <section className="border-t-4 border-black dark:border-white bg-[#FFF5BA] dark:bg-black py-20 overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center mb-16 dark:text-white text-black">¿Cómo funciona?</h2>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-20 right-20 h-2 bg-black dark:bg-white z-0 border-y-2 border-transparent border-dashed"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-black bg-[#B28DFF] flex items-center justify-center text-black text-3xl font-black shadow-[6px_6px_0_#000] mb-6">1</div>
              <h3 className="text-2xl font-black uppercase mb-3 dark:text-white text-black">El cliente entra</h3>
              <p className="font-bold opacity-80 dark:text-white text-black">Desde tu Instagram, WhatsApp o sitio web, acceden a tu widget de reservas 100% personalizado.</p>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-black bg-[#FFB5E8] flex items-center justify-center text-black text-3xl font-black shadow-[6px_6px_0_#000] mb-6">2</div>
              <h3 className="text-2xl font-black uppercase mb-3 dark:text-white text-black">Elige y Agenda</h3>
              <p className="font-bold opacity-80 dark:text-white text-black">Seleccionan el servicio, profesional y la hora que mejor les acomoda según tu disponibilidad real.</p>
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-black bg-[#85E3FF] flex items-center justify-center text-black text-3xl font-black shadow-[6px_6px_0_#000] mb-6">3</div>
              <h3 className="text-2xl font-black uppercase mb-3 dark:text-white text-black">Tú recibes el aviso</h3>
              <p className="font-bold opacity-80 dark:text-white text-black">La cita aparece mágicamente en tu calendario. El sistema enviará recordatorios automáticos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations & Data */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">Control Total de tus Datos</h2>
            <p className="text-lg font-bold opacity-80">
              No dejes que tu base de datos sea un cuaderno perdido. Con nuestro CRM integrado, cada vez que un cliente reserva, su perfil se actualiza.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-4">
                <div className="bg-[#FFF5BA] border-2 border-black p-2 shadow-[2px_2px_0_#000]"><Database className="h-6 w-6 text-black" /></div>
                <span className="font-bold">Historial completo de citas por cliente.</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-[#FFB5E8] border-2 border-black p-2 shadow-[2px_2px_0_#000]"><BarChart3 className="h-6 w-6 text-black" /></div>
                <span className="font-bold">Reportes de ingresos y citas canceladas.</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-[#85E3FF] border-2 border-black p-2 shadow-[2px_2px_0_#000]"><Bell className="h-6 w-6 text-black" /></div>
                <span className="font-bold">Alertas en tiempo real.</span>
              </li>
            </ul>
          </div>
          <div className="bg-black dark:bg-white rounded-3xl p-8 border-4 border-black dark:border-white shadow-[12px_12px_0_rgba(0,0,0,1)] dark:shadow-[12px_12px_0_#FFF5BA] transform rotate-2">
             {/* Fake dashboard snippet */}
             <div className="bg-white dark:bg-[#111] rounded-xl p-4 border-4 border-black dark:border-white">
                <div className="flex justify-between items-center border-b-4 border-black dark:border-white pb-4 mb-4">
                  <div className="font-black uppercase dark:text-white text-black">Métricas de Hoy</div>
                  <div className="bg-[#BFFCC6] text-black px-2 py-1 font-black text-xs border-2 border-black">ACTIVO</div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold opacity-80">Nuevos clientes</span>
                    <span className="font-black text-xl">+12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold opacity-80">Ingresos proyectados</span>
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
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-8 text-black dark:text-white">Deja de perder el tiempo organizando agendas a mano</h2>
          <Link href="/pricing">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-10 py-5 font-black uppercase text-2xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4 mx-auto">
              Empieza ahora <ArrowRight className="h-8 w-8" />
            </button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
