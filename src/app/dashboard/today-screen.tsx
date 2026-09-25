"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useLocale, useTranslations } from "next-intl";
import { MoreHorizontal, Plus } from "@/components/icons/hover-icons";
import { buildStoryStudioHref } from "@/lib/today-dashboard";
import { formatPrice } from "@/lib/utils";
import type { TodayDashboardData } from "@/server/services/today-dashboard.service";
import { AppointmentEditor } from "./appointment-editor";
import { AppointmentDetailDialog, type DashboardAppointment } from "./appointment-detail-dialog";
import { CopyWidgetLink } from "./copy-widget-link";
import { ScheduleBlockForm } from "./schedule-block-form";

const surface = "border-2 border-black bg-white text-black shadow-[3px_3px_0_#000] dark:border-white dark:bg-card dark:text-foreground dark:shadow-[3px_3px_0_#fff]";
const press = "hover:translate-x-px hover:translate-y-px hover:shadow-none";
const primaryBtn = `inline-flex min-h-11 items-center justify-center gap-1.5 border-2 border-black bg-[#7C3AED] px-3.5 py-2 text-sm font-black text-white shadow-[3px_3px_0_#000] ${press} dark:border-white dark:shadow-[3px_3px_0_#fff]`;
const secondaryBtn = `inline-flex min-h-11 items-center justify-center border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black shadow-[3px_3px_0_#000] ${press} dark:border-white dark:bg-card dark:text-foreground dark:shadow-[3px_3px_0_#fff]`;

function agendaHref(data: TodayDashboardData) {
  const query = new URLSearchParams();
  query.set("date", data.dateKey);
  if (data.showingOwnAgenda) query.set("agenda", "mine");
  if (data.selectedLocationSlug) query.set("location", data.selectedLocationSlug);
  return `/dashboard/agenda?${query.toString()}`;
}

function scopeHref(data: TodayDashboardData, agenda?: "mine", location?: string) {
  const query = new URLSearchParams();
  if (agenda) query.set("agenda", agenda);
  if (location) query.set("location", location);
  const value = query.toString();
  return value ? `/dashboard?${value}` : "/dashboard";
}

function storyHref(cue: NonNullable<TodayDashboardData["story"]>, objective: "LAST_MINUTE" | "CANCELLATION" = cue.objective) {
  return buildStoryStudioHref({
    locationId: cue.locationId,
    staffId: cue.staffId,
    serviceId: cue.serviceId,
    date: cue.date,
    objective,
  });
}

function wallTime(iso: string, timeZone: string) {
  return format(toZonedTime(parseISO(iso), timeZone), "HH:mm");
}

function durationMinutes(start: string, end: string) {
  return Math.max(1, Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / 60000));
}

function statusChip(status: string) {
  if (status === "CONFIRMED" || status === "COMPLETED") return "bg-[#BFFCC6]";
  if (status === "CHECKED_IN") return "bg-[#85E3FF]";
  if (status === "AWAITING_PAYMENT" || status === "NO_SHOW") return "bg-[#FFB5E8]";
  if (status === "CANCELLED") return "bg-white";
  return "bg-[#FFF5BA]";
}

export function TodayScreen({ data }: { data: TodayDashboardData }) {
  const t = useTranslations("dashboard.today");
  const homeT = useTranslations("dashboard.home");
  const calendarT = useTranslations("dashboard.calendar");
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockStaffId, setBlockStaffId] = useState(data.blockStaff[0]?.id ?? "");
  const selected = data.appointments.find((appointment) => appointment.id === selectedId) ?? null;
  const spotlight = data.appointments.find((appointment) => appointment.phase === "current" || appointment.phase === "next") ?? null;
  const rest = data.appointments.filter((appointment) => appointment.id !== spotlight?.id);
  const storyTarget = data.story ? storyHref(data.story) : "/dashboard/stories";
  const freed = data.attention.find((item) => item.id === "freed-availability");
  const dateLabel = useMemo(() => {
    const [year, month, day] = data.dateKey.split("-").map(Number);
    const formatted = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [data.dateKey, locale]);
  const context = [
    data.kpis.appointments > 0 ? t("contextAppointments", { count: data.kpis.appointments }) : null,
    data.showOpenSlots && data.kpis.openSlots > 0 && !data.story ? t("contextSlots", { count: data.kpis.openSlots }) : null,
  ].filter(Boolean).join(" · ");

  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      PENDING: calendarT("status.pending"),
      AWAITING_PAYMENT: calendarT("status.awaitingPayment"),
      CONFIRMED: calendarT("status.confirmed"),
      CANCELLED: calendarT("status.cancelled"),
      CHECKED_IN: calendarT("status.checkedIn"),
      COMPLETED: t("statusCompleted"),
      NO_SHOW: calendarT("status.noShow"),
    };
    return labels[status] ?? status;
  }

  function paymentLabel(label: TodayDashboardData["appointments"][number]["paymentLabel"]) {
    if (label === "collected") return t("paymentCollected");
    if (label === "partial") return t("paymentPartial");
    if (label === "pending") return t("paymentPending");
    if (label === "due") return t("paymentDue");
    return null;
  }

  function attentionCopy(item: TodayDashboardData["attention"][number]) {
    if (item.id === "pending-payments") return t("pendingPayments", { count: item.count });
    if (item.id === "pending-recurring") return t("pendingRecurring", { count: item.count });
    if (item.id === "needs-close") return t("needsClose", { count: item.count });
    return t("freedAvailability", { when: item.when === "afternoon" ? t("afternoon") : t("todayWord") });
  }

  function relativeLabel(appointment: TodayDashboardData["appointments"][number]) {
    if (appointment.phase === "current") return t("inProgressEyebrow");
    const minutes = Math.round((parseISO(appointment.startTime).getTime() - now) / 60000);
    if (minutes < 60) return t("inMinutes", { count: Math.max(1, minutes) });
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder === 0 ? t("inHours", { count: hours }) : t("inHoursMinutes", { hours, minutes: remainder });
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)] lg:items-start lg:gap-5">
      <header className="order-1 flex flex-col gap-4 lg:col-span-2 lg:order-none lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-4xl font-black tracking-tight text-black dark:text-foreground">{t("title")}</h1>
          <p className="mt-1 text-lg font-bold text-black dark:text-foreground">{dateLabel}</p>
          {context && <p className="mt-1 text-sm font-medium text-black/70 dark:text-foreground/70">{context}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {data.canToggleOwnAgenda && (
            <div className="grid grid-cols-2 border-2 border-black bg-white shadow-[3px_3px_0_#000] dark:border-white dark:bg-card dark:shadow-[3px_3px_0_#fff] sm:inline-grid">
              <Link href={scopeHref(data, undefined, data.selectedLocationSlug ?? undefined)} className={`px-3 py-2 text-center text-sm font-black ${!data.showingOwnAgenda ? "bg-[#7C3AED] text-white" : "bg-[#FFF5BA] text-black"}`} aria-current={!data.showingOwnAgenda ? "page" : undefined}>{homeT("wholeBusiness")}</Link>
              <Link href={scopeHref(data, "mine", data.selectedLocationSlug ?? undefined)} className={`border-l-2 border-black px-3 py-2 text-center text-sm font-black dark:border-white ${data.showingOwnAgenda ? "bg-[#7C3AED] text-white" : "bg-[#FFF5BA] text-black"}`} aria-current={data.showingOwnAgenda ? "page" : undefined}>{homeT("mySchedule")}</Link>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {data.canManageAppointments && (
              <button type="button" onClick={() => setCreating(true)} className={primaryBtn}><Plus className="h-4 w-4" /> {t("newAppointment")}</button>
            )}
            <Link href={agendaHref(data)} className={secondaryBtn}>{t("viewAgenda")}</Link>
            {data.canGenerateStory && <Link href={storyTarget} className={secondaryBtn}>{t("generateStory")}</Link>}
            {data.canBlockTime && data.blockStaff.length > 0 && (
              <details className="relative">
                <summary className={`${secondaryBtn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} aria-label={t("moreActions")}><MoreHorizontal className="h-4 w-4" /></summary>
                <div className={`absolute right-0 z-20 mt-2 w-56 p-1 ${surface}`}>
                  <button type="button" onClick={() => setBlocking(true)} className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-[#FFF5BA]">{t("blockTime")}</button>
                </div>
              </details>
            )}
          </div>
        </div>
      </header>

      {data.locations.length > 1 && (
        <div className="order-1 flex flex-wrap gap-2 lg:col-span-2 lg:order-none">
          {data.locations.map((location) => (
            <Link key={location.id} href={scopeHref(data, data.showingOwnAgenda ? "mine" : undefined, location.slug)} className={`border-2 border-black px-3 py-1.5 text-sm font-bold dark:border-white ${data.selectedLocationSlug === location.slug ? "bg-[#7C3AED] text-white shadow-[2px_2px_0_#000]" : "bg-white text-black dark:bg-card dark:text-foreground"}`}>
              {location.name}
            </Link>
          ))}
        </div>
      )}

      {data.kpis.appointments > 0 && (
        <div className="order-6 flex flex-wrap border-2 border-black bg-[#FFF5BA] text-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff] lg:col-span-2 lg:order-none">
          <Kpi label={t("appointments")} value={String(data.kpis.appointments)} />
          {data.canSeeMoney && <Kpi label={t("collected")} value={formatPrice(Math.round(data.kpis.collected), data.currencyCode)} />}
          {data.canSeeMoney && <Kpi label={t("pending")} value={formatPrice(Math.round(data.kpis.pending), data.currencyCode)} hint={data.kpis.projected > data.kpis.collected ? t("projected", { amount: formatPrice(Math.round(data.kpis.projected), data.currencyCode) }) : undefined} />}
          {data.showOpenSlots && <Kpi label={t("openSlots")} value={String(data.kpis.openSlots)} />}
        </div>
      )}

      <div className="contents lg:flex lg:flex-col lg:gap-4">
      <section className="order-2 lg:order-none">
        {spotlight && (
          <article className="border-2 border-black bg-white p-4 text-black shadow-[4px_4px_0_#7C3AED] dark:border-white dark:bg-card dark:text-foreground dark:shadow-[4px_4px_0_#A78BFA]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-2 border-black bg-[#FFF5BA] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_#000] dark:border-white">{spotlight.phase === "current" ? t("inProgressEyebrow") : t("nextEyebrow")}</span>
              <span className="text-sm font-black text-[#7C3AED] dark:text-[#C4B5FD]">{relativeLabel(spotlight)}</span>
            </div>
            <button type="button" onClick={() => setSelectedId(spotlight.id)} className="mt-3 block w-full text-left">
              <p className="text-3xl font-black leading-none sm:text-4xl">{wallTime(spotlight.startTime, data.timeZone)} <span className="text-2xl font-bold">— {spotlight.customerName}</span></p>
              <p className="mt-2 text-sm font-bold">
                {spotlight.serviceName} · {t("durationMinutes", { count: durationMinutes(spotlight.startTime, spotlight.endTime) })}
                {data.showStaff ? ` · ${spotlight.staffName || homeT("unassigned")}` : ""}
              </p>
              {paymentLabel(spotlight.paymentLabel) && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold">
                  <span className={`border-2 border-black px-2 py-0.5 text-black dark:border-white ${statusChip(spotlight.status)}`}>{paymentLabel(spotlight.paymentLabel)}</span>
                  {data.canSeeMoney && spotlight.paymentLabel !== "collected" && spotlight.pending > 0 && <span>{formatPrice(Math.round(spotlight.pending), data.currencyCode)}</span>}
                  {data.canSeeMoney && spotlight.paymentLabel === "collected" && spotlight.collected > 0 && <span>{formatPrice(Math.round(spotlight.collected), data.currencyCode)}</span>}
                </p>
              )}
            </button>
          </article>
        )}
      </section>
      <section className="order-4 space-y-3 lg:order-none">
        {data.dayState === "finished" && (
          <p className="border-2 border-black bg-[#BFFCC6] px-3 py-2 text-sm font-black text-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff]">
            {t("finishedTitle")}
            {data.finished.completed > 0 ? ` · ${t("attendedShort", { count: data.finished.completed })}` : ""}
            {data.canSeeMoney ? ` · ${formatPrice(Math.round(data.kpis.collected), data.currencyCode)} ${t("paymentCollected").toLowerCase()}` : ""}
            {data.finished.pendingActions > 0 ? ` · ${t("finishedPending")}` : ""}
          </p>
        )}
        {data.dayState === "empty" ? (
          <div className={`${surface} p-5`}>
            <span className="border-2 border-black bg-[#FFF5BA] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-black shadow-[2px_2px_0_#000]">{t("emptyTitle")}</span>
            <p className="mt-3 max-w-md text-sm font-medium">{t("emptyBody")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.canManageAppointments && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>{t("newAppointment")}</button>}
              <CopyWidgetLink slug={data.businessSlug} variant="button" />
              {data.canGenerateStory && <Link href={storyTarget} className={secondaryBtn}>{t("generateStory")}</Link>}
            </div>
          </div>
        ) : rest.length > 0 && (
          <div className={surface}>
            <h2 className="border-b-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wide dark:border-white">{t("restOfDay")}</h2>
            <ol>
              {rest.map((appointment) => {
                const quiet = appointment.phase === "past" || appointment.phase === "inactive";
                return (
                  <li key={appointment.id} className="border-b-2 border-black/15 last:border-b-0 dark:border-white/15">
                    <button type="button" onClick={() => setSelectedId(appointment.id)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${quiet ? "opacity-55" : ""}`}>
                      <span className="w-12 shrink-0 border-l-2 border-black pl-2 text-sm font-black tabular-nums dark:border-white">{wallTime(appointment.startTime, data.timeZone)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{appointment.customerName}</span>
                        <span className="block truncate text-xs font-medium text-black/70 dark:text-foreground/70">
                          {appointment.serviceName} · {t("durationMinutes", { count: durationMinutes(appointment.startTime, appointment.endTime) })}
                          {data.showStaff ? ` · ${appointment.staffName || homeT("unassigned")}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={`inline-block border-2 border-black px-1.5 py-0.5 text-[10px] font-black uppercase text-black dark:border-white ${statusChip(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                        {paymentLabel(appointment.paymentLabel) && <span className="mt-1 block text-[11px] font-bold">{paymentLabel(appointment.paymentLabel)}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-4">
      <aside className="order-3 lg:order-none">
        {data.attention.length === 0 ? (
          data.dayState === "empty" ? null : <p className="text-sm font-black text-black dark:text-foreground">✓ {t("allClearShort")}</p>
        ) : (
          <div className={surface}>
            <h2 className="border-b-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wide dark:border-white">{t("needsAttention")}</h2>
            <ul>
              {data.attention.map((item) => {
                const href = item.href ?? null;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 border-b-2 border-black px-3 py-3 last:border-b-0 dark:border-white">
                    <div className="min-w-0">
                      <p className="text-sm font-black">{attentionCopy(item)}</p>
                      {item.id === "pending-payments" && item.amount != null && item.amount > 0 && (
                        <p className="text-xs font-bold text-black/70 dark:text-foreground/70">{t("pendingAmount", { amount: formatPrice(Math.round(item.amount), data.currencyCode) })}</p>
                      )}
                    </div>
                    {href ? (
                      <Link href={href} className="shrink-0 text-sm font-black text-[#7C3AED] underline decoration-2 underline-offset-2 dark:text-[#C4B5FD]">{item.id === "freed-availability" ? t("generateStory") : t("review")}</Link>
                    ) : (
                      <button type="button" onClick={() => item.appointmentId && setSelectedId(item.appointmentId)} className="shrink-0 text-sm font-black text-[#7C3AED] underline decoration-2 underline-offset-2 dark:text-[#C4B5FD]">{t("review")}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>
      <aside className="order-5 lg:order-none">
        {data.story && data.canGenerateStory && (
          <div className="border-2 border-black bg-[#BFFCC6] p-4 text-black shadow-[3px_3px_0_#000] dark:border-white dark:shadow-[3px_3px_0_#fff]">
            <p className="text-[11px] font-black uppercase tracking-wide">{t("opportunities")}</p>
            <h2 className="mt-1 text-lg font-black leading-tight">
              {(data.story.when === "afternoon" ? t("freeAfternoon", { count: data.story.opportunityCount }) : t("freeToday", { count: data.story.opportunityCount }))}
            </h2>
            {data.story.times.length > 0 && (
              <p className="mt-2 text-sm font-black">
                {data.story.times.join(" · ")}
                {data.story.opportunityCount > data.story.times.length ? ` · ${t("moreTimes", { count: data.story.opportunityCount - data.story.times.length })}` : ""}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={storyHref(data.story, freed ? "CANCELLATION" : data.story.objective)} className={primaryBtn}>{t("generateStory")}</Link>
              <CopyWidgetLink slug={data.businessSlug} variant="button" />
            </div>
          </div>
        )}
      </aside>
      </div>

      {selected && (
        <AppointmentDetailDialog
          appointment={toDialogAppointment(selected, homeT("unassigned"))}
          onClose={() => setSelectedId(null)}
          canManageAppointments={data.canManageAppointments}
          posEnabled={data.posEnabled}
          services={data.services}
          staff={data.staff}
          clients={data.clients}
          currencyCode={data.currencyCode}
          timeZone={data.timeZone}
        />
      )}
      {creating && (
        <AppointmentEditor
          timeZone={data.timeZone}
          services={data.services}
          staff={data.staff}
          clients={data.clients}
          currencyCode={data.currencyCode}
          initialStaffId={data.showingOwnAgenda ? data.blockStaff[0]?.id : data.staff.length === 1 ? data.staff[0]?.id : undefined}
          onClose={() => setCreating(false)}
        />
      )}
      {blocking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={() => setBlocking(false)}>
          <div className={`w-full max-w-lg p-4 ${surface}`} onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">{t("blockTitle")}</h2>
              <button type="button" onClick={() => setBlocking(false)} className="text-sm font-bold">{t("close")}</button>
            </div>
            {data.blockStaff.length > 1 && (
              <label className="mb-3 block text-sm font-bold">
                <span className="mb-1 block text-xs">{t("blockStaff")}</span>
                <select value={blockStaffId} onChange={(event) => setBlockStaffId(event.target.value)} className="w-full border-2 border-black bg-white px-3 py-2 text-sm dark:border-white dark:bg-card">
                  {data.blockStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
            )}
            {blockStaffId && (
              <ScheduleBlockForm
                staffId={blockStaffId}
                locationId={data.selectedLocationId ?? undefined}
                initialDate={data.dateKey}
                onCancel={() => setBlocking(false)}
                onCreated={() => setBlocking(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-[8.5rem] flex-1 border-b-2 border-black px-3 py-2 last:border-b-0 sm:border-b-0 sm:border-r-2 sm:last:border-r-0 dark:border-white">
      <p className="text-[10px] font-black uppercase tracking-wide">{label}</p>
      <p className="text-base font-black leading-tight">{value}</p>
      {hint && <p className="text-[10px] font-bold">{hint}</p>}
    </div>
  );
}

function toDialogAppointment(appointment: TodayDashboardData["appointments"][number], unassigned: string): DashboardAppointment {
  return { ...appointment, staffName: appointment.staffName || unassigned };
}
