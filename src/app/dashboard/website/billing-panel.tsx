"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle } from "@paddle/paddle-js";
import { hasWebsitePaidAccess } from "@/websites/policy";
import { regularizeWebsiteAddon, activateWebsiteAddon, activateWebsiteTrial, cancelWebsiteAddon, reactivateWebsiteAddon } from "@/server/actions/website.actions";
import { formatWebsitePrice, websitePriceTier, websiteTrialState, websiteTrialDaysRemaining, type WebsiteOffer } from "@/websites/offers";
import styles from "./website-builder.module.css";
import { track } from "@/lib/analytics/client";
export type EditorAddon = { status: string; cancelAt: string | null; validUntil: string | null; provider?: string; agreementStatus?: string | null } | null;
export type EditorPrice = { id: string; amount: string; currency: string; provider?: string; enabled?: boolean } | null;
export default function BillingPanel({ addon, offer, price, canManage }: { addon: EditorAddon; offer?: WebsiteOffer | null; price: EditorPrice; canManage: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const router = useRouter();
  const founder = websitePriceTier(offer) === "BETA_FOUNDER";
  const paid = hasWebsitePaidAccess(addon, now);
  const trial = websiteTrialState(offer, now);
  const trialDays = websiteTrialDaysRemaining(offer, now);
  const agreementPending = ["pending", "authorized"].includes(addon?.agreementStatus || "") && !paid;
  const allowed = canManage && price?.enabled !== false;
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (founder) track("website_beta_offer_seen"); }, [founder]);
  function run(operation: () => Promise<unknown>, success: string) {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      try { const result = await operation(); if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error)); setMessage(success); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos completar el cambio"); }
      finally { busy.current = false; }
    });
  }
  async function checkout() {
    if (paid && addon?.cancelAt && addon.provider === "paddle") {
      const restored = await reactivateWebsiteAddon(true);
      if (restored && "error" in restored) throw new Error(restored.error);
      return;
    }
    const result = await (addon?.status === "PAST_DUE" ? regularizeWebsiteAddon() : activateWebsiteAddon());
    if ("error" in result) throw new Error(result.error);
    if ("checkoutUrl" in result) { window.location.assign(result.checkoutUrl); return; }
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token?.startsWith("test")) throw new Error("La activación todavía no está disponible. Contacta a Puragenda para ayudarte.");
    const paddle = await initializePaddle({ environment: "sandbox", token });
    if (!paddle) throw new Error("No pudimos abrir el pago");
    paddle.Checkout.open({ transactionId: result.transactionId });
  }
  const title = paid ? "TU SITIO WEB ESTÁ ACTIVO" : trial === "TRIALING" ? "TU WEB ESTÁ EN PRUEBA" : trial === "EXPIRED" ? "TU WEB SIGUE AQUÍ" : founder ? "TU BENEFICIO FUNDADOR" : "CREA LA WEB DE TU NEGOCIO";
  const firstCharge = trial === "TRIALING" && offer?.trialEndsAt ? new Date(offer.trialEndsAt).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "Desde la activación";
  return <details id="website-billing" className={styles.googleSettings} open={!paid}><summary>Tu suscripción de Sitio Web</summary><div>
    <h3>{title}</h3>
    <p className={styles.helper}>{trial === "TRIALING" && !paid ? `Te quedan ${trialDays} días. Tu precio fundador está asegurado.` : trial === "EXPIRED" && !paid ? "Guardamos todo lo que creaste. Activa cuando quieras; no se reinicia la prueba." : founder ? "Llegaste antes. Este precio queda reservado para tu negocio." : "Bella, Matchday y Ritual. Tus servicios, profesionales y reservas conectados."}</p>
    {trial === "AVAILABLE" && !paid ? <p><strong>15 DÍAS GRATIS</strong></p> : null}
    <p><strong>{formatWebsitePrice(websitePriceTier(offer))} / mes{founder ? " PARA SIEMPRE" : ""}</strong></p>
    {!paid && trial !== "AVAILABLE" ? <p className={styles.helper}>Primer cobro: {firstCharge}. {trial === "TRIALING" ? "Conservarás los días gratuitos que te quedan. " : ""}Cobro mensual. Puedes cancelar Sitio Web sin cancelar tu plan Puragenda.</p> : null}
    {agreementPending ? <p role="status" className={styles.helper}>Estamos esperando la confirmación de Mercado Pago. {trial === "TRIALING" ? "Tu prueba continúa." : "Tu sitio se activará cuando el pago esté confirmado."}</p> : null}
    {trial === "AVAILABLE" && !paid ? <button className={styles.primary} disabled={pending || !allowed} onClick={() => run(activateWebsiteTrial, "Tu prueba de 15 días comenzó.")}>PROBAR MI WEB GRATIS</button> : null}
    {!paid && trial !== "AVAILABLE" ? <button className={styles.primary} disabled={pending || !allowed || !price} onClick={() => run(checkout, "Completa el pago para activar tu sitio.")}>{addon?.status === "PAST_DUE" ? "REGULARIZAR MI PAGO" : trial === "TRIALING" ? "QUEDARME CON MI WEB" : founder ? "ACTIVAR MI WEB" : "ACTIVAR SITIO WEB"}</button> : null}
    {paid && addon?.cancelAt ? <><p className={styles.helper}>Tu sitio seguirá activo hasta {new Date(addon.cancelAt).toLocaleDateString("es-CL")}. Tu contenido seguirá guardado.</p><button className={styles.secondary} disabled={pending || !allowed} onClick={() => run(checkout, "Completa el acuerdo para mantener tu sitio.")}>MANTENER MI WEB</button></> : null}
    {addon && !addon.cancelAt && (paid || agreementPending || addon.status === "PAST_DUE") ? <button className={styles.secondary} disabled={pending || !canManage} onClick={() => { if (window.confirm(`Cancelar solo Sitio Web. Se detendrán los próximos cobros y conservarás el período pagado${addon.validUntil ? ` hasta ${new Date(addon.validUntil).toLocaleDateString("es-CL")}` : ""}. ¿Continuar?`)) run(() => cancelWebsiteAddon(true), "Cancelación confirmada. Conservaremos tu contenido."); }}>{paid ? "CANCELAR SITIO WEB" : "CANCELAR SOLICITUD DE PAGO"}</button> : null}
    {!allowed ? <p className={styles.helper}>Las nuevas activaciones están temporalmente pausadas.</p> : null}
    {message ? <p role="status" className={styles.helper}>{message}</p> : null}
  </div></details>;
}
