"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { WebsiteLaunchPreview } from "./website-launch-preview";
import { websiteDiscoveryProgress, websiteDiscoveryStory, websiteLaunchMessage, type WebsiteLaunchContext } from "@/websites/launch";
import type { WebsiteTrialReminderContext } from "@/websites/trial-reminder";
import { activateWebsiteTrial } from "@/server/actions/website.actions";
import { track } from "@/lib/analytics/client";
import styles from "./website-launch.module.css";
export function WebsiteLaunchPopup({ context, reminder, onDismiss, onNavigate, previewSrc }: {
  context: WebsiteLaunchContext;
  reminder?: WebsiteTrialReminderContext | null;
  onDismiss: () => void | Promise<void>;
  onNavigate: () => void | Promise<void>;
  previewSrc?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const seen = useRef(false);
  const inFlight = useRef(false);
  const closed = useRef(false);
  const exploreHeading = useRef<HTMLHeadingElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [experience, setExperience] = useState<"intro" | "website" | "booking">("intro");
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const message = websiteLaunchMessage(context.offer, context.addon);
  const businessName = context.preview?.businessName ?? reminder?.businessName ?? "tu negocio";
  const story = websiteDiscoveryStory(context.preview);
  const previewUrl = previewSrc ?? "/website-preview";
  const bookingUrl = `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}experience=booking`;
  function explore(mode: "website" | "booking") {
    setExperience(mode);
    track("changelog_launch_cta_clicked", { feature: mode === "booking" ? "website_booking_demo" : "website_preview" });
  }
  useEffect(() => { if (experience !== "intro") exploreHeading.current?.focus({ preventScroll: true }); }, [experience]);
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
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="website-launch-title" aria-describedby="website-launch-description" onKeyDown={event => {
    if (event.key !== "Tab" || experience !== "intro") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]"));
    if (!controls.length) return;
    event.preventDefault();
    const current = controls.indexOf(document.activeElement as HTMLElement);
    controls[(current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
  }} onCancel={event => { event.preventDefault(); dismiss(); }}>
    <button className={styles.close} aria-label="Cerrar anuncio de Sitio Web" onClick={dismiss}>×</button>
    {experience === "intro" ? <div className={styles.body}>
      <div className={styles.topline}><p className={styles.sticker}>{context.preview?.ready ? "PREPARAMOS ALGO PARA TI" : "TU PRÓXIMA WEB EMPIEZA AQUÍ"}</p><span className={styles.brand}>SITIO WEB · PURAGENDA</span></div>
      <div className={styles.impactGrid}>
        <div className={styles.story}>
          <p className={styles.businessName}>{businessName}{context.preview?.ready ? ", mira lo que preparamos para ti." : ", dale vida a tu web."}</p>
          <h2 id="website-launch-title">{message.paid || message.trial === "TRIALING" ? "Tu web. Tu estilo. Tus próximas reservas." : story.headline}</h2>
          <p id="website-launch-description" className={styles.description}>{story.description}</p>
          <ul className={styles.readyList} aria-label="Lo que tienes preparado">{websiteDiscoveryProgress(context.preview).map(item => <li key={item.label} data-complete={item.complete}><span aria-hidden="true">{item.complete ? "✓" : "○"}</span>{item.label}</li>)}</ul>
          <p className={styles.valueNote}>Un enlace para tu Instagram y WhatsApp.<br />Reservas que llegan a tu misma agenda.</p>
        </div>
        <div className={styles.visual}>
          <div className={styles.previewReveal}><WebsiteLaunchPreview preview={context.preview} src={previewSrc} /><button className={styles.reveal} onClick={() => explore("website")}><span>Así te verán tus clientes ↗</span></button></div>
          <p className={styles.previewNote}>{message.showFounderOffer ? "Recorre tu web. Tus 15 días aún no empiezan." : "Vista privada. Tú decides cuándo publicarla."}</p>
        </div>
      </div>
      {!message.showFounderOffer ? <div className={styles.offer}><strong>{message.paid || message.trial === "TRIALING" ? "Hazla tuya." : "Tu web te espera."}</strong><p>{message.trial === "EXPIRED" ? "Guardamos todo lo que creaste." : "Tu diseño, tus servicios y tu propia dirección."}{!message.paid ? <small>{message.price}</small> : null}</p></div> : null}
    </div> : <div className={styles.experienceBody}>
      <div className={styles.experienceHeading}><button className={styles.back} onClick={() => setExperience("intro")}>← Volver</button><h2 ref={exploreHeading} tabIndex={-1} id="website-launch-title">{experience === "booking" ? "Prueba cómo reservaría un cliente" : "Así te verán tus clientes"}</h2></div>
      <div className={styles.experienceControls}>
        <div className={styles.experienceTabs} aria-label="Explora tu web"><button aria-pressed={experience === "website"} onClick={() => explore("website")}>Mi web</button><button aria-pressed={experience === "booking"} onClick={() => explore("booking")}>Probar una reserva</button></div>
        <div className={styles.deviceControls} aria-label="Tamaño de vista previa"><button aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>Celular</button><button aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>Computador</button></div>
      </div>
      <p id="website-launch-description" className={styles.demoNotice}>{experience === "booking" ? "Tus servicios, con horarios de ejemplo. No se crean citas, no se envían datos ni se realizan cobros." : "Vista privada de tu web. Tú decides cuándo publicarla."}</p>
      <div className={styles.experienceStage} data-device={viewport}><iframe key={experience} src={experience === "booking" ? bookingUrl : previewUrl} title={`${experience === "booking" ? "Demostración de reserva" : "Web privada"} de ${businessName}`} className={styles.experienceFrame} /></div>
    </div>}
    <footer className={styles.footer}>
      <div className={styles.actions}>
        <button className={styles.primary} disabled={pending || !context.canManage || (message.showFounderOffer && context.canActivateTrial === false)} onClick={activate}>{pending ? message.showFounderOffer ? "Activando tu prueba…" : "Abriendo tu web…" : message.showFounderOffer ? "Estrenar mi web · 15 días gratis" : message.cta}<span aria-hidden="true">→</span></button>
        <button className={styles.secondary} onClick={() => explore(experience === "booking" ? "website" : "booking")}>{experience === "booking" ? "Volver a mi web" : "Probar una reserva"} <span aria-hidden="true">↗</span></button>
      </div>
      {message.showFounderOffer ? <p className={styles.helper}>{context.canActivateTrial === false ? "Las activaciones están temporalmente pausadas. Puedes ver tu web." : "Sin tarjeta ni cobro automático. Al estrenar tu web, activas tus 15 días."}</p> : null}
      {message.showFounderOffer ? <p className={styles.priceNote}>Después, si decides quedártela: <strong>{message.price}</strong>.</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.later} onClick={dismiss}>Seguir en mi dashboard</button>
    </footer>
  </dialog>;
}
