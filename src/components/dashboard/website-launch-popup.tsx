"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { websiteLaunchMessage, type WebsiteLaunchContext } from "@/websites/launch";
import { activateWebsiteTrial } from "@/server/actions/website.actions";
import { track } from "@/lib/analytics/client";
import styles from "./website-launch.module.css";
export function WebsiteLaunchPopup({ context, onDismiss, onNavigate }: { context: WebsiteLaunchContext; onDismiss: () => void; onNavigate: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const seen = useRef(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const message = websiteLaunchMessage(context.offer, context.addon);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (element && !element.open) element.showModal();
    if (!seen.current) { seen.current = true; track("website_launch_modal_seen"); }
    return () => { element?.close(); previous?.focus(); };
  }, []);
  function dismiss() { track("website_launch_modal_dismissed"); onDismiss(); }
  function activate() {
    start(async () => {
      if (message.showFounderOffer) {
        const result = await activateWebsiteTrial();
        if ("error" in result) { setError(result.error); return; }
      }
      onNavigate();
    });
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="website-launch-title" aria-describedby="website-launch-description" onKeyDown={event => {
    if (event.key !== "Tab") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  }} onCancel={event => { event.preventDefault(); dismiss(); }}>
    <button className={styles.close} aria-label="Cerrar anuncio de Sitio Web" onClick={dismiss}>×</button>
    <p className={styles.sticker}>NUEVO EN PURAGENDA</p>
    <h2 id="website-launch-title">{message.showFounderOffer ? "Llegaste antes. Este precio es tuyo." : "Tu negocio ahora puede tener su propia página web."}</h2>
    <p id="website-launch-description">{message.showFounderOffer ? "Gracias por confiar en Puragenda antes de este lanzamiento. Este beneficio queda reservado para tu negocio." : "Tu web, tus servicios y tus reservas, todo conectado a Puragenda."}</p>
    <div className={styles.previews}>{["bella", "matchday", "ritual"].map(key => <figure key={key}><Image src={`/websites/previews/${key}.svg`} width={220} height={140} alt={`Vista del diseño ${key}`} /><figcaption>{key.toUpperCase()}</figcaption></figure>)}</div>
    {message.showFounderOffer ? <div className={styles.offer}><strong>15 DÍAS GRATIS</strong><span>Después, si decides quedártela:</span><b>$5.990 / mes</b><strong>PARA SIEMPRE</strong><small>Nuevos negocios: $9.990 / mes</small></div> : !message.paid && message.trial !== "TRIALING" ? <div className={styles.offer}><b>{message.price}</b>{message.trial === "EXPIRED" ? <span>Tu web sigue aquí. Guardamos todo lo que creaste.</span> : null}</div> : null}
    <p>Elige Bella, Matchday o Ritual. Personaliza colores, fotos y textos, y recibe reservas desde tu propia web.</p>
    <button className={styles.primary} disabled={pending || !context.canManage} onClick={activate}>{pending ? "Preparando tu web…" : message.cta}</button>
    <button className={styles.later} disabled={pending} onClick={dismiss}>Ahora no</button>
    {error ? <p role="alert">{error}</p> : null}
  </dialog>;
}
