"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle } from "@paddle/paddle-js";
import { hasWebsiteEntitlement } from "@/websites/policy";
import { regularizeWebsiteAddon, activateWebsiteAddon, cancelWebsiteAddon, reactivateWebsiteAddon } from "@/server/actions/website.actions";
import styles from "./website-builder.module.css";
export type EditorAddon = { status: string; cancelAt: string | null; validUntil: string | null } | null;
export type EditorPrice = { id: string; amount: string; currency: string } | null;
export default function BillingPanel({ addon, price, canManage }: { addon: EditorAddon; price: EditorPrice; canManage: boolean }) {
  const [message, setMessage] = useState(""), [pending, start] = useTransition(); const router = useRouter();
  const active = hasWebsiteEntitlement(addon);
  function run(operation: () => Promise<unknown>, success: string) { start(async () => { try { const result = await operation(); if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error)); setMessage(success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos completar el cambio"); } }); }
  async function checkout() {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token?.startsWith("test")) throw new Error("La activación todavía no está disponible. Contacta a Puragenda para ayudarte.");
    const result = await (addon?.status === "PAST_DUE" ? regularizeWebsiteAddon() : activateWebsiteAddon());
    if ("error" in result) throw new Error(result.error);
    const paddle = await initializePaddle({ environment: "sandbox", token });
    if (!paddle) throw new Error("No pudimos abrir el pago");
    paddle.Checkout.open({ transactionId: result.transactionId });
  }
  return <details className={styles.googleSettings}><summary>Tu suscripción de Sitio Web</summary><div><h3>{active ? "Tu Sitio Web está activo" : "Publica tu negocio con Puragenda"}</h3><p className={styles.helper}>Diseño Bella, reservas, alojamiento y tu dirección web.</p><p className={styles.helper}>{price ? `${new Intl.NumberFormat("es-CL", { style: "currency", currency: price.currency, maximumFractionDigits: price.currency === "CLP" ? 0 : 2 }).format(Number(price.amount) / (price.currency === "CLP" ? 1 : 100))} al mes, adicional a tu plan.` : "Precio comercial previsto: $9.990 al mes, adicional a tu plan."}</p>{!active ? <button className={styles.primary} disabled={pending || !canManage || (!price && addon?.status !== "PAST_DUE")} onClick={() => run(checkout, "Completa el pago para activar tu sitio.")}>{addon?.status === "PAST_DUE" ? "Regularizar mi pago" : "Activar mi sitio"}</button> : addon?.cancelAt ? <><p className={styles.helper}>Disponible hasta {new Date(addon.cancelAt).toLocaleDateString("es-CL")}. Conservaremos tu contenido.</p><button className={styles.secondary} disabled={pending || !canManage} onClick={() => run(() => reactivateWebsiteAddon(true), "Solicitamos mantener tu sitio activo.")}>Mantener mi sitio activo</button></> : <button className={styles.secondary} disabled={pending || !canManage} onClick={() => { if (window.confirm(`Cancelar solo Sitio Web en el entorno de pruebas de Paddle. Seguirá activo hasta ${addon?.validUntil ? new Date(addon.validUntil).toLocaleDateString("es-CL") : "el fin del período"}. ¿Continuar?`)) run(() => cancelWebsiteAddon(true), "La cancelación se está procesando. Conservaremos tu contenido."); }}>Cancelar al finalizar el período</button>}{message ? <p role="status" className={styles.helper}>{message}</p> : null}</div></details>;
}
