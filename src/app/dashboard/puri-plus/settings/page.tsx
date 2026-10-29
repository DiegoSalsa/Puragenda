import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { getCommercialUsageSummary } from "@/server/services/commercial-usage-summary";
import { createPuriContext } from "@/server/puri/context";
import { createGrowthScope, growthSandboxEnabled } from "@/server/puri/growth/access";
import { CommercialUsagePanel } from "@/components/dashboard/commercial-usage-panel";
import { contactSnapshot } from "@/server/contact-flow/campaigns";
import { prisma } from "@/server/db/prisma";
import { publicConsentEnabled } from "@/server/contact-flow/public-consent";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!growthSandboxEnabled()) notFound();
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  const business = await getBusinessForUser(user.id);
  if (!business || business.ownerId !== user.id) notFound();
  const access = await getCommercialPlanAccess(business.id), usage = await getCommercialUsageSummary(business.id);
  const contact = access.has("contact_flow") ? await contactSnapshot(await createGrowthScope(await createPuriContext(user, { pathname: "/dashboard/puri-plus/settings", locale: "es" }))) : null;
  const [suppressions, pending] = contact ? await Promise.all([
    prisma.cfSuppression.count({ where: { businessId: business.id } }),
    prisma.cfConsent.count({ where: { businessId: business.id, state: "PENDING_VERIFICATION" } }),
  ]) : [0, 0];
  return <div className="mx-auto max-w-4xl space-y-5 pb-8">
    <Link href="/dashboard/puri-plus" className="text-sm font-bold underline">Volver a Puri+</Link>
    <h1 className="text-2xl font-black">Consumo y límites de tu plan</h1>
    <CommercialUsagePanel initial={usage} />
    {!contact ? <p className="rounded-2xl border-2 border-black bg-white p-5 text-sm">{access.allowed ? "Contact Flow y Puri avanzado están incluidos en Puragenda+." : "Tu periodo terminó. Puedes activar tu plan; tus datos se conservan."} <Link className="font-bold underline" href="/dashboard/settings#plan">Ver tu plan</Link></p> : <>
    <section className="space-y-2 rounded-2xl border-2 border-black bg-white p-5 text-sm text-black">
      <h2 className="font-black">Contact Flow</h2>
      <p>Cupo: {contact.policy?.dailyLimit ?? "sin configurar"} correos al día · {contact.policy?.monthlyLimit ?? "sin configurar"} al mes. Separado de los recordatorios de reservas.</p>
      <p>Intervalo mínimo entre contactos: {contact.policy?.contactDays ?? "sin configurar"} días. Pausa de envíos: {contact.policy?.killed !== false || contact.global?.killed !== false ? "activa" : "sin pausa"}.</p>
      <p>Consentimiento en reservas: {publicConsentEnabled() ? "opcional, requiere correo verificado" : "desactivado"}. {pending} pendientes de confirmación · {suppressions} registros de supresión.</p>
      <p>{contact.mode === "PRODUCTION_RESEND" ? "Solo se procesan campañas que autorizaste, dentro de sus límites." : "Los envíos a clientes siguen desactivados. Las pruebas externas se restringen a destinatarios autorizados."}</p>
    </section>
    <section className="space-y-2 rounded-2xl border-2 border-black bg-white p-5 text-sm text-black">
      <h2 className="font-black">Tu autorización decide</h2>
      <p>El propietario autoriza campañas. El equipo conserva los permisos y sucursales asignados. Puri prepara propuestas; la autorización de ejecución requiere una acción humana independiente.</p>
    </section>
    </>}
  </div>;
}
