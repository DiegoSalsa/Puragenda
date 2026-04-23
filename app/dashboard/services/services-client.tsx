"use client";

import { useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Wrench } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
}

export function ServicesClient({
  initialServices,
}: {
  initialServices: Service[];
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
  });

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
    if (!confirm("¿Estas seguro de eliminar este servicio?")) return;

    try {
      await fetch(`/api/dashboard/services/${id}`, {
        method: "DELETE",
      });
      await fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los servicios que ofrece tu negocio.
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="gap-2 bg-gradient-to-r from-violet-900 to-purple-700 text-white hover:from-violet-800 hover:to-purple-600"
        >
          <Plus className="w-4 h-4" /> Nuevo Servicio
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Editar Servicio" : "Nuevo Servicio"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Consultoria Web"
                  required
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripcion</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Descripcion del servicio..."
                  rows={3}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duracion (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: e.target.value })
                    }
                    placeholder="60"
                    required
                    min="1"
                    className="bg-muted/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (CLP)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="50000"
                    required
                    min="0"
                    className="bg-muted/50 border-border/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-border/50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-violet-800 text-white hover:bg-violet-700"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingService ? (
                    "Guardar Cambios"
                  ) : (
                    "Crear Servicio"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Listado de Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-white" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No hay servicios aun. Crea el primero.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">
                    Nombre
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Descripcion
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Duracion
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Precio
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow
                    key={service.id}
                    className="border-border/50 hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {service.description || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md border border-violet-400/35 bg-violet-700/25 px-2 py-0.5 text-xs font-medium text-white">
                        {service.duration} min
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPrice(service.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(service)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(service.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
