import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso de la plataforma Puragenda.",
};

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-8">
        <Link href="/" className="text-sm text-[#7C3AED] hover:underline">← Volver al inicio</Link>
      </div>
      <article className="prose prose-invert prose-purple max-w-none">
        <h1>Términos y Condiciones de Uso</h1>
        <p className="text-muted-foreground"><em>Última actualización: Abril 2026</em></p>

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
          en <a href="https://purocode.cl" className="text-[#7C3AED]">purocode.cl</a>.
        </p>
      </article>
    </main>
  );
}
