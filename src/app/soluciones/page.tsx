import { LandingLayout } from "@/components/landing/landing-layout";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Scissors, Sparkles, CheckCircle2, TrendingUp, Users2, Clock, PackageCheck } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Soluciones por industria",
  description: "Descubre cómo Puragenda se adapta a las necesidades específicas de tu rubro.",
  alternates: { canonical: absoluteUrl("/soluciones") },
};

const metrics = [
  { value: "24/7", label: "Reservas fuera de horario", icon: Clock, bg: "bg-[#FFB5E8]" },
  { value: "1 panel", label: "Agenda, clientes y pagos", icon: Users2, bg: "bg-[#FFF5BA]" },
  { value: "Tu marca", label: "Widget personalizable", icon: TrendingUp, bg: "bg-[#BFFCC6]" },
];

export default async function SolucionesPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          Hecho a la medida de tu industria
        </h1>
        <p className="text-xl font-bold mb-16 opacity-80 max-w-3xl mx-auto">
          Puragenda es flexible. Entendemos que una clínica médica no funciona igual que una barbería. Descubre cómo nos adaptamos a ti.
        </p>
      </section>

      {/* Zig Zag Layouts */}
      <section className="mx-auto w-full max-w-6xl px-6 space-y-24 py-12">
        {/* Barberias */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 bg-[#FFF5BA] dark:bg-black border-4 border-black dark:border-white p-8 rounded-3xl shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#FFF5BA]">
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-xl p-4">
              <div className="flex gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500 border-2 border-black"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500 border-2 border-black"></div>
                <div className="h-3 w-3 rounded-full bg-green-500 border-2 border-black"></div>
              </div>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded border-2 border-black dark:border-white w-3/4"></div>
                <div className="h-8 bg-[#FFF5BA] text-black font-black flex items-center px-2 rounded border-2 border-black w-full">Corte de Cabello - 30min</div>
                <div className="h-8 bg-[#85E3FF] text-black font-black flex items-center px-2 rounded border-2 border-black w-5/6">Barba - 15min</div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#FFF5BA] text-black shadow-[4px_4px_0_#000]">
              <Scissors className="h-8 w-8" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Peluquerías y Barberías</h2>
            <p className="text-lg font-bold opacity-80">
              Tus clientes reservan su corte sin tener que llamarte o enviarte WhatsApps infinitos. Controla los tiempos exactos de cada servicio y evita que se crucen citas de diferentes barberos gracias a nuestro sistema Multi-Staff.
            </p>
            <ul className="space-y-2 font-bold">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> Catálogo visual de servicios.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> Elección de profesional favorito.</li>
            </ul>
            <Link href="/para/barberias" className="inline-flex font-black uppercase text-[#7C3AED] hover:underline">
              Ver solución para barberías →
            </Link>
          </div>
        </div>

        {/* Estetica */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#85E3FF] text-black shadow-[4px_4px_0_#000]">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Centros de Estética</h2>
            <p className="text-lg font-bold opacity-80">
              Vende paquetes de sesiones y controla el historial de tratamientos de cada cliente en tu propio CRM. El recordatorio automático (Win-Back) te ayuda a recuperar a esos clientes que no se han hecho las uñas en un mes.
            </p>
            <ul className="space-y-2 font-bold">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> Fichas de cliente y notas.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> Campañas automáticas de reactivación.</li>
            </ul>
            <Link href="/para/estetica" className="inline-flex font-black uppercase text-[#7C3AED] hover:underline">
              Ver solución para estética →
            </Link>
          </div>
          <div className="bg-[#85E3FF] dark:bg-black border-4 border-black dark:border-white p-8 rounded-3xl shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#85E3FF]">
             <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-xl p-4 rotate-3">
              <div className="font-black uppercase border-b-4 border-black dark:border-white pb-2 mb-2 dark:text-white text-black">Ficha de Cliente</div>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full border-2 border-black bg-[#FFB5E8]"></div>
                <div>
                  <div className="font-black text-black dark:text-white">María González</div>
                  <div className="text-xs font-bold opacity-60">Última visita: Hace 32 días</div>
                </div>
              </div>
              <button className="w-full bg-[#BFFCC6] text-black font-black border-2 border-black py-2 shadow-[2px_2px_0_#000]">Enviar Recordatorio Email</button>
            </div>
          </div>
        </div>

        {/* Encargos y producción */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 bg-[#BFFCC6] dark:bg-black border-4 border-black dark:border-white p-8 rounded-3xl shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#BFFCC6]">
            <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-xl p-5">
              <p className="font-black uppercase border-b-4 border-black dark:border-white pb-3">Próxima entrega disponible</p>
              <p className="mt-5 text-3xl font-black">Diciembre 2026</p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-black">
                <span className="border-2 border-black bg-[#FFF5BA] p-2 text-black">2 cupos</span>
                <span className="border-2 border-black bg-[#FFB5E8] p-2 text-black">Abono</span>
                <span className="border-2 border-black bg-[#85E3FF] p-2 text-black">Archivos</span>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black bg-[#BFFCC6] text-black shadow-[4px_4px_0_#000]">
              <PackageCheck className="h-8 w-8" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Talleres y encargos personalizados</h2>
            <p className="text-lg font-bold opacity-80">
              Para réplicas de mascotas, tejidos, tortas, muebles, joyas u otros trabajos que se entregan semanas o meses después. Activa Encargos solo si lo necesitas y organiza cupos de producción, referencias, abonos y fechas estimadas.
            </p>
            <ul className="space-y-2 font-bold">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> Horizonte configurable de hasta varios meses.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> Capacidad por período y semanas bloqueadas.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#7C3AED]" /> Abono y archivos de referencia en el mismo flujo.</li>
            </ul>
            <Link href="/guias/agenda-encargos-con-abono" className="inline-flex font-black uppercase text-[#7C3AED] hover:underline">
              Leer la guía de encargos →
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="border-y-4 border-black dark:border-white py-20 bg-white dark:bg-[#111]">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-center mb-16">Una operación más fácil de controlar</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 border-4 border-black dark:border-white rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] bg-white dark:bg-black hover:-translate-y-2 transition-transform">
                <div className={`h-16 w-16 ${m.bg} border-4 border-black flex items-center justify-center rounded-xl mb-6 shadow-[4px_4px_0_#000]`}>
                  <m.icon className="h-8 w-8 text-black" />
                </div>
                <div className="text-5xl font-black uppercase mb-2">{m.value}</div>
                <div className="text-lg font-bold opacity-80">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-bold opacity-60">
            El impacto depende del tipo de negocio, la adopción del equipo y la forma en que configures recordatorios, abonos y disponibilidad.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <h2 className="text-3xl font-black uppercase mb-6">¿Listo para probarlo?</h2>
        <p className="font-bold opacity-80 mb-10 max-w-xl mx-auto">
          Si ofreces servicios que requieren agendar tiempo (abogados, consultores, psicólogos), Puragenda también es para ti.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <button className="bg-[#FFB5E8] text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 transition-all">
              Empezar 30 días gratis →
            </button>
          </Link>
          <Link href="/contacto">
            <button className="bg-black text-white dark:bg-white dark:text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 transition-all">
              Hablemos de tu negocio
            </button>
          </Link>
        </div>
        <p className="mt-6 text-sm font-bold opacity-60">Sin tarjeta de crédito · Cancela cuando quieras</p>
      </section>
    </LandingLayout>
  );
}
