import { prisma } from "@/server/db/prisma";
import { BusinessesClient } from "./businesses-client";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const businesses = await prisma.business.findMany({
    include: {
      owner: { select: { name: true, email: true } },
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          isTrial: true,
          trialEndsAt: true,
        },
      },
      _count: {
        select: { staff: true, services: true, appointments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <BusinessesClient businesses={businesses} />;
}

