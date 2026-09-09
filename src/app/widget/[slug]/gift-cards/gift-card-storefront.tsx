"use client";

/* Tenant-hosted branding URLs are intentionally rendered without a Next.js host allowlist. */
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { GiftCardVisual } from "@/components/gift-cards/gift-card-visual";
import { formatPrice } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  description: string | null;
  type: "BALANCE" | "SERVICE";
  salePrice: number;
  faceValue: number | null;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  imageUrl: string | null;
  shortMessage: string | null;
  services: Array<{ quantity: number; service: { name: string } }>;
};

type Props = {
  slug: string;
  business: { name: string; currencyCode: string; logoUrl: string | null };
  templates: Template[];
  paymentEnabled: boolean;
};

export function GiftCardStorefront({ slug, business, templates, paymentEnabled }: Props) {
  const t = useTranslations("giftCards");
  const [selected, setSelected] = useState<Template | null>(null);
  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    deliveryMode: "SELF" as "SELF" | "GIFT",
    recipientName: "",
    recipientEmail: "",
    senderName: "",
    giftMessage: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/business/" + slug + "/gift-cards/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selected.id, ...form }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      window.location.assign(payload.paymentUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("startPaymentError"));
      setBusy(false);
    }
  }

  const input = "h-12 w-full rounded-xl border-2 border-black bg-white px-3 font-bold outline-none focus:shadow-[3px_3px_0_#7c3aed]";

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 py-8 text-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            {business.logoUrl && <img src={business.logoUrl} alt="" className="mb-3 h-14 w-14 rounded-2xl border-2 border-black object-cover" />}
            <p className="text-sm font-black uppercase tracking-wider">{business.name}</p>
            <h1 className="text-4xl font-black">{t("storeHeading")}</h1>
          </div>
          <a href={"/widget/" + slug} className="rounded-xl border-2 border-black bg-white px-4 py-2 font-black shadow-[3px_3px_0_#000]">{t("reserve")}</a>
        </div>

        {!paymentEnabled && <div className="mb-6 rounded-2xl border-3 border-black bg-[#fff5ba] p-4 font-bold">{t("onlineUnavailable")}</div>}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="rounded-3xl border-3 border-black bg-white p-4 shadow-[7px_7px_0_#000]">
              <GiftCardVisual
                compact
                businessName={business.name}
                logoUrl={business.logoUrl}
                giftCardName={template.name}
                type={template.type}
                faceValue={template.faceValue}
                services={template.services.map((item) => ({ name: item.service.name, quantity: item.quantity }))}
                shortMessage={template.shortMessage || template.description}
                background={template.backgroundColor}
                accent={template.accentColor}
                text={template.textColor}
                imageUrl={template.imageUrl}
                currencyCode={business.currencyCode}
              />
              <div className="p-5">
                {template.type === "BALANCE" ? (
                  <>
                    <p className="text-xs font-black uppercase">{t("value", { amount: formatPrice(template.faceValue || 0, business.currencyCode) })}</p>
                    {template.salePrice !== template.faceValue && <p className="text-sm font-bold text-black/55">{t("youPay", { amount: formatPrice(template.salePrice, business.currencyCode) })}</p>}
                  </>
                ) : (
                  <ul className="space-y-1 text-sm font-bold">
                    {template.services.map((item) => <li key={item.service.name}>✓ {item.service.name}{item.quantity > 1 ? " × " + item.quantity : ""}</li>)}
                  </ul>
                )}
                <button disabled={!paymentEnabled} onClick={() => setSelected(template)} className="mt-5 w-full rounded-xl border-2 border-black bg-[#ffb5e8] py-3 font-black shadow-[3px_3px_0_#000] disabled:cursor-not-allowed disabled:opacity-40">
                  {template.type === "SERVICE" ? t("gift") : t("buy")}
                </button>
              </div>
            </article>
          ))}
        </section>

        {selected && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
            <form onSubmit={checkout} className="mx-auto my-8 max-w-lg space-y-4 rounded-3xl border-4 border-black bg-[#fffaf0] p-6 shadow-[10px_10px_0_#000]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase">{t("checkoutEyebrow")}</p>
                  <h2 className="text-2xl font-black">{selected.name}</h2>
                  <p className="font-bold">{formatPrice(selected.salePrice, business.currencyCode)}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-2xl font-black" aria-label={t("close")}>×</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({ ...form, deliveryMode: "SELF" })} className={"rounded-xl border-2 border-black p-3 font-black " + (form.deliveryMode === "SELF" ? "bg-[#c4b5fd]" : "bg-white")}>{t("forMe")}</button>
                <button type="button" onClick={() => setForm({ ...form, deliveryMode: "GIFT" })} className={"rounded-xl border-2 border-black p-3 font-black " + (form.deliveryMode === "GIFT" ? "bg-[#ffb5e8]" : "bg-white")}>{t("isGift")}</button>
              </div>
              <label className="block text-xs font-black">{t("yourName")}<input required value={form.buyerName} onChange={(event) => setForm({ ...form, buyerName: event.target.value })} className={input} /></label>
              <label className="block text-xs font-black">{t("yourEmail")}<input required type="email" value={form.buyerEmail} onChange={(event) => setForm({ ...form, buyerEmail: event.target.value })} className={input} /></label>
              {form.deliveryMode === "GIFT" && (
                <>
                  <label className="block text-xs font-black">{t("recipient")}<input required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} className={input} /></label>
                  <label className="block text-xs font-black">{t("recipientEmail")}<input required type="email" value={form.recipientEmail} onChange={(event) => setForm({ ...form, recipientEmail: event.target.value })} className={input} /></label>
                  <label className="block text-xs font-black">{t("from")}<input required value={form.senderName} onChange={(event) => setForm({ ...form, senderName: event.target.value })} className={input} /></label>
                  <label className="block text-xs font-black">{t("message")}<textarea maxLength={500} value={form.giftMessage} onChange={(event) => setForm({ ...form, giftMessage: event.target.value })} className="min-h-24 w-full rounded-xl border-2 border-black bg-white p-3" /></label>
                </>
              )}
              {error && <p role="alert" className="rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
              <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-3 border-black bg-[#7c3aed] font-black text-white shadow-[4px_4px_0_#000] disabled:opacity-50">
                {busy && <Loader2 className="h-5 w-5 animate-spin" />} {t("goToMercadoPago")}
              </button>
              <p className="text-center text-xs font-bold text-black/50">{t("accountNotRequired")}</p>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
