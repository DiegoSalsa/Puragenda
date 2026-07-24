import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";
import { LandingLayout } from "@/components/landing/landing-layout";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description: "Conoce a PuroCode, el equipo detrás de Puragenda. Desarrollamos software SaaS de alta calidad para negocios locales en Chile y Latinoamérica.",
  alternates: { canonical: absoluteUrl("/sobre-nosotros") },
};

export default async function AboutPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-8 text-center mb-16">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#7C3AED] dark:text-[#B28DFF] bg-[#FFF5BA] dark:bg-black border-2 border-black dark:border-white inline-block px-4 py-1 shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#FFFFFF]">Nuestra Misión</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center">
            Tecnología accesible para <br className="hidden sm:block" />
            negocios reales
          </h1>
        </div>

        <article className="mt-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-start">
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase bg-[#85E3FF] border-2 border-black dark:border-white inline-block px-3 py-1 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] text-black">El problema de las agendas</h2>
              <p className="text-lg font-bold leading-relaxed opacity-80">
                Al conversar con negocios locales —peluquerías, consultas, barberías y centros de estética— encontramos un patrón: profesionales que dedicaban parte de su jornada a coordinar citas por WhatsApp o en cuadernos.
              </p>
              <p className="text-lg font-bold leading-relaxed opacity-80">
                Puragenda nació como una alternativa enfocada en una configuración simple, precios publicados y atención directa para negocios pequeños y equipos en crecimiento.
              </p>
            </div>
            
            <div className="rounded-2xl border-4 border-black dark:border-white bg-[#FFB5E8] dark:bg-black p-8 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFB5E8] text-black dark:text-white">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-black text-black dark:text-white shadow-[4px_4px_0_#000]">
                <Code2 className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-black uppercase">¿Qué es PuroCode?</h2>
              <p className="mt-4 font-bold leading-relaxed opacity-80">
                PuroCode es el equipo de desarrollo detrás de Puragenda. Somos un equipo chileno con base en el Gran Concepción que construye productos web para empresas latinoamericanas.
              </p>
              <p className="mt-4 font-bold leading-relaxed opacity-80">
                Nuestro compromiso es mantener un producto rápido, documentar con claridad lo que ofrece y atender directamente las dudas de implementación.
              </p>
            </div>
          </div>

          <div className="mt-20 border-t-4 border-black dark:border-white pt-20">
            <h2 className="text-center text-4xl font-black uppercase mb-16">Nuestra Historia</h2>
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-transparent before:via-black dark:before:via-white before:to-transparent">
              {/* Event 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#FFB5E8] shadow-[4px_4px_0_#000] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <div className="font-black text-black">1</div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black uppercase text-xl">El Problema</h3>
                    <time className="font-bold opacity-60">2024</time>
                  </div>
                  <p className="font-bold opacity-80">Nos dimos cuenta que los pequeños negocios perdían horas valiosas gestionando citas por WhatsApp.</p>
                </div>
              </div>
              
              {/* Event 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#85E3FF] shadow-[4px_4px_0_#000] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <div className="font-black text-black">2</div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black uppercase text-xl">La Primera Versión</h3>
                    <time className="font-bold opacity-60">2025</time>
                  </div>
                  <p className="font-bold opacity-80">Lanzamos un MVP enfocado únicamente en barberías para probar la recepción del público.</p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#FFF5BA] shadow-[4px_4px_0_#000] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <div className="font-black text-black">3</div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black uppercase text-xl">Expansión</h3>
                    <time className="font-bold opacity-60">2026</time>
                  </div>
                  <p className="font-bold opacity-80">Nace Puragenda oficial, escalando el servicio a clínicas, centros médicos y estética.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 border-t-4 border-black dark:border-white pt-20">
            <h2 className="text-center text-3xl font-black uppercase">Nuestros Principios</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] rounded-xl hover:-translate-y-1 transition-transform">
                <h3 className="text-xl font-black uppercase text-black dark:text-white bg-[#BFFCC6] dark:bg-transparent dark:border-b-4 inline-block px-2 mb-3">1. Sin amarras</h3>
                <p className="font-bold opacity-80 text-sm">Cobramos mes a mes. Si el software no te da valor, puedes irte cuando quieras. Debemos ganarnos tu negocio todos los meses.</p>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] rounded-xl hover:-translate-y-1 transition-transform">
                <h3 className="text-xl font-black uppercase text-black dark:text-white bg-[#FFF5BA] dark:bg-transparent dark:border-b-4 inline-block px-2 mb-3">2. Soporte Humano</h3>
                <p className="font-bold opacity-80 text-sm">Priorizamos la atención directa: las dudas de configuración llegan al equipo que desarrolla y mantiene el sistema.</p>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] rounded-xl hover:-translate-y-1 transition-transform">
                <h3 className="text-xl font-black uppercase text-black dark:text-white bg-[#85E3FF] dark:bg-transparent dark:border-b-4 inline-block px-2 mb-3">3. Marca Blanca</h3>
                <p className="font-bold opacity-80 text-sm">Tu negocio es el protagonista. Nuestro widget se adapta a tus colores para que el cliente confíe en tu marca.</p>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-20 border-t-4 border-black dark:border-white pt-12 text-center space-y-6">
          <p className="text-xl font-black uppercase opacity-70">¿Listo para empezar?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="flex items-center gap-2 bg-[#FFB5E8] text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all">
                Empezar 30 días gratis <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all">
                Ver precios
              </button>
            </Link>
          </div>
          <p className="text-sm font-bold opacity-60">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </main>
    </LandingLayout>
  );
}
