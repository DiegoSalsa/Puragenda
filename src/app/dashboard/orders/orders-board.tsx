"use client";

import { useMemo, useState } from "react";
import { format, parseISO, startOfWeek } from "date-fns";
import { Banknote, CalendarRange, Check, ChevronDown, ImageIcon, Loader2, Package, Phone, UserRound, type LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { getDateLocale } from "@/i18n/date-locale";

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

export function OrdersBoard({ businessName, currencyCode, initialOrders }: { businessName: string; currencyCode: string; initialOrders: Order[] }) {
  const t = useTranslations("dashboard.orders");
  const dateLocale = getDateLocale(useLocale());
  const statusLabels: Record<string, string> = {
    AWAITING_DEPOSIT: t("status.awaitingDeposit"), REFERENCES_REVIEW: t("status.referencesReview"), QUEUED: t("status.queued"),
    IN_PRODUCTION: t("status.inProduction"), QUALITY_CHECK: t("status.qualityCheck"), BALANCE_DUE: t("status.balanceDue"),
    READY_TO_SHIP: t("status.readyToShip"), SHIPPED: t("status.shipped"), COMPLETED: t("status.completed"), CANCELLED: t("status.cancelled"),
  };
  const boardColumns = [
    { key: "PENDING", label: t("columns.pending"), statuses: ["AWAITING_DEPOSIT", "REFERENCES_REVIEW"] },
    { key: "QUEUED", label: t("columns.queued"), statuses: ["QUEUED"] },
    { key: "WORK", label: t("columns.work"), statuses: ["IN_PRODUCTION", "QUALITY_CHECK"] },
    { key: "DELIVERY", label: t("columns.delivery"), statuses: ["BALANCE_DUE", "READY_TO_SHIP", "SHIPPED"] },
    { key: "DONE", label: t("columns.done"), statuses: ["COMPLETED", "CANCELLED"] },
  ];
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
      if (!response.ok) throw new Error(updated.error || t("updateError"));
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
      alert(error instanceof Error ? error.message : t("updateError"));
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-7">
      <div data-tour="page-header">
        <p className="text-sm font-medium text-[#7C3AED]">{t("production")}</p>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle", { business: businessName })}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="orders-summary">
        {([
          [t("active"), stats.active, Package],
          [t("awaitingDeposit"), stats.awaitingDeposit, Banknote],
          [t("dueSoon"), stats.dueSoon, CalendarRange],
          [t("outstanding"), formatPrice(stats.outstanding, currencyCode), Banknote],
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
          <h2 className="mt-3 font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5" data-tour="orders-board">
          {boardColumns.map((column) => {
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
                          {order.productionWindowLabel || format(parseISO(order.productionWeek), "d MMM", { locale: dateLocale })}
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
                <p className="mt-1 text-sm text-muted-foreground">{statusLabels[selected.status]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg px-3 py-1 text-sm text-muted-foreground hover:bg-muted">{t("close")}</button>
            </div>
            <div className="grid gap-6 p-5 md:grid-cols-[1fr_240px]">
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold">{t("references")}</h3>
                  {selected.referenceImageUrls.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {selected.referenceImageUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={t("referenceAlt", { number: index + 1 })} className="aspect-square w-full rounded-xl object-cover" /></a>)}
                    </div>
                  ) : <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground"><ImageIcon className="h-4 w-4" />{t("noPhotos")}</div>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{t("petDetails")}</h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-sm">{selected.petDetails}</p>
                </div>
                {selected.selectedOptions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold">{t("options")}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">{selected.selectedOptions.map((option) => <span key={`${option.categoryName}-${option.alternativeName}`} className="rounded-lg bg-[#7C3AED]/10 px-2.5 py-1 text-xs text-[#7C3AED]">{option.categoryName}: {option.alternativeName}</span>)}</div>
                  </div>
                )}
              </div>
              <aside className="space-y-4">
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold"><CalendarRange className="h-4 w-4 text-[#7C3AED]" />{t("promisedDelivery")}</p>
                  {selected.productionWindowLabel && <p className="mt-2 font-medium">{selected.productionWindowLabel}</p>}
                  <p className="mt-1 text-muted-foreground">
                    {format(parseISO(selected.productionWeek), "d MMM", { locale: dateLocale })}
                    {selected.productionWindowEnd && ` – ${format(parseISO(selected.productionWindowEnd), "d MMM yyyy", { locale: dateLocale })}`}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-[#7C3AED]" />{t("customer")}</p>
                  <p className="mt-2">{selected.customerName}</p>
                  <p className="text-xs text-muted-foreground">{selected.customerEmail}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{selected.customerPhone}</p>
                </div>
                <div className="rounded-xl border border-border p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("total")}</span><strong>{formatPrice(selected.totalPrice, currencyCode)}</strong></div>
                  <div className="mt-2 flex justify-between"><span className="text-muted-foreground">{t("deposit")}</span><span>{formatPrice(selected.depositAmount, currencyCode)}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">{t("balance")}</span><span>{formatPrice(selected.balanceAmount, currencyCode)}</span></div>
                  {selected.depositPaymentStatus !== "APPROVED" && (
                    <button disabled={loading === selected.id} onClick={() => updateOrder(selected.id, { depositPaid: true })} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" />{t("markDeposit")}</button>
                  )}
                  {selected.status === "BALANCE_DUE" && selected.balancePaymentStatus !== "APPROVED" && (
                    <button disabled={loading === selected.id} onClick={() => updateOrder(selected.id, { balancePaid: true })} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 py-2 text-xs font-semibold text-blue-600"><Check className="h-3.5 w-3.5" />{t("markBalance")}</button>
                  )}
                </div>
                <label className="block text-xs font-medium text-muted-foreground">
                  {t("changeStatus")}
                  <div className="relative mt-1">
                    <select value={selected.status} disabled={loading === selected.id} onChange={(event) => updateOrder(selected.id, { status: event.target.value })}
                      className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm outline-none">
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
