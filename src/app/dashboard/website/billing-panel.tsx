"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle } from "@paddle/paddle-js";
import { hasWebsiteEntitlement } from "@/websites/policy";
import { regularizeWebsiteAddon, activateWebsiteAddon, activateWebsiteTrial, cancelWebsiteAddon, reactivateWebsiteAddon } from "@/server/actions/website.actions";
import { formatWebsitePrice, websiteTrialDaysRemaining, type WebsiteOffer } from "@/websites/offers";
import styles from "./website-builder.module.css";
import { track } from "@/lib/analytics/client";
export type EditorAddon = { status: string; cancelAt: string | null; validUntil: string | null } | null;
export type EditorPrice = { id: string; amount: string; currency: string } | null;
export default function BillingPanel({ addon, offer, price, canManage }: { addon: EditorAddon; offer?: WebsiteOffer | null; price: EditorPrice; canManage: boolean }) {
  const [message, setMessage] = useState(""), [pending, start] = useTransition(); const [now] = useState(() => new Date()); const router = useRouter();
  const active = hasWebsiteEntitlement(addon, new Date(), offer);
  function run(operation: () => Promise<unknown>, success: string) { start(async () => { try { const result = await operation(); if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error)); setMessage(success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos completar el cambio"); } }); }
  async function checkout() {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token?.startsWith("test")) throw new Error("La activación todavía no está disponible. Contacta a Puragenda para ayudarte.");
    const result = await (addon?.status === "PAST_DUE" ? regularizeWebsiteAddon() : activateWebsiteAddon());
    if ("error" in result) throw new Error(result.error);
    const paddle = await initializePaddle({ environment: "sandbox", token });
    if (!paddle) throw new Error("No pudimos abrir el pago");
    track(founder ? "website_beta_checkout_started" : "website_standard_checkout_started");
    paddle.Checkout.open({ transactionId: result.transactionId });
  }
  const founder = offer?.offerCode === "BETA_FOUNDER";
  const trialAvailable = founder && !offer?.trialConsumedAt;
  const trialing = founder && offer?.trialStartedAt && offer?.trialEndsAt && new Date(offer.trialEndsAt).getTime() > now.getTime() && !active;
  const trialDays = websiteTrialDaysRemaining(offer, now);
  useEffect(() => { if (founder) track("website_beta_offer_seen"); }, [founder]);
  return <details className={styles.googleSettings}><summary>Tu suscripción de Sitio Web</summary><div><h3>{active ? "Tu Sitio Web está activo" : founder ? "Tu página web, gratis por 15 días" : "Publica tu negocio con Puragenda"}</h3><p className={styles.helper}>{founder ? trialing ? `Prueba gratuita · ${trialDays} días restantes.` : offer?.trialConsumedAt ? "Tu prueba terminó. Todo lo que creaste sigue guardado." : "Por ser cliente de Puragenda antes del lanzamiento puedes probar Sitio Web sin costo." : "Diseño Bella, reservas, alojamiento y tu dirección web."}</p><p className={styles.helper}>{founder ? `Precio especial: ${formatWebsitePrice("BETA_FOUNDER")} / mes` : price ? `${new Intl.NumberFormat("es-CL", { style: "currency", currency: price.currency, maximumFractionDigits: price.currency === "CLP" ? 0 : 2 }).format(Number(price.amount))} al mes.` : `Sitio Web Puragenda · ${formatWebsitePrice("STANDARD")} / mes`}</p>{trialAvailable ? <button className={styles.primary} disabled={pending || !canManage} onClick={() => run(async () => { const result = await activateWebsiteTrial(); if ("error" in result) throw new Error(result.error); router.refresh(); }, "Tu prueba de 15 días comenzó.")}>Probar mi sitio</button> : trialing ? <p className={styles.helper}>Prueba gratuita en curso. Configura y publica tu sitio.</p> : !active ? <button className={styles.primary} disabled={pending || !canManage || (!price && addon?.status !== "PAST_DUE")} onClick={() => run(checkout, "Completa el pago para activar tu sitio.")}>{addon?.status === "PAST_DUE" ? "Regularizar mi pago" : founder ? `Mantener mi sitio por ${formatWebsitePrice("BETA_FOUNDER")}/mes` : "Activar Sitio Web"}</button> : addon?.cancelAt ? <><p className={styles.helper}>Disponible hasta {new Date(addon.cancelAt).toLocaleDateString("es-CL")}. Conservaremos tu contenido.</p><button className={styles.secondary} disabled={pending || !canManage} onClick={() => run(() => reactivateWebsiteAddon(true), "Solicitamos mantener tu sitio activo.")}>Mantener mi sitio activo</button></> : <button className={styles.secondary} disabled={pending || !canManage} onClick={() => { if (window.confirm(`Cancelar solo Sitio Web en el entorno de pruebas de Paddle. Seguirá activo hasta ${addon?.validUntil ? new Date(addon.validUntil).toLocaleDateString("es-CL") : "el fin del período"}. ¿Continuar?`)) run(() => cancelWebsiteAddon(true), "La cancelación se está procesando. Conservaremos tu contenido."); }}>Cancelar al finalizar el período</button>}{message ? <p role="status" className={styles.helper}>{message}</p> : null}</div></details>;
}
