import { format, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/server/db/prisma";
import { updatePrivacyRequestStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recibida",
  IN_REVIEW: "En revisión",
  FULFILLED: "Atendida",
  DENIED: "Denegada",
};

const TYPE_LABELS: Record<string, string> = {
  ACCESS: "Acceso",
  RECTIFICATION: "Rectificación",
  SUPPRESSION: "Supresión",
  OPPOSITION: "Oposición",
  PORTABILITY: "Portabilidad",
  BLOCKING: "Bloqueo",
};

export default async function PrivacyRequestsPage() {
  const now = new Date();
  const requests = await prisma.privacyRequest.findMany({
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 100,
  });
  const pending = requests.filter((request) => request.status === "RECEIVED" || request.status === "IN_REVIEW");
  const overdue = pending.filter((request) => isBefore(request.dueAt, now)).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-black/45">Cumplimiento</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tighter text-black sm:text-4xl">Solicitudes de privacidad</h1>
        <p className="mt-1 max-w-3xl text-sm font-bold text-black/55">Cola restringida para verificar identidad y responder derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border-4 border-black bg-[#FFF5BA] p-4 shadow-[5px_5px_0_#000]"><p className="text-xs font-black uppercase text-black/60">Pendientes</p><p className="mt-2 text-3xl font-black">{pending.length}</p></div>
        <div className={`border-4 border-black p-4 shadow-[5px_5px_0_#000] ${overdue > 0 ? "bg-[#FFB5E8]" : "bg-[#BFFCC6]"}`}><p className="text-xs font-black uppercase text-black/60">Fuera de plazo</p><p className="mt-2 text-3xl font-black">{overdue}</p></div>
        <div className="border-4 border-black bg-[#85E3FF] p-4 shadow-[5px_5px_0_#000]"><p className="text-xs font-black uppercase text-black/60">Total registradas</p><p className="mt-2 text-3xl font-black">{requests.length}</p></div>
      </div>

      <section className="overflow-hidden border-4 border-black bg-white shadow-[6px_6px_0_#000]">
        <div className="border-b-4 border-black bg-black px-5 py-4 text-white"><h2 className="text-sm font-black uppercase tracking-wide">Bandeja de solicitudes</h2><p className="mt-1 text-xs font-bold text-white/60">La identidad queda pendiente hasta completar la verificación por un canal confiable. El bloqueo temporal tiene un plazo operativo de 2 días hábiles.</p></div>
        {requests.length === 0 ? <p className="p-6 text-sm font-bold text-black/60">Aún no hay solicitudes.</p> : (
          <div className="divide-y-4 divide-black">
            {requests.map((request) => {
              const isPending = request.status === "RECEIVED" || request.status === "IN_REVIEW";
              const isOverdue = isPending && isBefore(request.dueAt, now);
              return (
                <article key={request.id} className="p-5">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="space-y-1 text-sm">
                      <p className="font-black uppercase">{TYPE_LABELS[request.requestType] || request.requestType} · {request.name}</p>
                      <p className="font-bold text-black/65">{request.email}</p>
                      <p className="text-xs font-bold text-black/55">Recibida {format(request.createdAt, "d MMM yyyy HH:mm", { locale: es })} · Vence {format(request.dueAt, "d MMM yyyy", { locale: es })} · Identidad: {request.identityStatus === "VERIFIED" ? "verificada" : "pendiente"}</p>
                      {isOverdue && <p className="text-xs font-black uppercase text-[#B0004B]">Requiere atención inmediata</p>}
                    </div>
                    <span className={`inline-flex w-fit border-2 border-black px-2 py-1 text-xs font-black uppercase ${request.status === "FULFILLED" ? "bg-[#BFFCC6]" : request.status === "DENIED" ? "bg-black text-white" : "bg-[#FFF5BA]"}`}>{STATUS_LABELS[request.status] || request.status}</span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap border-2 border-black/20 bg-black/[0.03] p-3 text-sm leading-6">{request.details}</p>
                  <form action={updatePrivacyRequestStatus} className="mt-4 grid gap-3 md:grid-cols-[180px_150px_1fr_auto] md:items-end">
                    <input type="hidden" name="id" value={request.id} />
                    <label className="text-xs font-black uppercase">Estado<select name="status" defaultValue={request.status} className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="text-xs font-black uppercase">Identidad<select name="identityStatus" defaultValue={request.identityStatus} className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"><option value="PENDING">Pendiente</option><option value="VERIFIED">Verificada</option></select></label>
                    <label className="text-xs font-black uppercase">Nota de resolución<input name="resolutionNotes" defaultValue={request.resolutionNotes || ""} maxLength={4000} className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-medium" placeholder="Verificación y respuesta entregada" /></label>
                    <label className="text-xs font-black uppercase">Canal de respuesta<input name="responseChannel" defaultValue={request.responseChannel || ""} maxLength={120} className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-medium" placeholder="Correo electrónico" /></label>
                    <label className="text-xs font-black uppercase md:col-span-3">Contenido íntegro de respuesta<textarea name="responseContent" defaultValue={request.responseContent || ""} maxLength={8000} rows={3} className="mt-1 w-full resize-y border-2 border-black bg-white px-2 py-2 text-sm font-medium" placeholder="Copia aquí la respuesta enviada al titular" /></label>
                    <button type="submit" className="border-2 border-black bg-[#B28DFF] px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#000]">Guardar</button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
