"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import StickerArt from "./StickerArt";
import { placementAtPoint, stickerName, type PinkSticker, type StickerEdit, type StickerEditorState, type StickerPlacement, type StickerRegionBox } from "./stickers";
import s from "./stickers.module.css";

function measure(root: HTMLDivElement) {
  const bounds = root.getBoundingClientRect();
  return { width: bounds.width, height: bounds.height, regions: Array.from(root.querySelectorAll<HTMLElement>("[data-sticker-region]")).map(element => {
    const box = element.getBoundingClientRect();
    return { region: element.dataset.stickerRegion as StickerPlacement["region"], top: box.top - bounds.top, height: box.height };
  }) };
}
export default function StickerCanvas({ root, stickers, editor, onEdit }: {
  root: RefObject<HTMLDivElement | null>; stickers: PinkSticker[]; editor?: StickerEditorState; onEdit?: (edit: StickerEdit) => void;
}) {
  const [metrics, setMetrics] = useState({ width: 0, height: 0, regions: [] as StickerRegionBox[] });
  const drag = useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number; clientX: number; clientY: number; placement: StickerPlacement } | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const enabled = !!editor?.enabled && !!onEdit;
  const viewport = enabled ? editor!.viewport : metrics.width <= 600 ? "mobile" : "desktop";
  useEffect(() => () => { drag.current = null; if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current); }, []);
  useEffect(() => {
    const element = root.current;
    if (!element || !stickers.length) return;
    const update = () => { const next = measure(element); setMetrics(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.querySelectorAll("[data-sticker-region]").forEach(region => observer.observe(region));
    return () => observer.disconnect();
  }, [root, stickers.length]);
  const selectedRegion = stickers.find(item => item.id === editor?.selectedId)?.[viewport].region;
  useEffect(() => {
    if (!enabled || !editor?.selectedId || drag.current || !metrics.width) return;
    root.current?.querySelector<HTMLElement>(`[data-sticker-id="${editor.selectedId}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [enabled, editor?.selectedId, selectedRegion, metrics.width, root]);
  const point = (event: PointerEvent<HTMLButtonElement>, placement: StickerPlacement, offsetX: number, offsetY: number) => {
    const element = root.current;
    if (!element) return placement;
    const bounds = element.getBoundingClientRect(), layout = measure(element);
    return placementAtPoint(placement, event.clientX - bounds.left - offsetX, event.clientY - bounds.top - offsetY, layout.width, layout.regions);
  };
  if (!stickers.length || !metrics.width) return null;
  return <div className={s.canvas} data-editing={enabled} data-sticker-width={metrics.width} data-sticker-viewport={viewport} aria-hidden={enabled ? undefined : true}>
    {stickers.map(item => {
      const placement = item[viewport], region = metrics.regions.find(box => box.region === placement.region);
      if (!region) return null;
      const angle = placement.rotation * Math.PI / 180;
      const diagonal = Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));
      const size = Math.min(placement.size, Math.max(24, (metrics.width - 8) / diagonal));
      const edge = size * diagonal / 2;
      const left = Math.min(metrics.width - edge, Math.max(edge, metrics.width * placement.x / 100));
      const top = Math.min(metrics.height - edge, Math.max(edge, region.top + region.height * placement.y / 100));
      const style = { width: size, height: size, left, top, "--sticker-rotation": `${placement.rotation}deg` } as CSSProperties;
      const art = <StickerArt sticker={item} />;
      if (!enabled) return <span key={item.id} className={s.item} style={style} data-sticker-id={item.id}>{art}</span>;
      return <button type="button" key={item.id} className={s.item} style={style} aria-label={`Mover sticker ${stickerName(item)}`} data-sticker-id={item.id} data-selected={editor?.selectedId === item.id}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
          const bounds = event.currentTarget.getBoundingClientRect();
          drag.current = { id: item.id, pointerId: event.pointerId, offsetX: event.clientX - (bounds.left + bounds.width / 2), offsetY: event.clientY - (bounds.top + bounds.height / 2), clientX: event.clientX, clientY: event.clientY, placement };
          event.currentTarget.setPointerCapture(event.pointerId);
          onEdit!({ id: item.id, viewport, action: "select" });
          const autoScroll = () => {
            const current = drag.current, element = root.current;
            if (!current || !element) return;
            const speed = current.clientY < 48 ? -12 : current.clientY > window.innerHeight - 48 ? 12 : 0;
            if (speed) {
              const before = window.scrollY; window.scrollBy(0, speed);
              if (window.scrollY !== before) {
                const bounds = element.getBoundingClientRect(), layout = measure(element);
                const next = placementAtPoint(current.placement, current.clientX - bounds.left - current.offsetX, current.clientY - bounds.top - current.offsetY, layout.width, layout.regions);
                onEdit!({ id: current.id, viewport, action: "move", placement: next });
              }
            }
            scrollFrame.current = requestAnimationFrame(autoScroll);
          };
          if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
          scrollFrame.current = requestAnimationFrame(autoScroll);
        }}
        onPointerMove={event => {
          const current = drag.current;
          if (current?.id !== item.id || current.pointerId !== event.pointerId) return;
          current.clientX = event.clientX; current.clientY = event.clientY;
          const next = point(event, current.placement, current.offsetX, current.offsetY);
          onEdit!({ id: item.id, viewport, action: "move", placement: next });
        }}
        onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={event => {
          if (["Delete", "Backspace"].includes(event.key)) { event.preventDefault(); onEdit!({ id: item.id, viewport, action: "delete" }); return; }
          const deltas: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
          const delta = deltas[event.key]; if (!delta) return;
          event.preventDefault(); const step = event.shiftKey ? 5 : 1;
          onEdit!({ id: item.id, viewport, action: "move", placement: { ...placement, x: Math.min(100, Math.max(0, placement.x + delta[0] * step)), y: Math.min(100, Math.max(0, placement.y + delta[1] * step)) } });
        }}
      >{art}</button>;
    })}
  </div>;
}
