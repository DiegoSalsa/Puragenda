"use client";

import { useEffect, useMemo, useState } from "react";
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

const surface = "rounded-2xl border border-black/10 dark:border-white/10 bg-card text-card-foreground shadow-sm";
const heroSurface = "rounded-2xl border-2 border-black bg-white text-black shadow-[5px_5px_0_#000] dark:border-white dark:bg-card dark:text-foreground dark:shadow-[5px_5px_0_#fff]";
const primaryBtn = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border-2 border-black bg-primary px-3.5 py-2 text-sm font-black text-primary-foreground shadow-[3px_3px_0_#000] transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white dark:shadow-[3px_3px_0_#fff] dark:hover:shadow-[2px_2px_0_#fff] disabled:pointer-events-none disabled:opacity-50";
const secondaryBtn = "inline-flex min-h-10 items-center justify-center rounded-lg border-2 border-black bg-background px-3 py-2 text-sm font-bold text-foreground shadow-[2px_2px_0_#000] transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white dark:shadow-[2px_2px_0_#fff] dark:hover:shadow-[1px_1px_0_#fff]";

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
  if (status === "CONFIRMED" || status === "COMPLETED") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "CHECKED_IN") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  if (status === "AWAITING_PAYMENT") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "NO_SHOW") return "bg-destructive/10 text-destructive";
  if (status === "CANCELLED") return "bg-muted text-muted-foreground";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export function TodayScreen({ data }: { data: TodayDashboardData }) {
  const t = useTranslations("dashboard.today");
  const homeT = useTranslations("dashboard.home");
  const calendarT = useTranslations("dashboard.calendar");
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockStaffId, setBlockStaffId] = useState(data.blockStaff[0]?.id ?? "");
  const selected = data.appointments.find((appointment) => appointment.id === selectedId) ?? null;
  const spotlight = data.appointments.find((appointment) => appointment.phase === "current" || appointment.phase === "next") ?? null;
  const rest = data.appointments.filter((appointment) => appointment.id !== spotlight?.id);
  const storyTarget = data.story ? storyHref(data.story) : "/dashboard/stories";
  const freed = data.attention.find((item) => item.id === "freed-availability");
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const currentTime = format(toZonedTime(new Date(now), data.timeZone), "HH:mm");
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
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)] lg:items-start lg:gap-5">
      <header className="order-1 flex flex-col gap-5 lg:col-span-2 lg:order-none lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-foreground">{t("yourDay")}</p>
          <h1 className="mt-1 text-5xl font-black tracking-[-0.06em] text-foreground sm:text-6xl">{t("title")}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-foreground/80">
            <span>{dateLabel}</span>
            <span className="text-brand-foreground" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FFF5BA] px-2 py-1 text-xs font-black text-black dark:bg-[#FFF5BA]" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" aria-hidden="true" />
              {currentTime}
            </span>
          </div>
          {context && <p className="mt-2 text-sm font-medium text-muted-foreground">{context}</p>}
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
          {data.canToggleOwnAgenda && (
            <div className="inline-grid w-full grid-cols-2 rounded-lg border-2 border-black bg-[#FFF5BA] p-1 shadow-[2px_2px_0_#000] sm:w-auto dark:border-white dark:bg-[#FFF5BA] dark:shadow-[2px_2px_0_#fff]">
              <Link href={scopeHref(data, undefined, data.selectedLocationSlug ?? undefined)} className={`rounded-md px-3 py-2 text-center text-sm font-black transition-colors ${!data.showingOwnAgenda ? "bg-white text-black shadow-sm" : "text-black/60 hover:text-black"}`} aria-current={!data.showingOwnAgenda ? "page" : undefined}>{homeT("wholeBusiness")}</Link>
              <Link href={scopeHref(data, "mine", data.selectedLocationSlug ?? undefined)} className={`rounded-md px-3 py-2 text-center text-sm font-black transition-colors ${data.showingOwnAgenda ? "bg-white text-black shadow-sm" : "text-black/60 hover:text-black"}`} aria-current={data.showingOwnAgenda ? "page" : undefined}>{homeT("mySchedule")}</Link>
            </div>
          )}
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {data.canManageAppointments && (
              <button type="button" onClick={() => setCreating(true)} className={primaryBtn}><Plus className="h-4 w-4" /> {t("newAppointment")}</button>
            )}
            <Link href={agendaHref(data)} className={secondaryBtn}>{t("viewAgenda")}</Link>
            {data.canGenerateStory && <Link href={storyTarget} className={secondaryBtn}>{t("generateStory")}</Link>}
            {data.canBlockTime && data.blockStaff.length > 0 && (
              <details className="relative">
                <summary className={`${secondaryBtn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} aria-label={t("moreActions")}><MoreHorizontal className="h-4 w-4" /></summary>
                <div className={`absolute right-0 z-20 mt-2 w-56 p-1 ${surface}`}>
                  <button type="button" onClick={() => setBlocking(true)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted">{t("blockTime")}</button>
                </div>
              </details>
            )}
          </div>
        </div>
      </header>

      {data.locations.length > 1 && (
        <div className="order-1 flex flex-wrap gap-2 lg:col-span-2 lg:order-none">
          {data.locations.map((location) => (
            <Link key={location.id} href={scopeHref(data, data.showingOwnAgenda ? "mine" : undefined, location.slug)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${data.selectedLocationSlug === location.slug ? "border-primary/30 bg-primary/10 text-brand-foreground" : "border-black/10 dark:border-white/10 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              {location.name}
            </Link>
          ))}
        </div>
      )}

      {data.kpis.appointments > 0 && (
        <div className="order-6 grid grid-cols-2 overflow-hidden rounded-2xl border-2 border-black bg-[#FFF5BA] text-black shadow-[4px_4px_0_#000] sm:grid-cols-4 lg:col-span-2 lg:order-none dark:border-white dark:bg-[#FFF5BA] dark:shadow-[4px_4px_0_#fff]">
          <Kpi label={t("appointments")} value={String(data.kpis.appointments)} />
          {data.canSeeMoney && <Kpi label={t("collected")} value={formatPrice(Math.round(data.kpis.collected), data.currencyCode)} />}
          {data.canSeeMoney && <Kpi label={t("pending")} value={formatPrice(Math.round(data.kpis.pending), data.currencyCode)} hint={data.kpis.projected > data.kpis.collected ? t("projected", { amount: formatPrice(Math.round(data.kpis.projected), data.currencyCode) }) : undefined} />}
          {data.showOpenSlots && <Kpi label={t("openSlots")} value={String(data.kpis.openSlots)} />}
        </div>
      )}

      <div className={`contents lg:col-start-1 lg:flex lg:flex-col lg:gap-5 ${data.dayState === "empty" ? "lg:col-span-2" : ""}`}>
      <section className="order-2 lg:order-none">
        {spotlight && (
          <article className={`relative overflow-hidden p-5 sm:p-6 ${heroSurface}`}>
            <span className="absolute inset-y-0 left-0 w-2 bg-primary" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-2 border-black bg-[#FFF5BA] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-black shadow-[2px_2px_0_#000] dark:border-white dark:shadow-[2px_2px_0_#fff]">{spotlight.phase === "current" ? t("inProgressEyebrow") : t("nextEyebrow")}</span>
              <span className="border-2 border-black bg-[#E9D8FF] px-2.5 py-1 text-sm font-black text-[#5B21B6] dark:border-white dark:bg-[#E9D8FF]">{relativeLabel(spotlight)}</span>
            </div>
            <button type="button" onClick={() => setSelectedId(spotlight.id)} className="mt-4 block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <p className="text-4xl font-black leading-none tracking-[-0.05em] sm:text-6xl"><span className="tabular-nums">{wallTime(spotlight.startTime, data.timeZone)}</span> <span className="text-black/35 dark:text-foreground/35">·</span> <span className="uppercase">{spotlight.customerName}</span></p>
              <p className="mt-4 text-sm font-bold text-black/70 dark:text-foreground/70">
                {spotlight.serviceName} · {t("durationMinutes", { count: durationMinutes(spotlight.startTime, spotlight.endTime) })}
                {data.showStaff ? ` · ${spotlight.staffName || homeT("unassigned")}` : ""}
              </p>
              {paymentLabel(spotlight.paymentLabel) && (
                <p className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                  <span className={`border-2 border-black px-2.5 py-1 text-xs font-black uppercase dark:border-white ${statusChip(spotlight.status)}`}>{statusLabel(spotlight.status)}</span>
                  <span className="border-2 border-black bg-white px-2.5 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0_#000] dark:border-white dark:bg-card dark:text-foreground dark:shadow-[2px_2px_0_#fff]">{paymentLabel(spotlight.paymentLabel)}{data.canSeeMoney && spotlight.paymentLabel !== "collected" && spotlight.pending > 0 ? ` · ${formatPrice(Math.round(spotlight.pending), data.currencyCode)}` : data.canSeeMoney && spotlight.paymentLabel === "collected" && spotlight.collected > 0 ? ` · ${formatPrice(Math.round(spotlight.collected), data.currencyCode)}` : ""}</span>
                </p>
              )}
            </button>
          </article>
        )}
      </section>
      <section className="order-4 space-y-3 lg:order-none">
        {data.dayState === "finished" && (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            {t("finishedTitle")}
            {data.finished.completed > 0 ? ` · ${t("attendedShort", { count: data.finished.completed })}` : ""}
            {data.canSeeMoney ? ` · ${formatPrice(Math.round(data.kpis.collected), data.currencyCode)} ${t("paymentCollected").toLowerCase()}` : ""}
            {data.finished.pendingActions > 0 ? ` · ${t("finishedPending")}` : ""}
          </p>
        )}
        {data.dayState === "empty" ? (
          <div className="relative overflow-hidden rounded-2xl border-2 border-black bg-[#FFF5BA] p-5 text-black shadow-[4px_4px_0_#000] dark:border-white dark:bg-[#FFF5BA] dark:shadow-[4px_4px_0_#fff] sm:p-6">
            <span className="absolute inset-y-0 left-0 w-2 bg-primary" aria-hidden="true" />
            <span className="border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] shadow-[2px_2px_0_#000]">{t("emptyTitle")}</span>
            {data.story ? (
              <>
                <p className="mt-5 text-6xl font-black leading-none tracking-[-0.07em]">{data.story.opportunityCount}</p>
                <p className="mt-1 text-sm font-black uppercase tracking-[0.1em]">{data.story.when === "afternoon" ? t("slotsAfternoon") : t("slotsToday")}</p>
                {data.story.times.length > 0 && <p className="mt-3 text-sm font-black text-[#5B21B6]">{data.story.times.join(" · ")}{data.story.opportunityCount > data.story.times.length ? ` · ${t("moreTimes", { count: data.story.opportunityCount - data.story.times.length })}` : ""}</p>}
              </>
            ) : null}
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-black/70">{t("emptyBody")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.canManageAppointments && <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>{t("newAppointment")}</button>}
              <CopyWidgetLink slug={data.businessSlug} variant="button" />
              {data.canGenerateStory && <Link href={storyTarget} className={secondaryBtn}>{t("generateStory")}</Link>}
            </div>
          </div>
        ) : rest.length > 0 && (
          <div className={`${surface} overflow-hidden`}>
            <h2 className="border-b border-black/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10">{t("restOfDay")}</h2>
            <ol className="relative p-2 sm:p-3">
              <span className="pointer-events-none absolute bottom-7 left-[4.65rem] top-7 w-px bg-black/15 dark:bg-white/15" aria-hidden="true" />
              {rest.map((appointment) => {
                const quiet = appointment.phase === "past" || appointment.phase === "inactive";
                return (
                  <li key={appointment.id} className="relative border-b border-black/10 last:border-b-0 dark:border-white/10">
                    <button type="button" onClick={() => setSelectedId(appointment.id)} className={`group flex w-full items-start gap-3 px-2 py-3.5 text-left transition-colors hover:bg-[#FFF5BA]/45 focus-visible:bg-[#FFF5BA]/45 focus-visible:outline-none sm:px-3 ${quiet ? "opacity-55" : ""}`}>
                      <span className="w-14 shrink-0 pt-0.5 text-sm font-black tabular-nums text-muted-foreground group-hover:text-foreground">{wallTime(appointment.startTime, data.timeZone)}</span>
                      <span className={`relative mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-black ${appointment.phase === "next" ? "bg-[#7C3AED]" : quiet ? "bg-black/20" : "bg-black"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-black text-foreground ${quiet ? "line-through decoration-1" : ""}`}>{appointment.customerName}</span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                          {appointment.serviceName} · {t("durationMinutes", { count: durationMinutes(appointment.startTime, appointment.endTime) })}
                          {data.showStaff ? ` · ${appointment.staffName || homeT("unassigned")}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={`inline-block rounded-sm border border-black/20 px-2 py-0.5 text-[10px] font-black uppercase ${statusChip(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                        {paymentLabel(appointment.paymentLabel) && <span className="mt-1 block text-[11px] text-muted-foreground">{paymentLabel(appointment.paymentLabel)}</span>}
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

      <div className={data.dayState === "empty" ? "hidden" : "contents lg:col-start-2 lg:flex lg:flex-col lg:gap-5"}>
      <aside className="order-3 lg:order-none">
        {data.attention.length === 0 ? (
          data.dayState === "empty" ? null : <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"><p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">✓ {t("allClearShort")}</p><p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">{t("allClear")}</p></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border-2 border-black bg-[#FFF5BA] text-black shadow-[3px_3px_0_#000] dark:border-white dark:bg-[#FFF5BA] dark:shadow-[3px_3px_0_#fff]">
            <h2 className="border-b-2 border-black/20 px-4 py-3 text-xs font-black uppercase tracking-[0.14em]">{t("needsAttention")}</h2>
            <ul>
              {data.attention.map((item) => {
                const href = item.href ?? null;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 border-b border-black/20 px-4 py-3.5 last:border-b-0">
                    <div className="min-w-0">
                      <p className="text-sm font-black">{attentionCopy(item)}</p>
                      {item.id === "pending-payments" && item.amount != null && item.amount > 0 && (
                        <p className="mt-0.5 text-xs font-bold text-black/65">{t("pendingAmount", { amount: formatPrice(Math.round(item.amount), data.currencyCode) })}</p>
                      )}
                    </div>
                    {href ? (
                      <Link href={href} className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-brand-foreground transition-colors hover:bg-primary/10">{item.id === "freed-availability" ? t("generateStory") : t("review")}</Link>
                    ) : (
                      <button type="button" onClick={() => item.appointmentId && setSelectedId(item.appointmentId)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-brand-foreground transition-colors hover:bg-primary/10">{t("review")}</button>
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
          <div className="rounded-2xl border-2 border-black bg-[#E9D8FF] p-5 text-black shadow-[4px_4px_0_#000] dark:border-white dark:bg-[#E9D8FF] dark:shadow-[4px_4px_0_#fff]">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5B21B6]">{t("opportunities")}</p>
            <p className="mt-2 text-6xl font-black leading-none tracking-[-0.07em] text-[#5B21B6]">{data.story.opportunityCount}</p>
            <h2 className="mt-1 text-sm font-black uppercase tracking-[0.08em]">
              {data.story.when === "afternoon" ? t("slotsAfternoon") : t("slotsToday")}
            </h2>
            {data.story.times.length > 0 && (
              <p className="mt-3 border-t-2 border-black/20 pt-3 text-sm font-black text-[#5B21B6]">
                {data.story.times.join(" · ")}
                {data.story.opportunityCount > data.story.times.length ? ` · ${t("moreTimes", { count: data.story.opportunityCount - data.story.times.length })}` : ""}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
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
                <select value={blockStaffId} onChange={(event) => setBlockStaffId(event.target.value)} className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-background px-3 py-2.5 text-sm">
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
    <div className="min-w-0 border-b-2 border-black/20 px-4 py-3.5 text-black last:border-b-0 sm:border-b-0 sm:border-r-2 sm:last:border-r-0">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 truncate text-2xl font-black leading-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] font-bold text-black/60">{hint}</p>}
    </div>
  );
}

function toDialogAppointment(appointment: TodayDashboardData["appointments"][number], unassigned: string): DashboardAppointment {
  return { ...appointment, staffName: appointment.staffName || unassigned };
}
