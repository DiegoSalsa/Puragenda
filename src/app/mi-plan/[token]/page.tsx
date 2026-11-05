import { prisma } from "@/server/db/prisma";
import { notFound, redirect } from "next/navigation";
import { PlanClient } from "./plan-client";
import { getClientPortalEmail } from "@/server/services/client-portal.service";
import { portalPlanWhere } from "@/server/services/portal-plan.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mi plan", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function MiPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const email = await getClientPortalEmail();
  if (!email) redirect(`/mi-agenda?returnTo=${encodeURIComponent(`/mi-plan/${token}`)}`);

  const exists = await prisma.recurringBooking.findFirst({
    where: portalPlanWhere(token, email),
    select: { id: true },
  });

  if (!exists) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4 text-white">
      <PlanClient token={exists.id} initialEmail={email} />
    </div>
  );
}
