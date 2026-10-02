"use client";
import { useEffect, useRef, useState } from "react";
import type { RitualConfig } from "./config";
import Media from "./Media";
import s from "./ritual.module.css";

export default function Lightbox({ images, initial, origin, onClose }: { images: RitualConfig["gallery"]; initial: number; origin: HTMLElement | null; onClose: () => void }) {
  const [index, setIndex] = useState(initial), dialog = useRef<HTMLDialogElement>(null), touch = useRef<{ x: number; y: number } | null>(null);
  const image = images[index];
  useEffect(() => {
    const element = dialog.current; element?.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; if (origin?.isConnected) origin.focus({ preventScroll: true }); };
  }, [origin]);
  const move = (delta: number) => setIndex(value => (value + delta + images.length) % images.length);
  if (!image) return null;
  return <dialog ref={dialog} className={s.lightbox} aria-label="Galería ampliada" onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}
    onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
    onTouchEnd={event => { if (!touch.current) return; const dx = event.changedTouches[0].clientX - touch.current.x, dy = event.changedTouches[0].clientY - touch.current.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1); touch.current = null; }}>
    <button className={s.lightboxClose} onClick={onClose} aria-label="Cerrar">×</button>
    {images.length > 1 ? <button className={s.lightboxNav} onClick={() => move(-1)} aria-label="Imagen anterior">←</button> : null}
    <figure className={s.lightboxImage}><Media src={image.image} alt={image.alt || image.name} fill sizes="90vw" /><figcaption className={s.lightboxCaption} aria-live="polite">{image.name || image.alt} · {index + 1} / {images.length}</figcaption></figure>
    {images.length > 1 ? <button className={s.lightboxNav} onClick={() => move(1)} aria-label="Imagen siguiente">→</button> : null}
  </dialog>;
}
