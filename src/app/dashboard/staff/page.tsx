import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { Users } from "lucide-react";
import { StaffList } from "./staff-list";
import { getStaffLimitInfo } from "@/server/actions/dashboard.actions";
import { PageTutorial } from "@/components/dashboard/page-tutorial";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;

  const [staffMembers, limitInfo, allServices] = await Promise.all([
    prisma.staff.findMany({
      where: { businessId: business.id },
      include: {
        schedule: { orderBy: { dayOfWeek: "asc" } },
        services: { select: { id: true } },
        scheduleBlocks: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
          take: 20,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    getStaffLimitInfo(business.id),
    prisma.service.findMany({
      where: { businessId: business.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serialized = staffMembers.map((s) => ({
    id: s.id, name: s.name, email: s.email, isActive: s.isActive,
    schedule: s.schedule.map((sc) => ({ dayOfWeek: sc.dayOfWeek, startTime: sc.startTime, endTime: sc.endTime, isWorking: sc.isWorking })),
    serviceIds: s.services.map((sv) => sv.id),
    blocks: s.scheduleBlocks.map((b) => ({
      id: b.id,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      reason: b.reason,
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
          <p className="text-sm text-muted-foreground">Gestiona tu equipo y sus horarios individuales.</p>
        </div>
      </div>
      <StaffList staff={serialized} limitInfo={limitInfo} allServices={allServices} />

      <PageTutorial
        tutorialKey="profesionales_v1"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "PROFESIONALES",
              description: "Aquí gestionas a todo tu equipo. Puedes agregar nuevos profesionales si tu plan lo permite.",
            }
          },
          {
            element: "button[title='Añadir profesional']",
            popover: {
              title: "NUEVO PROFESIONAL",
              description: "Haz clic aquí para agregar a un nuevo miembro del equipo. Se enviará una invitación a su correo opcionalmente.",
              side: "bottom",
              align: "end"
            }
          },
          {
            element: ".space-y-8 > div:last-child",
            popover: {
              title: "GESTIÓN DE HORARIOS",
              description: "Al hacer clic en un profesional, podrás configurar sus horarios, qué servicios realiza, y bloquear días u horas específicas.",
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
