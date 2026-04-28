"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Wrench, Settings2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { updateMaxServicesAction } from "@/server/actions/dashboard.actions";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
}

export function ServicesClient({
  initialServices,
  maxServicesPerBooking = 1,
}: {
  initialServices: Service[];
  maxServicesPerBooking?: number;
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [maxServices, setMaxServices] = useState(maxServicesPerBooking);
  const [savingMax, setSavingMax] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
  });

  async function handleSaveMaxServices(val: number) {
    setMaxServices(val);
    setSavingMax(true);
    await updateMaxServicesAction(val);
    setSavingMax(false);
  }

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/services");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingService(null);
    setForm({ name: "", description: "", duration: "", price: "" });
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || "",
      duration: String(service.duration),
      price: String(service.price),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingService) {
        await fetch(`/api/dashboard/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/dashboard/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      await fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return;

    try {
      await fetch(`/api/dashboard/services/${id}`, { method: "DELETE" });
      await fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="mt-1 text-white/40">
            Gestiona los servicios que ofrece tu negocio.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5B21B6]"
        >
          <Plus className="h-4 w-4" /> Nuevo Servicio
        </button>
      </div>

      {/* Multi-service config */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Settings2 className="h-4 w-4 text-[#7C3AED]" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">Servicios por reserva</p>
              <p className="text-xs text-white/35">Permite que tus clientes seleccionen varios servicios en una sola cita.</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                value={maxServices}
                onChange={(e) => handleSaveMaxServices(parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 appearance-none rounded-full bg-white/10 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7C3AED] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="rounded-lg border border-white/[0.06] bg-[#1a1a1a] px-3 py-1 font-mono text-xs text-white min-w-[3rem] text-center">
                {savingMax ? "..." : maxServices}
              </span>
            </div>
            <p className="text-[11px] text-white/25">{maxServices === 1 ? "Solo un servicio por cita (modo estándar)." : `Hasta ${maxServices} servicios por cita. Las duraciones y precios se suman automáticamente.`}</p>
          </div>
        </div>
      </div>

      {/* Dialog/Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#111] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-semibold">
              {editingService ? "Editar Servicio" : "Nuevo Servicio"}
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-white/60">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Consultoría Web"
                  required
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-white/60">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Descripción del servicio..."
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-white/60">
                    Duración (minutos)
                  </label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: e.target.value })
                    }
                    placeholder="60"
                    required
                    min="1"
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-white/60">Precio (CLP)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="50000"
                    required
                    min="0"
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl border border-white/[0.06] px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingService ? (
                    "Guardar Cambios"
                  ) : (
                    "Crear Servicio"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111]">
        <div className="border-b border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold">Listado de Servicios</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-white/30" />
            </div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center text-white/30">
              <Wrench className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p>No hay servicios aún. Crea el primero.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/30">
                    <th className="pb-3 pr-4">Nombre</th>
                    <th className="pb-3 pr-4">Descripción</th>
                    <th className="pb-3 pr-4">Duración</th>
                    <th className="pb-3 pr-4">Precio</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr
                      key={service.id}
                      className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 pr-4 font-medium">
                        {service.name}
                      </td>
                      <td className="max-w-xs truncate py-3.5 pr-4 text-white/40">
                        {service.description || "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                          {service.duration} min
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-sm">
                        {formatPrice(service.price)}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(service)}
                            className="rounded-lg p-2 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
