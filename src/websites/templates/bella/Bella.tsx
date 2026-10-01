import type { CSSProperties } from "react";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import type { WebsiteView } from "../../types";
import { BellaProvider } from "./Context";
import { bellaBrand } from "./brand";
import Media from "./Media";
import Header from "./_components/Header";
import Action from "./_components/Action";
import Portfolio from "./_components/Portfolio";
import Services from "./_components/Services";
import Studio from "./_components/Studio";
import BookingSection from "./_components/BookingSection";
import Motion from "./_components/Motion";
import { dateKey } from "./_lib/puragenda/validation";
import styles from "./studio.module.css";
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--bella-display", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], variable: "--bella-body", display: "swap" });
const palettes = { coral: ["#e74732", "#b62d1e"], plum: ["#cc9ada", "#653070"], forest: ["#83b69c", "#28553d"] };
export default function Bella({ view }: { view: WebsiteView }) {
  const { config, business, catalog } = view;
  const brand = bellaBrand(config, business.name);
  const colors = palettes[config.accent];
  const longName = brand.title.length > 7;
  const style = { "--red": colors[0], "--red-text": colors[1], ...(longName ? { "--brand-size": `clamp(44px, ${Math.min(20, 110 / brand.title.length)}vw, 230px)`, "--footer-brand-size": `clamp(38px, ${Math.min(9, 55 / brand.title.length)}vw, 140px)`, "--brand-stretch": 1 } : {}) } as CSSProperties;
  return <BellaProvider view={view}><div id="studio-root" className={`${styles.root} ${display.variable} ${body.variable}`} style={style}>
    <a href="#contenido-studio" className={styles.skip}>Saltar al contenido</a><Header />
    <main id="contenido-studio">
      <section id="inicio" className={styles.hero} aria-labelledby="bella-title">
        <h1 id="bella-title" className={styles.wordmark}>{brand.eyebrow ? <span>{brand.eyebrow.toUpperCase()}</span> : null}<strong>{brand.title.toUpperCase()}<span>.</span></strong></h1>
        <div className={styles.heroGrid}><figure><div className={styles.heroPhoto}><Media src={config.heroImage} alt={config.heroCaption || business.name} fill preload sizes="(max-width: 700px) 100vw, 73vw" /></div>{config.heroCaption ? <figcaption>{config.heroCaption}</figcaption> : null}</figure>
          <div className={styles.heroCopy}><h2 style={{ whiteSpace: "pre-line" }}>{config.headline || "Tu próximo\nmomento"}<span>.</span></h2>{config.intro ? <p>{config.intro}</p> : null}<Action booking>Reservar mi momento</Action>{config.gallery.length ? <Action href="#trabajos" quiet>Ver trabajos</Action> : null}</div></div>
      </section>
      {config.gallery.length ? <Portfolio /> : null}
      <Services catalog={catalog} error={null} />
      {config.about || config.process.length ? <Studio /> : null}
      <BookingSection catalog={catalog} error={null} today={dateKey(new Date(), catalog.business.timezone)} fallbackUrl={null} />
    </main>
    <footer className={styles.footer}><a className={styles.footerWordmark} href="#inicio">{brand.title.toUpperCase()}<span>.</span></a><div className={styles.footerLinks}>{config.gallery.length ? <a href="#trabajos">Mira los detalles</a> : null}<Action booking quiet>Reserva tu momento</Action>{config.instagram ? <a href={config.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> : null}{config.facebook ? <a href={config.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> : null}{config.whatsapp ? <a href={`https://wa.me/${config.whatsapp.replace("+", "")}`}>WhatsApp</a> : null}</div>
      <div className={styles.footerBottom}><p>{business.address}{config.phone ? <><br />{config.phone}</> : null}{config.contactEmail ? <><br /><a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a></> : null}</p>{view.preview ? <p>Vista previa. No se crean reservas.</p> : null}<a href="https://www.puragenda.cl" target="_blank" rel="noopener noreferrer">Reservas con Puragenda</a></div>
    </footer><Motion />
  </div></BellaProvider>;
}
