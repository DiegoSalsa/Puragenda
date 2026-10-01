"use client";
/* eslint-disable @next/next/no-img-element -- Native thumbnails display local browser blobs. */
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { BellaConfig } from "@/websites/config";
import { reorderGallery } from "@/websites/editor-utils";
import MediaPicker from "./media-picker";
import styles from "./website-builder.module.css";
export default function GalleryPanel({ config, update, busy, uploadCount, onLocal, highlight }: {
  config: BellaConfig; update: (next: (config: BellaConfig) => BellaConfig) => void;
  busy: (value: boolean) => void; uploadCount: number; onLocal: (key: string, url: string | null) => void; highlight: () => void;
}) {
  const [selected, setSelected] = useState(0), [category, setCategory] = useState("");
  const photo = config.gallery[selected];
  const categories = [...new Set([...config.galleryFilters, ...config.gallery.map(item => item.category)].filter(Boolean))];
  function edit(patch: Partial<BellaConfig["gallery"][number]>) {
    update(previous => ({ ...previous, gallery: previous.gallery.map((item, index) => {
      if (index !== selected) return item;
      const next = { ...item, ...patch };
      if (!("alt" in patch) && (!item.alt || item.alt === [item.name, item.category].filter(Boolean).join(" · "))) next.alt = [next.name, next.category].filter(Boolean).join(" · ");
      return next;
    }) }));
  }
  function move(from: number, to: number) { update(previous => ({ ...previous, gallery: reorderGallery(previous.gallery, from, to) })); setSelected(to); highlight(); }
  function remove() { update(previous => ({ ...previous, gallery: previous.gallery.filter((_, index) => index !== selected) })); setSelected(Math.max(0, selected - 1)); }
  return <div className={styles.panel}>
    <div className={styles.panelHeading}><h2>Galería</h2><p className={styles.helper}>Muestra tus mejores trabajos. Arrastra las fotos para cambiar su orden.</p></div>
    <div className={styles.gallery}>{config.gallery.map((item, index) => <button key={index} className={styles.galleryPhoto} aria-label={`Editar foto ${index + 1}: ${item.name}`} aria-pressed={selected === index} disabled={uploadCount > 0} draggable={uploadCount === 0} onDragStart={event => event.dataTransfer.setData("text/plain", String(index))} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const raw = event.dataTransfer.getData("text/plain"); const from = Number(raw); if (raw && Number.isInteger(from)) move(from, index); }} onClick={() => { setSelected(index); highlight(); }}><img src={item.image} alt={item.alt || item.name} /><span>{index + 1}</span></button>)}</div>
    {photo ? <div className={styles.divider}>
      <h3>Tu foto {selected + 1}</h3><label className={styles.field}>Título<input maxLength={100} value={photo.name} onChange={event => edit({ name: event.target.value })} onFocus={highlight} /></label>
      <div><p className={styles.label}>Categoría</p><div className={styles.chips}>{categories.map(item => <button key={item} aria-pressed={photo.category === item} onClick={() => edit({ category: item, filters: [item] })}>{item}</button>)}</div><div className={styles.row} style={{ marginTop: 9 }}><input className={styles.textInput} aria-label="Nueva categoría" value={category} maxLength={80} onChange={event => setCategory(event.target.value)} placeholder="Nueva categoría" /><button className={styles.secondary} disabled={!category.trim() || categories.length >= 20} onClick={() => { const item = category.trim(); update(previous => ({ ...previous, galleryFilters: [...new Set([...previous.galleryFilters, item])], gallery: previous.gallery.map((image, index) => index === selected ? { ...image, category: item, filters: [item], alt: image.alt || [image.name, item].filter(Boolean).join(" · ") } : image) })); setCategory(""); }}><Plus size={12} />Añadir</button></div></div>
      <MediaPicker label="Foto seleccionada" value={photo.image} usage="gallery" onBusy={busy} onLocalPreview={url => onLocal(`gallery.${selected}`, url)} onFocus={highlight} onChange={(url, asset) => { if (!url) remove(); else update(previous => ({ ...previous, gallery: previous.gallery.map((item, index) => index === selected ? { ...item, image: url } : item), ...(asset ? { mediaAssets: [...(previous.mediaAssets ?? []), asset] } : {}) })); }} />
      <details className={styles.googleSettings}><summary>Descripción y posición de la foto</summary><div><label className={styles.field}>Descripción de la imagen<textarea maxLength={250} value={photo.alt} onChange={event => edit({ alt: event.target.value })} /><span className={styles.helper}>Describe brevemente qué aparece en la foto. Ayuda a las personas que utilizan lectores de pantalla.</span></label><p className={styles.label}>Posición de la foto</p><div className={styles.focusOptions}>{(["left", "center", "right"] as const).map(position => <button key={position} aria-pressed={(photo.focal ?? "center") === position} onClick={() => { edit({ focal: position }); highlight(); }}><img src={photo.image} alt="" style={{ objectPosition: position === "left" ? "30%" : position === "right" ? "70%" : "center" }} /><span>{{ left: "Izquierda", center: "Centro", right: "Derecha" }[position]}</span></button>)}</div></div></details>
      <div className={styles.row}><button className={styles.secondary} disabled={!selected || uploadCount > 0} aria-label="Mover foto antes" onClick={() => move(selected, selected - 1)}><ArrowUp size={13} /></button><button className={styles.secondary} disabled={selected >= config.gallery.length - 1 || uploadCount > 0} aria-label="Mover foto después" onClick={() => move(selected, selected + 1)}><ArrowDown size={13} /></button><button className={styles.secondary} disabled={uploadCount > 0} onClick={remove}><Trash2 size={13} />Retirar foto</button></div>
    </div> : null}
    {config.gallery.length < 30 ? <MediaPicker label="Añadir foto a la galería" value="" usage="gallery" onBusy={busy} onLocalPreview={url => onLocal("galleryNew", url)} onFocus={highlight} onChange={(url, asset) => { if (!url || !asset) return; setSelected(config.gallery.length); update(previous => ({ ...previous, gallery: [...previous.gallery, { image: url, name: "Nuevo trabajo", alt: "Nuevo trabajo", category: "" }], mediaAssets: [...(previous.mediaAssets ?? []), asset] })); }} /> : <p className={styles.helper}>Tu galería tiene 30 fotos.</p>}
  </div>;
}
