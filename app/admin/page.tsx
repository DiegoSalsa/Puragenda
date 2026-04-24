import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // ─── Metrics ───
  const [totalBusinesses, subscriptions, totalUsers, totalAppointments] =
    await Promise.all([
      prisma.business.count(),
      prisma.subscription.findMany({
        include: { business: { select: { name: true, slug: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
      prisma.appointment.count(),
    ]);

  const activeBusinesses = subscriptions.filter(
    (s) => s.status === "ACTIVE" || s.status === "TRIALING"
  ).length;

  const trialBusinesses = subscriptions.filter(
    (s) => s.status === "TRIALING"
  ).length;

  const paidBasic = subscriptions.filter(
    (s) => s.plan === "BASIC" && s.status === "ACTIVE" && !s.isTrial
  ).length;

  const paidPro = subscriptions.filter(
    (s) => s.plan === "PRO" && s.status === "ACTIVE"
  ).length;

  const estimatedMRR = paidBasic * PRICING.BASIC + paidPro * PRICING.PRO;

  const stats = [
    {
      label: "MRR Estimado",
      value: `$${estimatedMRR.toLocaleString("es-CL")}`,
      sub: "Ingresos mensuales recurrentes",
      icon: DollarSign,
      gradient: true,
    },
    {
      label: "Negocios Activos",
      value: activeBusinesses,
      sub: `${totalBusinesses} totales registrados`,
      icon: Building2,
    },
    {
      label: "En Trial",
      value: trialBusinesses,
      sub: "Pruebas gratuitas activas",
      icon: Clock,
    },
    {
      label: "Usuarios",
      value: totalUsers,
      sub: `${totalAppointments} citas procesadas`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel SuperAdmin</h1>
          <p className="text-sm text-white/40">
            Vista global de Puragenda · métricas en tiempo real
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-6 transition-all ${
              stat.gradient
                ? "border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/10 to-[#5B21B6]/5"
                : "border-white/[0.06] bg-[#111]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/40">{stat.label}</p>
              <stat.icon
                className={`h-4 w-4 ${
                  stat.gradient ? "text-[#7C3AED]" : "text-white/20"
                }`}
              />
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-white/30">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-[#7C3AED]" />
            Desglose de Revenue
          </h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div>
                <p className="text-sm font-medium">Plan Base</p>
                <p className="text-xs text-white/40">{paidBasic} negocios × $24.990</p>
              </div>
              <p className="font-mono text-sm font-bold">
                ${(paidBasic * PRICING.BASIC).toLocaleString("es-CL")}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div>
                <p className="text-sm font-medium">Plan Pro</p>
                <p className="text-xs text-white/40">{paidPro} negocios × $39.990</p>
              </div>
              <p className="font-mono text-sm font-bold">
                ${(paidPro * PRICING.PRO).toLocaleString("es-CL")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-[#7C3AED]" />
            Trials Activos
          </h3>
          <div className="mt-4 space-y-2">
            {subscriptions
              .filter((s) => s.isTrial && s.status === "TRIALING")
              .slice(0, 5)
              .map((s) => {
                const daysLeft = s.trialEndsAt
                  ? differenceInDays(new Date(s.trialEndsAt), new Date())
                  : 0;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.business.name}</p>
                      <p className="text-xs text-white/40">/{s.business.slug}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        daysLeft <= 5
                          ? "border border-red-500/20 bg-red-500/10 text-red-400"
                          : "border border-[#7C3AED]/20 bg-[#7C3AED]/10 text-[#A78BFA]"
                      }`}
                    >
                      {daysLeft > 0 ? `${daysLeft}d restantes` : "Expirado"}
                    </span>
                  </div>
                );
              })}
            {subscriptions.filter((s) => s.isTrial && s.status === "TRIALING")
              .length === 0 && (
              <p className="py-4 text-center text-sm text-white/30">
                No hay trials activos
              </p>
            )}
          </div>
        </div>
      </div>

      {/* All Businesses Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111]">
        <div className="border-b border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold">Todos los Negocios</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/30">
                  <th className="pb-3 pr-4">Negocio</th>
                  <th className="pb-3 pr-4">Slug</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3 pr-4">Trial</th>
                  <th className="pb-3">Creado</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-3.5 pr-4 font-medium">
                      {sub.business.name}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-white/40">
                      /{sub.business.slug}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${
                          sub.plan === "PRO"
                            ? "border border-[#7C3AED]/20 bg-[#7C3AED]/10 text-[#A78BFA]"
                            : "border border-white/10 bg-white/[0.03] text-white/50"
                        }`}
                      >
                        {sub.plan}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                          sub.status === "ACTIVE"
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : sub.status === "TRIALING"
                            ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : sub.status === "CANCELLED"
                            ? "border border-red-500/20 bg-red-500/10 text-red-400"
                            : "border border-white/10 bg-white/[0.03] text-white/50"
                        }`}
                      >
                        {sub.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                        {sub.status === "TRIALING" && <Clock className="h-3 w-3" />}
                        {sub.status === "CANCELLED" && <XCircle className="h-3 w-3" />}
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-white/40">
                      {sub.isTrial ? "Sí" : "No"}
                    </td>
                    <td className="py-3.5 text-white/40">
                      {format(new Date(sub.business.createdAt), "dd/MM/yy", {
                        locale: es,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
