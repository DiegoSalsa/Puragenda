"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { WebsiteLaunchPreview as Preview } from "@/websites/launch";
import styles from "./website-launch.module.css";

export function WebsiteLaunchPreview({ preview, src = "/website-preview" }: { preview?: Preview; src?: string }) {
  const area = useRef<HTMLDivElement>(null);
  const contentObserver = useRef<MutationObserver | null>(null);
  const [width, setWidth] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(element);
    return () => { observer.disconnect(); contentObserver.current?.disconnect(); };
  }, []);
  const scale = width / 390;
  return <figure className={styles.preview} aria-label={`Vista previa privada de ${preview?.businessName ?? "tu negocio"}`}>
    <div className={styles.browserBar} aria-hidden="true"><span className={styles.browserDots}>● ● ●</span><span>{preview?.address ?? "Tu propia web en Puragenda"}</span><span>↗</span></div>
    <div className={styles.previewViewport} ref={area}>
      <div className={styles.previewFallback} aria-hidden="true">
        <Image src={preview?.coverImage ?? "/websites/previews/bella.svg"} alt="" fill unoptimized sizes="(max-width: 700px) 90vw, 550px" />
        <strong>{preview?.businessName ?? "Tu negocio"}</strong>
      </div>
      {width > 0 ? <iframe src={src} title={`Vista previa de ${preview?.businessName ?? "mi web"}`} tabIndex={-1} aria-hidden="true" inert onLoad={event => {
        contentObserver.current?.disconnect();
        try {
          const document = event.currentTarget.contentDocument;
          if (!document?.body) { setLoaded(false); return; }
          const showPreview = () => {
            if (!document.getElementById("studio-root")) return;
            setLoaded(true);
            contentObserver.current?.disconnect();
          };
          contentObserver.current = new MutationObserver(showPreview);
          contentObserver.current.observe(document.body, { childList: true, subtree: true });
          showPreview();
        } catch { setLoaded(false); }
      }} className={styles.previewFrame} style={{ width: 390, height: 844, transform: `scale(${scale})`, opacity: loaded ? 1 : 0 }} /> : null}
    </div>
    <figcaption><span>Tu diseño {preview?.templateName ?? "personalizable"}</span><strong>Vista privada</strong></figcaption>
  </figure>;
}
