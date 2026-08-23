
import { LocalizedText } from "@/components/i18n/localized-text";
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
  if (!user) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="92MLir4qhMgu" /></div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="JzdJYFMcoEJN" /></div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.STAFF_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="DASMDa3AfehR" /></div>;
  }

  const [staffMembers, limitInfo, allServices, accessProfiles, businessLocations] = await Promise.all([
    prisma.staff.findMany({
      where: { businessId: business.id },
      include: {
        user: { select: { id: true, role: true } },
        accessProfile: { select: { id: true, name: true } },
        schedule: { orderBy: { dayOfWeek: "asc" } },
        locations: {
          where: { isActive: true, location: { isActive: true } },
          include: { location: { select: { id: true, name: true } }, schedule: { orderBy: { dayOfWeek: "asc" } } },
        },
        services: { select: { id: true } },
        scheduleBlocks: {
          where: { endTime: { gte: new Date() } },
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
    prisma.businessLocation.findMany({
      where: { businessId: business.id, isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
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
    locations: s.locations.map((assignment) => ({
      locationId: assignment.location.id,
      name: assignment.location.name,
      schedule: assignment.schedule.map((sc) => ({ dayOfWeek: sc.dayOfWeek, startTime: sc.startTime, endTime: sc.endTime, isWorking: sc.isWorking, breakStart: sc.breakStart, breakEnd: sc.breakEnd })),
    })),
    serviceIds: s.services.map((sv) => sv.id),
    blocks: s.scheduleBlocks.map((b) => ({
      id: b.id,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      reason: b.reason,
      type: b.type,
      releaseAt: b.releaseAt?.toISOString() ?? null,
    })),
  }));

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" data-tour="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Users className="h-5 w-5 text-brand-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl"><LocalizedText id="WvNULhqPYqbr" /></h1>
            <p className="text-sm text-muted-foreground"><LocalizedText id="EwuJRp2-YIYn" /></p>
          </div>
        </div>
        {business.ownerId === user.id && (
          <Link href="/dashboard/staff/roles" className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#6D28D9] bg-[#7C3AED] px-4 py-2.5 text-left text-white shadow-[2px_2px_0_#111] transition-transform hover:-translate-y-0.5 lg:w-auto lg:min-w-[250px]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15"><ShieldCheck className="h-4 w-4" /></span>
            <span>
              <span className="block text-sm font-black"><LocalizedText id="ZbvRWWfJzdSu" /></span>
              <span className="block text-[11px] font-medium text-white"><LocalizedText id="2UY6bKLAF44s" /></span>
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
        allLocations={businessLocations}
        useBusinessScheduleOnly={limitInfo.plan === "INDIVIDUAL"}
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
