"use client";

import { useMemo, useState } from "react";
import { format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Banknote, CalendarRange, Check, ChevronDown, ImageIcon, Loader2, Package, Phone, UserRound, type LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  AWAITING_DEPOSIT: "Esperando abono",
  REFERENCES_REVIEW: "Revisar referencias",
  QUEUED: "En cola",
  IN_PRODUCTION: "En producción",
  QUALITY_CHECK: "Control final",
  BALANCE_DUE: "Saldo pendiente",
  READY_TO_SHIP: "Listo para entregar",
  SHIPPED: "Enviado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const BOARD_COLUMNS = [
  { key: "PENDING", label: "Por confirmar", statuses: ["AWAITING_DEPOSIT", "REFERENCES_REVIEW"] },
  { key: "QUEUED", label: "En cola", statuses: ["QUEUED"] },
  { key: "WORK", label: "En trabajo", statuses: ["IN_PRODUCTION", "QUALITY_CHECK"] },
  { key: "DELIVERY", label: "Cobro y entrega", statuses: ["BALANCE_DUE", "READY_TO_SHIP", "SHIPPED"] },
  { key: "DONE", label: "Finalizados", statuses: ["COMPLETED", "CANCELLED"] },
];

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  petName: string;
  petDetails: string;
  referenceImageUrls: string[];
  productionWeek: string;
  productionWindowLabel: string | null;
  productionWindowEnd: string | null;
  selectedOptions: { categoryName: string; alternativeName: string; priceDelta: number }[];
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  depositPaymentStatus: string;
  balancePaymentStatus: string;
  deliveryMethod: string;
  customerAddress: string | null;
  status: string;
  internalNotes: string | null;
  createdAt: string;
  serviceName: string;
}

export function OrdersBoard({ businessName, initialOrders }: { businessName: string; initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState("");

  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const stats = useMemo(() => ({
    active: orders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status)).length,
    awaitingDeposit: orders.filter((order) => order.status === "AWAITING_DEPOSIT").length,
    dueSoon: orders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status) && parseISO(order.productionWindowEnd || order.productionWeek) <= thisWeek).length,
    outstanding: orders
      .filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status))
      .reduce((sum, order) => sum + (order.depositPaymentStatus === "APPROVED" ? 0 : order.depositAmount) + (order.balancePaymentStatus === "APPROVED" ? 0 : order.balanceAmount), 0),
  }), [orders, thisWeek]);

  async function updateOrder(id: string, payload: Record<string, unknown>) {
    setLoading(id);
    try {
      const response = await fetch(`/api/dashboard/production-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || "No se pudo actualizar");
      const normalized = {
        ...updated,
        productionWeek: new Date(updated.productionWeek).toISOString().slice(0, 10),
        productionWindowEnd: updated.productionWindowEnd ? new Date(updated.productionWindowEnd).toISOString().slice(0, 10) : null,
        createdAt: new Date(updated.createdAt).toISOString(),
        serviceName: updated.service.name,
      };
      setOrders((current) => current.map((order) => order.id === id ? normalized : order));
      setSelected((current) => current?.id === id ? normalized : current);
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo actualizar");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-[#7C3AED]">Producción</p>
        <h1 className="text-3xl font-bold tracking-tight">Encargos</h1>
        <p className="mt-1 text-muted-foreground">Cupos y pedidos personalizados de {businessName}.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Activos", stats.active, Package],
          ["Esperando abono", stats.awaitingDeposit, Banknote],
          ["Por entregar", stats.dueSoon, CalendarRange],
          ["Por cobrar", formatPrice(stats.outstanding), Banknote],
        ] as [string, string | number, LucideIcon][]).map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{String(label)}</p><Icon className="h-4 w-4 text-[#7C3AED]" /></div>
            <p className="mt-2 text-2xl font-bold">{String(value)}</p>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h2 className="mt-3 font-semibold">Todavía no hay encargos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Los servicios configurados como “Encargo con cupos” aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          {BOARD_COLUMNS.map((column) => {
            const columnOrders = orders.filter((order) => column.statuses.includes(order.status));
            return (
              <section key={column.key} className="min-w-0 rounded-2xl border border-border bg-muted/20 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{column.label}</h2>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{columnOrders.length}</span>
                </div>
                <div className="space-y-3">
                  {columnOrders.map((order) => (
                    <button key={order.id} onClick={() => setSelected(order)} className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#7C3AED]/40">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7C3AED]">{order.orderNumber}</span>
                        <span className="max-w-[110px] truncate text-[10px] text-muted-foreground">
                          {order.productionWindowLabel || format(parseISO(order.productionWeek), "d MMM", { locale: es })}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">{order.petName}</p>
                      <p className="truncate text-xs text-muted-foreground">{order.serviceName}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="truncate text-muted-foreground">{order.customerName}</span>
                        {loading === order.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <p className="text-xs font-semibold text-[#7C3AED]">{selected.orderNumber}</p>
                <h2 className="mt-1 text-xl font-bold">{selected.petName} · {selected.serviceName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{STATUS_LABELS[selected.status]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg px-3 py-1 text-sm text-muted-foreground hover:bg-muted">Cerrar</button>
            </div>
            <div className="grid gap-6 p-5 md:grid-cols-[1fr_240px]">
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold">Referencias</h3>
                  {selected.referenceImageUrls.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {selected.referenceImageUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Referencia ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" /></a>)}
                    </div>
                  ) : <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground"><ImageIcon className="h-4 w-4" />Sin fotos</div>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Detalles de la mascota</h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-sm">{selected.petDetails}</p>
                </div>
                {selected.selectedOptions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold">Opciones</h3>
                    <div className="mt-2 flex flex-wrap gap-2">{selected.selectedOptions.map((option) => <span key={`${option.categoryName}-${option.alternativeName}`} className="rounded-lg bg-[#7C3AED]/10 px-2.5 py-1 text-xs text-[#7C3AED]">{option.categoryName}: {option.alternativeName}</span>)}</div>
                  </div>
                )}
              </div>
              <aside className="space-y-4">
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold"><CalendarRange className="h-4 w-4 text-[#7C3AED]" />Entrega prometida</p>
                  {selected.productionWindowLabel && <p className="mt-2 font-medium">{selected.productionWindowLabel}</p>}
                  <p className="mt-1 text-muted-foreground">
                    {format(parseISO(selected.productionWeek), "d MMM", { locale: es })}
                    {selected.productionWindowEnd && ` – ${format(parseISO(selected.productionWindowEnd), "d MMM yyyy", { locale: es })}`}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-[#7C3AED]" />Cliente</p>
                  <p className="mt-2">{selected.customerName}</p>
                  <p className="text-xs text-muted-foreground">{selected.customerEmail}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{selected.customerPhone}</p>
                </div>
                <div className="rounded-xl border border-border p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><strong>{formatPrice(selected.totalPrice)}</strong></div>
                  <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Abono</span><span>{formatPrice(selected.depositAmount)}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Saldo</span><span>{formatPrice(selected.balanceAmount)}</span></div>
                  {selected.depositPaymentStatus !== "APPROVED" && (
                    <button disabled={loading === selected.id} onClick={() => updateOrder(selected.id, { depositPaid: true })} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" />Marcar abono recibido</button>
                  )}
                  {selected.status === "BALANCE_DUE" && selected.balancePaymentStatus !== "APPROVED" && (
                    <button disabled={loading === selected.id} onClick={() => updateOrder(selected.id, { balancePaid: true })} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 py-2 text-xs font-semibold text-blue-600"><Check className="h-3.5 w-3.5" />Marcar saldo recibido</button>
                  )}
                </div>
                <label className="block text-xs font-medium text-muted-foreground">
                  Cambiar estado
                  <div className="relative mt-1">
                    <select value={selected.status} disabled={loading === selected.id} onChange={(event) => updateOrder(selected.id, { status: event.target.value })}
                      className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm outline-none">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </label>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
