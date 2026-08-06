import Link from "next/link";
import { CalendarCheck2, ShieldCheck, UsersRound } from "lucide-react";

import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  googleCalendarIsConfigured,
  googleCalendarOAuthIsAvailableFor,
} from "@/server/services/google-calendar.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { GoogleCalendarCard } from "./google-calendar-card";

export const dynamic = "force-dynamic";

function connectionSummary(connection: {
  id: string;
  googleEmail: string;
  calendarId: string;
  calendarName: string | null;
  includeCustomerAttendee: boolean;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
}) {
  return {
    ...connection,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
  };
}

export default async function GoogleCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string; google_error?: string }>;
}) {
  const user = await getCurrentSessionUser();
  if (!user) return <div>Debes iniciar sesión.</div>;
  const business = await getBusinessForUser(user.id);
  if (!business) return <div>No tienes un negocio configurado.</div>;

  const [canManageBusiness, ownStaff, connections, team, params] = await Promise.all([
    hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE),
    prisma.staff.findFirst({
      where: { businessId: business.id, userId: user.id, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.googleCalendarConnection.findMany({
      where: { businessId: business.id },
      select: {
        id: true,
        scope: true,
        staffId: true,
        googleEmail: true,
        calendarId: true,
        calendarName: true,
        includeCustomerAttendee: true,
        lastSyncedAt: true,
        lastSyncError: true,
      },
    }),
    prisma.staff.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true, email: true, userId: true },
      orderBy: { name: "asc" },
    }),
    searchParams,
  ]);
  const businessConnection = connections.find((connection) => connection.scope === "BUSINESS");
  const ownConnection = ownStaff
    ? connections.find((connection) => connection.scope === "STAFF" && connection.staffId === ownStaff.id)
    : null;
  const configured = googleCalendarIsConfigured();
  const oauthAvailable = googleCalendarOAuthIsAvailableFor(user.email);

  const errorMessages: Record<string, string> = {
    denied: "No se otorgaron los permisos de Google Calendar.",
    invalid_state: "La autorización venció o no es válida. Intenta conectar nuevamente.",
    token_exchange: "Google no pudo completar la conexión. Revisa las credenciales OAuth.",
    not_configured: "Faltan las credenciales OAuth de Google en el servidor.",
    forbidden: "No tienes permisos para conectar ese calendario.",
    verification_pending:
      "La conexión de nuevas cuentas está limitada temporalmente a usuarios de prueba mientras Google verifica los permisos.",
  };

  return (
    <div className="space-y-7">
      <header>
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-6 w-6 text-[#4285F4]" />
          <h1 className="text-3xl font-bold tracking-tight">Google Calendar</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Crea, modifica y cancela eventos automáticamente. El calendario personal de cada profesional también bloquea sus horas ocupadas en el widget.
        </p>
      </header>

      <aside className="flex items-start gap-3 rounded-2xl border border-[#4285F4]/30 bg-[#4285F4]/10 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#4285F4]" />
        <div className="text-sm">
          <p className="font-semibold">Privacidad y control de tus datos de Google</p>
          <p className="mt-1 max-w-4xl text-muted-foreground">
            Puragenda usa los permisos únicamente para identificar la cuenta, elegir un calendario,
            sincronizar citas y bloquear intervalos ocupados. No lee el contenido de eventos externos,
            no vende estos datos y protege los tokens con cifrado. Puedes desconectar el acceso aquí cuando quieras.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-medium text-[#4285F4]">
            <Link href="/politica-de-privacidad#google-calendar" className="hover:underline">
              Ver política sobre datos de Google
            </Link>
            <a
              href="https://myaccount.google.com/connections"
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              Administrar acceso en Google
            </a>
          </div>
        </div>
      </aside>

      {params.google_connected === "true" && (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-500">
          Google Calendar quedó conectado correctamente.
        </p>
      )}
      {params.google_error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-500">
          {errorMessages[params.google_error] || "No se pudo conectar Google Calendar."}
        </p>
      )}

      {canManageBusiness && (
        <GoogleCalendarCard
          title="Calendario principal del negocio"
          description="Respaldo para todas las citas. Invita al profesional asignado y al cliente sin duplicar eventos."
          scope="business"
          configured={configured}
          oauthAvailable={oauthAvailable}
          connection={businessConnection ? connectionSummary(businessConnection) : null}
        />
      )}

      {ownStaff && (
        <GoogleCalendarCard
          title={`Mi calendario · ${ownStaff.name}`}
          description="Tiene prioridad para tus propias citas y sus eventos externos bloquean horas en tu agenda pública."
          scope="staff"
          configured={configured}
          oauthAvailable={oauthAvailable}
          connection={ownConnection ? connectionSummary(ownConnection) : null}
        />
      )}

      {canManageBusiness && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UsersRound className="h-4 w-4 text-[#4285F4]" /> Estado del equipo
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada profesional con acceso a Puragenda puede conectar su cuenta desde esta misma sección.
          </p>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border">
            {team.map((staff) => {
              const connection = connections.find(
                (item) => item.scope === "STAFF" && item.staffId === staff.id,
              );
              return (
                <div key={staff.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.email || "Sin correo"}</p>
                  </div>
                  <span className={`text-xs font-medium ${connection ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {connection
                      ? `Conectado: ${connection.googleEmail}`
                      : staff.userId
                        ? "Pendiente de conectar"
                        : "Sin cuenta de acceso a Puragenda"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {canManageBusiness && team.some((staff) => staff.id !== ownStaff?.id) && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Calendarios de los profesionales</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Puedes ayudar a conectar cada cuenta aunque el profesional todavía no tenga acceso a Puragenda.
            </p>
          </div>
          {team
            .filter((staff) => staff.id !== ownStaff?.id)
            .map((staff) => {
              const connection = connections.find(
                (item) => item.scope === "STAFF" && item.staffId === staff.id,
              );
              return (
                <GoogleCalendarCard
                  key={staff.id}
                  title={`Calendario de ${staff.name}`}
                  description="Sus horas ocupadas bloquean el widget y sus citas se crean directamente en este calendario."
                  scope="staff"
                  staffId={staff.id}
                  configured={configured}
                  oauthAvailable={oauthAvailable}
                  connection={connection ? connectionSummary(connection) : null}
                />
              );
            })}
        </section>
      )}
    </div>
  );
}
