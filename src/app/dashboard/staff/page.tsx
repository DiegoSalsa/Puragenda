import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { StaffList } from "./staff-list";
import { getStaffLimitInfo } from "@/server/actions/dashboard.actions";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para gestionar profesionales</div>;
  }

  const [staffMembers, limitInfo, allServices, accessProfiles] = await Promise.all([
    prisma.staff.findMany({
      where: { businessId: business.id },
      include: {
        user: { select: { id: true, role: true } },
        accessProfile: { select: { id: true, name: true } },
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
    prisma.accessProfile.findMany({
      where: { businessId: business.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
  ]);

  const serialized = staffMembers.map((s) => ({
    id: s.id, name: s.name, email: s.email, isActive: s.isActive,
    imageUrl: s.imageUrl,
    role: s.user?.role ?? null,
    accessProfileId: s.accessProfile?.id ?? null,
    accessProfileName: s.accessProfile?.name ?? null,
    userId: s.user?.id ?? null,
    isOwner: s.user?.id === business.ownerId,
    schedule: s.schedule.map((sc) => ({ dayOfWeek: sc.dayOfWeek, startTime: sc.startTime, endTime: sc.endTime, isWorking: sc.isWorking, breakStart: sc.breakStart, breakEnd: sc.breakEnd })),
    serviceIds: s.services.map((sv) => sv.id),
    blocks: s.scheduleBlocks.map((b) => ({
      id: b.id,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      reason: b.reason,
    })),
  }));

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" data-tour="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Users className="h-5 w-5 text-[#7C3AED]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profesionales</h1>
            <p className="text-sm text-muted-foreground">Gestiona tu equipo, horarios y accesos individuales.</p>
          </div>
        </div>
        {business.ownerId === user.id && (
          <Link href="/dashboard/staff/roles" className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#6D28D9] bg-[#7C3AED] px-4 py-2.5 text-left text-white shadow-[2px_2px_0_#111] transition-transform hover:-translate-y-0.5 lg:w-auto lg:min-w-[250px]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15"><ShieldCheck className="h-4 w-4" /></span>
            <span>
              <span className="block text-sm font-black">Roles y funcionalidades</span>
              <span className="block text-[11px] font-medium text-white/75">Define qué puede ver cada persona</span>
            </span>
          </Link>
        )}
      </div>
      <StaffList
        staff={serialized}
        limitInfo={limitInfo}
        allServices={allServices}
        accessProfiles={accessProfiles}
        canManageRoles={business.ownerId === user.id}
      />

      <PageTutorial
        tutorialKey="profesionales_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "PROFESIONALES",
              description: "Aquí gestionas a todo tu equipo. Puedes agregar nuevos profesionales si tu plan lo permite.",
            }
          },
          {
            element: "#btn-add-staff",
            popover: {
              title: "NUEVO PROFESIONAL",
              description: "Haz clic aquí para agregar a un nuevo miembro del equipo. Se enviará una invitación a su correo opcionalmente.",
              side: "bottom",
              align: "end"
            }
          },
          {
            element: ".space-y-4",
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
