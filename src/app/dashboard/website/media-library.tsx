"use client";
/* eslint-disable @next/next/no-img-element -- Small asset library thumbnails. */
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { listWebsiteImages, removeWebsiteImage } from "@/server/actions/website.actions";
import type { WebsiteAsset } from "@/websites/media";
import styles from "./website-builder.module.css";
export default function MediaLibrary({ before, disabled }: { before: () => Promise<void>; disabled: boolean }) {
  const [assets, setAssets] = useState<(WebsiteAsset & { inUse: boolean })[]>([]), [message, setMessage] = useState(""), [pending, start] = useTransition();
  function load() { start(async () => { try { await before(); const result = await listWebsiteImages(); if ("error" in result) throw new Error(result.error); setAssets(result); setMessage(result.length ? "" : "Aquí aparecerán las fotos que subas a tu sitio."); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos abrir tus fotos"); } }); }
  function remove(id: string) { start(async () => { const result = await removeWebsiteImage(id); if (result && "error" in result) setMessage(result.error); else { setAssets(previous => previous.filter(item => item.id !== id)); setMessage("Foto eliminada de tu biblioteca."); } }); }
  return <details className={styles.googleSettings}><summary>Tus fotos guardadas</summary><div><p className={styles.helper}>Conservamos las fotos que sigan en tu sitio publicado. Puedes limpiar las que ya no uses después de publicar tus cambios.</p><button className={styles.secondary} disabled={disabled || pending} onClick={load}>Ver mis fotos</button><div className={styles.gallery}>{assets.map(asset => <div key={asset.id}><div className={styles.galleryPhoto}><img src={asset.secureUrl} alt="Foto guardada de tu negocio" /></div>{asset.inUse ? <p className={styles.helper}>En tu sitio</p> : <button className={styles.secondary} aria-label="Eliminar foto guardada" disabled={disabled || pending} onClick={() => { if (window.confirm("¿Eliminar esta foto que ya no usas?")) remove(asset.id); }}><Trash2 size={12} />Eliminar</button>}</div>)}</div>{message ? <p className={styles.helper} role="status">{message}</p> : null}</div></details>;
}
