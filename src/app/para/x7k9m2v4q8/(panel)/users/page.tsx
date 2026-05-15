import { prisma } from "@/server/db/prisma";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isSuperAdmin: true,
      createdAt: true,
      deletedAt: true,
      businesses: {
        select: { id: true, name: true, slug: true },
        take: 1,
      },
    },
  });

  return <UsersClient users={users} />;
}
