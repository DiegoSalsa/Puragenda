import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  Activity,
  CalendarDays,
  Clock3,
  DollarSign,
  Flame,
  LineChart,
  Scissors,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

type PeriodMode = "week" | "month";

interface InsightItem {
  label: string;
  value: number;
  helper?: string;
}

interface TopServiceItem extends InsightItem {
  revenue: number;
}

interface TopStaffItem extends InsightItem {
  revenue: number;
}

interface BusinessInsightsProps {
  currencyCode: string;
  period: PeriodMode;
  scopeLabel: string;
  periodLabel: string;
  currentHref: string;
  weekHref: string;
  monthHref: string;
  metrics: {
    appointmentCount: number;
    activeAppointmentCount: number;
    estimatedRevenue: number;
    averageTicket: number;
    reservedHours: number;
    uniqueClients: number;
    pendingCount: number;
    confirmedCount: number;
    cancelledCount: number;
    noShowCount: number;
    revenueChangePercent: number | null;
    appointmentChangePercent: number | null;
    busiestDay: InsightItem | null;
    topService: TopServiceItem | null;
    dayDistribution: InsightItem[];
    topServices: TopServiceItem[];
    topStaff: TopStaffItem[];
  };
  showTeamBreakdown: boolean;
}

function formatPercent(value: number, comparisonLabel: string) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}% ${comparisonLabel}`;
}

function TrendPill({ value, noComparisonLabel, comparisonLabel }: { value: number | null; noComparisonLabel: string; comparisonLabel: string }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">{noComparisonLabel}</span>;
  }

  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
      positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
    }`}>
      <Icon className="h-3 w-3" />
      {formatPercent(value, comparisonLabel)}
    </span>
  );
}

function maxValue(items: InsightItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

function BarList({
  items,
  valueSuffix = "",
  emptyText,
}: {
  items: InsightItem[];
  valueSuffix?: string;
  emptyText: string;
}) {
  const max = maxValue(items);

  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-muted-foreground">
              {item.value}{valueSuffix}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#7C3AED]"
              style={{ width: `${Math.max(8, Math.round((item.value / max) * 100))}%` }}
            />
          </div>
          {item.helper && <p className="text-xs text-muted-foreground">{item.helper}</p>}
        </div>
      ))}
    </div>
  );
}

export async function BusinessInsights({
  currencyCode,
  period,
  scopeLabel,
  periodLabel,
  currentHref,
  weekHref,
  monthHref,
  metrics,
  showTeamBreakdown,
}: BusinessInsightsProps) {
  const t = await getTranslations("dashboard.analytics");
  const activeStatuses = metrics.activeAppointmentCount;
  const attendanceBase = Math.max(1, activeStatuses + metrics.cancelledCount + metrics.noShowCount);
  const reliabilityRate = Math.round((activeStatuses / attendanceBase) * 100);

  const statusItems = [
    { label: t("status.confirmed"), value: metrics.confirmedCount },
    { label: t("status.pending"), value: metrics.pendingCount },
    { label: t("status.cancelled"), value: metrics.cancelledCount },
    { label: t("status.noShow"), value: metrics.noShowCount },
  ].filter((item) => item.value > 0);

  return (
    <section className="min-w-0 max-w-full space-y-5 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#A78BFA]">
            <LineChart className="h-3.5 w-3.5" />
            {period === "week" ? t("weeklySummary") : t("monthlySummary")}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t("pulse", { scope: scopeLabel })}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{periodLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            <Link
              href={weekHref}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                period === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("week")}
            </Link>
            <Link
              href={monthHref}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                period === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("month")}
            </Link>
          </div>
          <Link href={currentHref} className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("viewCalendar")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t("estimatedRevenue"),
            value: formatPrice(metrics.estimatedRevenue, currencyCode),
            helper: t("nonCancelled"),
            icon: DollarSign,
            trend: metrics.revenueChangePercent,
          },
          {
            label: t("appointments"),
            value: metrics.appointmentCount.toString(),
            helper: t("activeCount", { count: metrics.activeAppointmentCount }),
            icon: CalendarDays,
            trend: metrics.appointmentChangePercent,
          },
          {
            label: t("averageTicket"),
            value: formatPrice(metrics.averageTicket, currencyCode),
            helper: t("uniqueClients", { count: metrics.uniqueClients }),
            icon: Users,
          },
          {
            label: t("reservedHours"),
            value: metrics.reservedHours.toFixed(metrics.reservedHours % 1 === 0 ? 0 : 1),
            helper: t("activeRate", { rate: reliabilityRate }),
            icon: Clock3,
          },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">{stat.value}</p>
            <div className="mt-2 flex min-h-6 flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{stat.helper}</span>
              {"trend" in stat && <TrendPill value={stat.trend ?? null} noComparisonLabel={t("noComparison")} comparisonLabel={t("versusPrevious")} />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#F97316]" />
            <h3 className="font-semibold">{t("busiestDay")}</h3>
          </div>
          {metrics.busiestDay ? (
            <div>
              <p className="text-2xl font-bold">{metrics.busiestDay.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("appointmentsInPeriod", { count: metrics.busiestDay.value })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noAppointments")}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Scissors className="h-4 w-4 text-[#7C3AED]" />
            <h3 className="font-semibold">{t("topService")}</h3>
          </div>
          {metrics.topService ? (
            <div>
              <p className="text-2xl font-bold">{metrics.topService.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("serviceResult", { count: metrics.topService.value, revenue: formatPrice(metrics.topService.revenue, currencyCode) })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noServices")}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold">{t("appointmentStatus")}</h3>
          </div>
          <BarList items={statusItems} emptyText={t("noStatuses")} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <h3 className="mb-4 font-semibold">{t("dayDistribution")}</h3>
          <BarList items={metrics.dayDistribution} emptyText={t("dayDistributionEmpty")} />
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-4">
          <h3 className="mb-4 font-semibold">{t("mostBooked")}</h3>
          <BarList
            items={metrics.topServices.map((item) => ({
              label: item.label,
              value: item.value,
              helper: formatPrice(item.revenue, currencyCode),
            }))}
            emptyText={t("noServices")}
          />
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-4">
          <div className="mb-4 flex items-center gap-2">
            {showTeamBreakdown ? <Users className="h-4 w-4 text-muted-foreground" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}
            <h3 className="font-semibold">{showTeamBreakdown ? t("teamPerformance") : t("personalAnalysis")}</h3>
          </div>
          <BarList
            items={metrics.topStaff.map((item) => ({
              label: item.label,
              value: item.value,
              helper: formatPrice(item.revenue, currencyCode),
            }))}
            emptyText={showTeamBreakdown ? t("teamEmpty") : t("personalEmpty")}
          />
        </div>
      </div>
    </section>
  );
}
