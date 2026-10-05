"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { websiteLaunchMessage, type WebsiteLaunchContext } from "@/websites/launch";
import type { WebsiteTrialReminderContext } from "@/websites/trial-reminder";
import { activateWebsiteTrial } from "@/server/actions/website.actions";
import { track } from "@/lib/analytics/client";
import styles from "./website-launch.module.css";
export function WebsiteLaunchPopup({ context, reminder, onDismiss, onNavigate }: {
  context: WebsiteLaunchContext;
  reminder?: WebsiteTrialReminderContext | null;
  onDismiss: () => void | Promise<void>;
  onNavigate: () => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const seen = useRef(false);
  const inFlight = useRef(false);
  const closed = useRef(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const message = websiteLaunchMessage(context.offer, context.addon);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (element && !element.open) element.showModal();
    if (!seen.current) { seen.current = true; track(reminder ? "website_trial_reminder_seen" : "website_launch_modal_seen"); }
    return () => { element?.close(); previous?.focus(); };
  }, [reminder]);
  function dismiss() {
    if (closed.current) return;
    closed.current = true;
    dialog.current?.close();
    track(reminder ? "website_trial_reminder_dismissed" : "website_launch_modal_dismissed");
    void onDismiss();
  }
  function activate() {
    if (inFlight.current || closed.current) return;
    inFlight.current = true;
    start(async () => {
      setError("");
      try {
        if (message.showFounderOffer) {
          if (reminder) track("website_trial_reminder_cta_clicked");
          const result = await activateWebsiteTrial();
          if ("error" in result) { if (!closed.current) setError(result.error); return; }
          track("website_trial_started");
        }
        if (!closed.current) await onNavigate();
      } catch {
        if (!closed.current) setError("No pudimos preparar tu web. Inténtalo de nuevo.");
      } finally {
        inFlight.current = false;
      }
    });
  }
  return <dialog ref={dialog} className={`${styles.dialog}${reminder ? ` ${styles.reminder}` : ""}`} aria-labelledby="website-launch-title" aria-describedby="website-launch-description" onKeyDown={event => {
    if (event.key !== "Tab") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  }} onCancel={event => { event.preventDefault(); dismiss(); }}>
    <button className={styles.close} aria-label="Cerrar anuncio de Sitio Web" onClick={dismiss}>×</button>
    <p className={styles.sticker}>{reminder ? "TU WEB TE ESTÁ ESPERANDO" : "NUEVO EN PURAGENDA"}</p>
    <h2 id="website-launch-title">{reminder ? "Tu web está lista. Pruébala 15 días gratis." : message.showFounderOffer ? "Llegaste antes. Este precio es tuyo." : "Una web que trabaja para que tu negocio gane más."}</h2>
    <p id="website-launch-description" className={styles.description}>{reminder ? `La web de ${reminder.businessName} ya viene con tus servicios y reservas conectados. Revisa tus fotos, textos y colores, y compártela esta semana.` : message.showFounderOffer ? "Gracias por confiar en Puragenda antes de este lanzamiento. Te dejamos una web preconfigurada para tu negocio y este beneficio reservado para ti." : "Te dejamos una web preconfigurada para tu negocio, con tus servicios y reservas conectados para que tus clientes puedan encontrarte y reservar."}</p>
    {!reminder ? <figure className={styles.preview}>
      <Image src="/websites/previews/bella.svg" width={560} height={350} alt="Vista previa de la web recomendada para tu negocio" />
      <figcaption>Tu web recomendada · lista para revisar y publicar</figcaption>
    </figure> : null}
    {message.showFounderOffer ? <div className={styles.offer}><strong>15 DÍAS GRATIS</strong><span>Después, si decides quedártela:</span><b>$5.990 / mes</b><strong>PARA SIEMPRE</strong>{!reminder ? <small>Nuevos negocios: $9.990 / mes</small> : null}</div> : !message.paid && message.trial !== "TRIALING" ? <div className={styles.offer}><b>{message.price}</b>{message.trial === "EXPIRED" ? <span>Tu web sigue aquí. Guardamos todo lo que creaste.</span> : null}</div> : null}
    <div className={styles.benefits}>
      <strong>{reminder ? "Lista para compartir con tus clientes" : "¿Qué ganas con tenerla?"}</strong>
      <span>{reminder ? "Tu propia dirección para Instagram y WhatsApp." : "Más confianza antes del primer contacto."}</span>
      <span>{reminder ? "Tus servicios y profesionales ya conectados." : "Un enlace profesional para compartir en todas partes."}</span>
      <span>{reminder ? "Reservas que llegan directo a tu agenda." : "Reservas conectadas a tu agenda, sin trabajo extra."}</span>
    </div>
    {reminder ? <p className={styles.helper}>La prueba comienza cuando la activas. Sin tarjeta y sin cobro automático.</p> : null}
    <button className={styles.primary} disabled={pending || !context.canManage} onClick={activate}>{pending ? "Preparando tu web…" : reminder ? "ACTIVAR MIS 15 DÍAS GRATIS" : message.cta}</button>
    <button className={styles.later} onClick={dismiss}>{reminder ? "Lo revisaré después" : "Ahora no"}</button>
    {error ? <p role="alert">{error}</p> : null}
  </dialog>;
}
