import type { Metadata } from "next";
import Link from "next/link";
import { verifyReviewToken } from "@/server/security/review-token";
import { getReviewFormContext } from "@/server/services/reviews.service";
import { ReviewOpenedTracker } from "./review-opened-tracker";
import { ValorarClient } from "./valorar-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Valorar atención",
  robots: { index: false, follow: false },
};

export default async function ValorarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const claims = verifyReviewToken(decoded);

  if (!claims) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-5 py-12">
        <h1 className="text-2xl font-black">Enlace no válido</h1>
        <p className="mt-2 text-sm font-semibold text-black/60">
          Este enlace de valoración expiró o no es válido.
        </p>
      </main>
    );
  }

  const context = await getReviewFormContext({
    appointmentId: claims.appointmentId,
    businessId: claims.businessId,
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
      <ReviewOpenedTracker authenticated={false} />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">Opinión verificada</p>
      <h1 className="mt-2 text-3xl font-black">¿Cómo estuvo tu atención?</h1>
      <ValorarClient
        token={decoded}
        businessName={context.appointment.business.name}
        serviceName={context.appointment.serviceName}
      />
    </main>
  );
}
