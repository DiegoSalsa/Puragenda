import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { PlanClient } from "./plan-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.recurringBooking.findUnique({
    where: { managementToken: token },
    select: { service: { select: { name: true } }, business: { select: { name: true } } },
  });
  if (!booking) return { title: "Plan no encontrado" };
  return {
    title: `Mi Plan — ${booking.service.name} | ${booking.business.name}`,
    description: `Gestiona tu suscripción de ${booking.service.name} en ${booking.business.name}`,
  };
}

export default async function MiPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const exists = await prisma.recurringBooking.findUnique({
    where: { managementToken: token },
    select: { id: true },
  });

  if (!exists) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-4 text-white">
      <PlanClient token={token} />
    </div>
  );
}
