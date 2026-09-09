"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Check, Gift, Loader2, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { GiftCardVisual } from "@/components/gift-cards/gift-card-visual";
import { getWidgetContrastColor, WidgetShell } from "@/components/widget/widget-shell";
import { getLocaleForCurrency } from "@/core/countries";

type Template = {
  id: string; name: string; description: string | null; type: "BALANCE" | "SERVICE";
  salePrice: number; faceValue: number | null; backgroundColor: string; accentColor: string;
  textColor: string; imageUrl: string | null; shortMessage: string | null;
  services: Array<{ quantity: number; service: { name: string } }>;
};

type BuyerForm = {
  buyerName: string; buyerEmail: string; deliveryMode: "SELF" | "GIFT";
  recipientName: string; recipientEmail: string; senderName: string; giftMessage: string;
};

type Props = {
  slug: string;
  business: {
    name: string; currencyCode: string; logoUrl: string | null; primaryColor: string;
    secondaryColor: string; backgroundColor: string; textColor: string; textSecondary: string;
    fontSize: number; cornerRadius: number; shadowStyle: string; headerAlign: string;
  };
  templates: Template[];
  paymentEnabled: boolean;
};

const copy = {
  es: {
    eyebrow: "Reservas y regalos online", reserve: "Reservar", giftCards: "Gift Cards", stepByStep: "Paso a paso",
    heading: "Regala un momento 💕", subheading: "Elige una Gift Card y sorprende a alguien especial.",
    unavailable: "Este negocio vende Gift Cards directamente en el local.",
    unavailableHint: "Puedes revisar las opciones disponibles y contactar al negocio para comprar.",
    empty: "Este negocio todavía no tiene Gift Cards disponibles.", value: "Valor de tu Gift Card", receive: "Recibe",
    pay: "Tú pagas", extra: "extra", includes: "Incluye", buy: "Comprar", continue: "Continuar", back: "Volver",
    cardStep: "Gift Card", recipientStep: "Para quién", giftStep: "Tu regalo", paymentStep: "Pago",
    selectedTitle: "Tu Gift Card seleccionada", selectedHint: "Revisa el beneficio antes de continuar.",
    forWho: "¿Para quién es esta Gift Card?", forMe: "Para mí", isGift: "Es un regalo", yourInfo: "Tu información",
    yourName: "Nombre", yourEmail: "Email", recipient: "Destinatario", recipientName: "Nombre del destinatario",
    recipientEmail: "Email del destinatario", sender: "De parte de", senderName: "Nombre visible", message: "Mensaje opcional",
    messagePlaceholder: "Feliz cumpleaños 💕 Espero que disfrutes un momento para ti.",
    deliverySelf: "La Gift Card llegará a este correo.",
    accountNote: "Si luego se la entregas a otra persona, deberá crear o iniciar sesión en su cuenta cliente de Puragenda para agregarla y usarla.",
    detailsError: "Completa los campos requeridos con correos válidos.", previewTitle: "Así se verá tu regalo",
    to: "Para", from: "De", goToPayment: "Ir al pago", finalSummary: "Resumen de tu compra",
    finalHint: "Confirma los datos antes de continuar a Mercado Pago.", card: "Gift Card", delivery: "Entrega",
    payWithMp: "Pagar con Mercado Pago", securePayment: "Pago seguro procesado por Mercado Pago.",
    paymentError: "No pudimos iniciar el pago. Inténtalo nuevamente.", poweredBy: "Powered by",
  },
  en: {
    eyebrow: "Online bookings and gifts", reserve: "Book", giftCards: "Gift Cards", stepByStep: "Step by step",
    heading: "Give a special moment 💕", subheading: "Choose a Gift Card and surprise someone special.",
    unavailable: "This business sells Gift Cards directly at the store.",
    unavailableHint: "You can review the available options and contact the business to purchase.",
    empty: "This business does not have any Gift Cards available yet.", value: "Gift Card value", receive: "Receive",
    pay: "You pay", extra: "extra", includes: "Includes", buy: "Buy", continue: "Continue", back: "Back",
    cardStep: "Gift Card", recipientStep: "For whom", giftStep: "Your gift", paymentStep: "Payment",
    selectedTitle: "Your selected Gift Card", selectedHint: "Review the benefit before continuing.",
    forWho: "Who is this Gift Card for?", forMe: "For me", isGift: "It is a gift", yourInfo: "Your information",
    yourName: "Name", yourEmail: "Email", recipient: "Recipient", recipientName: "Recipient name",
    recipientEmail: "Recipient email", sender: "From", senderName: "Visible name", message: "Optional message",
    messagePlaceholder: "Happy birthday 💕 I hope you enjoy a moment for yourself.",
    deliverySelf: "The Gift Card will be sent to this email.",
    accountNote: "If you later give it to someone else, they must create or sign in to their Puragenda client account to add and use it.",
    detailsError: "Complete the required fields with valid email addresses.", previewTitle: "This is how your gift will look",
    to: "To", from: "From", goToPayment: "Go to payment", finalSummary: "Purchase summary",
    finalHint: "Confirm the details before continuing to Mercado Pago.", card: "Gift Card", delivery: "Delivery",
    payWithMp: "Pay with Mercado Pago", securePayment: "Secure payment processed by Mercado Pago.",
    paymentError: "We could not start the payment. Please try again.", poweredBy: "Powered by",
  },
} as const;

export function formatGiftCardCurrency(amount: number, currencyCode: string, locale: string): string {
  const currencyLocale = getLocaleForCurrency(currencyCode);
  const regionalLocale = locale.includes("-") ? locale : currencyLocale;
  return new Intl.NumberFormat(regionalLocale, { style: "currency", currency: currencyCode, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(amount);
}

export function giftCardGridClass(templateCount: number): string {
  return templateCount === 1 ? "mx-auto grid w-full max-w-xl gap-5" : "grid gap-5 sm:grid-cols-2";
}

function isValidEmail(value: string) { return /^\S+@\S+\.\S+$/.test(value.trim()); }

export function GiftCardStorefront({ slug, business, templates, paymentEnabled }: Props) {
  const locale = useLocale();
  const text = locale.toLowerCase().startsWith("es") ? copy.es : copy.en;
  const [selected, setSelected] = useState<Template | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BuyerForm>({ buyerName: "", buyerEmail: "", deliveryMode: "SELF", recipientName: "", recipientEmail: "", senderName: "", giftMessage: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = (amount: number) => formatGiftCardCurrency(amount, business.currencyCode, locale);
  const primaryText = getWidgetContrastColor(business.primaryColor);
  const inputClass = "mt-1.5 h-12 w-full rounded-xl border bg-transparent px-3 text-sm font-semibold outline-none transition focus:ring-2";

  function chooseTemplate(template: Template) { setSelected(template); setStep(1); setError(""); }
  function validateDetails() {
    const buyerValid = Boolean(form.buyerName.trim()) && isValidEmail(form.buyerEmail);
    const recipientValid = form.deliveryMode === "SELF" || (Boolean(form.recipientName.trim()) && isValidEmail(form.recipientEmail) && Boolean(form.senderName.trim()));
    if (!buyerValid || !recipientValid) { setError(text.detailsError); return; }
    setError(""); setStep(3);
  }

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!selected || !paymentEnabled) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/business/${slug}/gift-cards/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: selected.id, ...form }) });
      const payload = await response.json();
      if (!response.ok || !payload.paymentUrl) throw new Error(payload.error || text.paymentError);
      window.location.assign(payload.paymentUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text.paymentError); setBusy(false);
    }
  }

  function renderVisual(template: Template, compact = false) {
    return <GiftCardVisual compact={compact} businessName={business.name} logoUrl={business.logoUrl} giftCardName={template.name} type={template.type} faceValue={template.faceValue} services={template.services.map((item) => ({ name: item.service.name, quantity: item.quantity }))} shortMessage={template.shortMessage || template.description} background={template.backgroundColor} accent={template.accentColor} text={template.textColor} imageUrl={template.imageUrl} currencyCode={business.currencyCode} formatAmount={currency} />;
  }

  function renderCommercialDetails(template: Template) {
    const bonus = template.faceValue && template.faceValue > template.salePrice ? template.faceValue - template.salePrice : 0;
    if (template.type === "SERVICE") return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: business.textSecondary }}>{text.includes}</p><ul className="space-y-1.5 text-sm font-semibold">{template.services.map((item, index) => <li key={`${item.service.name}-${index}`} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: business.primaryColor }} aria-hidden="true" /><span>{item.service.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span></li>)}</ul><div className="flex items-end justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--wborder)" }}><span className="text-sm" style={{ color: business.textSecondary }}>{text.pay}</span><strong className="text-xl">{currency(template.salePrice)}</strong></div></div>;
    return <div className="space-y-3"><div className="flex items-end justify-between gap-3"><span className="text-sm" style={{ color: business.textSecondary }}>{text.receive}</span><strong className="text-xl">{currency(template.faceValue || 0)}</strong></div><div className="flex items-end justify-between gap-3"><span className="text-sm" style={{ color: business.textSecondary }}>{text.pay}</span><strong className="text-xl">{currency(template.salePrice)}</strong></div>{bonus > 0 && <p className="rounded-lg px-3 py-2 text-center text-sm font-bold" style={{ background: `${business.primaryColor}18`, color: business.primaryColor }}>+ {currency(bonus)} {text.extra}</p>}</div>;
  }

  const recipientName = form.deliveryMode === "GIFT" ? form.recipientName : form.buyerName;
  const recipientEmail = form.deliveryMode === "GIFT" ? form.recipientEmail : form.buyerEmail;
  const backButton = (target: number) => <button type="button" onClick={() => setStep(target)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold" style={{ borderColor: "var(--wborder)" }}><ArrowLeft className="h-4 w-4" aria-hidden="true" />{text.back}</button>;
  const primaryButton = (label: string, onClick: () => void) => <button type="button" onClick={onClick} className="min-h-12 rounded-xl px-5 py-3 font-bold transition hover:opacity-90 active:scale-[0.98]" style={{ background: business.primaryColor, color: primaryText }}>{label}</button>;

  return (
    <WidgetShell business={{ name: business.name, slug, logoUrl: business.logoUrl }} primaryColor={business.primaryColor} secondaryColor={business.secondaryColor} backgroundColor={business.backgroundColor} textColor={business.textColor} textSecondary={business.textSecondary} fontSize={business.fontSize} cornerRadius={business.cornerRadius} shadowStyle={business.shadowStyle} headerAlign={business.headerAlign} eyebrow={text.eyebrow} stepBadge={text.stepByStep} activeMode="gift-cards" showModeTabs={templates.length > 0} reserveLabel={text.reserve} giftCardsLabel={text.giftCards} progressLabels={step > 0 ? [text.cardStep, text.recipientStep, text.giftStep, text.paymentStep] : undefined} progressIndex={Math.max(0, step - 1)} poweredByLabel={text.poweredBy}>
      <form onSubmit={checkout} className="p-5 sm:p-6">
        {step === 0 && <div className="animate-fade-up space-y-6">
          <div><h2 className="text-2xl font-bold tracking-tight">{text.heading}</h2><p className="mt-1 text-sm" style={{ color: business.textSecondary }}>{text.subheading}</p></div>
          {!paymentEnabled && templates.length > 0 && <div className="rounded-2xl border p-4" style={{ borderColor: `${business.primaryColor}45`, background: `${business.primaryColor}10` }}><p className="font-semibold">{text.unavailable}</p><p className="mt-1 text-xs" style={{ color: business.textSecondary }}>{text.unavailableHint}</p></div>}
          {templates.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: "var(--wborder)", color: business.textSecondary }}><Gift className="mx-auto mb-3 h-8 w-8" aria-hidden="true" /><p className="font-semibold">{text.empty}</p></div> :
            <section aria-label={text.heading} className={giftCardGridClass(templates.length)}>{templates.map((template) => <article key={template.id} className="flex flex-col rounded-2xl border p-3.5" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>{renderVisual(template, true)}<div className="flex flex-1 flex-col px-1 pb-1 pt-4"><h3 className="text-lg font-bold">{template.name}</h3>{template.description && <p className="mb-4 mt-1 line-clamp-2 text-sm" style={{ color: business.textSecondary }}>{template.description}</p>}<div className="mt-auto">{renderCommercialDetails(template)}</div>{paymentEnabled && <button type="button" onClick={() => chooseTemplate(template)} className="mt-4 min-h-12 w-full rounded-xl px-4 py-3 text-sm font-bold transition hover:opacity-90 active:scale-[0.98]" style={{ background: business.primaryColor, color: primaryText }}>{text.buy}</button>}</div></article>)}</section>}
        </div>}

        {step === 1 && selected && <div className="animate-fade-up space-y-5"><div><h2 className="text-xl font-bold">{text.selectedTitle}</h2><p className="text-sm" style={{ color: business.textSecondary }}>{text.selectedHint}</p></div><div className="mx-auto max-w-xl">{renderVisual(selected)}</div><div className="rounded-2xl border p-4" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}><h3 className="mb-3 font-bold">{selected.name}</h3>{renderCommercialDetails(selected)}</div><div className="grid gap-3 sm:grid-cols-[auto_1fr]">{backButton(0)}{primaryButton(text.continue, () => setStep(2))}</div></div>}

        {step === 2 && selected && <div className="animate-fade-up space-y-5">
          <h2 className="text-xl font-bold">{text.forWho}</h2>
          <div className="grid grid-cols-2 gap-2 rounded-xl border p-1" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>{(["SELF", "GIFT"] as const).map((mode) => { const active = form.deliveryMode === mode; return <button key={mode} type="button" aria-pressed={active} onClick={() => { setForm({ ...form, deliveryMode: mode }); setError(""); }} className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold" style={active ? { background: business.primaryColor, color: primaryText } : { color: business.textSecondary }}>{mode === "SELF" ? text.forMe : text.isGift}</button>; })}</div>
          <fieldset className="space-y-4"><legend className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: business.textSecondary }}>{text.yourInfo}</legend><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">{text.yourName}<input required value={form.buyerName} onChange={(event) => setForm({ ...form, buyerName: event.target.value })} className={inputClass} style={{ borderColor: "var(--wborder)" }} autoComplete="name" /></label><label className="text-sm font-semibold">{text.yourEmail}<input required type="email" value={form.buyerEmail} onChange={(event) => setForm({ ...form, buyerEmail: event.target.value })} className={inputClass} style={{ borderColor: "var(--wborder)" }} autoComplete="email" /></label></div></fieldset>
          {form.deliveryMode === "SELF" ? <div className="space-y-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}><p className="font-semibold">{text.deliverySelf}</p><p className="text-xs leading-relaxed" style={{ color: business.textSecondary }}>{text.accountNote}</p></div> : <div className="space-y-5"><fieldset className="space-y-4"><legend className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: business.textSecondary }}>{text.recipient}</legend><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">{text.recipientName}<input required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} className={inputClass} style={{ borderColor: "var(--wborder)" }} /></label><label className="text-sm font-semibold">{text.recipientEmail}<input required type="email" value={form.recipientEmail} onChange={(event) => setForm({ ...form, recipientEmail: event.target.value })} className={inputClass} style={{ borderColor: "var(--wborder)" }} /></label></div></fieldset><label className="block text-sm font-semibold">{text.sender}<input required value={form.senderName} onChange={(event) => setForm({ ...form, senderName: event.target.value })} placeholder={text.senderName} className={inputClass} style={{ borderColor: "var(--wborder)" }} /></label><label className="block text-sm font-semibold">{text.message}<textarea maxLength={500} value={form.giftMessage} onChange={(event) => setForm({ ...form, giftMessage: event.target.value })} placeholder={text.messagePlaceholder} className="mt-1.5 min-h-28 w-full resize-y rounded-xl border bg-transparent p-3 text-sm outline-none transition focus:ring-2" style={{ borderColor: "var(--wborder)" }} /></label></div>}
          {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">{backButton(1)}{primaryButton(text.continue, validateDetails)}</div>
        </div>}

        {step === 3 && selected && <div className="animate-fade-up space-y-5"><h2 className="text-xl font-bold">{text.previewTitle}</h2><div className="mx-auto max-w-xl">{renderVisual(selected)}</div><div className="rounded-2xl border p-5" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}><p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: business.textSecondary }}>{text.to}</p><p className="mt-1 text-xl font-bold">{recipientName}</p>{form.deliveryMode === "GIFT" && form.giftMessage && <p className="my-5 whitespace-pre-wrap text-base italic leading-relaxed">“{form.giftMessage}”</p>}{form.deliveryMode === "GIFT" && <p className="mt-4 text-sm"><span style={{ color: business.textSecondary }}>{text.from}: </span><strong>{form.senderName}</strong></p>}<div className="mt-5 flex items-end justify-between border-t pt-4" style={{ borderColor: "var(--wborder)" }}><span style={{ color: business.textSecondary }}>{text.pay}</span><strong className="text-2xl">{currency(selected.salePrice)}</strong></div></div><div className="grid gap-3 sm:grid-cols-[auto_1fr]">{backButton(2)}{primaryButton(text.goToPayment, () => setStep(4))}</div></div>}

        {step === 4 && selected && <div className="animate-fade-up space-y-5"><div><h2 className="text-xl font-bold">{text.finalSummary}</h2><p className="text-sm" style={{ color: business.textSecondary }}>{text.finalHint}</p></div><div className="rounded-2xl border p-5" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt style={{ color: business.textSecondary }}>{text.card}</dt><dd className="text-right font-semibold">{selected.name}</dd></div>{selected.type === "BALANCE" && <div className="flex justify-between gap-4"><dt style={{ color: business.textSecondary }}>{text.value}</dt><dd className="font-semibold">{currency(selected.faceValue || 0)}</dd></div>}<div className="flex justify-between gap-4"><dt style={{ color: business.textSecondary }}>{text.pay}</dt><dd className="text-xl font-bold">{currency(selected.salePrice)}</dd></div><div className="flex justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--wborder)" }}><dt style={{ color: business.textSecondary }}>{text.delivery}</dt><dd className="max-w-[65%] break-words text-right font-semibold">{recipientName} · {recipientEmail}</dd></div></dl></div>{error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-500">{error}</p>}<div className="grid gap-3 sm:grid-cols-[auto_1fr]">{backButton(3)}<button disabled={busy} className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold disabled:opacity-50" style={{ background: business.primaryColor, color: primaryText }}>{busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}{text.payWithMp}</button></div><p className="flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: business.textSecondary }}><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{text.securePayment}</p></div>}
      </form>
    </WidgetShell>
  );
}
