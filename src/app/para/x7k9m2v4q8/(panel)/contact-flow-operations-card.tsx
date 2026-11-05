import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { getCurrentAdminSessionUser } from "@/server/auth/admin-session";
import { contactOperationalStatus } from "@/server/contact-flow/operations";

export async function ContactFlowOperationsCard() {
  const admin = await getCurrentAdminSessionUser();
  if (!admin) return null;
  const contactFlow = await contactOperationalStatus(admin.id);
  return <>
    {contactFlow.proReview && (
      <section role="alert" className="border-4 border-black bg-[#FFF5BA] p-5 shadow-[6px_6px_0_#000]">
        <h2 className="font-black uppercase">Primer cliente pagado de Puragenda+</h2>
        <p className="mt-2 text-sm font-bold">Mercado Pago confirmó un cobro real y la conciliación quedó aplicada. Corresponde revisar la contratación manual de Resend Pro.</p>
        <p className="mt-2 text-sm">Contact Flow conserva sus límites actuales hasta que se amplíe la capacidad y se actualice la configuración.</p>
        <Link className="mt-3 inline-block font-black underline" href={`${ADMIN_SECRET_PATH}/businesses/${encodeURIComponent(contactFlow.proReview.businessId)}`}>Revisar negocio</Link>
      </section>
    )}
    <section className="border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
      <h2 className="font-black uppercase">Contact Flow · capacidad de correo</h2>
      <p className="mt-2 text-sm font-bold">{contactFlow.release.deliveryEnabled ? "Activación configurada" : "Envío productivo pausado"}. {contactFlow.capacity?.lastError ? "La capacidad del proveedor requiere revisión; las campañas quedan en cola." : contactFlow.capacity?.lastSuccessAt ? "Consumo del proveedor registrado; el worker comprueba su vigencia antes de enviar." : "Falta una lectura confiable de capacidad antes de enviar."}</p>
      <p className="mt-2 text-sm">Última ejecución completada del worker: {contactFlow.worker?.lastSuccessAt ? contactFlow.worker.lastSuccessAt.toLocaleString("es-CL",{timeZone:"America/Santiago"}) : "sin registro"}. {contactFlow.needsAttention ? "Hay trabajo pendiente o errores que requieren revisión." : "Sin incidencias registradas."}</p>
    </section>
  </>;
}
