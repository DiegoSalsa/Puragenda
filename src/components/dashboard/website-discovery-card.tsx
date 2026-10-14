"use client";

import Image from "next/image";
import Link from "next/link";
import { websiteLaunchMessage, type WebsiteLaunchContext } from "@/websites/launch";
import { useDashboardOverlay } from "./dashboard-overlay-context";
import { track } from "@/lib/analytics/client";
import styles from "./website-launch.module.css";

export function WebsiteDiscoveryCard({ context }: { context: WebsiteLaunchContext }) {
  const { setChangelogOpen } = useDashboardOverlay();
  const message = websiteLaunchMessage(context.offer, context.addon);
  if (message.paid) return null;
  const trialing = message.trial === "TRIALING";
  const published = !!context.preview?.published;
  return <aside className={styles.discovery} aria-label="Descubre la web de tu negocio">
    <div className={styles.discoveryImage}><Image src={context.preview?.coverImage ?? "/websites/previews/bella.svg"} alt="" fill unoptimized sizes="160px" /></div>
    <div className={styles.discoveryCopy}>
      <p className={styles.discoveryEyebrow}>{trialing ? "TU WEB YA ESTÁ EN PRUEBA" : message.showFounderOffer ? "15 DÍAS PARA PROBAR TU WEB" : "TU PROPIA WEB EN PURAGENDA"}</p>
      <h2>{trialing ? published ? "Tu web ya está publicada. Comparte el enlace." : "Tu prueba empezó. Estrena tu web." : message.trial === "EXPIRED" ? "Tu web sigue aquí. Hazla tuya." : context.preview?.ready ? "Preparamos tu web. Mira cómo quedó." : "Dale a tu negocio un lugar propio en internet."}</h2>
      <p>{context.preview?.businessName ? `${context.preview.businessName} · ` : ""}{trialing ? "Lleva tu enlace a Instagram y WhatsApp. Tus reservas llegan a la misma agenda." : "Tus servicios, tu estilo y reservas conectadas a tu agenda."}</p>
    </div>
    {message.showFounderOffer ? <button className={styles.discoveryCta} onClick={() => { track("changelog_launch_cta_clicked", { feature: "website_discovery_card" }); setChangelogOpen(true); }}>Ver mi web <span aria-hidden="true">↗</span></button> : <Link className={styles.discoveryCta} href="/dashboard/website">{trialing ? published ? "Compartir mi web" : "Publicar mi web" : message.cta} <span aria-hidden="true">↗</span></Link>}
  </aside>;
}
