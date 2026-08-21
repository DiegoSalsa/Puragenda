"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  Clock3,
  Contact,
  Download,
  Filter,
  Mail,
  Search,
  UserCheck,
} from "lucide-react";

type ClientAccount = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  sessions: { lastUsedAt: Date }[];
  _count: { sessions: number };
};

function csvCell(value: string | number) {
  let normalized = String(value);
  if (/^[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function ClientsClient({ clients }: { clients: ClientAccount[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "VERIFIED" && client.emailVerifiedAt) ||
        (statusFilter === "PENDING" && !client.emailVerifiedAt);
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const verifiedCount = clients.filter((client) => client.emailVerifiedAt).length;
  const pendingCount = clients.length - verifiedCount;
  const recentThreshold = subDays(new Date(), 7);
  const recentCount = clients.filter((client) => new Date(client.createdAt) >= recentThreshold).length;

  function downloadCSV() {
    const headers = ["Nombre", "Correo", "Telefono", "Estado", "Ultimo acceso", "Creado"];
    const rows = filtered.map((client) => [
      client.name,
      client.email,
      client.phone || "",
      client.emailVerifiedAt ? "Verificada" : "Pendiente",
      client.sessions[0]?.lastUsedAt ? format(new Date(client.sessions[0].lastUsedAt), "dd/MM/yyyy HH:mm") : "",
      format(new Date(client.createdAt), "dd/MM/yyyy"),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `clientes-${format(new Date(), "yyyyMMdd")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-black sm:text-3xl">Clientes</h1>
          <p className="text-sm font-bold text-black/50">
            {filtered.length} de {clients.length} cuentas de clientes
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCSV}
          disabled={filtered.length === 0}
          className="flex w-fit items-center gap-2 border-4 border-black bg-[#FFF5BA] px-4 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total", value: clients.length, icon: Contact, bg: "bg-[#85E3FF]" },
          { label: "Verificadas", value: verifiedCount, icon: UserCheck, bg: "bg-[#BFFCC6]" },
          { label: "Pendientes", value: pendingCount, icon: Clock3, bg: "bg-[#FFF5BA]" },
          { label: "Nuevas en 7 días", value: recentCount, icon: Mail, bg: "bg-[#FFD6A5]" },
        ].map((stat) => (
          <div key={stat.label} className={`border-4 border-black ${stat.bg} p-4 shadow-[4px_4px_0_#000]`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-black/60">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-black/50" />
            </div>
            <p className="text-3xl font-black tracking-tighter text-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
        <Filter className="h-4 w-4 shrink-0 text-black/50" />
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <input
            type="search"
            placeholder="Buscar por nombre, correo o teléfono..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border-2 border-black bg-white py-2 pl-9 pr-4 text-sm font-bold text-black placeholder:text-black/30 focus:border-[#B28DFF] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="border-2 border-black bg-white px-3 py-2 text-sm font-black uppercase text-black focus:border-[#B28DFF] focus:outline-none"
        >
          <option value="ALL">Todos los estados</option>
          <option value="VERIFIED">Verificadas</option>
          <option value="PENDING">Pendientes</option>
        </select>
        {(search || statusFilter !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
            }}
            className="border-2 border-black bg-[#FFB5E8] px-3 py-2 text-xs font-black uppercase text-black transition-colors hover:bg-black hover:text-[#FFB5E8]"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-3 lg:hidden">
        {filtered.map((client) => {
          const lastUsedAt = client.sessions[0]?.lastUsedAt;
          return (
            <article key={client.id} className="space-y-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-black">{client.name}</p>
                  <p className="truncate text-xs font-bold text-black/50">{client.email}</p>
                </div>
                <VerificationBadge verified={Boolean(client.emailVerifiedAt)} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-black/50">
                <p>{client.phone || "Sin teléfono"}</p>
                <p>{client._count.sessions} sesiones activas</p>
                <p>Creada {format(new Date(client.createdAt), "dd/MM/yy", { locale: es })}</p>
                <p>{lastUsedAt ? `Acceso ${format(new Date(lastUsedAt), "dd/MM/yy HH:mm", { locale: es })}` : "Sin accesos"}</p>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && <EmptyState hasClients={clients.length > 0} />}
      </div>

      <div className="hidden overflow-x-auto border-4 border-black bg-white shadow-[6px_6px_0_#000] lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-4 border-black bg-[#FFF5BA] text-left text-xs font-black uppercase tracking-wider text-black">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-4 py-4">Contacto</th>
              <th className="px-4 py-4">Estado</th>
              <th className="px-4 py-4">Sesiones activas</th>
              <th className="px-4 py-4">Último acceso</th>
              <th className="px-4 py-4">Cuenta creada</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client.id} className="border-b-2 border-black/10 transition-colors hover:bg-[#FFFAEB]">
                <td className="px-6 py-4">
                  <p className="font-black text-black">{client.name}</p>
                  <p className="font-mono text-[11px] font-bold text-black/30">{client.id}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-bold text-black">{client.email}</p>
                  <p className="text-xs font-bold text-black/40">{client.phone || "Sin teléfono"}</p>
                </td>
                <td className="px-4 py-4"><VerificationBadge verified={Boolean(client.emailVerifiedAt)} /></td>
                <td className="px-4 py-4 font-black text-black">{client._count.sessions}</td>
                <td className="px-4 py-4 text-xs font-bold text-black/50">
                  {client.sessions[0]?.lastUsedAt
                    ? format(new Date(client.sessions[0].lastUsedAt), "dd/MM/yy HH:mm", { locale: es })
                    : "Sin accesos"}
                </td>
                <td className="px-4 py-4 text-xs font-bold text-black/50">
                  {format(new Date(client.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState hasClients={clients.length > 0} />}
      </div>
    </div>
  );
}

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${verified ? "bg-[#BFFCC6]" : "bg-[#FFF5BA]"}`}>
      {verified ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
      {verified ? "Verificada" : "Pendiente"}
    </span>
  );
}

function EmptyState({ hasClients }: { hasClients: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Contact className="h-10 w-10 text-black/20" />
      <p className="mt-3 text-sm font-bold text-black/40">
        {hasClients ? "No hay clientes que coincidan con los filtros" : "No hay cuentas de clientes registradas"}
      </p>
    </div>
  );
}
