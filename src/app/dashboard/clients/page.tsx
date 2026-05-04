import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { ClientsTable } from "./clients-table";
import { getBusinessForUser } from "@/server/services/business.service";

export default async function ClientsPage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  const biz = await getBusinessForUser(user.id);
  if (!biz) redirect("/dashboard/settings");

  const business = await prisma.business.findUnique({
    where: { id: biz.id },
  });

  if (!business) redirect("/dashboard/settings");

  // CRM available for all plans
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
