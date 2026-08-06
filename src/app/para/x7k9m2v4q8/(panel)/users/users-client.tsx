"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useMemo, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Search, Shield, Building2, UserX, UserCheck, Filter } from "lucide-react";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import Link from "next/link";
import { deactivateUserAction, reactivateUserAction } from "@/server/actions/admin.actions";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  businesses: { id: string; name: string; slug: string }[];
  staff: { business: { id: string; name: string; slug: string } }[];
};

export function UsersClient({ users }: { users: User[] }) {
  const legacy = useTranslations("legacy");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.businesses[0]?.name.toLowerCase().includes(q) ||
        u.staff[0]?.business.name.toLowerCase().includes(q);

      const matchRole = roleFilter === "ALL" || u.role === roleFilter || (roleFilter === "SUPERADMIN" && u.isSuperAdmin);

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && !u.deletedAt) ||
        (statusFilter === "INACTIVE" && !!u.deletedAt);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalActive = users.filter((u) => !u.deletedAt).length;
  const totalInactive = users.filter((u) => !!u.deletedAt).length;
  const totalSuperAdmin = users.filter((u) => u.isSuperAdmin).length;
  const totalOwners = users.filter((u) => u.role === "ADMIN" && !u.isSuperAdmin).length;

  function handleToggle(userId: string, isActive: boolean) {
    setLoadingId(userId);
    startTransition(async () => {
      if (isActive) {
        await deactivateUserAction(userId);
      } else {
        await reactivateUserAction(userId);
      }
      setLoadingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-black"><LocalizedText id="sGtBq6zY5rTL" /></h1>
        <p className="text-sm font-bold text-black/50">{users.length} <LocalizedText id="TvIo3zkt4UL4" /></p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Activos", value: totalActive, bg: "bg-[#BFFCC6]" },
          { label: "Inactivos", value: totalInactive, bg: "bg-[#FFB5E8]" },
          { label: "Duenos", value: totalOwners, bg: "bg-[#85E3FF]" },
          { label: "SuperAdmin", value: totalSuperAdmin, bg: "bg-[#B28DFF]" },
        ].map((s) => (
          <div key={s.label} className={`border-4 border-black ${s.bg} p-4 shadow-[4px_4px_0_#000]`}>
            <p className="text-xs font-black uppercase tracking-widest text-black/60">{s.label}</p>
            <p className="text-3xl font-black text-black tracking-tighter">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
        <Filter className="h-4 w-4 text-black/50 shrink-0" />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <input
            type="text"
            placeholder={legacy("QsmzD9cvkWsv")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-black bg-white pl-9 pr-4 py-2 text-sm font-bold text-black placeholder:text-black/30 focus:outline-none focus:border-[#B28DFF]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border-2 border-black bg-white px-3 py-2 text-sm font-black uppercase text-black focus:outline-none focus:border-[#B28DFF]"
        >
          <option value="ALL">Todos los roles</option>
          <option value="ADMIN">Dueno (ADMIN)</option>
          <option value="STAFF">Staff</option>
          <option value="RECEPTIONIST">Recepcionista</option>
          <option value="SUPERADMIN">SuperAdmin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-2 border-black bg-white px-3 py-2 text-sm font-black uppercase text-black focus:outline-none focus:border-[#B28DFF]"
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
        {(search || roleFilter !== "ALL" || statusFilter !== "ALL") && (
          <button
            onClick={() => { setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL"); }}
            className="border-2 border-black bg-[#FFB5E8] px-3 py-2 text-xs font-black uppercase text-black hover:bg-black hover:text-[#FFB5E8] transition-colors"
          >
            <LocalizedText id="CN8in6Wtx_p4" />
          </button>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((user) => {
          const isActive = !user.deletedAt;
          const ownerBiz = user.businesses[0];
          const staffBiz = user.staff[0]?.business;
          const linkedBiz = ownerBiz || staffBiz;
          const isViaStaff = !ownerBiz && !!staffBiz;
          return (
            <div key={user.id} className={`border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000] space-y-3 ${!isActive ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black font-black text-sm ${user.isSuperAdmin ? "bg-[#B28DFF]" : "bg-[#85E3FF]"}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-black text-sm truncate">{user.name}</p>
                    <p className="text-xs font-bold text-black/40 truncate">{user.email}</p>
                  </div>
                </div>
                <span className={`shrink-0 border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${isActive ? "bg-[#BFFCC6]" : "bg-[#FFB5E8]"}`}>
                  {isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${user.isSuperAdmin ? "bg-[#B28DFF]" : user.role === "ADMIN" ? "bg-[#85E3FF]" : "bg-black/10"}`}>
                  {user.isSuperAdmin && <Shield className="h-3 w-3" />}
                  {user.isSuperAdmin ? "SuperAdmin" : user.role}
                </span>
                {linkedBiz ? (
                  <Link href={`${ADMIN_SECRET_PATH}/businesses/${linkedBiz.id}`} className="flex items-center gap-1 hover:underline">
                    <Building2 className="h-3 w-3 text-black/40" />
                    <span className="text-xs font-bold text-black">{linkedBiz.name}</span>
                    {isViaStaff && <span className="border border-black/30 bg-black/5 px-1 py-0.5 text-[10px] font-black uppercase text-black/50"><LocalizedText id="aBkn40t35Lkb" /></span>}
                  </Link>
                ) : (
                  <span className="text-xs font-bold text-black/30"><LocalizedText id="LpHHbbdxRRZG" /></span>
                )}
                <span className="text-xs font-bold text-black/40">{format(new Date(user.createdAt), "dd/MM/yy", { locale: es })}</span>
              </div>
              {!user.isSuperAdmin && (
                <button
                  disabled={loadingId === user.id || pending}
                  onClick={() => handleToggle(user.id, isActive)}
                  className={`flex items-center gap-1 border-2 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-40 ${isActive ? "bg-[#FFB5E8] text-black" : "bg-[#BFFCC6] text-black"}`}
                >
                  {loadingId === user.id ? "..." : isActive ? (
                    <><UserX className="h-3 w-3" /> <LocalizedText id="fvHNLTSGsj1G" /></>
                  ) : (
                    <><UserCheck className="h-3 w-3" /> <LocalizedText id="jjjCVx2H9u69" /></>
                  )}
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border-4 border-black bg-white shadow-[4px_4px_0_#000]">
            <Users className="h-10 w-10 text-black/20" />
            <p className="mt-3 text-sm font-bold text-black/40"><LocalizedText id="v5_BmD_6eEES" /></p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000] overflow-x-auto hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-4 border-black bg-[#FFF5BA] text-left text-xs uppercase tracking-wider font-black text-black">
              <th className="px-6 py-4"><LocalizedText id="Y2FP_eLTUN9A" /></th>
              <th className="px-4 py-4"><LocalizedText id="-59R_pJQLRoI" /></th>
              <th className="px-4 py-4"><LocalizedText id="B8s6yKMYEqy_" /></th>
              <th className="px-4 py-4"><LocalizedText id="mOWs3bbEaiSP" /></th>
              <th className="px-4 py-4"><LocalizedText id="iQCGsWtIBAcO" /></th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const isActive = !user.deletedAt;
              return (
                <tr key={user.id} className={`border-b-2 border-black/10 transition-colors ${!isActive ? "opacity-50" : "hover:bg-[#FFFAEB]"}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black font-black text-sm ${user.isSuperAdmin ? "bg-[#B28DFF]" : "bg-[#85E3FF]"}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-black">{user.name}</p>
                        <p className="text-xs font-bold text-black/40">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${user.isSuperAdmin ? "bg-[#B28DFF]" : user.role === "ADMIN" ? "bg-[#85E3FF]" : "bg-black/10"}`}>
                      {user.isSuperAdmin && <Shield className="h-3 w-3" />}
                      {user.isSuperAdmin ? "SuperAdmin" : user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const ownerBiz = user.businesses[0];
                      const staffBiz = user.staff[0]?.business;
                      const linkedBiz = ownerBiz || staffBiz;
                      const isViaStaff = !ownerBiz && !!staffBiz;
                      if (linkedBiz) {
                        return (
                          <Link href={`${ADMIN_SECRET_PATH}/businesses/${linkedBiz.id}`} className="flex items-center gap-1.5 hover:underline">
                            <Building2 className="h-3 w-3 text-black/40" />
                            <span className="text-sm font-bold text-black">{linkedBiz.name}</span>
                            {isViaStaff && <span className="border border-black/30 bg-black/5 px-1.5 py-0.5 text-[10px] font-black uppercase text-black/50"><LocalizedText id="aBkn40t35Lkb" /></span>}
                          </Link>
                        );
                      }
                      return <span className="text-xs font-bold text-black/30"><LocalizedText id="LpHHbbdxRRZG" /></span>;
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${isActive ? "bg-[#BFFCC6]" : "bg-[#FFB5E8]"}`}>
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-black/40">
                    {format(new Date(user.createdAt), "dd/MM/yy", { locale: es })}
                  </td>
                  <td className="px-4 py-4">
                    {!user.isSuperAdmin && (
                      <button
                        disabled={loadingId === user.id || pending}
                        onClick={() => handleToggle(user.id, isActive)}
                        className={`flex items-center gap-1 border-2 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-40 ${isActive ? "bg-[#FFB5E8] text-black" : "bg-[#BFFCC6] text-black"}`}
                      >
                        {loadingId === user.id ? "..." : isActive ? (
                          <><UserX className="h-3 w-3" /> <LocalizedText id="fvHNLTSGsj1G" /></>
                        ) : (
                          <><UserCheck className="h-3 w-3" /> <LocalizedText id="jjjCVx2H9u69" /></>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="h-10 w-10 text-black/20" />
            <p className="mt-3 text-sm font-bold text-black/40"><LocalizedText id="v5_BmD_6eEES" /></p>
          </div>
        )}
      </div>
    </div>
  );
}
