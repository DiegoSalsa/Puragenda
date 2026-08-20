
import { LocalizedText } from "@/components/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { CalendarDays, Check, Clock, Gift, History, MapPin, Sparkles, Store } from "lucide-react";
import {
  getClientPortalData,
  getClientPortalEmail,
  getClientPortalProfile,
} from "@/server/services/client-portal.service";
import { safeClientPortalReturnTo } from "@/server/validations/client-portal";
import {
  ClientPortalAccessForm,
  ClientPortalActivationCard,
  ClientPortalAppointmentActions,
  ClientPortalLogout,
  ClientPortalProfileEditor,
} from "./client-portal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi agenda",
  description: "Consulta tus próximas citas, historial y premios.",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  AWAITING_PAYMENT: "Esperando pago",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "En atención",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

function appointmentDate(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "EEEE d 'de' MMMM", { locale: es });
}

function appointmentTime(start: Date, end: Date, timezone: string) {
  return `${formatInTimeZone(start, timezone, "HH:mm")} – ${formatInTimeZone(end, timezone, "HH:mm")}`;
}

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cuenta?: string; returnTo?: string }>;
}) {
  const [email, query] = await Promise.all([getClientPortalEmail(), searchParams]);
  const returnTo = safeClientPortalReturnTo(query.returnTo);
  if (!email) return <ClientPortalAccessForm invalidLink={query.error === "enlace-invalido" || query.error === "activacion-invalida"} returnTo={returnTo} />;

  const [data, profile] = await Promise.all([
    getClientPortalData(email),
    getClientPortalProfile(email),
  ]);
  if (returnTo && profile) redirect(returnTo);
  const firstName = data.displayName.split(/\s+/)[0];

  return (
    <main className="min-h-screen bg-[#fffaf0] text-black">
      <header className="border-b-3 border-black bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Ir al inicio">
            <img src="/logos/logoPuragendaSVG.svg" alt="Puragenda" className="h-11 w-auto" />
          </Link>
          <ClientPortalLogout />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border-4 border-black bg-[#c4b5fd] p-6 shadow-[8px_8px_0_#000] sm:p-9">
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border-4 border-black bg-[#fff5ba]" />
          <div className="relative max-w-2xl">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em]"><LocalizedText id="ghZyVGcTCJ9z" /></p>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl"><LocalizedText id="-DINcEjYeVEU" /> {firstName}.</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 sm:text-base">
              <LocalizedText id="2hal186n_8_K" />
            </p>
          </div>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.45fr_0.8fr]">
          <div className="space-y-10">
            <section>
              <div className="mb-4 flex items-center gap-3">
                <CalendarDays className="h-6 w-6" strokeWidth={2.8} />
                <h2 className="text-xl font-black sm:text-2xl"><LocalizedText id="3__-DXhULfaV" /></h2>
                <span className="rounded-full border-2 border-black bg-[#85e3ff] px-2.5 py-0.5 text-xs font-black">{data.upcoming.length}</span>
              </div>

              {data.upcoming.length === 0 ? (
                <div className="rounded-2xl border-3 border-dashed border-black/35 bg-white/60 p-8 text-center">
                  <CalendarDays className="mx-auto h-9 w-9 text-black/35" />
                  <p className="mt-3 font-black"><LocalizedText id="uFafXRRBDIuO" /></p>
                  <p className="mt-1 text-sm font-medium text-black/55"><LocalizedText id="B7wjsuQ4XlA3" /></p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.upcoming.map((appointment, index) => {
                    // This dynamic server page intentionally evaluates action availability at request time.
                    // eslint-disable-next-line react-hooks/purity
                    const hoursUntil = (appointment.startTime.getTime() - Date.now()) / 3_600_000;
                    const canManage = appointment.business.includeAppointmentActionsInConfirmationEmail;
                    const canReschedule = canManage && appointment.business.allowRescheduling && !appointment.recurringBookingId && hoursUntil >= appointment.business.rescheduleHoursLimit;

                    return (
                      <article key={appointment.id} className="rounded-2xl border-3 border-black bg-white p-5 shadow-[5px_5px_0_#000] sm:p-6">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black ${index === 0 ? "bg-[#bffcc6]" : "bg-[#fff5ba]"}`}>
                            {appointment.business.logoUrl ? (
                              <img src={appointment.business.logoUrl} alt="" className="h-full w-full rounded-[9px] object-cover" />
                            ) : <Store className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider text-black/45">{appointment.business.name}</p>
                                <h3 className="mt-1 text-lg font-black">{appointment.service.name}</h3>
                              </div>
                              <span className="rounded-full border-2 border-black bg-[#bffcc6] px-2.5 py-1 text-[10px] font-black uppercase">{STATUS_LABELS[appointment.status]}</span>
                            </div>
                            <div className="mt-4 grid gap-2 text-sm font-semibold text-black/65 sm:grid-cols-2">
                              <p className="flex items-center gap-2 capitalize"><CalendarDays className="h-4 w-4 text-black" />{appointmentDate(appointment.startTime, appointment.business.timezone)}</p>
                              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-black" />{appointmentTime(appointment.startTime, appointment.endTime, appointment.business.timezone)}</p>
                              {appointment.staff?.name && <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-black" />{appointment.staff.name}</p>}
                              {appointment.business.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-black" />{appointment.business.address}</p>}
                            </div>
                            <ClientPortalAppointmentActions appointmentId={appointment.id} canCancel={canManage} canReschedule={canReschedule} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <History className="h-6 w-6" strokeWidth={2.8} />
                <h2 className="text-xl font-black sm:text-2xl"><LocalizedText id="mVwHHfrudM6E" /></h2>
              </div>
              <div className="overflow-hidden rounded-2xl border-3 border-black bg-white">
                {data.history.length === 0 ? (
                  <p className="p-6 text-sm font-semibold text-black/50"><LocalizedText id="GRNXlpeXye_E" /></p>
                ) : data.history.map((appointment, index) => (
                  <div key={appointment.id} className={`flex items-center justify-between gap-4 p-4 ${index ? "border-t-2 border-black/10" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate font-black">{appointment.service.name}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-black/50">{appointment.business.name} · <span className="capitalize">{appointmentDate(appointment.startTime, appointment.business.timezone)}</span></p>
                    </div>
                    <span className={`shrink-0 rounded-full border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${appointment.status === "CANCELLED" || appointment.status === "NO_SHOW" ? "bg-red-100" : "bg-[#bffcc6]"}`}>
                      {STATUS_LABELS[appointment.status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            {profile
              ? <ClientPortalProfileEditor profile={profile} />
              : <ClientPortalActivationCard email={email} initialName={data.displayName === "Cliente" ? "" : data.displayName} />}
            <section>
            <div className="mb-4 flex items-center gap-3">
              <Gift className="h-6 w-6" strokeWidth={2.8} />
              <h2 className="text-xl font-black sm:text-2xl"><LocalizedText id="mMz0bV7E_UM0" /></h2>
            </div>
            <div className="space-y-4 lg:sticky lg:top-6">
              {data.clients.filter((client) => client.business.isLoyaltyEnabled).length === 0 ? (
                <div className="rounded-2xl border-3 border-dashed border-black/35 bg-white/60 p-6 text-center">
                  <Gift className="mx-auto h-8 w-8 text-black/35" />
                  <p className="mt-3 text-sm font-bold text-black/55"><LocalizedText id="yRfFS3qeRyf_" /></p>
                </div>
              ) : data.clients.filter((client) => client.business.isLoyaltyEnabled).map((client) => {
                const required = Math.max(1, client.business.stampsRequired);
                const progress = Math.min(100, Math.round((client.currentStamps / required) * 100));
                return (
                  <article key={client.id} className="rounded-2xl border-3 border-black bg-[#ffb5e8] p-5 shadow-[5px_5px_0_#000]">
                    <p className="text-xs font-black uppercase tracking-wider">{client.business.name}</p>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-black">{client.currentStamps}/{required}</p>
                        <p className="text-xs font-bold"><LocalizedText id="9aUWRMrWCOWZ" /></p>
                      </div>
                      <span className="text-xl font-black">{progress}%</span>
                    </div>
                    <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-black bg-white">
                      <div className="h-full bg-[#7c3aed]" style={{ width: `${progress}%` }} />
                    </div>
                    {client.business.rewardName && <p className="mt-3 text-sm font-black"><LocalizedText id="vZnf-Ubjfpbj" /> {client.business.rewardName}</p>}
                    {client.loyaltyCodes.length > 0 && (
                      <div className="mt-4 rounded-xl border-2 border-black bg-[#bffcc6] p-3">
                        <p className="flex items-center gap-2 text-xs font-black uppercase"><Check className="h-4 w-4" /> <LocalizedText id="SXJTCZrmm2K-" /></p>
                        {client.loyaltyCodes.map((reward) => <p key={reward.id} className="mt-2 font-mono text-sm font-black">{reward.code}</p>)}
                      </div>
                    )}
                    <Link href={`/widget/${client.business.slug}`} className="mt-4 inline-flex items-center text-xs font-black underline decoration-2 underline-offset-4"><LocalizedText id="6SU94P85w4-J" /></Link>
                  </article>
                );
              })}
            </div>
            </section>
          </aside>
        </div>

        <footer className="mt-14 border-t-2 border-black/15 py-6 text-center text-xs font-bold text-black/40">
          <LocalizedText id="RLylJ9wkQKiB" /> {data.email} <LocalizedText id="7_pfVjmkayXE" />
        </footer>
      </div>
    </main>
  );
}
