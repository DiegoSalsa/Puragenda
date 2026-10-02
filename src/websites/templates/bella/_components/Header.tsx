"use client";
import { useEffect, useRef, useState } from "react";
import Image from "../Media";
import { useBella } from "../Context";
import { bellaBrand } from "../brand";
import { bellaCopy } from "../copy";
import Action from "./Action";
import styles from "../studio.module.css";
export default function Header() {
  const { config, business, catalog } = useBella();
  const copy = bellaCopy(config, business.name);
  const brand = bellaBrand(config, business.name);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return <header className={styles.header} data-website-field="logo">
    <a href="#inicio" className={styles.brand} data-website-field="displayName" aria-label={`${config.displayName || business.name}, inicio`}>{config.logo || business.logo ? <Image src={config.logo || business.logo || ""} alt={config.displayName || business.name} width={150} height={48} style={{ objectFit: "contain" }} /> : <>{brand.eyebrow.toUpperCase()} <strong>{brand.title.toUpperCase()}<span>.</span></strong></>}</a>
    <nav id="bella-nav" className={styles.nav} aria-label={copy.nav.aria} data-open={open} onClick={() => setOpen(false)}>
      {config.gallery.length ? <a href="#trabajos">{copy.nav.gallery}</a> : null}<a href="#tratamientos">{copy.nav.services}</a>{catalog.staff.length ? <a href="#profesionales">{copy.nav.staff}</a> : null}{config.about || config.process.length ? <a href="#estudio">{copy.nav.about}</a> : null}
    </nav>
    <div className={styles.headerActions}><button ref={toggle} className={styles.menuButton} type="button" aria-expanded={open} aria-controls="bella-nav" onClick={() => setOpen(!open)}>{open ? copy.nav.close : copy.nav.menu}</button><Action booking>{copy.nav.reserve}</Action></div>
  </header>;
}
