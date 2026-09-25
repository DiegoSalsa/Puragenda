"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useLocale, useTranslations } from "next-intl";
import { Building2, CalendarPlus, Clock, ImagePlus, Plus, UserRound } from "@/components/icons/hover-icons";
import { getDateLocale } from "@/i18n/date-locale";
import { buildStoryStudioHref } from "@/lib/today-dashboard";
import { formatPrice } from "@/lib/utils";
import type { TodayDashboardData } from "@/server/services/today-dashboard.service";
import { AppointmentEditor } from "./appointment-editor";
import { APPOINTMENT_STATUS_COLORS, AppointmentDetailDialog, type DashboardAppointment } from "./appointment-detail-dialog";
import { CopyWidgetLink } from "./copy-widget-link";
import { ScheduleBlockForm } from "./schedule-block-form";

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

export function TodayScreen({ data }: { data: TodayDashboardData }) {
  const t = useTranslations("dashboard.today");
  const homeT = useTranslations("dashboard.home");
  const calendarT = useTranslations("dashboard.calendar");
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockStaffId, setBlockStaffId] = useState(data.blockStaff[0]?.id ?? "");
  const selected = data.appointments.find((appointment) => appointment.id === selectedId) ?? null;
  const spotlight = data.appointments.find((appointment) => appointment.phase === "current" || appointment.phase === "next") ?? null;
  const dateLabel = useMemo(() => {
    const [year, month, day] = data.dateKey.split("-").map(Number);
    return format(new Date(year, month - 1, day), "PPPP", { locale: getDateLocale(locale) });
  }, [data.dateKey, locale]);
  const storyTarget = data.story ? storyHref(data.story) : "/dashboard/stories";
  const freed = data.attention.find((item) => item.id === "freed-availability");
  const wallTime = (iso: string) => format(toZonedTime(parseISO(iso), data.timeZone), "HH:mm");

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 capitalize text-muted-foreground">{dateLabel}</p>
          <p className="text-sm text-muted-foreground">{data.businessName}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {data.canManageAppointments && (
              <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9]">
                <Plus className="h-4 w-4" /> {t("newAppointment")}
              </button>
            )}
            {data.canBlockTime && data.blockStaff.length > 0 && (
              <button type="button" onClick={() => setBlocking(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                <Clock className="h-4 w-4" /> {t("blockTime")}
              </button>
            )}
            {data.canGenerateStory && (
              <Link href={storyTarget} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                <ImagePlus className="h-4 w-4" /> {t("generateStory")}
              </Link>
            )}
            <Link href={agendaHref(data)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
              <CalendarPlus className="h-4 w-4" /> {t("viewAgenda")}
            </Link>
          </div>
          {data.canToggleOwnAgenda && (
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
              <Link href={scopeHref(data, undefined, data.selectedLocationSlug ?? undefined)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${!data.showingOwnAgenda ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                <Building2 className="h-4 w-4" /> {homeT("wholeBusiness")}
              </Link>
              <Link href={scopeHref(data, "mine", data.selectedLocationSlug ?? undefined)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${data.showingOwnAgenda ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                <UserRound className="h-4 w-4" /> {homeT("mySchedule")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {data.locations.length > 1 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
          {data.locations.map((location) => (
            <Link key={location.id} href={scopeHref(data, data.showingOwnAgenda ? "mine" : undefined, location.slug)} className={`rounded-lg px-3 py-2 text-sm font-medium ${data.selectedLocationSlug === location.slug ? "bg-[#7C3AED] text-white" : "bg-muted text-muted-foreground"}`}>
              {location.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:hidden">
        {spotlight && (
          <AppointmentRow
            appointment={spotlight}
            time={wallTime(spotlight.startTime)}
            showStaff={data.showStaff}
            unassigned={homeT("unassigned")}
            statusLabel={statusLabel(spotlight.status)}
            payment={paymentLabel(spotlight.paymentLabel)}
            onSelect={() => setSelectedId(spotlight.id)}
            highlighted
          />
        )}
        <AttentionPanel data={data} freed={Boolean(freed)} copy={attentionCopy} onReview={setSelectedId} />
        <DayColumn data={data} wallTime={wallTime} statusLabel={statusLabel} paymentLabel={paymentLabel} unassigned={homeT("unassigned")} onSelect={setSelectedId} onCreate={() => setCreating(true)} storyTarget={storyTarget} hideSpotlight />
        {data.dayState !== "empty" && <KpiRow data={data} />}
      </div>

      <div className="hidden gap-6 lg:grid lg:grid-cols-3">
        {data.dayState !== "empty" && <div className="lg:col-span-3"><KpiRow data={data} /></div>}
        <div className="lg:col-span-2">
          <DayColumn data={data} wallTime={wallTime} statusLabel={statusLabel} paymentLabel={paymentLabel} unassigned={homeT("unassigned")} onSelect={setSelectedId} onCreate={() => setCreating(true)} storyTarget={storyTarget} />
        </div>
        <AttentionPanel data={data} freed={Boolean(freed)} copy={attentionCopy} onReview={setSelectedId} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={() => setBlocking(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("blockTitle")}</h2>
              <button type="button" onClick={() => setBlocking(false)} className="text-sm text-muted-foreground">{t("close")}</button>
            </div>
            {data.blockStaff.length > 1 && (
              <label className="mb-3 block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("blockStaff")}</span>
                <select value={blockStaffId} onChange={(event) => setBlockStaffId(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
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

function KpiRow({ data }: { data: TodayDashboardData }) {
  const t = useTranslations("dashboard.today");
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label={t("appointments")} value={String(data.kpis.appointments)} hint={data.kpis.cancelled > 0 ? t("cancelledIncluded", { count: data.kpis.cancelled }) : undefined} />
      {data.canSeeMoney && (
        <Kpi label={t("collected")} value={formatPrice(Math.round(data.kpis.collected), data.currencyCode)} hint={data.kpis.projected > data.kpis.collected ? t("projected", { amount: formatPrice(Math.round(data.kpis.projected), data.currencyCode) }) : undefined} />
      )}
      {data.canSeeMoney && <Kpi label={t("pending")} value={formatPrice(Math.round(data.kpis.pending), data.currencyCode)} />}
      {data.showOpenSlots && <Kpi label={t("openSlots")} value={String(data.kpis.openSlots)} />}
    </section>
  );
}

function DayColumn({
  data,
  wallTime,
  statusLabel,
  paymentLabel,
  unassigned,
  onSelect,
  onCreate,
  storyTarget,
  hideSpotlight = false,
}: {
  data: TodayDashboardData;
  wallTime: (iso: string) => string;
  statusLabel: (status: string) => string;
  paymentLabel: (label: TodayDashboardData["appointments"][number]["paymentLabel"]) => string | null;
  unassigned: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  storyTarget: string;
  hideSpotlight?: boolean;
}) {
  const t = useTranslations("dashboard.today");
  const spotlightId = data.appointments.find((appointment) => appointment.phase === "current" || appointment.phase === "next")?.id;
  const rows = hideSpotlight ? data.appointments.filter((appointment) => appointment.id !== spotlightId) : data.appointments;
  if (hideSpotlight && data.dayState === "active" && rows.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t("yourDay")}</h2>
      {data.dayState === "empty" ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.canManageAppointments && <button type="button" onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-semibold text-white">{t("newAppointment")}</button>}
            <CopyWidgetLink slug={data.businessSlug} />
            {data.canGenerateStory && <Link href={storyTarget} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium">{t("generateStory")}</Link>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.dayState === "finished" && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">{t("finishedTitle")}</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {data.finished.completed > 0 && <li>{t("finishedCompleted", { count: data.finished.completed })}</li>}
                {data.finished.cancelled > 0 && <li>{t("finishedCancelled", { count: data.finished.cancelled })}</li>}
                {data.finished.noShow > 0 && <li>{t("finishedNoShow", { count: data.finished.noShow })}</li>}
                {data.canSeeMoney && <li>{t("collected")}: {formatPrice(Math.round(data.kpis.collected), data.currencyCode)}</li>}
                {data.finished.pendingActions > 0 && <li>{t("finishedPending")}</li>}
              </ul>
            </div>
          )}
          <ol className="space-y-2">
            {rows.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentRow
                  appointment={appointment}
                  time={wallTime(appointment.startTime)}
                  showStaff={data.showStaff}
                  unassigned={unassigned}
                  statusLabel={statusLabel(appointment.status)}
                  payment={paymentLabel(appointment.paymentLabel)}
                  onSelect={() => onSelect(appointment.id)}
                  highlighted={appointment.phase === "current" || appointment.phase === "next"}
                  quiet={appointment.phase === "past" || appointment.phase === "inactive"}
                />
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function AttentionPanel({
  data,
  freed,
  copy,
  onReview,
}: {
  data: TodayDashboardData;
  freed: boolean;
  copy: (item: TodayDashboardData["attention"][number]) => string;
  onReview: (id: string) => void;
}) {
  const t = useTranslations("dashboard.today");
  if (data.dayState === "empty" && data.attention.length === 0 && !(data.story && data.canGenerateStory)) return null;
  return (
    <aside className="space-y-4">
      <h2 className="text-lg font-semibold">{t("needsAttention")}</h2>
      {data.attention.length === 0 ? (
        data.dayState === "empty" ? null : <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("allClear")}</p>
      ) : (
        <div className="space-y-2">
          {data.attention.map((item) => {
            const href = item.href ?? null;
            return (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-medium">{copy(item)}</p>
                {href ? (
                  <Link href={href} className="mt-3 inline-flex text-sm font-semibold text-[#7C3AED]">{item.id === "freed-availability" ? t("generateStory") : t("review")}</Link>
                ) : (
                  <button type="button" onClick={() => item.appointmentId && onReview(item.appointmentId)} className="mt-3 text-sm font-semibold text-[#7C3AED]">{t("review")}</button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {data.story && data.canGenerateStory && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("opportunities")}</p>
          <h3 className="mt-1 text-sm font-semibold">{data.story.when === "afternoon" ? t("slotsAfternoon") : t("slotsToday")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("slotsDetail", { count: data.story.slotCount })}</p>
          <Link href={storyHref(data.story, freed ? "CANCELLATION" : data.story.objective)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED]">
            <ImagePlus className="h-4 w-4" /> {t("generateStory")}
          </Link>
        </div>
      )}
    </aside>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AppointmentRow({
  appointment,
  time,
  showStaff,
  unassigned,
  statusLabel,
  payment,
  onSelect,
  highlighted,
  quiet,
}: {
  appointment: TodayDashboardData["appointments"][number];
  time: string;
  showStaff: boolean;
  unassigned: string;
  statusLabel: string;
  payment: string | null;
  onSelect: () => void;
  highlighted?: boolean;
  quiet?: boolean;
}) {
  const style = APPOINTMENT_STATUS_COLORS[appointment.status] || APPOINTMENT_STATUS_COLORS.PENDING;
  return (
    <button type="button" onClick={onSelect} className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left ${highlighted ? "border-[#7C3AED]/40 bg-[#7C3AED]/10" : "border-border bg-card"} ${quiet ? "opacity-70" : ""}`}>
      <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{time}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
          <span className="truncate text-sm font-medium">{appointment.customerName}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {appointment.serviceName}
          {showStaff ? ` · ${appointment.staffName || unassigned}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`block text-xs font-medium ${style.text}`}>{statusLabel}</span>
        {payment && <span className="mt-1 block text-[11px] text-muted-foreground">{payment}</span>}
      </span>
    </button>
  );
}

function toDialogAppointment(appointment: TodayDashboardData["appointments"][number], unassigned: string): DashboardAppointment {
  return { ...appointment, staffName: appointment.staffName || unassigned };
}
