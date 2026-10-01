"use client";
import Image from "../Media";
import { useMemo, useState } from "react";
import type { Catalog, StudioService } from "../_lib/puragenda/types";
import { money, quoteService } from "../_lib/puragenda/validation";
import { useBella } from "../Context";
import { bellaCopy } from "../copy";
import Action from "./Action";
import styles from "../studio.module.css";
export default function Services({ catalog: initial, error: initialError }: { catalog: Catalog | null; error: string | null }) {
  const { api: studioApi, config, business } = useBella(); const copy = bellaCopy(config, business.name);
  const [catalog, setCatalog] = useState(initial);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(initial?.services[0]?.id ?? "");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const service = catalog?.services.find((item) => item.id === selectedId) ?? catalog?.services[0];
  const serviceGroups = useMemo(() => (catalog?.services ?? []).reduce<Array<{ id: string; name: string; position: number; services: StudioService[] }>>((groups, item) => {
    const id = item.categoryId || "__uncategorized";
    const name = item.category || "Otros servicios";
    const existing = groups.find((group) => group.id === id);
    if (existing) existing.services.push(item);
    else groups.push({ id, name, position: item.categoryPosition, services: [item] });
    return groups;
  }, []).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "es")), [catalog?.services]);
  async function retry() { setLoading(true); try { const next = await studioApi.catalog(); setCatalog(next); setError(null); setSelectedId(next.services[0]?.id ?? ""); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos consultar los tratamientos."); } finally { setLoading(false); } }
  return <section id="tratamientos" className={styles.services} aria-labelledby="services-title">
    <div className={styles.serviceHeading}><h2 id="services-title" data-website-field="servicesTitle" style={{ whiteSpace: "pre-line" }}>{copy.services.title}</h2><p>{copy.services.subtitle}</p></div>
    {error ? <div className={styles.errorPanel} role="alert"><p>{error}</p><button className={styles.outlineButton} type="button" onClick={retry} disabled={loading}>{loading ? copy.services.loading : copy.services.retry}</button></div> : catalog && service ? <>
      <div className={styles.serviceList} aria-label={copy.services.aria}>{serviceGroups.map((group) => <div key={group.id} className={styles.serviceGroup}><button type="button" className={styles.serviceGroupHeader} aria-expanded={expandedCategories.includes(group.id)} onClick={() => setExpandedCategories((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}><span><strong>{group.name}</strong><small>{group.services.length} {group.services.length === 1 ? "servicio" : "servicios"}</small></span><span aria-hidden="true">{expandedCategories.includes(group.id) ? "⌃" : "⌄"}</span></button>{expandedCategories.includes(group.id) ? group.services.map((item) => <button key={item.id} type="button" aria-pressed={service.id === item.id} onClick={() => { setSelectedId(item.id); setExpandedCategories((current) => current.includes(group.id) ? current : [...current, group.id]); }}><span className={styles.selectionDot} aria-hidden="true" />{item.name}</button>) : null}</div>)}</div>
      <ServiceDetail key={service.id} service={service} catalog={catalog} />
    </> : <p>{copy.services.unavailable}</p>}
  </section>;
}
function ServiceDetail({ service, catalog }: { service: StudioService; catalog: Catalog }) {
  const { config, business } = useBella(); const copy = bellaCopy(config, business.name);
  // Display starts at canonical base; complete option pricing belongs to booking.
  const required = service.optionCategories.filter((category) => category.isRequired);
  const defaults = required.flatMap((category) => category.alternatives.slice(0, 1).map((option) => option.id));
  let quote: ReturnType<typeof quoteService> | null = null;
  try { quote = quoteService(service, defaults); } catch { /* Incomplete canonical options cannot be booked. */ }
  const deposit = quote && catalog.rules?.depositEnabled ? Math.min(service.depositAmount ?? 0, quote.price) : 0;
  return <article className={styles.serviceDetail} aria-live="polite">
    <div className={styles.servicePhoto}><Image src={service.image} alt={`${service.image.startsWith("/demos/") ? "Detalle conceptual" : "Imagen"} de ${service.name}`} fill sizes="(max-width: 700px) 90vw, 44vw" style={service.id === "permanente" ? { objectPosition: "70% center" } : undefined} /></div>
    <h3>{service.name}</h3><p>{service.description}</p>
    {quote ? <dl className={styles.serviceFacts}><div><dt>Duración{required.length ? " base" : ""}</dt><dd>{service.duration} min</dd></div><div><dt>{required.length ? "Desde" : "Precio total"}</dt><dd>{money(required.length ? quote.price : service.price, catalog.business.currency)}</dd></div>{deposit > 0 ? <div><dt>Abono</dt><dd>{money(deposit, catalog.business.currency)}</dd></div> : null}</dl> : <p>Este tratamiento estará disponible cuando el negocio complete sus opciones.</p>}
    {service.optionCategories.length ? <p className={styles.fineprint}>{service.optionCategories.map((category) => category.name).join(" · ")} · elige tus opciones en la reserva.</p> : null}
    <div className={styles.serviceBottom}>{quote ? <Action booking serviceId={service.id}>{copy.services.choose}</Action> : null}<span>{catalog.mode === "demo" ? "Precios de muestra." : "Datos de Puragenda."}</span></div>
  </article>;
}
