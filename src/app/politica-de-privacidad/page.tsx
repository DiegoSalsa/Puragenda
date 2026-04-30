import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad y protección de datos personales de Puragenda.",
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-8">
        <Link href="/" className="text-sm text-[#7C3AED] hover:underline">← Volver al inicio</Link>
      </div>
      <article className="prose prose-invert prose-purple max-w-none">
        <h1>Política de Privacidad</h1>
        <p className="text-muted-foreground"><em>Última actualización: Abril 2026</em></p>

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

        <h2>9. Menores de Edad</h2>
        <p>
          El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente
          datos de menores. Si detectamos que hemos recopilado datos de un menor, los eliminaremos.
        </p>

        <h2>10. Cambios en esta Política</h2>
        <p>
          Nos reservamos el derecho de actualizar esta política. Los cambios serán notificados
          a través de la plataforma. La fecha de última actualización se indica al inicio del documento.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Para consultas sobre privacidad y protección de datos, contáctenos en{" "}
          <a href="https://purocode.cl" className="text-[#7C3AED]">purocode.cl</a>.
        </p>
      </article>
    </main>
  );
}
