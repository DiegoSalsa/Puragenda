import Link from "next/link";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { PricingCards } from "@/components/pricing-cards";
import { LandingLayout } from "@/components/landing/landing-layout";
import { STAFF_LIMITS } from "@/core/constants";
import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Precios y planes",
  description: "Compara los planes Individual y Equipo de Puragenda, sus precios en pesos chilenos y las funciones incluidas.",
  alternates: { canonical: absoluteUrl("/pricing") },
};

export default async function PricingPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter sm:text-6xl text-center mb-4">Planes para crecer a tu ritmo</h2>
        <p className="mx-auto mt-4 max-w-xl font-bold text-black/70 dark:text-gray-400 text-center mb-4">Prueba gratis por 30 días. Sin tarjeta. Cancela cuando quieras.</p>
        <PricingCards mode="landing" />
      </section>

      {/* Comparison Table */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h3 className="text-2xl font-black uppercase tracking-tighter text-center mb-12 sm:text-3xl">Comparación de Planes</h3>
        <div className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-2xl overflow-hidden shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF]">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-[#FFF5BA] dark:bg-black border-b-4 border-black dark:border-white text-black dark:text-white">
                <th className="p-4 font-black uppercase border-r-4 border-black dark:border-white">Característica</th>
                <th className="p-4 font-black uppercase border-r-4 border-black dark:border-white text-center">Plan Individual</th>
                <th className="p-4 font-black uppercase text-center">Plan Equipo</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">Citas mensuales</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center">Ilimitadas</td>
                <td className="p-4 text-center">Ilimitadas</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">Widget de reservas web</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">Panel de administración</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">Marca Blanca (Tus colores)</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">Marketing Win-Back Automático</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-green-500">✓</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b-2 border-black dark:border-white/20">
                <td className="p-4 border-r-2 border-black dark:border-white/20">Profesionales incluidos</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center">{STAFF_LIMITS.INDIVIDUAL}</td>
                <td className="p-4 text-center">{STAFF_LIMITS.EQUIPO}</td>
              </tr>
              <tr>
                <td className="p-4 border-r-2 border-black dark:border-white/20">Roles (Admin/Staff)</td>
                <td className="p-4 border-r-2 border-black dark:border-white/20 text-center text-red-500">✗</td>
                <td className="p-4 text-center text-green-500">✓</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>
      



      {user && (
        <div className="text-center pb-12">
          <Link href="/dashboard" className="inline-block border-4 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_#FFFFFF] hover:translate-y-1 transition-all">
            ← Volver al Dashboard
          </Link>
        </div>
      )}
    </LandingLayout>
  );
}
