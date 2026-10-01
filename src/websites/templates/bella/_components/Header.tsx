"use client";
import { useEffect, useRef, useState } from "react";
import Image from "../Media";
import { useBella } from "../Context";
import { bellaBrand } from "../brand";
import Action from "./Action";
import styles from "../studio.module.css";
export default function Header() {
  const { config, business } = useBella();
  const brand = bellaBrand(config, business.name);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return <header className={styles.header}>
    <a href="#inicio" className={styles.brand} aria-label={`${business.name}, inicio`}>{config.logo || business.logo ? <Image src={config.logo || business.logo || ""} alt={business.name} width={150} height={48} style={{ objectFit: "contain" }} /> : <>{brand.eyebrow.toUpperCase()} <strong>{brand.title.toUpperCase()}<span>.</span></strong></>}</a>
    <nav id="bella-nav" className={styles.nav} aria-label="Navegación principal" data-open={open} onClick={() => setOpen(false)}>
      {config.gallery.length ? <a href="#trabajos">Trabajos</a> : null}<a href="#tratamientos">Tratamientos</a>{config.about || config.process.length ? <a href="#estudio">El estudio</a> : null}
    </nav>
    <div className={styles.headerActions}><button ref={toggle} className={styles.menuButton} type="button" aria-expanded={open} aria-controls="bella-nav" onClick={() => setOpen(!open)}>{open ? "Cerrar" : "Menú"}</button><Action booking>Reservar</Action></div>
  </header>;
}
