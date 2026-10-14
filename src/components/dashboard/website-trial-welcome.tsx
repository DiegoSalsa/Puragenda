"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/client";
import styles from "./website-trial-welcome.module.css";

export function WebsiteTrialWelcome({ businessName, published, publicUrl, trialEndsAt, ready }: {
  businessName: string;
  published: boolean;
  publicUrl: string;
  trialEndsAt: string | null;
  ready: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setError("");
      track("changelog_launch_cta_clicked", { feature: "website_share_link" });
    } catch { setError("Selecciona el enlace de abajo y cópialo para compartirlo."); }
  }
  return <aside className={styles.welcome} aria-label="Estrena y comparte tu web">
    <div className={styles.copy}>
      <p className={styles.eyebrow}>{published ? "TU WEB YA ESTÁ EN INTERNET" : "TU WEB YA ESTÁ EN PRUEBA"}</p>
      <h2>{businessName}, {published ? "es hora de compartirla." : "dale vida a tu web."}</h2>
      <p>{published ? "Copia tu enlace y llévalo a Instagram o WhatsApp. Tus clientes podrán reservar desde ahí." : ready ? "Revisa tu web y pulsa «Publicar cambios» en el editor. Después tendrás tu enlace listo para compartir." : "Completa las fotos y textos de tu web, revisa el resultado y pulsa «Publicar cambios» en el editor."}</p>
      <ol className={styles.steps} aria-label="Tu camino para estrenar la web"><li data-done={ready}>1. Preparar el diseño</li><li data-done={published}>2. Publicar</li><li data-done={copied}>3. Compartir el enlace</li></ol>
      {trialEndsAt ? <p className={styles.ends}>Tu prueba termina el {new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", timeZone: "America/Santiago" }).format(new Date(trialEndsAt))}. Sin cobro automático.</p> : null}
    </div>
    <div className={styles.actions}>
      {published ? <><button onClick={() => void copy()}>{copied ? "¡Enlace copiado!" : "Copiar mi enlace"}<span aria-hidden="true">↗</span></button><a href={publicUrl} target="_blank" rel="noopener noreferrer">Ver mi web publicada ↗</a><input aria-label="Enlace de tu web publicada" value={publicUrl} readOnly onFocus={event => event.currentTarget.select()} />{error ? <p role="status">{error}</p> : null}</> : <a className={styles.preview} href="/website-preview" target="_blank" rel="noopener noreferrer">Revisar mi web ↗</a>}
    </div>
  </aside>;
}
