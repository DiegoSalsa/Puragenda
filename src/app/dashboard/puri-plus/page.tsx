import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { growthSandboxEnabled } from "@/server/puri/growth/access";
import { PuriPlusWorkspace } from "@/components/dashboard/puri-plus/workspace";
import { prisma } from "@/server/db/prisma";
import { COMMERCIAL_PLAN_METADATA } from "@/core/commercial-catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "Puri+ · Puragenda", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  if (!growthSandboxEnabled()) notFound();
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  const business = await getBusinessForUser(user.id);
  if (!business) notFound();
  const owner = business.ownerId === user.id;
  const subscription = owner ? await prisma.commercialSubscription.findUnique({ where: { businessId: business.id }, select: {
    planCode: true, status: true, periodEnd: true, renewalAt: true, professionalTotal: true, lastPaymentStatus: true,
  } }) : null;
  return <div className="space-y-6 pb-8">
    <section className="rounded-2xl border-2 border-black bg-white p-5 text-black shadow-[3px_3px_0_#171717]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-widest">Puragenda+</p><h1 className="mt-1 text-2xl font-black">Puri+ y Contact Flow</h1></div>
        <Link href="/dashboard/puri-plus/settings" className="rounded-xl border-2 border-black px-4 py-2 text-sm font-bold">Configuración y límites</Link>
      </div>
      <p className="mt-3 text-sm">Detecta oportunidades con tus reservas, revisa estrategias y autoriza cada campaña desde tu dashboard.</p>
      {owner && <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div><p className="font-bold">Plan completo mensual</p><p>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly)} CLP · IVA incluido</p><p className="text-xs">Incluye un profesional, web, Puri+ y Contact Flow. Profesionales adicionales según catálogo.</p></div>
        <div><p className="font-bold">Suscripción</p><p>{subscription?.planCode === "PURAGENDA_PLUS" ? subscription.status : "Sin Puragenda+ contratado"}</p><p className="text-xs">Pago: {subscription?.lastPaymentStatus ?? "sin confirmar"}</p></div>
        <div><p className="font-bold">Período pagado</p><p>{subscription?.periodEnd ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: business.timezone }).format(subscription.periodEnd) : "Sin período confirmado"}</p><p className="text-xs">Las capacidades premium se verifican en cada operación.</p></div>
      </div>}
    </section>
    <PuriPlusWorkspace searchParams={searchParams} dashboard />
  </div>;
}
