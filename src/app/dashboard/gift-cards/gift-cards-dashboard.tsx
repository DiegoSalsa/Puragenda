"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Copy, CreditCard, Gift, Mail, Pencil, Plus, Send, ShoppingBag, WalletCards, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Service = { id: string; name: string; price: number };
type Template = {
  id: string; name: string; description: string | null; type: "BALANCE" | "SERVICE"; salePrice: number; faceValue: number | null;
  isActive: boolean; isPublic: boolean; designPreset: string; backgroundColor: string; accentColor: string; textColor: string;
  imageUrl: string | null; shortMessage: string | null; createdAt: string; updatedAt: string;
  services: Array<{ serviceId: string; quantity: number; service: { id: string; name: string } }>;
};
type Purchase = {
  id: string; templateNameSnapshot: string; salePrice: number; currencyCode: string; buyerName: string; buyerEmail: string;
  deliveryMode: "SELF" | "GIFT"; recipientName: string | null; recipientEmail: string | null; paymentMethod: string;
  paymentStatus: string; manualPaymentMethod: string | null; paidAt: string | null; createdAt: string;
  giftCard: { id: string; publicCode: string; status: string; claimedAt: Date | string | null } | null;
  createdBy: { name: string } | null;
};

type TemplateForm = Omit<Template, "id" | "createdAt" | "updatedAt" | "services"> & { description: string; imageUrl: string; shortMessage: string; services: Array<{ serviceId: string; quantity: number }> };
type SaleForm = { templateId: string; buyerName: string; buyerEmail: string; deliveryMode: "SELF" | "GIFT"; recipientName: string; recipientEmail: string; senderName: string; giftMessage: string; manualPaymentMethod: "TRANSFER" | "CASH" | "OTHER" };
const blankTemplate: TemplateForm = { name: "", description: "", type: "BALANCE", salePrice: 0, faceValue: 0, isActive: true, isPublic: true, designPreset: "classic", backgroundColor: "#FFF5BA", accentColor: "#FF8FAB", textColor: "#111111", imageUrl: "", shortMessage: "", services: [] };
const blankSale: SaleForm = { templateId: "", buyerName: "", buyerEmail: "", deliveryMode: "SELF", recipientName: "", recipientEmail: "", senderName: "", giftMessage: "", manualPaymentMethod: "TRANSFER" };

export function GiftCardsDashboard({ business, metrics, templates: initialTemplates, services, purchases: initialPurchases }: {
  business: { name: string; currencyCode: string; mercadoPagoConnected: boolean; widgetSlug: string };
  metrics: { sold: number; sales: number; pending: number; used: number };
  templates: Template[]; services: Service[]; purchases: Purchase[];
}) {
  const [tab, setTab] = useState<"overview" | "templates" | "sales">("overview");
  const [templates, setTemplates] = useState(initialTemplates);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [templateForm, setTemplateForm] = useState(blankTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sale, setSale] = useState(blankSale);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectedTemplate = useMemo(() => templates.find((item) => item.id === sale.templateId), [sale.templateId, templates]);

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No pudimos completar la acción");
    return payload;
  }

  async function saveTemplate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const saved = await request(editingId ? `/api/dashboard/gift-cards/templates/${editingId}` : "/api/dashboard/gift-cards/templates", { method: editingId ? "PUT" : "POST", body: JSON.stringify(templateForm) });
      setTemplates((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [saved, ...current]);
      setTemplateForm(blankTemplate); setEditingId(null); setNotice(editingId ? "Gift Card actualizada. Las ya emitidas conservan su snapshot." : "Gift Card creada.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Error"); } finally { setBusy(false); }
  }

  function editTemplate(template: Template) {
    setEditingId(template.id); setTab("templates");
    setTemplateForm({ name: template.name, description: template.description || "", type: template.type, salePrice: template.salePrice, faceValue: template.faceValue || 0, isActive: template.isActive, isPublic: template.isPublic, designPreset: template.designPreset, backgroundColor: template.backgroundColor, accentColor: template.accentColor, textColor: template.textColor, imageUrl: template.imageUrl || "", shortMessage: template.shortMessage || "", services: template.services.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity })) });
  }

  async function manualSale(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const created = await request("/api/dashboard/gift-cards/manual", { method: "POST", body: JSON.stringify(sale) });
      setSale(blankSale); setNotice(`Gift Card ${created.publicCode} emitida y enviada.`); window.location.reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Error"); } finally { setBusy(false); }
  }

  async function resend(cardId: string) {
    setBusy(true); setError(""); try { await request(`/api/dashboard/gift-cards/${cardId}/resend`, { method: "POST" }); setNotice("Correo reenviado."); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Error"); } finally { setBusy(false); }
  }

  async function voidCard(cardId: string) {
    const reason = window.prompt("Motivo de anulación (mínimo 5 caracteres):");
    if (!reason) return;
    setBusy(true); setError(""); try { await request(`/api/dashboard/gift-cards/${cardId}/void`, { method: "POST", body: JSON.stringify({ reason }) }); setPurchases((current) => current.map((item) => item.giftCard?.id === cardId ? { ...item, giftCard: { ...item.giftCard, status: "VOIDED" } } : item)); setNotice("Gift Card anulada. No se realizó ningún refund externo."); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Error"); } finally { setBusy(false); }
  }

  const input = "h-11 w-full rounded-xl border-2 border-black bg-white px-3 text-sm font-bold outline-none focus:shadow-[3px_3px_0_#7c3aed]";
  return <>
    {!business.mercadoPagoConnected && <div className="rounded-2xl border-3 border-black bg-[#fff5ba] p-4 font-bold shadow-[4px_4px_0_#000]">Conecta Mercado Pago para vender Gift Cards automáticamente desde tu widget. Mientras tanto puedes registrar ventas manuales.</div>}
    {(notice || error) && <div role="status" className={`rounded-xl border-2 border-black p-3 text-sm font-bold ${error ? "bg-red-100 text-red-800" : "bg-[#bffcc6]"}`}>{error || notice}</div>}
    <nav className="flex flex-wrap gap-2" aria-label="Secciones Gift Cards">{([['overview','Vista general'],['templates','Gift Cards'],['sales','Ventas']] as const).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl border-2 border-black px-4 py-2 text-sm font-black shadow-[3px_3px_0_#000] ${tab === id ? "bg-black text-white" : "bg-white"}`}>{label}</button>)}</nav>

    {tab === "overview" && <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: "Gift Cards vendidas", value: metrics.sold, Icon: ShoppingBag, color: "bg-[#ffb5e8]" }, { label: "Ventas generadas", value: formatPrice(metrics.sales, business.currencyCode), Icon: CreditCard, color: "bg-[#bffcc6]" }, { label: "Valor pendiente", value: formatPrice(metrics.pending, business.currencyCode), Icon: WalletCards, color: "bg-[#fff5ba]" }, { label: "Valor utilizado", value: formatPrice(metrics.used, business.currencyCode), Icon: Check, color: "bg-[#c4b5fd]" },
      ].map(({ label,value,Icon,color }) => <article key={label} className={`${color} rounded-2xl border-3 border-black p-4 shadow-[4px_4px_0_#000]`}><Icon className="h-5 w-5" /><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs font-black">{label}</p></article>)}</section>
      <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border-3 border-black bg-white p-5 shadow-[5px_5px_0_#000]"><h2 className="text-xl font-black">Tus Gift Cards</h2><p className="mt-1 text-sm text-black/60">{templates.length} plantillas · {templates.filter((item) => item.isActive).length} activas</p><button onClick={() => setTab("templates")} className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-[#ffb5e8] px-4 py-2 font-black shadow-[3px_3px_0_#000]"><Plus className="h-4 w-4" /> Crear Gift Card</button></div><div className="rounded-2xl border-3 border-black bg-white p-5 shadow-[5px_5px_0_#000]"><h2 className="text-xl font-black">Venta manual</h2><p className="mt-1 text-sm text-black/60">Emite por transferencia, efectivo u otro medio.</p><button onClick={() => setTab("sales")} className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-[#bffcc6] px-4 py-2 font-black shadow-[3px_3px_0_#000]"><Send className="h-4 w-4" /> Emitir venta</button></div></section>
    </div>}

    {tab === "templates" && <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-4">{templates.length === 0 && <div className="rounded-2xl border-3 border-dashed border-black bg-white p-10 text-center font-bold">Aún no tienes Gift Cards.</div>}{templates.map((template) => <article key={template.id} className="flex flex-col gap-4 rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_#000] sm:flex-row sm:items-center"><div className="h-24 w-full rounded-xl border-2 border-black p-3 sm:w-40" style={{ background: template.backgroundColor, color: template.textColor }}><Gift className="h-5 w-5" /><p className="mt-2 line-clamp-2 text-sm font-black">{template.name}</p></div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full border border-black px-2 py-0.5 text-[10px] font-black">{template.type === "BALANCE" ? "MONTO" : "SERVICIOS"}</span><span className={`rounded-full border border-black px-2 py-0.5 text-[10px] font-black ${template.isActive ? "bg-[#bffcc6]" : "bg-black/10"}`}>{template.isActive ? "ACTIVA" : "INACTIVA"}</span></div><h3 className="mt-2 font-black">{template.name}</h3><p className="text-sm font-bold">Venta {formatPrice(template.salePrice, business.currencyCode)}{template.faceValue ? ` · Valor ${formatPrice(template.faceValue, business.currencyCode)}` : ""}</p>{template.services.length > 0 && <p className="mt-1 text-xs text-black/55">{template.services.map((item) => `${item.service.name} × ${item.quantity}`).join(" · ")}</p>}</div><button onClick={() => editTemplate(template)} className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#fff5ba] px-3 py-2 text-sm font-black"><Pencil className="h-4 w-4" /> Editar</button></article>)}</section>
      <form onSubmit={saveTemplate} className="h-fit space-y-4 rounded-2xl border-3 border-black bg-[#fffaf0] p-5 shadow-[6px_6px_0_#000]"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{editingId ? "Editar Gift Card" : "Nueva Gift Card"}</h2>{editingId && <button type="button" onClick={() => { setEditingId(null); setTemplateForm(blankTemplate); }} aria-label="Cancelar edición"><X /></button>}</div><label className="block text-xs font-black">Nombre<input required value={templateForm.name} onChange={(e) => setTemplateForm({...templateForm,name:e.target.value})} className={input} /></label><label className="block text-xs font-black">Descripción<textarea value={templateForm.description} maxLength={500} onChange={(e) => setTemplateForm({...templateForm,description:e.target.value})} className="min-h-20 w-full rounded-xl border-2 border-black p-3" /></label><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setTemplateForm({...templateForm,type:"BALANCE",services:[]})} className={`rounded-xl border-2 border-black p-3 font-black ${templateForm.type === "BALANCE" ? "bg-[#c4b5fd]" : "bg-white"}`}>Monto</button><button type="button" onClick={() => setTemplateForm({...templateForm,type:"SERVICE",faceValue:0})} className={`rounded-xl border-2 border-black p-3 font-black ${templateForm.type === "SERVICE" ? "bg-[#ffb5e8]" : "bg-white"}`}>Servicios</button></div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-black">Precio de venta<input required type="number" min="1" value={templateForm.salePrice || ""} onChange={(e) => setTemplateForm({...templateForm,salePrice:Number(e.target.value)})} className={input} /></label>{templateForm.type === "BALANCE" && <label className="text-xs font-black">Valor entregado<input required type="number" min="1" value={templateForm.faceValue || ""} onChange={(e) => setTemplateForm({...templateForm,faceValue:Number(e.target.value)})} className={input} /></label>}</div>{templateForm.type === "SERVICE" && <div className="space-y-2"><p className="text-xs font-black">Servicios incluidos</p>{services.map((service) => { const selected = templateForm.services.find((item) => item.serviceId === service.id); return <label key={service.id} className="flex items-center gap-2 rounded-xl border-2 border-black bg-white p-2 text-xs font-bold"><input type="checkbox" checked={Boolean(selected)} onChange={(e) => setTemplateForm({...templateForm,services:e.target.checked ? [...templateForm.services,{serviceId:service.id,quantity:1}] : templateForm.services.filter((item)=>item.serviceId!==service.id)})} /><span className="flex-1">{service.name}</span>{selected && <input aria-label={`Cantidad de ${service.name}`} type="number" min="1" max="100" value={selected.quantity} onChange={(e) => setTemplateForm({...templateForm,services:templateForm.services.map((item)=>item.serviceId===service.id?{...item,quantity:Number(e.target.value)}:item)})} className="h-8 w-16 rounded border-2 border-black px-2" />}</label>; })}</div>}<div className="grid grid-cols-3 gap-2">{([['Fondo','backgroundColor'],['Acento','accentColor'],['Texto','textColor']] as const).map(([label,key]) => <label key={key} className="text-[10px] font-black">{label}<input type="color" value={templateForm[key]} onChange={(e) => setTemplateForm({...templateForm,[key]:e.target.value})} className="h-10 w-full rounded border-2 border-black" /></label>)}</div><div className="flex gap-4"><label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={templateForm.isActive} onChange={(e)=>setTemplateForm({...templateForm,isActive:e.target.checked})} /> Activa</label><label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={templateForm.isPublic} onChange={(e)=>setTemplateForm({...templateForm,isPublic:e.target.checked})} /> Pública</label></div><button disabled={busy} className="w-full rounded-xl border-3 border-black bg-[#7c3aed] py-3 font-black text-white shadow-[4px_4px_0_#000] disabled:opacity-50">{editingId ? "Guardar cambios" : "Crear Gift Card"}</button></form>
    </div>}

    {tab === "sales" && <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]"><form onSubmit={manualSale} className="h-fit space-y-3 rounded-2xl border-3 border-black bg-[#bffcc6] p-5 shadow-[6px_6px_0_#000]"><h2 className="text-xl font-black">Emitir venta manual</h2><label className="block text-xs font-black">Gift Card<select required value={sale.templateId} onChange={(e)=>setSale({...sale,templateId:e.target.value})} className={input}><option value="">Selecciona</option>{templates.filter((item)=>item.isActive).map((item)=><option key={item.id} value={item.id}>{item.name} · {formatPrice(item.salePrice,business.currencyCode)}</option>)}</select></label><label className="block text-xs font-black">Comprador<input required value={sale.buyerName} onChange={(e)=>setSale({...sale,buyerName:e.target.value})} className={input} /></label><label className="block text-xs font-black">Correo comprador<input required type="email" value={sale.buyerEmail} onChange={(e)=>setSale({...sale,buyerEmail:e.target.value})} className={input} /></label><label className="block text-xs font-black">Forma de pago<select value={sale.manualPaymentMethod} onChange={(e)=>setSale({...sale,manualPaymentMethod:e.target.value as typeof sale.manualPaymentMethod})} className={input}><option value="TRANSFER">Transferencia</option><option value="CASH">Efectivo</option><option value="OTHER">Otro</option></select></label><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={sale.deliveryMode === "GIFT"} onChange={(e)=>setSale({...sale,deliveryMode:e.target.checked?"GIFT":"SELF"})} /> Es un regalo</label>{sale.deliveryMode === "GIFT" && <><label className="block text-xs font-black">Destinatario<input required value={sale.recipientName} onChange={(e)=>setSale({...sale,recipientName:e.target.value})} className={input} /></label><label className="block text-xs font-black">Correo destinatario<input required type="email" value={sale.recipientEmail} onChange={(e)=>setSale({...sale,recipientEmail:e.target.value})} className={input} /></label><label className="block text-xs font-black">De parte de<input required value={sale.senderName} onChange={(e)=>setSale({...sale,senderName:e.target.value})} className={input} /></label><label className="block text-xs font-black">Mensaje<textarea maxLength={500} value={sale.giftMessage} onChange={(e)=>setSale({...sale,giftMessage:e.target.value})} className="min-h-20 w-full rounded-xl border-2 border-black p-3" /></label></>} {selectedTemplate && <div className="rounded-xl border-2 border-black p-4" style={{background:selectedTemplate.backgroundColor,color:selectedTemplate.textColor}}><Gift className="h-5 w-5"/><p className="mt-2 font-black">{selectedTemplate.name}</p><p className="text-sm">{formatPrice(selectedTemplate.faceValue ?? selectedTemplate.salePrice,business.currencyCode)}</p></div>}<button disabled={busy} className="w-full rounded-xl border-3 border-black bg-black py-3 font-black text-white shadow-[4px_4px_0_#7c3aed] disabled:opacity-50">Emitir Gift Card</button></form><section className="space-y-3"><h2 className="text-xl font-black">Ventas recientes</h2>{purchases.map((purchase)=><article key={purchase.id} className="rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_#000]"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex gap-2"><span className="rounded-full border border-black px-2 py-0.5 text-[10px] font-black">{purchase.paymentMethod === "MANUAL" ? "VENTA MANUAL" : "MERCADO PAGO"}</span><span className="rounded-full border border-black bg-[#fff5ba] px-2 py-0.5 text-[10px] font-black">{purchase.paymentStatus}</span></div><h3 className="mt-2 font-black">{purchase.templateNameSnapshot}</h3><p className="text-sm font-bold">{purchase.deliveryMode === "GIFT" ? purchase.recipientName : purchase.buyerName} · {formatPrice(purchase.salePrice,purchase.currencyCode)}</p><p className="text-xs text-black/55">{new Date(purchase.createdAt).toLocaleString("es-CL")}{purchase.createdBy ? ` · Creada por ${purchase.createdBy.name}` : ""}</p>{purchase.giftCard && <p className="mt-1 font-mono text-xs font-black">{purchase.giftCard.publicCode} · {purchase.giftCard.status}</p>}</div>{purchase.giftCard && <div className="flex gap-2"><button disabled={busy} onClick={()=>resend(purchase.giftCard!.id)} aria-label="Reenviar Gift Card" className="rounded-lg border-2 border-black bg-[#c4b5fd] p-2"><Mail className="h-4 w-4"/></button>{purchase.paymentMethod === "MANUAL" && purchase.giftCard.status !== "VOIDED" && <button disabled={busy} onClick={()=>voidCard(purchase.giftCard!.id)} aria-label="Anular Gift Card" className="rounded-lg border-2 border-black bg-red-100 p-2"><X className="h-4 w-4"/></button>}</div>}</div></article>)}</section></div>}
  </>;
}
