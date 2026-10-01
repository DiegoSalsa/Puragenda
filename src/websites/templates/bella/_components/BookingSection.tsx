"use client";
import dynamic from "next/dynamic";
import Image from "../Media";
import { useEffect, useState } from "react";
import type { Catalog } from "../_lib/puragenda/types";
import { useBella } from "../Context";
import { bellaCopy } from "../copy";
import { bookingEvent } from "./booking-events";
import styles from "../studio.module.css";
const BookingFlow = dynamic(() => import("./BookingFlow"), { loading: () => <div className={styles.bookingLoading} role="status">Preparando tu momento…</div> });
export default function BookingSection({ catalog: initial, error: initialError, today, fallbackUrl }: { catalog: Catalog | null; error: string | null; today: string; fallbackUrl: string | null }) {
  const { api: studioApi, business, preview, config } = useBella(); const copy = bellaCopy(config, business.name);
  const [catalog, setCatalog] = useState(initial);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<{ id: number; serviceId?: string } | null>(null);
  useEffect(() => {
    const open = (event: Event) => {
      if (!catalog?.services.length || !catalog.locations.length) return;
      const detail = (event as CustomEvent<{ serviceId?: string }>).detail;
      setSession((previous) => previous && !detail?.serviceId ? previous : { id: (previous?.id ?? 0) + 1, serviceId: detail?.serviceId });
    };
    window.addEventListener(bookingEvent, open);
    return () => window.removeEventListener(bookingEvent, open);
  }, [catalog]);
  async function retry() { setLoading(true); try { setCatalog(await studioApi.catalog()); setError(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos consultar la agenda."); } finally { setLoading(false); } }
  return <section id="agenda" data-website-field="booking" className={styles.booking} aria-labelledby="booking-title">
    {error ? <div className={styles.bookingLayout}><aside className={styles.bookingAside}><p className={styles.bookingMode}>{copy.booking.mode}</p><h2 id="booking-title" style={{ whiteSpace: "pre-line" }}>{copy.booking.title}</h2></aside><div className={styles.bookingPanel}><h3>La agenda está pendiente.</h3><p role="alert">{error}</p><button className={styles.outlineButton} type="button" onClick={retry} disabled={loading}>{loading ? "Consultando…" : "Volver a consultar"}</button>{fallbackUrl ? <a href={fallbackUrl} className={styles.textAction} target="_blank" rel="noopener noreferrer">Abrir agenda alternativa en Puragenda</a> : null}</div></div>
      : catalog && session ? <BookingFlow key={session.id} catalog={catalog} today={today} initialServiceId={session.serviceId} />
      : <div className={styles.bookingLayout}><aside className={styles.bookingAside}><p className={styles.bookingMode}>{catalog?.mode === "demo" ? copy.booking.demoMode : copy.booking.mode}</p><h2 id="booking-title" style={{ whiteSpace: "pre-line" }}>{copy.booking.title}</h2><p style={{ whiteSpace: "pre-line" }}>{copy.booking.intro}</p><div className={styles.bookingPreview}><Image src={catalog?.services[0]?.image || ""} alt={business.name} fill sizes="(max-width: 700px) 35vw, 25vw" /></div></aside><div className={styles.bookingPanel}><p className={styles.fineprint}>{business.name.toUpperCase()} / {copy.booking.panelEyebrow}</p><h3 style={{ whiteSpace: "pre-line" }}>{copy.booking.panelTitle}</h3><p style={{ whiteSpace: "pre-line" }}>{copy.booking.panelIntro}</p>{!catalog?.services.length || !catalog.locations.length ? <p role="status">La agenda todavía no tiene tratamientos disponibles.</p> : null}<ol className={styles.bookingIntroSteps}>{copy.booking.steps.map(step => <li key={step}>{step}</li>)}</ol><button type="button" className={styles.action} onClick={() => setSession({ id: 1 })} disabled={!catalog?.services.length || !catalog.locations.length}>{copy.booking.start}</button><p className={styles.fineprint}>{catalog?.mode === "demo" ? "Disponibilidad demostrativa. No se crea una cita ni se envían tus datos." : preview ? "Vista previa con datos reales. No se crean citas." : "Tu reserva se registra directamente en la agenda del negocio."}</p></div></div>}
  </section>;
}
