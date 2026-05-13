import { LandingLayout } from "@/components/landing/landing-layout";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Mail, MapPin, Phone } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto | Puragenda",
  description: "Ponte en contacto con el equipo de Puragenda para resolver tus dudas o agendar una demostración.",
};

export default async function ContactoPage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  return (
    <LandingLayout user={user} business={business}>
      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center mb-6">
          Hablemos
        </h1>
        <p className="text-xl font-bold text-center mb-16 opacity-80">
          ¿Tienes dudas sobre cómo Puragenda puede ayudar a tu negocio? Estamos aquí para ayudarte.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-[#BFFCC6] dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#BFFCC6] text-black dark:text-white">
              <div className="flex items-center gap-4 mb-2">
                <Mail className="h-6 w-6" />
                <h3 className="text-xl font-black uppercase">Email</h3>
              </div>
              <p className="font-bold opacity-80">contacto@purocode.com</p>
            </div>
            
            <div className="bg-[#FFF5BA] dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFF5BA] text-black dark:text-white">
              <div className="flex items-center gap-4 mb-2">
                <Phone className="h-6 w-6" />
                <h3 className="text-xl font-black uppercase">WhatsApp</h3>
              </div>
              <p className="font-bold opacity-80">+56 9 4925 5006</p>
            </div>
          </div>

          {/* Fake Form */}
          <form className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 rounded-2xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] space-y-4">
            <div>
              <label className="block text-sm font-black uppercase mb-1">Nombre</label>
              <input type="text" className="w-full border-2 border-black dark:border-white bg-transparent p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-sm font-black uppercase mb-1">Email</label>
              <input type="email" className="w-full border-2 border-black dark:border-white bg-transparent p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-black uppercase mb-1">Mensaje</label>
              <textarea rows={4} className="w-full border-2 border-black dark:border-white bg-transparent p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" placeholder="¿En qué podemos ayudarte?"></textarea>
            </div>
            <button type="button" className="w-full bg-[#7C3AED] text-white border-4 border-black dark:border-white px-6 py-4 font-black uppercase text-lg shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:translate-y-1 transition-transform mt-4">
              Enviar Mensaje
            </button>
          </form>
        </div>

        {/* SLA and Sales FAQ */}
        <div className="mt-24 border-t-4 border-black dark:border-white pt-16">
          <h2 className="text-3xl font-black uppercase text-center mb-12">Nuestro Compromiso</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="bg-[#BFFCC6] text-black border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0_#000]">
                <h3 className="text-xl font-black uppercase mb-2">Tiempos de Respuesta</h3>
                <p className="font-bold opacity-80">Garantizamos una respuesta inicial en menos de <strong>10 minutos</strong> en horario hábil para clientes del Plan Equipo.</p>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                <h3 className="text-xl font-black uppercase mb-2">Migración Gratuita</h3>
                <p className="font-bold opacity-80">Si vienes de otro software (AgendaPro, Fresha, etc), nosotros migramos todos tus clientes gratis.</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black uppercase mb-4">Dudas Frecuentes</h3>
              <div className="space-y-4">
                <div className="border-b-2 border-black dark:border-white/20 pb-4">
                  <h4 className="font-black uppercase mb-1">¿Hay contrato de permanencia?</h4>
                  <p className="text-sm font-bold opacity-80">No. Cobramos mes a mes. Puedes cancelar cuando quieras sin multas.</p>
                </div>
                <div className="border-b-2 border-black dark:border-white/20 pb-4">
                  <h4 className="font-black uppercase mb-1">¿Necesito conocimientos técnicos?</h4>
                  <p className="text-sm font-bold opacity-80">En absoluto. Nosotros configuramos todo por ti durante la primera semana.</p>
                </div>
                <div className="border-b-2 border-black dark:border-white/20 pb-4">
                  <h4 className="font-black uppercase mb-1">¿Puedo probarlo antes de pagar?</h4>
                  <p className="text-sm font-bold opacity-80">Sí. Tienes 30 días gratuitos en el Plan Base para convencerte.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
