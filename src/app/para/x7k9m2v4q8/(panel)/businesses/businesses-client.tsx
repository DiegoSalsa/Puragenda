"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useMemo, useTransition } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Search,
  Download,
  Filter,
  Share2,
} from "@/components/icons/hover-icons";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { getCountryName } from "@/core/countries";
import { extendTrialAction } from "@/server/actions/admin.actions";

type Business = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  createdAt: Date;
  owner: { name: string; email: string } | null;
  subscription: {
    id: string;
    plan: string;
    status: string;
    isTrial: boolean;
    trialEndsAt: Date | null;
  } | null;
  affiliate: {
    referralCode: string;
    paidReferrals: number;
    _count: { referredBusinesses: number };
  } | null;
  referredByAffiliate: {
    referralCode: string;
    business: { name: string };
  } | null;
  _count: { staff: number; services: number; appointments: number };
};

function countryFlag(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

function countryLabel(countryCode: string) {
  const normalized = countryCode.toUpperCase();
  return `${countryFlag(normalized)} ${getCountryName(normalized)} · ${normalized}`;
}

export function BusinessesClient({ businesses }: { businesses: Business[] }) {
  const legacy = useTranslations("legacy");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [extending, setExtending] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return businesses.filter((biz) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        biz.name.toLowerCase().includes(q) ||
        biz.slug.toLowerCase().includes(q) ||
        countryLabel(biz.countryCode).toLowerCase().includes(q) ||
        biz.owner?.email.toLowerCase().includes(q) ||
        biz.owner?.name.toLowerCase().includes(q);

      const matchPlan =
        planFilter === "ALL" || biz.subscription?.plan === planFilter;

      const matchStatus =
        statusFilter === "ALL" || biz.subscription?.status === statusFilter;

      return matchSearch && matchPlan && matchStatus;
    });
  }, [businesses, search, planFilter, statusFilter]);

  function downloadCSV() {
    const headers = ["Nombre", "Slug", "Pais", "Dueno", "Email", "Plan", "Estado", "Staff", "Servicios", "Citas", "Creado"];
    const rows = filtered.map((biz) => [
      biz.name,
      biz.slug,
      getCountryName(biz.countryCode),
      biz.owner?.name || "",
      biz.owner?.email || "",
      biz.subscription?.plan || "",
      biz.subscription?.status || "",
      biz._count.staff,
      biz._count.services,
      biz._count.appointments,
      format(new Date(biz.createdAt), "dd/MM/yyyy"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `negocios-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExtendTrial(subscriptionId: string) {
    setExtending(subscriptionId);
    startTransition(async () => {
      await extendTrialAction(subscriptionId, 7);
      setExtending(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-black"><LocalizedText id="higGPAdHyxvs" /></h1>
          <p className="text-sm font-bold text-black/50">
            {filtered.length} <LocalizedText id="lZpF1E5vz1g2" /> {businesses.length} <LocalizedText id="Ndt8FeOpmK-u" />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 border-4 border-black bg-[#FFF5BA] px-4 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
          >
            <Download className="h-4 w-4" />
            <LocalizedText id="62tC9UxC0oMu" />
          </button>
          <Link
            href={`${ADMIN_SECRET_PATH}/businesses/new`}
            className="flex items-center gap-2 border-4 border-black bg-[#B28DFF] px-5 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
          >
            <Plus className="h-4 w-4" />
            <LocalizedText id="vFWB9vK6fNvi" />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
        <Filter className="h-4 w-4 text-black/50 shrink-0" />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <input
            type="text"
            placeholder={legacy("YYJMfQjacWOM")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-black bg-white pl-9 pr-4 py-2 text-sm font-bold text-black placeholder:text-black/30 focus:outline-none focus:border-[#B28DFF]"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="border-2 border-black bg-white px-3 py-2 text-sm font-black uppercase text-black focus:outline-none focus:border-[#B28DFF]"
        >
          <option value="ALL">Todos los planes</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="EQUIPO">Equipo</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-2 border-black bg-white px-3 py-2 text-sm font-black uppercase text-black focus:outline-none focus:border-[#B28DFF]"
        >
          <option value="ALL">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="TRIALING">Trial</option>
          <option value="PAST_DUE">Pago pendiente</option>
          <option value="CANCELLED">Cancelado</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
        {(search || planFilter !== "ALL" || statusFilter !== "ALL") && (
          <button
            onClick={() => { setSearch(""); setPlanFilter("ALL"); setStatusFilter("ALL"); }}
            className="border-2 border-black bg-[#FFB5E8] px-3 py-2 text-xs font-black uppercase text-black hover:bg-black hover:text-[#FFB5E8] transition-colors"
          >
            <LocalizedText id="CN8in6Wtx_p4" />
          </button>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((biz) => {
          const sub = biz.subscription;
          const daysLeft = sub?.isTrial && sub?.trialEndsAt ? differenceInDays(new Date(sub.trialEndsAt), new Date()) : null;
          return (
            <Link key={biz.id} href={`${ADMIN_SECRET_PATH}/businesses/${biz.id}`} className="block border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000] space-y-3 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-black text-black text-sm truncate">{biz.name}</p>
                  <p className="font-mono text-xs font-bold text-black/40">/{biz.slug}</p>
                </div>
                {sub && (
                  <span className={`shrink-0 inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
                    sub.status === "ACTIVE" ? "bg-[#BFFCC6]" : sub.status === "TRIALING" ? "bg-[#FFF5BA]" : sub.status === "PAST_DUE" ? "bg-orange-200" : sub.status === "CANCELLED" ? "bg-[#FFB5E8]" : "bg-black/10"
                  }`}>
                    {sub.status}
                    {daysLeft !== null && daysLeft >= 0 && <span className="opacity-60">({daysLeft}<LocalizedText id="ATRy0lB6A6zo" /></span>}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {sub && <span className={`border border-black px-1.5 py-0.5 font-black uppercase ${sub.plan === "EQUIPO" ? "bg-[#B28DFF]" : "bg-[#85E3FF]"}`}>{sub.plan}</span>}
                <span className="border border-black bg-[#FFFAEB] px-1.5 py-0.5 font-black text-black">{countryLabel(biz.countryCode)}</span>
                <span className="font-bold text-black/40">{biz.owner?.name || legacy("ccvM499wENUT")}</span>
                <span className="font-bold text-black/40">{biz._count.staff}<LocalizedText id="wtPweAXxxFPk" /> {biz._count.services}<LocalizedText id="J_56giO82IOd" /> {biz._count.appointments}c</span>
              </div>
              {biz.affiliate && (
                <div className="flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-black/40" />
                  <span className="font-mono text-[11px] font-black text-black/60">{biz.affiliate.referralCode}</span>
                  {biz.affiliate._count.referredBusinesses > 0 && <span className="text-[11px] font-bold text-black/40">· {biz.affiliate._count.referredBusinesses} <LocalizedText id="P_bAVyO7Bp0Z" /></span>}
                </div>
              )}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border-4 border-black bg-white shadow-[4px_4px_0_#000]">
            <Building2 className="h-10 w-10 text-black/20" />
            <p className="mt-3 text-sm font-bold text-black/40">{businesses.length === 0 ? "No hay negocios registrados" : legacy("Z1-HNJq8_DHt")}</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-4 border-black bg-[#FFF5BA] text-left text-xs uppercase tracking-wider text-black font-black">
              <th className="px-6 py-4"><LocalizedText id="B8s6yKMYEqy_" /></th>
              <th className="px-4 py-4"><LocalizedText id="X9bAm2SBCtDr" /></th>
              <th className="px-4 py-4"><LocalizedText id="8_ar4QSokQuo" /></th>
              <th className="px-4 py-4"><LocalizedText id="-o7Qvavda8sc" /></th>
              <th className="px-4 py-4"><LocalizedText id="mOWs3bbEaiSP" /></th>
              <th className="px-4 py-4"><LocalizedText id="wgPakJ2NbGW3" /></th>
              <th className="px-4 py-4 text-center"><LocalizedText id="aBkn40t35Lkb" /></th>
              <th className="px-4 py-4 text-center"><LocalizedText id="UnRPpCLeNiGc" /></th>
              <th className="px-4 py-4 text-center"><LocalizedText id="ck-UW42uQga3" /></th>
              <th className="px-4 py-4"><LocalizedText id="G7pxpRFE8wkP" /></th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((biz) => {
              const sub = biz.subscription;
              const daysLeft =
                sub?.isTrial && sub?.trialEndsAt
                  ? differenceInDays(new Date(sub.trialEndsAt), new Date())
                  : null;

              return (
                <tr key={biz.id} className="border-b-2 border-black/10 hover:bg-[#FFFAEB] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-black">{biz.name}</p>
                    <p className="font-mono text-xs font-bold text-black/40">/{biz.slug}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex border-2 border-black bg-[#FFFAEB] px-2 py-0.5 text-xs font-black text-black">
                      {countryLabel(biz.countryCode)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-black">{biz.owner?.name || legacy("IDIGwo_GCFCQ")}</p>
                    <p className="text-xs font-bold text-black/40">{biz.owner?.email || ""}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
                        sub?.plan === "EQUIPO" ? "bg-[#B28DFF]" : "bg-[#85E3FF]"
                      }`}
                    >
                      {sub?.plan === "EQUIPO"
                        ? "Equipo"
                        : sub?.plan === "INDIVIDUAL"
                        ? "Individual"
                        : sub?.plan || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
                          sub?.status === "ACTIVE"
                            ? "bg-[#BFFCC6]"
                            : sub?.status === "TRIALING"
                            ? "bg-[#FFF5BA]"
                            : sub?.status === "PAST_DUE"
                              ? "bg-orange-200"
                            : sub?.status === "CANCELLED"
                            ? "bg-[#FFB5E8]"
                            : "bg-black/10"
                        }`}
                      >
                        {sub?.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                        {sub?.status === "TRIALING" && <Clock className="h-3 w-3" />}
                        {sub?.status === "PAST_DUE" && <AlertTriangle className="h-3 w-3" />}
                        {sub?.status === "CANCELLED" && <XCircle className="h-3 w-3" />}
                        {sub?.status === "INACTIVE" && <AlertTriangle className="h-3 w-3" />}
                        {sub?.status || "N/A"}
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className="ml-1 opacity-60">({daysLeft}<LocalizedText id="ATRy0lB6A6zo" /></span>
                        )}
                      </span>
                      {sub?.status === "TRIALING" && sub?.id && (
                        <button
                          disabled={extending === sub.id || isPending}
                          onClick={() => handleExtendTrial(sub.id)}
                          className="border border-black bg-[#BFFCC6] px-2 py-0.5 text-xs font-black uppercase text-black hover:bg-black hover:text-[#BFFCC6] transition-colors disabled:opacity-40 w-fit"
                        >
                          {extending === sub.id ? "..." : "+7 dias"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      {biz.affiliate ? (
                        <>
                          <span className="inline-flex items-center gap-1 border border-black/30 bg-[#FFFAEB] px-1.5 py-0.5 font-mono text-[11px] font-black text-black">
                            <Share2 className="h-3 w-3" />
                            {biz.affiliate.referralCode}
                          </span>
                          {biz.affiliate._count.referredBusinesses > 0 && (
                            <p className="text-[11px] font-bold text-black/50">
                              {biz.affiliate._count.referredBusinesses} <LocalizedText id="3nvNX7Kf9r9g" />{biz.affiliate._count.referredBusinesses !== 1 ? "s" : ""}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-bold text-black/30">—</span>
                      )}
                      {biz.referredByAffiliate && (
                        <p className="text-[10px] font-bold text-black/40">
                          <LocalizedText id="cKTpbjfJ1E7b" /> {biz.referredByAffiliate.business.name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-black text-black">{biz._count.staff}</td>
                  <td className="px-4 py-4 text-center font-black text-black">{biz._count.services}</td>
                  <td className="px-4 py-4 text-center font-black text-black">{biz._count.appointments}</td>
                  <td className="px-4 py-4 font-bold text-black/50 text-xs">
                    {format(new Date(biz.createdAt), "dd/MM/yy", { locale: es })}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`${ADMIN_SECRET_PATH}/businesses/${biz.id}`}
                      className="flex items-center gap-1 border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-white shadow-[2px_2px_0_#7C3AED] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                    >
                      <LocalizedText id="QmI05ypbXPJo" /> <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-10 w-10 text-black/20" />
            <p className="mt-3 text-sm font-bold text-black/40">
              {businesses.length === 0
                ? "No hay negocios registrados"
                : legacy("Z1-HNJq8_DHt")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
