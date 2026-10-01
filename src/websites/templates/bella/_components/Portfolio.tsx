"use client";
import Image from "../Media";
import { useEffect, useMemo, useRef, useState } from "react";
import ArrowNarrowRightIcon from "../icons/arrow-narrow-right-icon";
import { useBella } from "../Context";
import { bellaCopy } from "../copy";
import { normalizeGalleryCategories, categoryIdsForImage } from "../categories";
import styles from "../studio.module.css";
export default function Portfolio() {
  const { config, business } = useBella(); const copy = bellaCopy(config, business.name);
  const categories = normalizeGalleryCategories(config);
  const works = useMemo(() => config.gallery.map((work, index) => { const ids = work.categoryIds?.length ? work.categoryIds : categoryIdsForImage(work, categories); const labels = categories.filter(item => ids.includes(item.id)).map(item => item.label); return { ...work, id: String(index), filters: ["Todo", ...labels].filter(Boolean) }; }), [config.gallery, categories]);
  const filters = useMemo(() => { const available = works.flatMap(work => work.filters).filter(item => item !== "Todo"); return ["Todo", ...new Set([...config.galleryFilters.filter(item => available.includes(item)), ...available])]; }, [works, config.galleryFilters]);
  const [filter, setFilter] = useState<string>("Todo");
  const [expanded, setExpanded] = useState<(typeof works)[number] | null>(null);
  const [paused, setPaused] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = works.filter((work) => (work.filters as readonly string[]).includes(filter));
  useEffect(() => { const receive = (event: Event) => { const value = (event as CustomEvent<string>).detail; if (typeof value === "string" && filters.includes(value)) { setFilter(value); rail.current?.scrollTo({ left: 0 }); } }; window.addEventListener("bella:gallery-filter", receive); return () => window.removeEventListener("bella:gallery-filter", receive); }, [filters]);
  const navigate = (direction: number) => { const element = rail.current; if (element) element.scrollBy({ left: direction * element.clientWidth * .65, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); };
  return <section data-website-field="gallery" id="trabajos" className={styles.portfolio} aria-labelledby="portfolio-title">
    <div className={styles.sectionHeading}><h2 id="portfolio-title" data-website-field="galleryTitle" style={{ whiteSpace: "pre-line" }}>{copy.gallery.title}</h2><p data-website-field="gallerySubtitle">{copy.gallery.subtitle}</p></div>
    <div className={styles.portfolioTools}>
      <div className={styles.filters} aria-label={copy.gallery.filterLabel}>{filters.map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => { setFilter(item); rail.current?.scrollTo({ left: 0 }); }}>{item}</button>)}</div>
      <div className={styles.railControls}><button type="button" aria-label={copy.gallery.previous} onClick={() => navigate(-1)}><span className={styles.reverse} aria-hidden="true"><ArrowNarrowRightIcon /></span></button><button type="button" aria-label={copy.gallery.next} onClick={() => navigate(1)}><span aria-hidden="true"><ArrowNarrowRightIcon /></span></button></div>
    </div>
    <div className={styles.galleryRail} ref={rail} data-single={visible.length === 1}>
      {visible.map((work, index) => <figure className={styles.work} key={`${filter}-${work.id}`}>
        <button type="button" className={styles.workImage} aria-label={`Ampliar ${work.name}`} onClick={() => { setExpanded(work); dialog.current?.showModal(); }}>
          <Image src={work.image} alt={work.alt} fill sizes="(max-width: 700px) 85vw, 45vw" style={{ objectPosition: work.focal === "right" ? "70% center" : work.focal === "left" ? "30% center" : "center" }} /><span className={styles.expandLabel}>{copy.gallery.expand}</span>
        </button><figcaption><span>{String(index + 1).padStart(2, "0")} / {work.name}</span><span>{work.category}</span></figcaption>
      </figure>)}
    </div>
    <div className={styles.galleryNote}><span role="status">{visible.length} {visible.length === 1 ? copy.gallery.countSingular : copy.gallery.countPlural}{copy.gallery.countSuffix ? ` · ${copy.gallery.countSuffix}` : ""}</span><span>{copy.gallery.note}</span></div>
    <dialog aria-label={copy.gallery.dialogLabel} className={styles.photoDialog} ref={dialog} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.dialogBar}><p>{expanded?.name}</p><button type="button" onClick={() => dialog.current?.close()}>{copy.gallery.closeDialog}</button></div>
      {expanded ? <div className={styles.expandedPhoto}><Image src={expanded.image} alt={expanded.alt} fill sizes="90vw" /></div> : null}
      <p className={styles.dialogCaption}>{business.name}</p>
    </dialog>
    {copy.gallery.marqueeEnabled && copy.gallery.marquee.length ? <div className={styles.marquee} data-paused={paused}>
      <div className={styles.marqueeTrack} aria-hidden="true">{[0, 1].map(index => <span key={index}>{copy.gallery.marquee.join(" · ")}</span>)}</div>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? copy.gallery.resume : copy.gallery.pause}</button>
    </div> : null}
  </section>;
}
