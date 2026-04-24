import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { Users } from "lucide-react";
import { StaffList } from "./staff-list";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-white/40">Debes iniciar sesión</div>;

  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return <div className="py-20 text-center text-white/40">No tienes un negocio</div>;

  const staffMembers = await prisma.staff.findMany({
    where: { businessId: business.id },
    include: { schedule: { orderBy: { dayOfWeek: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const serialized = staffMembers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    isActive: s.isActive,
    schedule: s.schedule.map((sc) => ({
      dayOfWeek: sc.dayOfWeek,
      startTime: sc.startTime,
      endTime: sc.endTime,
      isWorking: sc.isWorking,
    })),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Users className="h-5 w-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profesionales</h1>
          <p className="text-sm text-white/40">Gestiona tu equipo y sus horarios individuales.</p>
        </div>
      </div>
      <StaffList staff={serialized} />
    </div>
  );
}
