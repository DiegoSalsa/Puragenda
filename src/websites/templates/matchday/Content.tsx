"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import type { WebsiteView } from "../../types";
import type { MatchdayConfig } from "./config";
import { matchdayTokens } from "./palettes";
import { matchdayGallery } from "./gallery";
import { PREVIEW_PROTOCOL, trustedPreviewSender } from "../../preview-transport";
import { parseMatchdayPreview } from "./preview";
import { dateKey, money } from "../../booking/validation";
import { Provider } from "./Context";
import Media from "./Media";
import s from "./matchday.module.css";
const Booking = dynamic(() => import("./Booking"));
type View = WebsiteView<MatchdayConfig>;
export default function Content({ view: initial, fontClass }: { view: View; fontClass: string }) {
  const [draft, setDraft] = useState(initial.config), sequence = useRef(-1);
  useEffect(() => {
    if (!initial.preview || window.parent === window) return;
    function receive(event: MessageEvent) {
      if (!trustedPreviewSender(event, window.parent, window.location.origin)) return;
      const result = parseMatchdayPreview(event.data, window.location.origin);
      if (!result.success || result.data.sequence < sequence.current) return;
      sequence.current = result.data.sequence; setDraft(result.data.config);
      if (result.data.focus) requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-website-field="${result.data.focus}"]`);
        if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 100), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      });
    }
    window.addEventListener("message", receive); window.parent.postMessage({ protocol: PREVIEW_PROTOCOL, type: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [initial.preview]);
  const view = { ...initial, config: initial.preview ? draft : initial.config };
  return <Provider view={view}><Page view={view} fontClass={fontClass} /></Provider>;
}
function Page({ view, fontClass }: { view: View; fontClass: string }) {
  const { config: c, business: b, catalog } = view, copy = c.copy, t = matchdayTokens(c);
  const name = c.brandTitle || c.displayName || b.name;
  const [activeService, setActiveService] = useState(catalog.services[0]?.id ?? "");
  const service = catalog.services.find(item => item.id === activeService) ?? catalog.services[0];
  const [bookingService, setBookingService] = useState<string>(), [bookingOpen, setBookingOpen] = useState(false);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const [filter, setFilter] = useState("all"), [photo, setPhoto] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), lastTrigger = useRef<HTMLElement | null>(null);
  const gallery = matchdayGallery(c, catalog);
  const visibleGallery = filter === "all" ? gallery : gallery.filter(item => item.categoryIds?.includes(filter));
  const staff = catalog.staff.filter(person => c.staffEditorial[person.id]?.visible !== false);
  const reserve = (id?: string) => { setBookingService(id); setBookingOpen(true); requestAnimationFrame(() => document.getElementById("booking")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })); };
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) { e.target.setAttribute("data-seen", "true"); observer.unobserve(e.target); } }, { threshold: .12 });
    document.querySelectorAll('[data-matchday-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (photo !== null) dialog.current?.showModal(); else { dialog.current?.close(); lastTrigger.current?.focus(); } }, [photo]);
  const styles = { "--md-accent": t.accent, "--md-on-accent": t.onAccent, "--md-paper": t.paper, "--md-ink": t.ink, "--md-name-mobile": `${Math.min(17, 88 / (Math.max(...name.split(/\s+/).map(word => word.length)) * .62))}vw` } as CSSProperties;
  const navItems = [{ id: "services", label: copy.nav.services, visible: !!catalog.services.length }, { id: "staff", label: copy.nav.staff, visible: !!staff.length }, { id: "gallery", label: copy.nav.gallery, visible: !!gallery.length }, { id: "about", label: copy.nav.about, visible: !!c.about || !!c.aboutImage }];
  return <main id="studio-root" className={`${s.root} ${fontClass}`} style={styles}>
    <header className={s.header}><a href="#top" className={s.brand}>{c.logo || b.logo ? <Media src={c.logo || b.logo!} alt={c.displayName || b.name} width={100} height={40} /> : <span>{c.displayName || b.name}</span>}</a><nav aria-label="Navegación principal">{navItems.filter(n => n.visible).map(n => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav><button className={s.action} onClick={() => reserve()}>{copy.nav.reserve}<Arrow /></button></header>
    <section id="top" className={s.hero} data-website-field="brandTitle" data-long-name={name.length > 35}>
      <div className={s.heroMeta}><span data-website-field="brandEyebrow">{c.brandEyebrow}</span><span>{b.address}</span></div>
      <h1 className={s.name}>{name}</h1>
      {c.heroImage ? <figure className={s.heroPhoto} data-website-field="heroImage"><Media src={c.heroImage} alt={c.heroCaption || c.displayName || b.name} fill sizes="(max-width: 600px) 75vw, 45vw" loading="eager" fetchPriority="high" /><figcaption>{c.heroCaption}</figcaption></figure> : null}
      <div className={s.heroStatement} data-website-field="headline"><h2>{c.headline}</h2>{c.graphicPhrase ? <span className={s.graphic}>{c.graphicPhrase}</span> : null}</div>
      <div className={s.heroBottom}><p data-website-field="intro">{c.intro}</p><div><button className={s.action} onClick={() => reserve()}>{copy.reserve}<Arrow /></button>{gallery.length ? <a className={s.textLink} href="#gallery">{copy.secondary}<Arrow /></a> : null}</div></div>
    </section>
    {c.showMarquee && c.marquee.length ? <div className={s.marquee} aria-label={c.marquee.join(" · ")}><button className={s.marqueePause} aria-pressed={marqueePaused} onClick={() => setMarqueePaused(!marqueePaused)}>{marqueePaused ? "Reanudar movimiento" : "Pausar movimiento"}</button><div aria-hidden="true" style={{ animationPlayState: marqueePaused ? "paused" : "running" }}>{[0, 1].map(i => <span key={i}>{c.marquee.map((phrase, j) => <span key={j}>{phrase}<i> / </i></span>)}</span>)}</div></div> : null}
    {catalog.services.length ? <section id="services" className={s.section} data-website-field="servicesTitle" data-matchday-reveal><SectionHeading number={c.showNumbers ? "01" : ""} title={copy.servicesTitle} note={copy.servicesNote} /><div className={s.services}><div className={s.serviceIndex}>{catalog.services.map((item, i) => <button key={item.id} aria-pressed={item.id === service?.id} onClick={() => setActiveService(item.id)}><span>{c.showNumbers ? String(i + 1).padStart(2, "0") : ""}</span><strong>{item.name}</strong><small>{item.duration} min<br />{money(item.price, catalog.business.currency)}</small><Arrow /></button>)}</div>{service ? <div className={s.serviceFeature} key={service.id}>{service.image ? <div className={s.servicePhoto}><Media src={service.image} alt={service.name} fill sizes="(max-width: 700px) 100vw, 42vw" /></div> : <div className={s.serviceType} aria-hidden="true">{service.name}</div>}<div className={s.serviceDetail} aria-live="polite"><h3>{service.name}</h3><p>{service.description}</p><p>{service.duration} min · {money(service.price, catalog.business.currency)}</p><button className={s.action} onClick={() => reserve(service.id)}>{copy.serviceAction}<Arrow /></button></div></div> : null}</div></section> : null}
    {staff.length ? <section id="staff" className={`${s.section} ${s.crewSection}`} data-website-field="staff" data-matchday-reveal><SectionHeading number={c.showNumbers ? "02" : ""} title={copy.staffTitle} note={copy.staffNote} /><div className={s.crew}>{staff.map((person, i) => { const editorial = c.staffEditorial[person.id]; return <article key={person.id} className={s.person}><div className={s.portrait}>{person.image ? <Media src={person.image} alt={person.name} fill sizes="(max-width: 600px) 75vw, 32vw" /> : <span className={s.initials}>{person.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>}{c.showNumbers ? <span className={s.jersey}>{editorial?.visualNumber || String(i + 1).padStart(2, "0")}</span> : null}</div><h3>{person.name}</h3>{editorial?.label ? <p className={s.editorialLabel}>{editorial.label}</p> : null}<p className={s.specialties}>{catalog.services.filter(item => !person.serviceIds.length || person.serviceIds.includes(item.id)).map(item => item.name).join(" / ")}</p></article>; })}</div></section> : null}
    {gallery.length ? <section id="gallery" className={s.section} data-website-field="gallery" data-matchday-reveal><SectionHeading number={c.showNumbers ? "03" : ""} title={copy.galleryTitle} note={copy.galleryNote} />{c.showGalleryCategories && c.gallery.length && c.galleryCategories.length ? <div className={s.filters}><button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{copy.galleryAll}</button>{c.galleryCategories.filter(cat => gallery.some(item => item.categoryIds?.includes(cat.id))).map(cat => <button key={cat.id} aria-pressed={filter === cat.id} onClick={() => setFilter(cat.id)}>{cat.label}</button>)}</div> : null}<div className={s.gallery}>{visibleGallery.map((item, i) => <button className={s.galleryItem} key={`${item.image}-${i}`} onClick={e => { lastTrigger.current = e.currentTarget; setPhoto(i); }} aria-label={`Ver ${item.name || item.alt}`}><Media src={item.image} alt={item.alt || item.name} fill sizes="(max-width: 600px) 90vw, 50vw" style={{ objectPosition: item.focal }} /><span>{item.name}<Arrow /></span></button>)}</div></section> : null}
    {c.about || c.aboutImage ? <section id="about" className={`${s.section} ${s.about}`} data-website-field="about" data-matchday-reveal><div><SectionHeading number="" title={copy.aboutTitle} /><p>{c.about}</p></div>{c.aboutImage ? <div className={s.aboutPhoto}><Media src={c.aboutImage} alt={copy.aboutTitle} fill sizes="(max-width: 700px) 100vw, 45vw" /></div> : null}</section> : null}
    <section id="booking" className={`${s.section} ${s.booking}`} data-website-field="booking"><SectionHeading number={c.showNumbers ? "04" : ""} title={copy.bookingTitle} note={copy.bookingNote} />{bookingOpen ? <Booking key={bookingService || "all"} catalog={catalog} today={dateKey(new Date(), catalog.business.timezone)} initialServiceId={bookingService} /> : <button className={s.action} onClick={() => reserve()}>{copy.reserve}<Arrow /></button>}</section>
    <footer className={`${s.section} ${s.footer}`} data-website-field="contact"><p className={s.footerStatement}>{copy.footerStatement || c.displayName || b.name}</p><div className={s.footerGrid}>{b.address || b.mapsUrl ? <div><h2>{copy.contactTitle}</h2>{b.address ? <p>{b.address}</p> : null}{b.mapsUrl ? <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer">{copy.mapsLabel}<Arrow /></a> : null}</div> : null}{b.hours?.length ? <div><h2>{copy.hoursTitle}</h2><dl>{[...b.hours].sort((a,b) => a.dayOfWeek - b.dayOfWeek).map(row => <div key={row.dayOfWeek}><dt>{["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][row.dayOfWeek]}</dt><dd>{row.isOpen ? `${row.startTime} — ${row.endTime}` : "Cerrado"}</dd></div>)}</dl></div> : null}<div>{!b.address && !b.mapsUrl ? <h2>{copy.contactTitle}</h2> : null}{c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : null}{c.contactEmail ? <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a> : null}{c.whatsapp ? <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a> : null}{c.instagram ? <a href={c.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> : null}{c.facebook ? <a href={c.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> : null}<button className={s.action} onClick={() => reserve()}>{copy.reserve}<Arrow /></button></div></div><div className={s.colophon}><span>{c.displayName || b.name}</span><a href="https://puragenda.cl" target="_blank" rel="noopener noreferrer">Sitio y reservas con Puragenda<Arrow /></a></div></footer>
    <dialog className={s.lightbox} ref={dialog} onCancel={() => setPhoto(null)} onClose={() => { setPhoto(null); lastTrigger.current?.focus(); }} aria-label={visibleGallery[photo ?? 0]?.name || copy.galleryTitle}><button className={s.close} onClick={() => setPhoto(null)} aria-label="Cerrar imagen">Cerrar ×</button>{photo !== null && visibleGallery[photo] ? <><div className={s.lightboxPhoto}><Media src={visibleGallery[photo].image} alt={visibleGallery[photo].alt || visibleGallery[photo].name} fill sizes="95vw" /></div><p>{visibleGallery[photo].name}</p><div className={s.lightboxActions}><button disabled={photo === 0} onClick={() => setPhoto(photo - 1)}>Anterior</button><span>{photo + 1} / {visibleGallery.length}</span><button disabled={photo === visibleGallery.length - 1} onClick={() => setPhoto(photo + 1)}>Siguiente</button></div></> : null}</dialog>
  </main>;
}
function SectionHeading({ number, title, note }: { number: string; title: string; note?: string }) { return <div className={s.sectionHeading}>{number ? <span>{number} /</span> : null}<h2>{title}</h2>{note ? <p>{note}</p> : null}</div>; }
function Arrow() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.8" /></svg>; }
