"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "./website-builder.module.css";
export default function LivePreviewFrame({ mobile, frame, onLoad }: { mobile: boolean; frame: RefObject<HTMLIFrameElement | null>; onLoad: () => void }) {
  const area = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 1024, height: 650 });
  useEffect(() => {
    const element = area.current; if (!element) return;
    const observer = new ResizeObserver(entries => { const rect = entries[0].contentRect; setBounds({ width: rect.width, height: rect.height }); });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const targetWidth = mobile ? 390 : Math.max(1024, bounds.width);
  const scale = Math.min(1, bounds.width / targetWidth);
  return <div ref={area} className={styles.frameArea} data-mobile={mobile}>
    <div className={styles.frameStage} style={{ width: targetWidth * scale }}>
      <iframe ref={frame} className={styles.frame} src="/website-preview" title="Vista previa en vivo de mi sitio" onLoad={onLoad} style={{ width: targetWidth, height: Math.max(1, Math.floor(bounds.height / (scale || 1))), transform: `scale(${scale})` }} />
    </div>
  </div>;
}
