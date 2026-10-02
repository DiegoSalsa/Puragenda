"use client";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { BellaView } from "./types";
import { BellaProvider } from "./Context";
import { useLivePreview } from "./LivePreview";
import { paletteTokens } from "../../palettes";
import { bellaCopy } from "./copy";
import { bellaBrand } from "./brand";
import Media from "./Media";
import Header from "./_components/Header";
import Action from "./_components/Action";
import Portfolio from "./_components/Portfolio";
import Services from "./_components/Services";
import Staff from "./_components/Staff";
import Studio from "./_components/Studio";
import BookingSection from "./_components/BookingSection";
import Motion from "./_components/Motion";
import { dateKey } from "./_lib/puragenda/validation";
import styles from "./studio.module.css";
import { effectiveWebsiteHeadline } from "../../publishing";
import { bellaDisplayConfig } from "./display-config";
export default function BellaContent({ view: initial, fontClass }: { view: BellaView; fontClass: string }) {
  const liveView = useLivePreview(initial);
  const view = useMemo(() => {
    return { ...liveView, config: bellaDisplayConfig(liveView.config, liveView.catalog.services, liveView.preview) };
  }, [liveView]);
  const { config, business, catalog } = view;
  const brand = bellaBrand(config, business.name);
  const copy = bellaCopy(config, business.name);
  const headline = effectiveWebsiteHeadline({ ...config, copy });
  const colors = paletteTokens(config.accent, config.customPalette, config.paletteMode);
  const longName = brand.title.length > 7;
  const style = { "--red": colors.primary, "--red-text": colors.text, "--gray": colors.background, "--ink": colors.ink, ...(longName ? { "--brand-size": `clamp(44px, ${Math.min(20, 110 / brand.title.length)}vw, 230px)`, "--footer-brand-size": `clamp(38px, ${Math.min(9, 55 / brand.title.length)}vw, 140px)`, "--brand-stretch": 1 } : {}) } as CSSProperties;
  return <BellaProvider view={view}><div id="studio-root" className={`${styles.root} ${fontClass}`} style={style}>
    <a href="#contenido-studio" className={styles.skip}>Saltar al contenido</a><Header />
    <main id="contenido-studio">
      <section id="inicio" className={styles.hero} aria-labelledby="bella-title">
        <h1 id="bella-title" className={styles.wordmark} data-website-field="brandTitle">{brand.eyebrow ? <span data-website-field="brandEyebrow">{brand.eyebrow.toUpperCase()}</span> : null}<strong>{brand.title.toUpperCase()}<span>.</span></strong></h1>
        <div className={styles.heroGrid}><figure><div className={styles.heroPhoto} data-website-field="heroImage"><Media src={config.heroImage} alt={config.heroCaption || business.name} fill preload sizes="(max-width: 700px) 100vw, 73vw" /></div>{config.heroCaption ? <figcaption data-website-field="heroCaption">{config.heroCaption}</figcaption> : null}</figure>
          <div className={styles.heroCopy}><h2 data-website-field="headline" style={{ whiteSpace: "pre-line" }}>{headline}{/[.!?…]$/.test(headline.trim()) ? null : "."}</h2>{config.intro ? <p data-website-field="intro">{config.intro}</p> : null}<Action booking>{copy.hero.reserve}</Action>{config.gallery.length ? <Action href="#trabajos" quiet>{copy.hero.gallery}</Action> : null}</div></div>
      </section>
      <Portfolio />
      <Services catalog={catalog} error={null} />
      <Staff catalog={catalog} />
      {config.about || config.process.length ? <Studio /> : null}
      <BookingSection catalog={catalog} error={null} today={dateKey(new Date(), catalog.business.timezone)} fallbackUrl={null} />
    </main>
    <footer data-website-field="contact" className={styles.footer}><a className={styles.footerWordmark} href="#inicio">{brand.title.toUpperCase()}<span>.</span></a><div className={styles.footerLinks}>{config.gallery.length ? <a href="#trabajos">{copy.footer.gallery}</a> : null}<Action booking quiet>{copy.footer.reserve}</Action>{config.instagram ? <a href={config.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> : null}{config.facebook ? <a href={config.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> : null}{config.whatsapp ? <a href={`https://wa.me/${config.whatsapp.replace("+", "")}`}>WhatsApp</a> : null}</div>
      <div className={styles.footerBottom}><p>{business.address}{config.phone ? <><br />{config.phone}</> : null}{config.contactEmail ? <><br /><a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a></> : null}</p>{view.preview ? <p>{copy.footer.preview}</p> : null}<a href="https://www.puragenda.cl" target="_blank" rel="noopener noreferrer">{copy.footer.credit}</a></div>
    </footer><Motion />
  </div></BellaProvider>;
}
