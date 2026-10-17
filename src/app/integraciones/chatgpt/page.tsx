import Link from "next/link";
export const metadata = { title: "Conectar Puragenda con ChatGPT y Codex", description: "Conexión MCP, permisos y revocación de acceso a Puragenda." };
export default function Page() {
  return <main className="mx-auto max-w-2xl space-y-6 px-6 py-16"><Link href="/" className="text-brand-foreground">Puragenda</Link><h1 className="text-3xl font-bold">Puragenda en ChatGPT y Codex</h1>
    <p>Esta integración permite consultar tu agenda y estadísticas con los permisos de tu cuenta, y preparar cambios de citas que apruebas en Puragenda. Su disponibilidad en el directorio depende de la revisión y publicación.</p>
    <ol className="list-decimal space-y-3 pl-6"><li>En la configuración de plugins o conexiones de tu cliente, añade el servidor MCP de Puragenda que te indique tu administrador.</li><li>Inicia sesión en Puragenda, selecciona el negocio y revisa los permisos solicitados.</li><li>Consulta primero la cuenta conectada para comprobar el negocio. Para conectar otro negocio, añade otra conexión.</li><li>Al crear, cancelar o reprogramar una cita, abre el enlace de preparación, revisa los datos y aprueba. Luego vuelve al chat para ejecutar y verificar el resultado.</li></ol>
    <p>Los servicios con abono requieren el flujo habitual del negocio y no se crean mediante el conector. Las reservas públicas del conector admiten exclusivamente servicios gratuitos. Una cita pendiente no equivale a una reserva confirmada.</p>
    <p>Puedes revocar conexiones en <Link href="/dashboard/settings#chatgpt-connection" className="text-brand-foreground underline">Configuración de Puragenda</Link>. Cambiar tus permisos, desactivar tu membresía o cerrar todas las sesiones también invalida el acceso correspondiente.</p>
    <p>Ejemplos: «¿Qué citas tengo hoy?», «Compara lo cobrado esta semana con la anterior», «Prepara la reprogramación de esta cita».</p>
    <p><Link href="/integraciones/chatgpt/conexiones" className="text-brand-foreground underline">Consultar o revocar mis conexiones</Link></p>
    <Link href="/politica-de-privacidad" className="text-brand-foreground underline">Datos y privacidad</Link>
  </main>;
}
