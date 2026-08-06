
import { LocalizedText } from "@/components/i18n/localized-text";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { RecurringClient } from "./recurring-client";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { getCountryConfig } from "@/core/countries";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="sHS_BPq6bc__" /></div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="cAo2JMIpl23f" /></div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.RECURRING_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="S6rXjhnbI8lA" /></div>;
  }
  const country = getCountryConfig(business.countryCode);

  const agendaScope = await getStaffAgendaScope(user, business);
  const scopedStaffFilter = agendaScope.canSeeAllAgendas
    ? {}
    : { staffId: agendaScope.staffId ?? "__no_staff_access__" };

  const bookings = await prisma.recurringBooking.findMany({
    where: { businessId: business.id, ...scopedStaffFilter },
    orderBy: { createdAt: "desc" },
    include: {
      service: { select: { id: true, name: true, duration: true } },
      staff: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true } },
      appointments: {
        orderBy: { startTime: "asc" },
        select: { id: true, startTime: true, endTime: true, status: true },
      },
      sessionOverrides: {
        orderBy: { createdAt: "desc" },
        select: { id: true, originalDate: true, newTime: true, reason: true, requestedByClient: true, createdAt: true },
      },
      _count: { select: { appointments: true } },
    },
  });

  const serialized = bookings.map((b) => ({
    id: b.id,
    status: b.status as string,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    customerRut: b.customerRut,
    serviceName: b.service.name,
    serviceId: b.service.id,
    staffName: b.staff?.name ?? null,
    staffId: b.staff?.id ?? null,
    clientId: b.client?.id ?? null,
    selectedDays: b.selectedDays,
    selectedTimes: b.selectedTimes as Record<string, string>,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    durationMonths: b.durationMonths,
    internalNotes: b.internalNotes,
    healthAnswers: b.healthAnswers as Record<string, string> | null,
    healthFreeText: b.healthFreeText,
    pausedUntil: b.pausedUntil?.toISOString() ?? null,
    managementToken: b.managementToken,
    createdAt: b.createdAt.toISOString(),
    totalAppointments: b._count.appointments,
    completedAppointments: b.appointments.filter((a) => ["CHECKED_IN", "COMPLETED"].includes(a.status)).length,
    appointments: b.appointments.map((a) => ({
      id: a.id,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
      status: a.status as string,
    })),
    sessionOverrides: b.sessionOverrides.map((o) => ({
      id: o.id,
      originalDate: o.originalDate.toISOString(),
      newTime: o.newTime,
      reason: o.reason,
      requestedByClient: o.requestedByClient,
      createdAt: o.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><LocalizedText id="LJaEyV9lV-lK" /></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <LocalizedText id="VDiwdIEBIKRi" /> {bookings.length} <LocalizedText id="ESOYctF4cprM" />
        </p>
      </div>
      <RecurringClient
        bookings={serialized}
        locale={country.locale}
        timezone={business.timezone || country.timezone}
        taxIdLabel={country.taxIdLabel}
      />

      <PageTutorial
        tutorialKey="suscripciones_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "PLANES RECURRENTES",
              description: "Si ofreces planes mensuales (por ejemplo, 4 sesiones al mes), aquí podrás gestionar a los clientes suscritos.",
            }
          },
          {
            element: ".space-y-4", // Targeting the list container inside RecurringClient
            popover: {
              title: "GESTIÓN DE PLANES",
              description: "Verás las solicitudes pendientes de aprobación, y podrás pausar o cancelar suscripciones activas.",
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
