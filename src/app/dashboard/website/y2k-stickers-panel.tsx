"use client";
import { useId, useState } from "react";
import StickerArt from "@/websites/templates/pink-y2k/StickerArt";
import { MAX_STICKERS, STICKER_CATEGORIES, STICKER_LIBRARY, STICKER_REGIONS, STICKER_REGION_NAMES, applyStickerEdit, duplicateSticker, layerSticker, newSticker, stickerName, stickersForViewport, type PinkSticker, type StickerPlacement, type StickerViewport } from "@/websites/templates/pink-y2k/stickers";
import type { WebsiteAsset } from "@/websites/media";
import MediaPicker from "./media-picker";
import s from "@/websites/templates/pink-y2k/stickers.module.css";

export default function Y2kStickersPanel({ items, onChange, selectedId, onSelect, editing, onToggleEditing, viewport, onViewport, onBusy, allowUploads = true }: {
  items: PinkSticker[]; onChange: (items: PinkSticker[], asset?: WebsiteAsset) => void;
  selectedId?: string; onSelect: (id?: string, items?: PinkSticker[]) => void; editing: boolean; onToggleEditing: () => void;
  viewport: StickerViewport; onViewport: (viewport: StickerViewport) => void; onBusy: (busy: boolean) => void;
  allowUploads?: boolean;
}) {
  const visibleItems = stickersForViewport(items, viewport);
  const inputId = useId(), selected = visibleItems.find(item => item.id === selectedId), position = selected?.[viewport];
  const atLimit = visibleItems.length >= MAX_STICKERS;
  const [query, setQuery] = useState(""), [category, setCategory] = useState("Todas");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const library = STICKER_LIBRARY.filter(art => (category === "Todas" || art.category === category) && normalize(art.name).includes(normalize(query.trim())));
  function add(kind: PinkSticker["kind"], image = "", asset?: WebsiteAsset) {
    if (atLimit) return;
    const item = newSticker(kind, crypto.randomUUID(), image, viewport);
    item[viewport].x += visibleItems.length % 5 * 6;
    const next = layerSticker([...items, item], item.id, viewport, true);
    onChange(next, asset); onSelect(item.id, next);
  }
  function placement<K extends keyof StickerPlacement>(key: K, value: StickerPlacement[K]) {
    if (selected && position) onChange(items.map(item => item.id === selected.id ? { ...item, [viewport]: { ...position, [key]: value } } : item));
  }
  function duplicate() {
    if (!selected || atLimit) return;
    const item = duplicateSticker(selected, crypto.randomUUID(), viewport);
    const next = layerSticker([...items, item], item.id, viewport, true);
    onChange(next); onSelect(item.id, next);
  }
  function layer(front: boolean) {
    if (!selected) return;
    onChange(layerSticker(items, selected.id, viewport, front));
  }
  return <div className={s.panel}>
    <h3>Stickers a tu manera</h3>
    <p className={s.hint}>Elige un sticker y arrástralo sobre tu página con el dedo o el cursor. Los stickers que añadas o acomodes aquí solo cambian en {viewport === "mobile" ? "móvil" : "escritorio"}.</p>
    <div className={s.toolbar}><button type="button" className={s.action} aria-pressed={editing} onClick={onToggleEditing}>{editing ? "Terminar de colocar" : "Colocar en vista previa"}</button><button type="button" className={s.action} aria-pressed={viewport === "desktop"} onClick={() => onViewport("desktop")}>Escritorio</button><button type="button" className={s.action} aria-pressed={viewport === "mobile"} onClick={() => onViewport("mobile")}>Móvil</button></div>
    {editing ? <p className={s.notice}>Estás colocando stickers en {viewport === "mobile" ? "móvil" : "escritorio"}. Cada vista tiene su propia composición.</p> : null}
    <div className={s.fields}><label className={s.field}>Buscar sticker<input type="search" aria-label="Buscar sticker" value={query} onChange={event => setQuery(event.target.value)} placeholder="Kitty, leopardo, Bratz…" /></label><label className={s.field}>Categoría<select aria-label="Categoría de stickers" value={category} onChange={event => setCategory(event.target.value)}><option>Todas</option>{STICKER_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label></div>
    <p className={s.hint} role="status">{library.length} de {STICKER_LIBRARY.length} stickers de la colección Y2K</p>
    <div className={s.library} aria-label="Biblioteca de stickers">{library.map(art => <button type="button" key={art.kind} disabled={atLimit} aria-label={`Añadir ${art.name}`} onClick={() => add(art.kind)}><StickerArt sticker={{ kind: art.kind, image: "" }}/><span>{art.name}</span></button>)}</div>
    {!library.length ? <p className={s.hint}>No hay stickers con ese nombre. Prueba otra búsqueda o categoría.</p> : null}
    {atLimit ? <p className={s.hint}>Tienes {MAX_STICKERS} stickers en esta vista. Retira uno para añadir otro.</p> : allowUploads ? <details><summary>Subir mi propio sticker</summary><p className={s.hint}>Usa PNG o WebP con fondo transparente para conservar el recorte.</p><MediaPicker label="Mi sticker" value="" usage="logo" onBusy={onBusy} onLocalPreview={() => {}} onChange={(url, asset) => { if (url) add("custom", url, asset); }}/></details> : null}
    {visibleItems.length ? <div className={s.list} aria-label="Mis stickers" data-my-stickers>{visibleItems.map((item, index) => <button type="button" key={item.id} className={s.row} aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id, items)}><StickerArt sticker={item}/><span>{stickerName(item)} · {index + 1}</span></button>)}</div> : <p className={s.hint}>Esta vista todavía no tiene stickers. Elige uno de la biblioteca para añadirlo.</p>}
    {selected && position ? <>
      <h3>{stickerName(selected)} · {viewport === "mobile" ? "Móvil" : "Escritorio"}</h3>
      <p className={s.hint}>Muévelo directamente sobre la página. Los ajustes precisos son opcionales.</p>
      <details className={s.adjustments}><summary>Ajustes precisos del sticker</summary><div>
      <label className={s.field}>Sección<select aria-label="Sección del sticker" value={position.region} onChange={event => placement("region", event.target.value as StickerPlacement["region"])}>{STICKER_REGIONS.map(region => <option key={region} value={region}>{STICKER_REGION_NAMES[region]}</option>)}</select></label>
      <div className={s.fields}>{(["x", "y", "size", "rotation"] as const).map(key => <label className={s.field} key={key} htmlFor={`${inputId}-${key}`}><span>{{ x: "Horizontal", y: "Vertical", size: "Tamaño", rotation: "Giro" }[key]} · {Math.round(position[key])}{key === "size" ? " px" : key === "rotation" ? "°" : "%"}</span><input id={`${inputId}-${key}`} aria-label={{ x: "Posición horizontal del sticker", y: "Posición vertical del sticker", size: "Tamaño del sticker", rotation: "Giro del sticker" }[key]} type="range" min={key === "size" ? 24 : key === "rotation" ? -180 : 0} max={key === "size" ? 280 : key === "rotation" ? 180 : 100} step={1} value={position[key]} onChange={event => placement(key, Number(event.target.value))}/></label>)}</div>
      <button type="button" className={s.action} onClick={() => { const other = viewport === "mobile" ? "desktop" : "mobile"; onChange(items.map(item => item.id === selected.id ? { ...item, [viewport]: { ...item[other], visible: item[viewport].visible, layer: item[viewport].layer } } : item)); }}>Copiar posición de {viewport === "mobile" ? "escritorio" : "móvil"}</button>
      </div></details>
      <div className={s.toolbar}><button type="button" className={s.action} onClick={duplicate} disabled={atLimit}>Duplicar sticker</button><button type="button" className={s.action} onClick={() => layer(true)}>Traer al frente</button><button type="button" className={s.action} onClick={() => layer(false)}>Enviar al fondo</button><button type="button" className={s.action} onClick={() => { onChange(applyStickerEdit(items, { id: selected.id, viewport, action: "delete" })); onSelect(undefined); }}>Eliminar sticker</button></div>
    </> : null}
  </div>;
}
