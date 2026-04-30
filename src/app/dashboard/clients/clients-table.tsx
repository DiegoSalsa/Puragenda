"use client";

import { useState, useMemo } from "react";
import { Search, Users, AlertTriangle, TrendingUp, ShieldAlert, Phone, Mail } from "lucide-react";

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalSpent: number;
  noShowCount: number;
  totalAppointments: number;
  completedAppointments: number;
  createdAt: string;
}

function formatCLP(amount: number) {
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

export function ClientsTable({ clients }: { clients: ClientData[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [clients, search]);

  const totalClients = clients.length;
  const totalRevenue = clients.reduce((sum, c) => sum + c.totalSpent, 0);
  const flaggedClients = clients.filter((c) => c.noShowCount >= 2).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/10">
              <Users className="h-4 w-4 text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalClients}</p>
              <p className="text-xs text-muted-foreground">Clientes totales</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCLP(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Revenue total</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{flaggedClients}</p>
              <p className="text-xs text-muted-foreground">Clientes bloqueados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-[#7C3AED]/30 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No se encontraron clientes con ese término" : "Aún no hay clientes registrados. Aparecerán aquí cuando alguien reserve una cita."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Contacto</th>
                  <th className="px-5 py-3.5 text-center">Citas</th>
                  <th className="px-5 py-3.5 text-center">Completadas</th>
                  <th className="px-5 py-3.5 text-center">No-Shows</th>
                  <th className="px-5 py-3.5 text-right">Total Gastado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const isBlocked = client.noShowCount >= 2;
                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${
                        isBlocked ? "bg-red-500/[0.03]" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                            isBlocked
                              ? "bg-red-500/10 text-red-500"
                              : "bg-[#7C3AED]/10 text-[#7C3AED]"
                          }`}>
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Cliente desde {new Date(client.createdAt).toLocaleDateString("es-CL", { month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total appointments */}
                      <td className="px-5 py-4 text-center">
                        <span className="font-medium">{client.totalAppointments}</span>
                      </td>

                      {/* Completed */}
                      <td className="px-5 py-4 text-center">
                        <span className="font-medium text-emerald-500">{client.completedAppointments}</span>
                      </td>

                      {/* No-shows */}
                      <td className="px-5 py-4 text-center">
                        {client.noShowCount > 0 ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isBlocked
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}>
                            <AlertTriangle className="h-3 w-3" />
                            {client.noShowCount}
                            {isBlocked && " · Bloqueado"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono font-medium">
                          {client.totalSpent > 0 ? formatCLP(client.totalSpent) : "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
