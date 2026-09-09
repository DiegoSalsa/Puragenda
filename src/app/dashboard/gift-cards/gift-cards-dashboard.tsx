"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, CreditCard, Gift, Mail, Pencil, Plus, Send, ShoppingBag, WalletCards, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { GiftCardVisual } from "@/components/gift-cards/gift-card-visual";
import { formatPrice } from "@/lib/utils";
import { GiftCardBuilder, type GiftCardDashboardService, type GiftCardDashboardTemplate } from "./gift-card-builder";

type Purchase = {
  id: string;
  templateNameSnapshot: string;
  salePrice: number;
  currencyCode: string;
  buyerName: string;
  buyerEmail: string;
  deliveryMode: "SELF" | "GIFT";
  recipientName: string | null;
  recipientEmail: string | null;
  paymentMethod: string;
  paymentStatus: string;
  manualPaymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  giftCard: { id: string; publicCode: string; status: string; claimedAt: Date | string | null } | null;
  createdBy: { name: string } | null;
};

type SaleForm = {
  templateId: string;
  buyerName: string;
  buyerEmail: string;
  deliveryMode: "SELF" | "GIFT";
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  giftMessage: string;
  manualPaymentMethod: "TRANSFER" | "CASH" | "OTHER";
};

const blankSale: SaleForm = { templateId: "", buyerName: "", buyerEmail: "", deliveryMode: "SELF", recipientName: "", recipientEmail: "", senderName: "", giftMessage: "", manualPaymentMethod: "TRANSFER" };

export function GiftCardsDashboard({ business, metrics, templates: initialTemplates, services, purchases: initialPurchases }: {
  business: {
    name: string;
    currencyCode: string;
    mercadoPagoConnected: boolean;
    widgetSlug: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  metrics: { sold: number; sales: number; pending: number; used: number };
  templates: GiftCardDashboardTemplate[];
  services: GiftCardDashboardService[];
  purchases: Purchase[];
}) {
  const t = useTranslations("giftCardsDashboard");
  const locale = useLocale();
  const spanish = locale.startsWith("es");
  const [tab, setTab] = useState<"overview" | "templates" | "sales">("overview");
  const [templates, setTemplates] = useState(initialTemplates);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [builder, setBuilder] = useState<{ mode: "new" } | { mode: "edit"; template: GiftCardDashboardTemplate } | null>(null);
  const [builderDirty, setBuilderDirty] = useState(false);
  const [sale, setSale] = useState(blankSale);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectedTemplate = useMemo(() => templates.find((item) => item.id === sale.templateId), [sale.templateId, templates]);
  const activeTemplates = templates.filter((item) => item.isActive).length;
  const discardMessage = spanish ? "Tienes cambios sin guardar. ¿Quieres descartarlos?" : "You have unsaved changes. Do you want to discard them?";

  function canLeaveBuilder() {
    return !builderDirty || window.confirm(discardMessage);
  }

  function changeTab(nextTab: "overview" | "templates" | "sales") {
    if (nextTab === tab) return;
    if (builder && !canLeaveBuilder()) return;
    setBuilder(null);
    setBuilderDirty(false);
    setTab(nextTab);
  }

  function createTemplate() {
    if (builder && !canLeaveBuilder()) return;
    setTab("templates");
    setBuilderDirty(false);
    setBuilder({ mode: "new" });
  }

  function editTemplate(template: GiftCardDashboardTemplate) {
    if (builder && !canLeaveBuilder()) return;
    setTab("templates");
    setBuilderDirty(false);
    setBuilder({ mode: "edit", template });
  }

  function updateSavedTemplate(saved: GiftCardDashboardTemplate) {
    setTemplates((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setBuilderDirty(false);
  }

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || t("requestError"));
    return payload;
  }

  async function manualSale(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await request("/api/dashboard/gift-cards/manual", { method: "POST", body: JSON.stringify(sale) });
      setSale(blankSale);
      setNotice(created.emailWarning || t("sentNotice", { code: created.publicCode }));
      if (!created.emailWarning) window.location.reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function resend(cardId: string) {
    setBusy(true);
    setError("");
    try {
      await request(`/api/dashboard/gift-cards/${cardId}/resend`, { method: "POST" });
      setNotice(t("emailResent"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function voidCard(cardId: string) {
    const reason = window.prompt(t("voidReason"));
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await request(`/api/dashboard/gift-cards/${cardId}/void`, { method: "POST", body: JSON.stringify({ reason }) });
      setPurchases((current) => current.map((item) => item.giftCard?.id === cardId ? { ...item, giftCard: { ...item.giftCard, status: "VOIDED" } } : item));
      setNotice(t("voided"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]";

  return <>
    {!business.mercadoPagoConnected && <div className="rounded-2xl border-[3px] border-black bg-[#fff5ba] p-4 font-bold shadow-[4px_4px_0_#000]">{t("connectMp")}</div>}
    {(notice || error) && <div role={error ? "alert" : "status"} className={`rounded-xl border-2 border-black p-3 text-sm font-bold ${error ? "bg-red-100 text-red-800" : "bg-[#bffcc6]"}`}>{error || notice}</div>}

    <nav className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" aria-label={t("cards")}>
      {([['overview', t("overview")], ['templates', t("cards")], ['sales', t("sales")]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => changeTab(id)} aria-current={tab === id ? "page" : undefined} className={`min-w-0 rounded-xl border-2 border-black px-2 py-2 text-xs font-black shadow-[3px_3px_0_#000] sm:px-4 sm:text-sm ${tab === id ? "bg-black text-white" : "bg-white"}`}>{label}</button>)}
    </nav>

    {tab === "overview" && <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: t("soldCards"), value: metrics.sold, Icon: ShoppingBag, color: "bg-[#ffb5e8]" },
        { label: t("generatedSales"), value: formatPrice(metrics.sales, business.currencyCode), Icon: CreditCard, color: "bg-[#bffcc6]" },
        { label: t("pendingValue"), value: formatPrice(metrics.pending, business.currencyCode), Icon: WalletCards, color: "bg-[#fff5ba]" },
        { label: t("usedValue"), value: formatPrice(metrics.used, business.currencyCode), Icon: Check, color: "bg-[#c4b5fd]" },
      ].map(({ label, value, Icon, color }) => <article key={label} className={`${color} rounded-2xl border-[3px] border-black p-4 shadow-[4px_4px_0_#000]`}><Icon className="h-5 w-5" /><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs font-black">{label}</p></article>)}</section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[5px_5px_0_#000]"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">{t("yourCards")}</h2><p className="mt-1 text-sm text-black/60">{t("templatesCount", { total: templates.length, active: activeTemplates })}</p></div><span className="rounded-full border-2 border-black bg-[#ffb5e8] px-3 py-1 text-xs font-black">{activeTemplates} {spanish ? "activas" : "active"}</span></div><button type="button" onClick={createTemplate} className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-[#ffb5e8] px-4 py-2 font-black shadow-[3px_3px_0_#000]"><Plus className="h-4 w-4" /> {t("createCard")}</button></div>
        <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[5px_5px_0_#000]"><h2 className="text-xl font-black">{t("manualSale")}</h2><p className="mt-1 text-sm text-black/60">{t("manualSaleDescription")}</p><button type="button" onClick={() => changeTab("sales")} className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-[#bffcc6] px-4 py-2 font-black shadow-[3px_3px_0_#000]"><Send className="h-4 w-4" /> {t("issueSale")}</button></div>
      </section>
    </div>}

    {tab === "templates" && (builder ? <GiftCardBuilder key={builder.mode === "edit" ? builder.template.id : "new"} business={business} services={services} template={builder.mode === "edit" ? builder.template : null} onSaved={updateSavedTemplate} onDirtyChange={setBuilderDirty} onClose={() => { setBuilder(null); setBuilderDirty(false); }} /> : <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-black/50">{spanish ? "Colección" : "Collection"}</p><h2 className="text-2xl font-black">{t("yourCards")}</h2><p className="mt-1 text-sm font-semibold text-black/55">{spanish ? "Cada tarjeta se muestra tal como la verá tu cliente." : "Each card is shown as your customer will see it."}</p></div><button type="button" onClick={createTemplate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#ffb5e8] px-4 font-black shadow-[4px_4px_0_#000]"><Plus className="h-4 w-4" /> {t("createCard")}</button></div>
      {templates.length === 0 ? <div className="rounded-3xl border-[3px] border-dashed border-black bg-[#fff5ba] p-8 text-center shadow-[5px_5px_0_#000] sm:p-12"><Gift className="mx-auto h-12 w-12" /><h3 className="mt-4 text-2xl font-black">{spanish ? "Crea tu primera Gift Card" : "Create your first Gift Card"}</h3><p className="mx-auto mt-2 max-w-md font-semibold text-black/60">{spanish ? "Vende experiencias y servicios por adelantado con una tarjeta que se sienta lista para regalar." : "Sell experiences and services in advance with a card that feels ready to gift."}</p><button type="button" onClick={createTemplate} className="mt-6 inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#ffb5e8] px-5 py-3 font-black shadow-[4px_4px_0_#000]"><Plus className="h-4 w-4" /> {t("createCard")}</button></div> : <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{templates.map((template) => <article key={template.id} className="flex flex-col rounded-3xl border-[3px] border-black bg-white p-4 shadow-[5px_5px_0_#000]"><GiftCardVisual compact businessName={business.name} logoUrl={business.logoUrl} giftCardName={template.name} type={template.type} faceValue={template.faceValue} services={template.services.map((item) => ({ name: item.service.name, quantity: item.quantity }))} shortMessage={template.shortMessage || template.description} background={template.backgroundColor} accent={template.accentColor} text={template.textColor} imageUrl={template.imageUrl} currencyCode={business.currencyCode} /><div className="mt-5 flex flex-1 flex-col"><div className="flex flex-wrap gap-2"><span className="rounded-full border-2 border-black bg-[#fff5ba] px-2 py-0.5 text-[10px] font-black">{template.type === "BALANCE" ? t("amountType") : t("serviceType")}</span><span className={`rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black ${template.isActive ? "bg-[#bffcc6]" : "bg-black/10"}`}>{template.isActive ? t("active") : t("inactive")}</span><span className={`rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black ${template.isPublic ? "bg-[#c4b5fd]" : "bg-white"}`}>{template.isPublic ? (spanish ? "EN WIDGET" : "IN WIDGET") : (spanish ? "PRIVADA" : "PRIVATE")}</span></div><h3 className="mt-3 text-xl font-black">{template.name}</h3><p className="mt-1 text-sm font-bold">{spanish ? "Se vende por" : "Sells for"} {formatPrice(template.salePrice, business.currencyCode)}</p>{template.type === "BALANCE" ? <p className="text-sm font-bold text-black/55">{spanish ? "Entrega" : "Delivers"} {formatPrice(template.faceValue || 0, business.currencyCode)}</p> : <p className="line-clamp-2 text-sm font-semibold text-black/55">{template.services.map((item) => `${item.service.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`).join(" · ")}</p>}<button type="button" onClick={() => editTemplate(template)} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#fff5ba] px-3 text-sm font-black transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]"><Pencil className="h-4 w-4" /> {t("edit")}</button></div></article>)}</div>}
    </section>)}

    {tab === "sales" && <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={manualSale} className="h-fit space-y-3 rounded-2xl border-[3px] border-black bg-[#bffcc6] p-5 shadow-[6px_6px_0_#000]"><h2 className="text-xl font-black">{t("issueManual")}</h2><label className="block text-xs font-black">Gift Card<select required value={sale.templateId} onChange={(event) => setSale({ ...sale, templateId: event.target.value })} className={input}><option value="">{t("select")}</option>{templates.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} · {formatPrice(item.salePrice, business.currencyCode)}</option>)}</select></label><label className="block text-xs font-black">{t("buyer")}<input required value={sale.buyerName} onChange={(event) => setSale({ ...sale, buyerName: event.target.value })} className={input} /></label><label className="block text-xs font-black">{t("buyerEmail")}<input required type="email" value={sale.buyerEmail} onChange={(event) => setSale({ ...sale, buyerEmail: event.target.value })} className={input} /></label><label className="block text-xs font-black">{t("paymentMethod")}<select value={sale.manualPaymentMethod} onChange={(event) => setSale({ ...sale, manualPaymentMethod: event.target.value as SaleForm["manualPaymentMethod"] })} className={input}><option value="TRANSFER">{t("transfer")}</option><option value="CASH">{t("cash")}</option><option value="OTHER">{t("other")}</option></select></label><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={sale.deliveryMode === "GIFT"} onChange={(event) => setSale({ ...sale, deliveryMode: event.target.checked ? "GIFT" : "SELF" })} className="h-5 w-5 accent-black" /> {t("giftToggle")}</label>{sale.deliveryMode === "GIFT" && <><label className="block text-xs font-black">{t("recipient")}<input required value={sale.recipientName} onChange={(event) => setSale({ ...sale, recipientName: event.target.value })} className={input} /></label><label className="block text-xs font-black">{t("recipientEmail")}<input required type="email" value={sale.recipientEmail} onChange={(event) => setSale({ ...sale, recipientEmail: event.target.value })} className={input} /></label><label className="block text-xs font-black">{t("sender")}<input required value={sale.senderName} onChange={(event) => setSale({ ...sale, senderName: event.target.value })} className={input} /></label><label className="block text-xs font-black">{t("message")}<textarea maxLength={500} value={sale.giftMessage} onChange={(event) => setSale({ ...sale, giftMessage: event.target.value })} className="mt-1 min-h-20 w-full rounded-xl border-2 border-black bg-white p-3" /></label></>}{selectedTemplate && <GiftCardVisual compact businessName={business.name} logoUrl={business.logoUrl} giftCardName={selectedTemplate.name} type={selectedTemplate.type} faceValue={selectedTemplate.faceValue} services={selectedTemplate.services.map((item) => ({ name: item.service.name, quantity: item.quantity }))} shortMessage={selectedTemplate.shortMessage || selectedTemplate.description} background={selectedTemplate.backgroundColor} accent={selectedTemplate.accentColor} text={selectedTemplate.textColor} imageUrl={selectedTemplate.imageUrl} currencyCode={business.currencyCode} />}<button disabled={busy} className="w-full rounded-xl border-[3px] border-black bg-black py-3 font-black text-white shadow-[4px_4px_0_#7c3aed] disabled:opacity-50">{t("issueCard")}</button></form>
      <section className="space-y-3"><h2 className="text-xl font-black">{t("recentSales")}</h2>{purchases.length === 0 && <div className="rounded-2xl border-[3px] border-dashed border-black bg-white p-8 text-center font-bold">{spanish ? "Todavía no hay ventas de Gift Cards." : "There are no Gift Card sales yet."}</div>}{purchases.map((purchase) => <article key={purchase.id} className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_#000]"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border-2 border-black bg-[#c4b5fd] px-2 py-0.5 text-[10px] font-black">{purchase.paymentMethod === "MANUAL" ? t("manualBadge") : t("mpBadge")}</span><span className="rounded-full border-2 border-black bg-[#fff5ba] px-2 py-0.5 text-[10px] font-black">{purchase.deliveryMode === "GIFT" ? (spanish ? "REGALO" : "GIFT") : (spanish ? "PARA SÍ" : "FOR SELF")}</span><span className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black">{purchase.paymentStatus}</span>{purchase.giftCard && <span className={`rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black ${purchase.giftCard.claimedAt ? "bg-[#bffcc6]" : "bg-black/10"}`}>{purchase.giftCard.claimedAt ? (spanish ? "RECLAMADA" : "CLAIMED") : (spanish ? "SIN RECLAMAR" : "UNCLAIMED")}</span>}</div><h3 className="mt-3 font-black">{purchase.templateNameSnapshot}</h3><p className="text-sm font-bold">{purchase.deliveryMode === "GIFT" ? purchase.recipientName : purchase.buyerName} · {formatPrice(purchase.salePrice, purchase.currencyCode)}</p><p className="text-xs text-black/55">{new Date(purchase.createdAt).toLocaleString(locale)}{purchase.createdBy ? ` · ${t("createdBy", { name: purchase.createdBy.name })}` : ""}</p>{purchase.giftCard && <p className="mt-1 font-mono text-xs font-black">{purchase.giftCard.publicCode} · {purchase.giftCard.status}</p>}</div>{purchase.giftCard && <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => resend(purchase.giftCard!.id)} aria-label={t("resend")} className="rounded-lg border-2 border-black bg-[#c4b5fd] p-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c4b5fd]"><Mail className="h-4 w-4" /></button>{purchase.paymentMethod === "MANUAL" && purchase.giftCard.status !== "VOIDED" && <button type="button" disabled={busy} onClick={() => voidCard(purchase.giftCard!.id)} aria-label={t("void")} className="rounded-lg border-2 border-black bg-red-100 p-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"><X className="h-4 w-4" /></button>}</div>}</div></article>)}</section>
    </div>}
  </>;
}
