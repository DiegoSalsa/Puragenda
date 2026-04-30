import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Puragenda",
  description: "Términos y condiciones de uso de la plataforma Puragenda.",
};

export default function TerminosPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-[#7C3AED]/30">
      <Navbar />
      
      <main className="relative overflow-hidden pt-24 lg:pt-32 pb-20">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/10 blur-[120px]" />
        
        <div className="mx-auto w-full max-w-4xl px-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#7C3AED] transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" /> Volver al inicio
          </Link>

          <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-2xl p-8 shadow-2xl sm:p-12 md:p-16 relative">
            {/* Subtle inner border glow */}
            <div className="absolute inset-0 -z-10 rounded-3xl ring-1 ring-inset ring-white/5" />
            
            <header className="mb-12 border-b border-border/50 pb-8 text-center sm:text-left">
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                Términos y Condiciones
              </h1>
              <p className="mt-4 text-sm text-[#7C3AED] uppercase tracking-widest font-medium">
                Última actualización: Abril 2026
              </p>
            </header>

            <article className="prose prose-invert prose-purple max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-[#7C3AED] hover:prose-a:text-[#A78BFA] prose-strong:text-foreground">
              <h2>1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar la plataforma Puragenda (&quot;el Servicio&quot;), operada por PuroCode (&quot;la Empresa&quot;),
                usted acepta cumplir con estos Términos y Condiciones. Si no está de acuerdo con alguno de estos términos,
                le recomendamos no utilizar el Servicio.
              </p>

              <h2>2. Descripción del Servicio</h2>
              <p>
                Puragenda es una plataforma SaaS de agendamiento online que permite a negocios gestionar citas,
                reservas y disponibilidad de sus profesionales a través de un widget embebible y un panel de administración.
              </p>

              <h3>2.1 Funcionalidades principales</h3>
              <ul>
                <li>Gestión de citas y reservas online</li>
                <li>Widget de reservas personalizable para sitios web</li>
                <li>Gestión de múltiples profesionales y servicios</li>
                <li>Detección automática de colisiones de horarios</li>
                <li>Panel de administración para el negocio</li>
              </ul>

              <h2>3. Registro y Cuentas</h2>
              <p>
                Para utilizar el Servicio, debe crear una cuenta proporcionando información veraz y actualizada.
                Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas
                las actividades que ocurran bajo su cuenta.
              </p>

              <h2>4. Planes y Pagos</h2>
              <p>
                Puragenda ofrece diferentes planes de suscripción. Los precios, límites y características de cada
                plan están detallados en nuestra página de precios. La Empresa se reserva el derecho de modificar
                los precios con previo aviso de 30 días.
              </p>

              <h2>5. Uso Aceptable</h2>
              <p>El usuario se compromete a:</p>
              <ul>
                <li>No utilizar el Servicio para fines ilegales o no autorizados</li>
                <li>No intentar acceder a cuentas o datos de otros usuarios</li>
                <li>No interferir con el funcionamiento normal del Servicio</li>
                <li>No enviar contenido malicioso, spam o virus a través del Servicio</li>
              </ul>

              <h2>6. Propiedad Intelectual</h2>
              <p>
                Todo el contenido, diseño, código y funcionalidades de Puragenda son propiedad exclusiva
                de PuroCode. Los datos ingresados por los usuarios son propiedad del usuario respectivo.
              </p>

              <h2>7. Limitación de Responsabilidad</h2>
              <p>
                El Servicio se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;. La Empresa no garantiza
                que el Servicio será ininterrumpido o libre de errores. En ningún caso la Empresa será responsable
                por daños indirectos, incidentales o consecuentes.
              </p>

              <h2>8. Terminación</h2>
              <p>
                La Empresa puede suspender o cancelar su cuenta si se detecta un uso que viole estos términos.
                El usuario puede cancelar su cuenta en cualquier momento desde el panel de configuración.
              </p>

              <h2>9. Modificaciones</h2>
              <p>
                La Empresa se reserva el derecho de modificar estos términos en cualquier momento.
                Los cambios serán notificados a través de la plataforma o por correo electrónico.
                El uso continuado del Servicio después de los cambios constituye la aceptación de los mismos.
              </p>

              <h2>10. Legislación Aplicable</h2>
              <p>
                Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa será
                sometida a la jurisdicción de los tribunales competentes de Santiago de Chile.
              </p>

              <h2>11. Contacto</h2>
              <p>
                Para consultas sobre estos términos, puede contactarnos a través de nuestro sitio web
                en <a href="https://purocode.cl">purocode.cl</a>.
              </p>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
