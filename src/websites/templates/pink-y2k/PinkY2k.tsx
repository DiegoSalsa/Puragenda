"use client";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  MapPin,
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ImageOff,
  Pause,
  Play,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { BellaProvider } from "../bella/Context";
import { bellaConfigSchema } from "../../config";
import type { WebsiteView } from "../../types";
import { usePreviewBooking } from "../../use-preview-booking";
import { pinkPatternColor, type PinkConfig } from "./config";
import LovePocket from "./LovePocket";
import { JellyLetters, MotionWords, usePinkMotion } from "./Motion";
import bella from "../bella/studio.module.css";
import s from "./pink.module.css";
import m from "./motion.module.css";
import a from "./appearance.module.css";
import StickerCanvas from "./StickerCanvas";
import stickersStyle from "./stickers.module.css";
import type { StickerEditorState, StickerEdit } from "./stickers";
import BookingFlow from "../bella/_components/BookingFlow";
const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");
export const pinkTokens = (config: PinkConfig) =>
  ({
    "--pink-accent": config.colors.accent,
    "--pink-ink": config.colors.ink,
    "--pink-paper": config.colors.background,
    "--pink-surface": config.colors.surface,
    "--pink-pattern-ratio": String(config.appearance.patternCoverage / 100),
    "--pink-pattern-color": pinkPatternColor(config.appearance, config.colors),
  }) as CSSProperties;

function Photo({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState("");
  if (!src || failedSource === src)
    return (
      <span className={s.missingImage}>
        <ImageOff size={28} />
        <span>Imagen por agregar</span>
      </span>
    );
  return (
    <Image
      className={className}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailedSource(src)}
      unoptimized={src.startsWith("https:") || src.startsWith("blob:")}
    />
  );
}
function GlossStar({ className, animated = false, chrome = false, heart = false }: { className?: string; animated?: boolean; chrome?: boolean; heart?: boolean }) {
  const gradientId = useId();
  return (
    <svg
      className={cx(className, animated && m.loop, animated && m.starGlint)}
      data-pink-loop={animated ? "sparkle" : undefined}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradientId} cx=".3" cy=".25" r=".85">
          <stop stopColor="white" />
          <stop offset=".28" stopColor={chrome ? "#f5f6fa" : "#f8e6ff"} />
          <stop offset=".48" stopColor={chrome ? "#6e7387" : "#cf9ae4"} />
          <stop offset=".56" stopColor={chrome ? "#fff" : "#e3bde9"} />
          <stop offset=".8" stopColor={chrome ? "#484553" : "#866293"} />
          <stop offset="1" stopColor={chrome ? "#e5e8f1" : "#f5dcff"} />
        </radialGradient>
      </defs>
      <path
        d={heart ? "M50 88 13 53C-9 27 23-3 50 23 77-3 109 27 87 53Z" : chrome ? "M50 4 62 35 96 38 70 60 79 94 50 75 21 94 30 60 4 38 38 35Z" : "M50 2C56 34 66 44 98 50 66 56 56 66 50 98 44 66 34 56 2 50 34 44 44 34 50 2Z"}
        fill={`url(#${gradientId})`}
        stroke="#fff"
        strokeWidth="2"
      />
    </svg>
  );
}
function GlossHeart() {
  return (
    <svg className={m.glossHeart} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id="pink-candy-heart" cx=".3" cy=".2" r=".9">
          <stop stopColor="#fff9ff" />
          <stop offset=".3" stopColor="#ffb1d7" />
          <stop offset=".65" stopColor="#d05596" />
          <stop offset="1" stopColor="#973665" />
        </radialGradient>
      </defs>
      <path d="M20 35 5 21C-4 10 9-2 20 9 31-2 44 10 35 21Z" fill="url(#pink-candy-heart)" stroke="#b45b8a" />
      <path d="M7 15c-1-6 5-8 9-5" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function WindowBar({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={s.windowBar} data-pink-bar="">
      <span>
        <Heart size={14} />
        {title}
      </span>
      {children ?? (
        <span aria-hidden="true" className={s.windowDecor}>
          — □ ×
        </span>
      )}
    </div>
  );
}

export default function PinkY2k({
  view,
  today,
  stickerEditor,
  onStickerEdit,
}: {
  view: WebsiteView<PinkConfig>;
  today: string;
  stickerEditor?: StickerEditorState;
  onStickerEdit?: (edit: StickerEdit) => void;
}) {
  const { catalog, business } = view;
  const c = useMemo(() => ({ ...view.config, displayName: view.config.displayName || business.name, logo: view.config.logo || business.logo || "" }), [view.config, business.name, business.logo]);
  const root = useRef<HTMLDivElement>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  const [menu, setMenu] = useState(false),
    [filter, setFilter] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);
  usePinkMotion(root, c, filter);
  const bookingPanel = useRef<HTMLDivElement>(null);
  const [bookingInView, setBookingInView] = useState(false);
  useEffect(() => {
    const panel = bookingPanel.current;
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => setBookingInView(entry.isIntersecting));
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  const pointerStart = useRef<number | null>(null);
  const usesCategoryIds = c.galleryCategories.length > 0 || c.gallery.some(row => row.categoryIds !== undefined);
  const categories = usesCategoryIds ? c.galleryCategories.filter(cat => c.gallery.some(row => row.categoryIds?.includes(cat.id))).map(cat => ({ id: cat.id, label: cat.label })) : [...new Set(c.gallery.map(row => row.category).filter(Boolean))].map(label => ({ id: label, label }));
  const activeFilter = categories.some(cat => cat.id === filter) ? filter : "";
  const gallery = c.gallery
    .map((row, index) => ({ ...row, index }))
    .filter((row) => !activeFilter || (usesCategoryIds ? row.categoryIds?.includes(activeFilter) : row.category === activeFilter));
  const lightboxPhoto = lightbox === -1
    ? { image: c.heroImage, name: c.heroCaption || `Portada de ${c.displayName}`, alt: `Portada de ${c.displayName}` }
    : lightbox !== null ? c.gallery[lightbox] : undefined;
  const reserve = () => {
    setMenu(false);
    bookingPanel.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    bookingPanel.current?.focus({ preventScroll: true });
  };
  usePreviewBooking(view.preview && view.previewExperience === "booking", reserve);
  const nextPhoto = (direction: number) =>
    setLightbox((index) =>
      index === null || index === -1 || !c.gallery.length
        ? index
        : (index + direction + c.gallery.length) % c.gallery.length,
    );
  const bookingView = {
    ...view,
    config: bellaConfigSchema.parse({
      displayName: c.displayName,
      copy: {
        booking: {
          title: "Tu próximo\nset empieza aquí.",
          demoMode: "Agenda de demostración",
          idleSummary: "Elige tu servicio y tu momento.\nSin crear una cuenta.",
        },
      },
    }),
  };
  const canBook = catalog.services.length > 0 && catalog.locations.length > 0;
  const bookButton = (
    className: string,
    label = c.copy.reserve,
  ) => (
    <button
      type="button"
      className={cx(className, m.glossButton)}
      data-pink-reserve
      disabled={!canBook}
      onClick={reserve}
    >
      {label}
      <ArrowUpRight size={19} />
    </button>
  );

  return (
    <div
      id="studio-root"
      ref={root}
      className={cx(s.root, a.canvas, stickersStyle.host, motionPaused && m.motionPaused)}
      style={pinkTokens(c)}
      data-title-finish={c.appearance.titleFinish}
      data-title-font={c.appearance.titleFont}
      data-background={c.appearance.background}
      data-decorations={c.appearance.decorations}
      data-texture-strength={c.appearance.textureStrength}
      data-pattern-coverage={c.appearance.patternCoverage}
      data-pattern-scope={c.appearance.patternScope}
      data-pattern-color={c.appearance.patternColor ? "custom" : undefined}
    >
      <a href="#services" className={s.skip}>
        Ir a servicios y reserva
      </a>
      <div className={a.pageSurface} data-pink-page-surface>
      <header className={cx(s.header, a.readableSurface)} id="top" data-sticker-region="header">
        <a
          href="#top"
          className={s.brand}
          data-pink-brand
          aria-label={`${c.displayName}, inicio`}
        >
          {c.logo ? (
            <span className={s.logo}>
              <Photo src={c.logo} alt={c.displayName} sizes="160px" />
            </span>
          ) : (
            <>
              <Heart size={23} fill="currentColor" />
              <span>
                {c.displayName}
                <small>{c.copy.brandTagline}</small>
              </span>
            </>
          )}
        </a>
        <nav className={s.nav} aria-label="Navegación principal">
          <a href="#services">{c.copy.navServices}</a>
          {c.visibility.gallery ? (
            <a href="#gallery">{c.copy.navGallery}</a>
          ) : null}
          <a href="#guide">{c.copy.navGuide}</a>
        </nav>
        <div className={s.headerActions}>
          {bookButton(s.navReserve)}
          <button
            className={s.menuButton}
            type="button"
            aria-label={menu ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menu}
            aria-controls="pink-mobile-menu"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={23} /> : <Plus size={24} />}
          </button>
        </div>
      </header>
      {menu ? (
        <nav
          className={s.mobileMenu}
          id="pink-mobile-menu"
          aria-label="Menú móvil"
        >
          <a href="#services" onClick={() => setMenu(false)}>
            {c.copy.navServices} <ArrowUpRight size={18} />
          </a>
          {c.visibility.gallery ? (
            <a href="#gallery" onClick={() => setMenu(false)}>
              {c.copy.navGallery} <ArrowUpRight size={18} />
            </a>
          ) : null}
          <a href="#guide" onClick={() => setMenu(false)}>
            {c.copy.navGuide} <ArrowUpRight size={18} />
          </a>
        </nav>
      ) : null}
      <main>
        <section className={cx(s.hero, a.readableSurface, a.heroSurface)} aria-labelledby="pink-heading" data-sticker-region="hero">
          <div className={s.heroMeta}>
            <span>
              <i /> {c.copy.eyebrow}
            </span>
            <span>
              {c.city || business.address ? <><MapPin size={13} />{c.city || business.address}</> : null}
            </span>
          </div>
          <div className={s.heroStage}>
            <div className={s.orbit} data-pink-orbit="" aria-hidden="true" />
            <h1 id="pink-heading" className={s.headline} data-pink-headline="" aria-label={c.headline.join(" ")}>
              <JellyLetters text={c.headline[0]} line={0} connected={c.appearance.titleTopFont === "script"} finish={c.appearance.titleTopFinish} font={c.appearance.titleTopFont} />
              <JellyLetters text={c.headline[1]} line={1} connected={c.appearance.titleFont === "script"} finish={c.appearance.titleFinish} font={c.appearance.titleFont} />
            </h1>
            <GlossStar className={s.heroStar} animated chrome={c.appearance.decorations !== "classic"} heart={c.appearance.decorations === "hearts"} />
            <GlossStar className={s.heroStarSmall} animated chrome={c.appearance.decorations !== "classic"} heart={c.appearance.decorations === "hearts"} />
            <button
              className={cx(s.heroPhoto, m.heroPhotoEntry)}
              type="button"
              aria-label="Ampliar foto de portada"
              disabled={!c.heroImage}
              onClick={() => setLightbox(-1)}
            >
              <span className={s.tape} aria-hidden="true" />
              <span className={s.heroPhotoFrame}>
                <Photo
                  src={c.heroImage}
                  alt={`Portada de ${c.displayName}`}
                  sizes="(max-width: 600px) 45vw, 260px"
                  priority
                />
              </span>
              <span className={s.photoCaption}>
                {c.heroCaption} <ArrowUpRight size={16} />
              </span>
            </button>
            <div className={s.heroCopy}>
              <p>{c.intro}</p>
              <div className={s.heroCtas}>
                {bookButton(s.primary)}
                {c.visibility.gallery ? (
                  <a href="#gallery" className={s.secondary}>
                    {c.copy.secondary}
                    <ArrowRight size={17} />
                  </a>
                ) : null}
              </div>
              <span className={s.heroNote}>
                <Sparkles size={13} />
                {c.copy.heroNote}
              </span>
            </div>
            <div className={s.sticker} data-pink-sticker="" aria-hidden="true">
              <span>{c.copy.sticker}</span>
              <svg viewBox="0 0 90 32">
                <path
                  d="M5 9c24 28 48 13 72 4m-11-4 13 2-5 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            {c.visibility.pocket ? (
              <div className={s.heroPocket}>
                <LovePocket config={c.pocket} reserve={() => reserve()} />
              </div>
            ) : null}
            <div className={s.heroFile}>
              <span aria-hidden="true">✦</span> {c.copy.heroFile}{" "}
              <span>♡ .01</span>
            </div>
          </div>
        </section>
        <div className={s.ribbon} data-sticker-region="ribbon">
          <div className={cx(m.marqueeTrack, m.loop)} data-pink-loop="marquee" aria-hidden="true">
            {[0, 1].map((group) => (
              <div className={m.marqueeGroup} key={group} data-pink-marquee-group="">
                {[0, 1, 2].map((n) => (
                  <span className={m.marqueeUnit} key={n}>
                    SOFT GEL <i>✦</i> KAPPING <i>♡</i> NAIL ART <i>✦</i> POLYGEL <i>♡</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
          <button
            type="button"
            className={m.motionToggle}
            onClick={() => setMotionPaused((paused) => !paused)}
            aria-label={motionPaused ? "Reanudar movimiento decorativo" : "Pausar movimiento decorativo"}
            title={motionPaused ? "Reanudar movimiento" : "Pausar movimiento"}
          >
            {motionPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>

        <section
          className={cx(s.services, a.readableSurface)}
          id="services"
          data-sticker-region="services"
          aria-labelledby="pink-services-title"
        >
          <div className={s.serviceIntro}>
            <span className={s.eyebrow}>01 / LA CARTA DE AMOR</span>
            <h2 id="pink-services-title" className={m.serviceTitle} data-pink-reveal="" aria-label={c.copy.servicesTitle}>
              <MotionWords text={c.copy.servicesTitle} />
            </h2>
            <p>{c.copy.servicesIntro}</p>
            <span className={s.handNote}>
              tu nueva obsesión
              <br />
              empieza aquí ↗
            </span>
            <div className={s.serviceMini}>
              <GlossHeart />
              <span>
                {c.copy.servicesLove}
                <br />
                <strong>{c.copy.servicesLoveStrong}</strong>
              </span>
            </div>
          </div>
          <div className={cx(s.priceWindow, m.windowOpen)} data-pink-reveal="">
            <WindowBar title="reserva_tu_hora.exe" />
            <div className={s.notepadMenu}>
              <span>Tu servicio</span>
              <span>Tu momento</span>
              <span>Mucho amor ♡</span>
            </div>
            <div ref={bookingPanel} tabIndex={-1} role="region" aria-label="Reserva tu hora" className={cx(bella.root, s.inlineBooking)} style={{
              "--red": c.colors.accent,
              "--red-text": c.colors.accent,
              "--ink": c.colors.ink,
              "--paper": c.colors.surface,
              "--gray": "color-mix(in srgb, var(--pink-accent) 7%, var(--pink-surface))",
              "--line": "color-mix(in srgb, var(--pink-accent) 25%, var(--pink-surface))",
              "--bella-display": "var(--font-sans)",
              "--bella-body": "var(--font-sans)",
            } as CSSProperties}>
              {canBook ? <>
                {view.preview ? <p className={s.inlineNotice}>Vista previa · No se crean citas ni se realizan cobros.</p> : null}
                <BellaProvider view={bookingView}>
                  <BookingFlow catalog={catalog} today={today} presentation="embedded" />
                </BellaProvider>
              </> : <p className={s.empty} role="status">{catalog.services.length ? "La agenda estará disponible cuando el estudio configure su ubicación." : "Los servicios aparecerán aquí cuando estén configurados en la agenda."}</p>}
            </div>
            <p className={s.priceNote}><span>♡</span>{c.copy.servicesNote}</p>
            <div className={s.windowStatus}>
              <span>
                {catalog.mode === "demo"
                  ? "PRECIOS DE EJEMPLO · DEMOSTRACIÓN"
                  : "CATÁLOGO DEL NEGOCIO"}
              </span>
              <span aria-hidden="true">◢</span>
            </div>
          </div>
        </section>

        {c.visibility.gallery ? (
          <section
            className={s.gallerySection}
            id="gallery"
            data-sticker-region="gallery"
            aria-labelledby="pink-gallery-title"
          >
            <div className={s.sectionHeading}>
              <div>
                <span className={s.eyebrow}>02 / EL ÁLBUM</span>
                <h2 id="pink-gallery-title" className={m.albumTitle} data-pink-reveal="" aria-label={c.copy.galleryTitle}>
                  <MotionWords text={c.copy.galleryTitle} />
                </h2>
                <p>{c.copy.galleryIntro}</p>
              </div>
              <span className={cx(s.albumStamp, m.stampEntry)} data-pink-reveal="" aria-hidden="true">
                NAIL
                <br />
                LOVE
                <br />
                <Heart size={23} />
              </span>
            </div>
            <div className={s.galleryTools}>
              <div className={s.filters} aria-label="Filtrar galería">
                <button
                  type="button"
                  aria-pressed={!activeFilter}
                  onClick={() => setFilter("")}
                >
                  {c.copy.albumAll}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={activeFilter === category.id}
                    onClick={() => setFilter(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <span className={s.galleryTip}>toca para mirar de cerca ↗</span>
            </div>
            <div className={s.galleryRail}>
              {gallery.length ? (
                gallery.map((row, i) => (
                  <button
                    className={cx(s.galleryPhoto, m.polaroidEntry)}
                    data-pink-reveal=""
                    style={{ "--pink-delay": `${Math.min(i, 4) * 75}ms` } as CSSProperties}
                    type="button"
                    key={`${row.image}-${row.index}`}
                    onClick={() => setLightbox(row.index)}
                    aria-label={`Ampliar ${row.name}`}
                  >
                    <div className={s.galleryPhotoTop}>
                      <span>
                        IMG_{String(row.index + 1).padStart(3, "0")}.LOVE
                      </span>
                      <Plus size={14} />
                    </div>
                    <span className={s.galleryImage}>
                      <Photo
                        src={row.image}
                        alt={row.alt || row.name}
                        sizes="(max-width: 600px) 75vw, (max-width: 900px) 42vw, 23vw"
                        className={
                          row.focal === "left"
                            ? s.focalLeft
                            : row.focal === "right"
                              ? s.focalRight
                              : undefined
                        }
                      />
                    </span>
                    <span className={s.galleryCaption}>
                      <span>{row.name}</span>
                      <Heart
                        size={18}
                        fill={i === 0 ? "currentColor" : "none"}
                      />
                    </span>
                  </button>
                ))
              ) : (
                <p className={s.empty} role="status">
                  Tu álbum está esperando sus primeras fotos.
                </p>
              )}
            </div>
            {view.preview && business.id.startsWith("fixture-") ? (
              <p className={s.sampleNote}>
                Álbum de inspiración: imagen generada con IA y muestras de
                Bella. No representan trabajos verificados de este negocio.
              </p>
            ) : null}
          </section>
        ) : null}

        <section
          className={cx(s.guide, a.readableSurface)}
          id="guide"
          data-sticker-region="guide"
          aria-labelledby="pink-guide-title"
        >
          <div className={s.sectionHeading}>
            <div>
              <span className={s.eyebrow}>03 / HAGAMOS MATCH</span>
              <h2 id="pink-guide-title" className={m.guideTitle} data-pink-reveal="">{c.copy.guideTitle}</h2>
              <p>{c.copy.guideIntro}</p>
            </div>
            <GlossStar className={s.guideStar} chrome={c.appearance.decorations !== "classic"} heart={c.appearance.decorations === "hearts"} />
          </div>
          <div className={s.steps}>
            {c.copy.steps.map((row, i) => (
              <div key={i}>
                <span className={s.stepNumber}>
                  {String(i + 1).padStart(2, "0")}
                  <Heart size={15} />
                </span>
                <h3>{row.title}</h3>
                <p>{row.body}</p>
              </div>
            ))}
          </div>
          {c.about || c.aboutImage ? <div className={s.about}><div>{c.about ? <p>{c.about}</p> : null}</div>{c.aboutImage ? <div className={s.aboutPhoto}><Photo src={c.aboutImage} alt={`El espacio de ${c.displayName}`} sizes="(max-width: 600px) 90vw, 400px" /></div> : null}</div> : null}
          {c.visibility.policies ? (
            <div className={cx(s.policyWindow, m.policyEntry)} data-pink-reveal="">
              <WindowBar title="antes_de_tu_cita.txt" />
              <div className={s.policyContent}>
                <div>
                  <MapPin size={20} />
                  <h3>{c.city || business.address ? `Nos encontramos en ${c.city || business.address}` : "Tu cita, a tu manera"}</h3>
                  <p>{c.policy.modality}</p>
                </div>
                <details>
                  <summary>
                    <span>
                      <Heart size={19} />
                      {c.policy.title}
                    </span>
                    <Plus size={20} />
                  </summary>
                  <p>{c.policy.body}</p>
                </details>
              </div>
            </div>
          ) : null}
        </section>

        <section className={s.final} aria-labelledby="pink-final-title" data-sticker-region="final">
          <span className={s.finalHeart} aria-hidden="true">
            ♡
          </span>
          <span className={s.eyebrow}>{c.copy.finalEyebrow}</span>
          <h2 id="pink-final-title" className={m.finalTitle} data-pink-reveal="" aria-label={c.copy.finalTitle}>
            <MotionWords text={c.copy.finalTitle} />
          </h2>
          <p>{c.copy.finalBody}</p>
          {bookButton(s.primary)}
          <div className={cx(s.finalPixels, m.finalDetail)} data-pink-reveal="" aria-hidden="true">
            ✦ ♡ ✦
          </div>
        </section>
      </main>
      <footer className={cx(s.footer, a.readableSurface)} id="pink-contact" data-sticker-region="footer">
        <a href="#top" className={s.footerBrand}>
          {c.displayName}
          <Heart size={20} />
        </a>
        <p>{c.copy.footer}</p>
        {c.instagram ? (
          <a
            href={c.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram de ${c.displayName}`}
          >
            <Camera size={16} />
            Instagram
            <ArrowUpRight size={14} />
          </a>
        ) : null}
        <div className={s.contactLinks}>
          {business.address ? <span>{business.address}</span> : null}
          {business.mapsUrl ? <a href={business.mapsUrl} target="_blank" rel="noopener noreferrer">Cómo llegar ↗</a> : null}
          {c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : null}
          {c.whatsapp ? <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a> : null}
          {c.contactEmail ? <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a> : null}
          {c.facebook ? <a href={c.facebook} target="_blank" rel="noopener noreferrer">Facebook ↗</a> : null}
        </div>
        {business.hours?.length ? <details className={s.hours}><summary>Horarios</summary>{[...business.hours].sort((a,b) => a.dayOfWeek - b.dayOfWeek).map(row => <p key={row.dayOfWeek}>{["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][row.dayOfWeek]} · {row.isOpen ? `${row.startTime} — ${row.endTime}` : "Cerrado"}</p>)}</details> : null}
        <span className={s.credit}>
          Reservas con <strong>puragenda</strong> ♡
        </span>
      </footer>
      </div>
      <div
        className={s.mobileBooking}
        data-pink-booking-dock
        hidden={bookingInView}
        role="region"
        aria-label="Reserva rápida"
      >
        {bookButton(s.primary)}
        <span>{view.preview ? "Demo privada · no crea reservas" : c.city}</span>
      </div>

      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => !open && setLightbox(null)}
      >
        <DialogContent
          className={cx(s.root, s.lightbox, m.lightboxOpen)}
          style={pinkTokens(c)}
          showCloseButton={false}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") nextPhoto(1);
            if (event.key === "ArrowLeft") nextPhoto(-1);
          }}
        >
          <DialogTitle className={s.lightboxTitle}>
            {lightboxPhoto?.name || "Galería"}
          </DialogTitle>
          <DialogDescription className={s.srOnly}>
            {lightbox === -1 ? "Fotografía de portada del sitio." : view.preview
              ? "Fotografía de inspiración de muestra. Usa las flechas para cambiar de imagen."
              : "Usa las flechas para cambiar de imagen."}
          </DialogDescription>
          <DialogClose className={s.roundButton} aria-label="Cerrar imagen">
            <X size={22} />
          </DialogClose>
          {lightboxPhoto ? (
            <div
              className={s.lightboxImage}
              onPointerDown={(event) => {
                pointerStart.current = event.clientX;
              }}
              onPointerUp={(event) => {
                if (
                  pointerStart.current !== null &&
                  Math.abs(event.clientX - pointerStart.current) > 50
                )
                  nextPhoto(event.clientX > pointerStart.current ? -1 : 1);
                pointerStart.current = null;
              }}
            >
              <div className={m.photoChange} key={lightbox} style={{ position: "absolute", inset: 0 }}>
                <Photo
                  src={lightboxPhoto.image}
                  alt={lightboxPhoto.alt || lightboxPhoto.name}
                  sizes="(max-width: 600px) 95vw, 600px"
                />
              </div>
            </div>
          ) : null}
          <div className={s.lightboxControls}>
            <button
              type="button"
              className={s.roundButton}
              aria-label="Imagen anterior"
              disabled={lightbox === -1 || c.gallery.length < 2}
              onClick={() => nextPhoto(-1)}
            >
              <ChevronLeft />
            </button>
            <span aria-live="polite">
              {lightbox === -1 ? "1 / 1" : `${lightbox !== null ? lightbox + 1 : 0} / ${c.gallery.length}`}
            </span>
            <button
              type="button"
              className={s.roundButton}
              aria-label="Imagen siguiente"
              disabled={lightbox === -1 || c.gallery.length < 2}
              onClick={() => nextPhoto(1)}
            >
              <ChevronRight />
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <StickerCanvas root={root} stickers={c.stickers} editor={view.preview ? stickerEditor : undefined} onEdit={view.preview ? onStickerEdit : undefined}/>
    </div>
  );
}
