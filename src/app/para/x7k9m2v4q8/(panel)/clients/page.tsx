import { prisma } from "@/server/db/prisma";
import { ClientsClient } from "./clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const now = new Date();
  const clients = await prisma.clientPortalAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      emailVerifiedAt: true,
      createdAt: true,
      sessions: {
        orderBy: { lastUsedAt: "desc" },
        take: 1,
        select: { lastUsedAt: true },
      },
      _count: {
        select: {
          sessions: { where: { expiresAt: { gt: now } } },
        },
      },
    },
  });

  return <ClientsClient clients={clients} />;
}
