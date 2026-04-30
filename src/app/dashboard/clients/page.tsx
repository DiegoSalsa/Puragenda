import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { ClientsTable } from "./clients-table";

export default async function ClientsPage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { ownerId: user.id },
    include: {
      subscription: { select: { plan: true } },
    },
  });

  if (!business) redirect("/dashboard/settings");

  const plan = business.subscription?.plan || "INDIVIDUAL";
  const isPro = plan === "PRO";

  if (!isPro) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">CRM de clientes y sistema anti-inasistencias.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED]/10 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Funcionalidad exclusiva del Plan PRO</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Desbloquea el <span className="font-semibold text-foreground">CRM de Clientes</span> y el{" "}
            <span className="font-semibold text-foreground">Escudo Anti-Inasistencias</span> con el Plan PRO.
            Conoce a tus clientes, trackea su historial y bloquea automáticamente a los que faltan.
          </p>
          <a
            href="/pricing"
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6] shadow-lg shadow-[#7C3AED]/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
            Mejorar a Plan PRO
          </a>
        </div>
      </div>
    );
  }

  // PRO plan: fetch clients
  const clients = await prisma.client.findMany({
    where: { businessId: business.id },
    include: {
      _count: {
        select: { appointments: true },
      },
      appointments: {
        where: { status: "CHECKED_IN" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const clientsData = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    totalSpent: c.totalSpent,
    noShowCount: c.noShowCount,
    totalAppointments: c._count.appointments,
    completedAppointments: c.appointments.length,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CRM de clientes · {clientsData.length} registrado{clientsData.length !== 1 ? "s" : ""}
        </p>
      </div>
      <ClientsTable clients={clientsData} />
    </div>
  );
}
