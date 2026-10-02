"use client";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import s from "./ritual.module.css";

const subscribe = (notify: () => void) => { const media = window.matchMedia("(max-width: 800px)"); media.addEventListener("change", notify); return () => media.removeEventListener("change", notify); };
const snapshot = () => window.matchMedia("(max-width: 800px)").matches;
const serverSnapshot = () => false;

/** Native touch scrolling on mobile; a bounded editorial window on desktop. */
export default function Rail<T>({ items, size, kind, label, render }: { items: T[]; size: number; kind: "gallery" | "staff"; label: string; render: (item: T, index: number) => ReactNode }) {
  const mobile = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [position, setPosition] = useState(0), rail = useRef<HTMLDivElement>(null);
  const max = mobile ? Math.max(0, items.length - 1) : Math.max(0, items.length - size), cursor = Math.min(position, max);
  const visible = mobile ? items : items.slice(cursor, cursor + size);
  function move(next: number) {
    const index = Math.max(0, Math.min(next, max)); setPosition(index);
    if (mobile && rail.current) {
      const child = rail.current.children[index] as HTMLElement | undefined;
      if (child) rail.current.scrollTo({ left: child.offsetLeft - (rail.current.children[0] as HTMLElement).offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }
  return <div className={s.rail} data-rail={kind}>
    <div ref={rail} className={kind === "gallery" ? s.gallery : s.staffGrid} data-count={Math.min(items.length, size)} role="region" aria-roledescription="carrusel" aria-label={label} tabIndex={0}
      onKeyDown={event => { const next = event.key === "ArrowRight" ? cursor + 1 : event.key === "ArrowLeft" ? cursor - 1 : event.key === "Home" ? 0 : event.key === "End" ? max : null; if (next !== null) { event.preventDefault(); move(next); } }}
      onScroll={() => { if (!mobile || !rail.current) return; const first = rail.current.children[0] as HTMLElement | undefined; if (!first) return; let index = 0, distance = Infinity; Array.from(rail.current.children).forEach((child, i) => { const delta = Math.abs((child as HTMLElement).offsetLeft - first.offsetLeft - rail.current!.scrollLeft); if (delta < distance) { index = i; distance = delta; } }); setPosition(index); }}>
      {visible.map((item, index) => render(item, mobile ? index : cursor + index))}
    </div>
    {items.length > (mobile ? 1 : size) ? <div className={s.railControls}>
      <button type="button" disabled={cursor === 0} aria-label={kind === "gallery" ? "Imagen anterior" : "Profesional anterior"} onClick={() => move(cursor - 1)}>←</button>
      <span aria-live="polite" aria-atomic="true">{String(cursor + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
      <button type="button" disabled={cursor === max} aria-label={kind === "gallery" ? "Imagen siguiente" : "Profesional siguiente"} onClick={() => move(cursor + 1)}>→</button>
    </div> : null}
  </div>;
}
