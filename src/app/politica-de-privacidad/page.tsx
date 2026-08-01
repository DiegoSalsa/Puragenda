import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ChevronLeft } from "lucide-react";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad y protección de datos personales de Puragenda.",
  alternates: { canonical: absoluteUrl("/politica-de-privacidad") },
};

export default function PrivacidadPage() {
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
                Política de Privacidad
              </h1>
              <p className="mt-4 text-sm text-[#7C3AED] uppercase tracking-widest font-medium">
                Última actualización: Agosto 2026
              </p>
            </header>

            <article className="
              text-base text-muted-foreground leading-relaxed
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-6
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-4
              [&_p]:mb-6
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-3 [&_ul]:mb-6 [&_ul]:marker:text-[#7C3AED]
              [&_li]:pl-2
              [&_a]:text-[#7C3AED] hover:[&_a]:text-[#A78BFA] [&_a]:underline [&_a]:transition-colors
              [&_strong]:text-foreground [&_strong]:font-semibold
            ">
              <h2>1. Introducción</h2>
              <p>
                En PuroCode (&quot;la Empresa&quot;), operadores de Puragenda (&quot;el Servicio&quot;), nos comprometemos
                a proteger la privacidad de nuestros usuarios. Esta política describe cómo recopilamos,
                utilizamos, almacenamos y protegemos su información personal en conformidad con la
                Ley N° 19.628 de Protección de la Vida Privada de Chile.
              </p>

              <h2>2. Datos que Recopilamos</h2>

              <h3>2.1 Datos de los negocios (clientes del SaaS)</h3>
              <ul>
                <li>Nombre del negocio y datos de contacto</li>
                <li>Correo electrónico y contraseña (encriptada)</li>
                <li>Información de servicios, profesionales y horarios configurados</li>
                <li>Dirección IP al momento del registro (prevención de fraude)</li>
              </ul>

              <h3>2.2 Datos de los clientes finales (quienes reservan)</h3>
              <ul>
                <li>Nombre, correo electrónico y teléfono (proporcionados al agendar)</li>
                <li>Historial de reservas y citas</li>
              </ul>

              <h3>2.3 Datos técnicos</h3>
              <ul>
                <li>Cookies esenciales para el funcionamiento del sitio</li>
                <li>Información del navegador y dispositivo</li>
                <li>Datos de uso y navegación (analítica)</li>
              </ul>

              <h2>3. Uso de los Datos</h2>
              <p>Utilizamos los datos recopilados para:</p>
              <ul>
                <li>Proporcionar y mantener el Servicio</li>
                <li>Procesar reservas y gestionar citas</li>
                <li>Enviar notificaciones relacionadas con el Servicio</li>
                <li>Prevenir fraudes y abusos</li>
                <li>Mejorar la experiencia del usuario</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>

              <h2>4. Almacenamiento y Seguridad</h2>
              <p>
                Los datos se almacenan en servidores seguros proporcionados por proveedores de infraestructura
                en la nube con certificaciones de seguridad internacionales. Las contraseñas se almacenan
                con cifrado bcrypt. Las comunicaciones se realizan mediante protocolo HTTPS/TLS.
              </p>

              <h2>5. Cookies</h2>
              <p>Utilizamos los siguientes tipos de cookies:</p>
              <ul>
                <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento del sitio (sesión, autenticación)</li>
                <li><strong>Cookies de preferencias:</strong> Guardan configuraciones del usuario (tema oscuro/claro)</li>
                <li><strong>Cookies analíticas:</strong> Nos ayudan a entender cómo se utiliza el Servicio (pueden ser desactivadas)</li>
              </ul>
              <p>
                Puede gestionar sus preferencias de cookies a través del banner que aparece al visitar el sitio
                por primera vez, o desde la configuración de su navegador.
              </p>

              <h2>6. Compartir Datos con Terceros</h2>
              <p>
                No vendemos ni compartimos datos personales con terceros para fines publicitarios.
                Los datos pueden ser compartidos únicamente con:
              </p>
              <ul>
                <li>Proveedores de infraestructura (hosting, base de datos)</li>
                <li>Servicios de procesamiento de pagos (cuando aplique)</li>
                <li>Autoridades legales cuando sea requerido por ley</li>
              </ul>

              <h2>7. Derechos del Usuario</h2>
              <p>De acuerdo con la legislación vigente, usted tiene derecho a:</p>
              <ul>
                <li>Acceder a sus datos personales almacenados</li>
                <li>Solicitar la rectificación de datos incorrectos</li>
                <li>Solicitar la eliminación de sus datos</li>
                <li>Oponerse al tratamiento de sus datos</li>
                <li>Solicitar la portabilidad de sus datos</li>
              </ul>
              <p>
                Para ejercer estos derechos, puede contactarnos a través de nuestro sitio web.
              </p>

              <h2>8. Retención de Datos</h2>
              <p>
                Los datos se conservan mientras la cuenta esté activa o según sea necesario para
                proporcionar el Servicio. Al eliminar una cuenta, los datos se eliminan en un plazo
                de 30 días, salvo que la ley requiera su conservación por un período mayor.
              </p>

              <h2 id="google-calendar" className="scroll-mt-32">9. Integración con Google Calendar y datos de Google</h2>

              <h3>9.1 Datos de Google a los que accede Puragenda</h3>
              <p>
                La integración con Google Calendar es opcional y solo se activa cuando el usuario
                selecciona &quot;Conectar con Google&quot; y concede su autorización. Puragenda accede únicamente a:
              </p>
              <ul>
                <li>El correo de la cuenta de Google, para identificar qué cuenta está conectada.</li>
                <li>La lista de calendarios y sus datos básicos, como identificador, nombre, calendario principal y nivel de acceso, para permitir que el usuario elija el calendario de destino.</li>
                <li>Los intervalos de disponibilidad ocupada del calendario seleccionado, para impedir reservas que se superpongan. Puragenda no consulta ni muestra el título, descripción o contenido de los eventos externos.</li>
                <li>Los eventos de citas administrados por Puragenda, para crearlos, actualizarlos o eliminarlos cuando una reserva cambia o se cancela.</li>
              </ul>

              <h3>9.2 Finalidad del uso</h3>
              <p>
                Los datos de Google se utilizan exclusivamente para ofrecer la sincronización visible de citas,
                seleccionar el calendario conectado, enviar las actualizaciones autorizadas y bloquear horarios
                ocupados en la agenda pública del profesional. No se utilizan para publicidad, elaboración de
                perfiles, evaluación crediticia ni entrenamiento de modelos de inteligencia artificial.
              </p>

              <h3>9.3 Almacenamiento y protección</h3>
              <p>
                Puragenda conserva el correo conectado, el identificador y nombre del calendario elegido, los
                identificadores de los eventos sincronizados y el estado de la conexión. Los tokens OAuth se
                cifran en reposo mediante AES-256-GCM y se transmiten únicamente mediante HTTPS/TLS. Los intervalos
                ocupados consultados desde eventos externos se usan para calcular disponibilidad y no se almacenan
                como contenido de dichos eventos.
              </p>

              <h3>9.4 Transferencia, divulgación y uso limitado</h3>
              <p>
                No vendemos, transferimos ni compartimos datos de usuarios de Google con plataformas publicitarias,
                corredores de datos u otros terceros. Solo pueden ser procesados por proveedores de infraestructura
                necesarios para operar Puragenda, bajo obligaciones de confidencialidad y seguridad, o cuando una
                ley aplicable lo exija. El uso y la transferencia de información recibida desde las APIs de Google
                cumplen con la Política de Datos de Usuario de los Servicios de API de Google, incluidos sus
                requisitos de Uso Limitado.
              </p>
              <p lang="en">
                Puragenda&apos;s use and transfer of information received from Google APIs adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>

              <h3>9.5 Control, revocación y eliminación</h3>
              <p>
                El usuario puede desconectar Google Calendar en cualquier momento desde la misma sección del
                dashboard. Al desconectar, Puragenda revoca el token, elimina las credenciales y la configuración
                de conexión almacenadas, y retira del calendario los eventos creados por esa conexión. También se
                puede revocar el acceso desde la página de conexiones de la cuenta de Google. Los datos de reservas
                creados directamente en Puragenda se conservan conforme a las reglas generales de retención de esta
                política.
              </p>
              <p>
                Para administrar o revocar el acceso concedido, visite{" "}
                <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">
                  las conexiones de su cuenta de Google
                </a>.
              </p>

              <h2>10. Menores de Edad</h2>
              <p>
                El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente
                datos de menores. Si detectamos que hemos recopilado datos de un menor, los eliminaremos.
              </p>

              <h2>11. Cambios en esta Política</h2>
              <p>
                Nos reservamos el derecho de actualizar esta política. Los cambios serán notificados
                a través de la plataforma. La fecha de última actualización se indica al inicio del documento.
              </p>

              <h2>12. Contacto</h2>
              <p>
                Para consultas sobre privacidad y protección de datos, contáctenos en{" "}
                <a href="mailto:contacto@purocode.com">contacto@purocode.com</a>.
              </p>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
