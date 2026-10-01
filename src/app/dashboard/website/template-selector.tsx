"use client";
/* eslint-disable @next/next/no-img-element -- Template thumbnails are local vector artwork. */
import { useState } from "react";
import { templateRegistry } from "@/websites/registry";
import { switchWebsiteTemplate } from "@/server/actions/website.actions";
import { useRouter } from "next/navigation";
import styles from "./website-builder.module.css";
export default function TemplateSelector({ active, flush, revision, disabled }: { active: string; flush: () => Promise<void>; revision: () => number; disabled: boolean }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function select(key: string, version: number) {
    setBusy(true); setError("");
    try { await flush(); const result = await switchWebsiteTemplate(key, version, revision()); if ("error" in result) throw new Error(result.error); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "No pudimos cambiar el diseño"); setBusy(false); }
  }
  return <details className={styles.googleSettings} open><summary>Cambiar diseño</summary><div><p className={styles.helper}>Prueba cada diseño con los datos de tu negocio. El sitio público cambia cuando publiques.</p>{Object.values(templateRegistry).map(template => <div key={template.key} className={styles.designCard}><img src={template.preview.thumbnail} alt={`Composición ${template.name}`} style={{ width: "100%", maxHeight: 160, objectFit: "cover" }} /><div className={styles.designInfo}><strong>{template.name}</strong><span>{template.editor.category}</span></div><div className={styles.row}><a className={styles.secondary} href={template.preview.desktop} target="_blank" rel="noopener noreferrer">Escritorio</a><a className={styles.secondary} href={template.preview.mobile} target="_blank" rel="noopener noreferrer">Móvil</a><button className={styles.secondary} disabled={disabled || busy || template.key === active} onClick={() => select(template.key, template.version)}>{template.key === active ? "Tu diseño" : busy ? "Cambiando…" : "Usar diseño"}</button></div></div>)}{error ? <p role="alert">{error}</p> : null}</div></details>;
}
