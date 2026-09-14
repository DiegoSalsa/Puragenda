import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientPortalAccount, getClientPortalEmail } from "@/server/services/client-portal.service";
import { getReviewFormContext } from "@/server/services/reviews.service";
import { prisma } from "@/server/db/prisma";
import { ReviewOpenedTracker } from "../../[token]/review-opened-tracker";
import { PortalReviewClient } from "./portal-review-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Valorar atención",
  robots: { index: false, follow: false },
};

export default async function PortalReviewPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const email = await getClientPortalEmail();
  const account = await getClientPortalAccount();
  if (!email || !account) {
    const returnTo = `/valorar/cita/${encodeURIComponent(appointmentId)}`;
    redirect(`/mi-agenda?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, businessId: true, customerEmail: true, client: { select: { email: true } } },
  });
  const matches = appointment && (
    appointment.customerEmail.trim().toLowerCase() === email.trim().toLowerCase()
    || appointment.client?.email.trim().toLowerCase() === email.trim().toLowerCase()
  );
  if (!matches || !appointment) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-5 py-12">
        <h1 className="text-2xl font-black">No se puede valorar</h1>
        <p className="mt-2 text-sm font-semibold text-black/60">No encontramos esa reserva en tu agenda.</p>
        <Link href="/mi-agenda" className="mt-6 inline-block text-sm font-black underline">Ir a Mi agenda</Link>
      </main>
    );
  }

  const context = await getReviewFormContext({
    appointmentId: appointment.id,
    businessId: appointment.businessId,
    email,
  });
  if (!context.ok) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-5 py-12">
        <h1 className="text-2xl font-black">No se puede valorar</h1>
        <p className="mt-2 text-sm font-semibold text-black/60">{context.error}</p>
        <Link href="/mi-agenda" className="mt-6 inline-block text-sm font-black underline">Ir a Mi agenda</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-10">
      <ReviewOpenedTracker authenticated />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">Opinión verificada</p>
      <h1 className="mt-2 text-3xl font-black">¿Cómo estuvo tu atención?</h1>
      <PortalReviewClient
        appointmentId={appointment.id}
        businessName={context.appointment.business.name}
        serviceName={context.appointment.serviceName}
      />
    </main>
  );
}
