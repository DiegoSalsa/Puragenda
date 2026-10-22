import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { createPuriContext } from "@/server/puri/context";
import { createGrowthScope, growthSandboxEnabled } from "@/server/puri/growth/access";
import { growthBudgetSnapshot } from "@/server/puri/growth/budgets";
import { prisma } from "@/server/db/prisma";
import { publicConsentEnabled } from "@/server/contact-flow/public-consent";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!growthSandboxEnabled()) notFound();
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  const context = await createPuriContext(user, { pathname: "/dashboard/puri-plus/settings", locale: "es" });
  const scope = await createGrowthScope(context);
  if (!scope.owner) notFound();
  const [budgets, policy, worker, suppressions, pending] = await Promise.all([
    growthBudgetSnapshot(scope), prisma.cfPolicy.findUnique({ where: { key: scope.businessId } }),
    prisma.commercialWorkerState.findUnique({ where: { key: "PURAGENDA_NEXT" } }),
    prisma.cfSuppression.count({ where: { businessId: scope.businessId } }),
    prisma.cfConsent.count({ where: { businessId: scope.businessId, state: "PENDING_VERIFICATION" } }),
  ]);
  return <div className="mx-auto max-w-4xl space-y-5 pb-8">
    <Link href="/dashboard/puri-plus" className="text-sm font-bold underline">Volver a Puri+</Link>
    <h1 className="text-2xl font-black">Configuración comercial</h1>
    <section className="rounded-2xl border-2 border-black bg-white p-5 text-black">
      <h2 className="font-black">Uso mensual de Puri+</h2>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Categoría</th><th className="p-2">Operaciones</th><th className="p-2">Presupuesto USD</th><th className="p-2">Estado</th></tr></thead><tbody>{budgets.map(b => <tr key={b.category} className="border-t"><td className="p-2">{b.category}</td><td className="p-2">{b.spentUnits + b.reservedUnits} / {b.limitUnits}</td><td className="p-2">{((b.spentMicros + b.reservedMicros) / 1000000).toFixed(4)} / {(b.limitMicros / 1000000).toFixed(2)}</td><td className="p-2">{b.unknownCost ? "Conciliación requerida" : b.alertLevel >= 80 ? `Alerta ${b.alertLevel}%` : "Disponible"}</td></tr>)}</tbody></table></div>
      {!budgets.length && <p className="mt-3 text-sm">Sin presupuesto configurado. La IA permanece bloqueada.</p>}
    </section>
    <section className="space-y-2 rounded-2xl border-2 border-black bg-white p-5 text-sm text-black">
      <h2 className="font-black">Contact Flow</h2>
      <p>Correo: {policy?.emailEnabled ? "habilitado por política" : "desactivado"}. Pausa del negocio: {policy?.killed !== false ? "activa" : "sin pausa"}.</p>
      <p>Cuota: {policy?.dailyLimit ?? 0} al día · {policy?.monthlyLimit ?? 0} al mes. Separada de los recordatorios de reservas.</p>
      <p>Consentimiento en reservas: {publicConsentEnabled() ? "opcional, requiere correo verificado" : "desactivado"}. {pending} pendientes de confirmación · {suppressions} registros de supresión.</p>
      <p>Envíos productivos: desactivados. Las pruebas externas requieren un remitente verificado y destinatarios técnicos autorizados.</p>
    </section>
    <section className="space-y-2 rounded-2xl border-2 border-black bg-white p-5 text-sm text-black">
      <h2 className="font-black">Ejecución y permisos</h2>
      <p>Última ejecución correcta: {worker?.lastSuccessAt?.toISOString() ?? "sin ejecución registrada"}. {worker?.lastError ? "Requiere revisión operativa." : ""}</p>
      <p>El propietario autoriza campañas. El equipo conserva los permisos y sucursales asignados. Puri prepara propuestas; la autorización de ejecución requiere una acción humana independiente.</p>
    </section>
  </div>;
}
