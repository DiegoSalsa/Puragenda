"use client";

import React from "react";

import { useState, useMemo, useTransition } from "react";
import { Search, Users, AlertTriangle, TrendingUp, ShieldAlert, Phone, Mail, ChevronDown, StickyNote, RefreshCw, Edit2, Check, X } from "lucide-react";
import { updateClientNotesAction, updateClientRutAction } from "@/server/actions/client.actions";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface RecurringBookingSummary {
  id: string;
  status: string;
  serviceName: string;
  durationMonths: number;
  startDate: string;
  endDate: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  rut: string | null;
  privateNotes: string | null;
  totalSpent: number;
  noShowCount: number;
  totalAppointments: number;
  completedAppointments: number;
  createdAt: string;
  recurringBookings: RecurringBookingSummary[];
}

const RECURRING_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activa",
  PENDING_APPROVAL: "Pendiente",
  PAUSED: "Pausada",
};

export function ClientsTable({ clients, currencyCode, taxIdLabel, taxIdPlaceholder }: { clients: ClientData[]; currencyCode: string; taxIdLabel: string; taxIdPlaceholder: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingRut, setEditingRut] = useState<string | null>(null);
  const [rutValue, setRutValue] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [pending, startTransition] = useTransition();

  function saveRut(clientId: string) {
    startTransition(async () => {
      await updateClientRutAction(clientId, rutValue.trim());
      router.refresh();
      setEditingRut(null);
    });
  }

  function saveNotes(clientId: string) {
    startTransition(async () => {
      await updateClientNotesAction(clientId, notesValue.trim());
      router.refresh();
      setEditingNotes(null);
    });
  }

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
              <p className="text-2xl font-bold">{formatPrice(totalRevenue, currencyCode)}</p>
              <p className="text-xs text-muted-foreground">Ingresos totales</p>
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
                  <th className="px-3 sm:px-5 py-2 sm:py-3.5">Cliente</th>
                  <th className="hidden sm:table-cell px-3 sm:px-5 py-2 sm:py-3.5">Contacto</th>
                  <th className="px-3 sm:px-5 py-2 sm:py-3.5 text-center">Citas</th>
                  <th className="hidden sm:table-cell px-3 sm:px-5 py-2 sm:py-3.5 text-center">Completadas</th>
                  <th className="hidden sm:table-cell px-3 sm:px-5 py-2 sm:py-3.5 text-center">Inasistencias</th>
                  <th className="px-3 sm:px-5 py-2 sm:py-3.5 text-right">Total Gastado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const isBlocked = client.noShowCount >= 2;
                  return (
                    <React.Fragment key={client.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/50 cursor-pointer ${
                        isBlocked ? "bg-red-500/[0.03]" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            isBlocked
                              ? "bg-red-500/10 text-red-500"
                              : "bg-[#7C3AED]/10 text-[#7C3AED]"
                          }`}>
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{client.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                Cliente desde {new Date(client.createdAt).toLocaleDateString("es-CL", { month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:hidden ${
                              expandedId === client.id ? "rotate-180" : ""
                            }`} />
                          </div>
                        </div>
                      </td>

                      {/* Contact - hidden on mobile */}
                      <td className="hidden sm:table-cell px-3 sm:px-5 py-3 sm:py-4">
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
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-center">
                        <span className="font-medium">{client.totalAppointments}</span>
                      </td>

                      {/* Completed */}
                      <td className="hidden sm:table-cell px-3 sm:px-5 py-3 sm:py-4 text-center">
                        <span className="font-medium text-emerald-500">{client.completedAppointments}</span>
                      </td>

                      {/* Inasistencias */}
                      <td className="hidden sm:table-cell px-3 sm:px-5 py-3 sm:py-4 text-center">
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
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right">
                        <span className="font-mono font-medium">
                          {client.totalSpent > 0 ? formatPrice(client.totalSpent, currencyCode) : "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable detail row */}
                    {expandedId === client.id && (
                      <tr className="border-b border-border/50">
                        <td colSpan={6} className="px-3 sm:px-5 py-4 bg-muted/20">
                          <div className="space-y-4 text-sm">
                            {/* Contact details */}
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-medium text-foreground">{client.email}</span>
                              </div>
                              {client.phone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span className="font-medium text-foreground">{client.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Gastado: <span className="font-mono font-medium text-foreground">{formatPrice(client.totalSpent, currencyCode)}</span></span>
                                <span>Citas: <span className="font-medium text-foreground">{client.totalAppointments}</span></span>
                              </div>
                            </div>

                            {/* RUT */}
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 mt-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">{taxIdLabel}</span>
                              {editingRut === client.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    autoFocus
                                    value={rutValue}
                                    onChange={(e) => setRutValue(e.target.value)}
                                    placeholder={taxIdPlaceholder}
                                    className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
                                  />
                                  <button disabled={pending} onClick={() => saveRut(client.id)} className="rounded-lg bg-[#7C3AED] p-1.5 text-white hover:bg-[#6d28d9] disabled:opacity-50">
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => setEditingRut(null)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <span className={client.rut ? "font-medium text-foreground" : "text-muted-foreground italic"}>
                                    {client.rut ?? `Sin ${taxIdLabel} registrado`}
                                  </span>
                                  <button
                                    onClick={() => { setEditingRut(client.id); setRutValue(client.rut ?? ""); }}
                                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Private Notes */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  <StickyNote className="h-3.5 w-3.5" />
                                  Notas privadas
                                </div>
                                {editingNotes !== client.id && (
                                  <button
                                    onClick={() => { setEditingNotes(client.id); setNotesValue(client.privateNotes ?? ""); }}
                                    className="text-xs text-[#7C3AED] hover:underline"
                                  >
                                    {client.privateNotes ? "Editar" : "Agregar nota"}
                                  </button>
                                )}
                              </div>
                              {editingNotes === client.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    autoFocus
                                    value={notesValue}
                                    onChange={(e) => setNotesValue(e.target.value)}
                                    rows={2}
                                    placeholder="Notas privadas sobre este cliente..."
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/30 transition-colors"
                                  />
                                  <div className="flex gap-2">
                                    <button disabled={pending} onClick={() => saveNotes(client.id)} className="rounded-xl bg-[#7C3AED] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-50">
                                      {pending ? "Guardando..." : "Guardar"}
                                    </button>
                                    <button onClick={() => setEditingNotes(null)} className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : client.privateNotes ? (
                                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                                  {client.privateNotes}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Sin notas</p>
                              )}
                            </div>

                            {/* Recurring subscriptions */}
                            {client.recurringBookings.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Suscripciones ({client.recurringBookings.length})
                                </div>
                                <div className="space-y-1">
                                  {client.recurringBookings.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
                                      <span className="font-medium">{r.serviceName || "Servicio"} · {r.durationMonths} {r.durationMonths === 1 ? "mes" : "meses"}</span>
                                      <span className={`rounded-lg px-2 py-0.5 font-medium ${
                                        r.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" :
                                        r.status === "PENDING_APPROVAL" ? "bg-amber-500/10 text-amber-600" :
                                        "bg-blue-500/10 text-blue-600"
                                      }`}>
                                        {RECURRING_STATUS_LABELS[r.status] ?? r.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {client.noShowCount > 0 && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                <span className="text-amber-500">{client.noShowCount} inasistencia{client.noShowCount > 1 ? "s" : ""}</span>
                                {isBlocked && <span className="text-red-500 font-medium">· Bloqueado</span>}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
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
