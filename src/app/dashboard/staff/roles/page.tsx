import { redirect } from "next/navigation";
import { AccessProfilesManager } from "./access-profiles-manager";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function StaffRolesPage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;
  if (business.ownerId !== user.id && user.role !== "SUPERADMIN") {
    return <div className="py-20 text-center text-muted-foreground">Solo la cuenta owner puede administrar roles.</div>;
  }
  const profiles = await prisma.accessProfile.findMany({
    where: { businessId: business.id },
    include: { _count: { select: { staff: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  return (
    <AccessProfilesManager profiles={profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      permissions: profile.permissions,
      baseRole: profile.baseRole,
      isSystem: profile.isSystem,
      accountCount: profile._count.staff,
    }))} />
  );
}
