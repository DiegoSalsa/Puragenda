"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleHelp, Globe, Images, LayoutTemplate, LoaderCircle, Monitor, Palette, Phone, Smartphone, Sparkles, Users, Scissors, Heart, CalendarCheck } from "lucide-react";
import type { WebsiteEditorProps } from "@/websites/editor-types";
import { ritualConfigSchema, type RitualConfig } from "@/websites/templates/ritual/config";
import { RITUAL_PALETTES, RITUAL_COLOR_CONTROLS, ritualCustomColor, ritualTokens, validRitualPalette } from "@/websites/templates/ritual/palettes";
import { DraftAutosave } from "@/websites/autosave";
import { referencedAssets } from "@/websites/editor-utils";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import { saveWebsiteDraft, publishWebsite } from "@/server/actions/website.actions";
import { hasWebsiteEntitlement } from "@/websites/policy";
import TemplateSelector from "./template-selector";
import MediaPicker from "./media-picker";
import LivePreviewFrame from "./live-preview-frame";
import DomainPanel from "./domain-panel";
import RitualGalleryPanel from "./ritual-gallery-panel";
import RitualCopyFields from "./ritual-copy-fields";
import styles from "./website-builder.module.css";

type Props = WebsiteEditorProps<RitualConfig>;
const sections = [
  { key: "design", name: "Diseño", icon: Palette },
  { key: "hero", name: "Portada", icon: LayoutTemplate },
  { key: "services", name: "Terapias", icon: Scissors },
  { key: "staff", name: "Equipo", icon: Users },
  { key: "gallery", name: "Galería", icon: Images },
  { key: "faq", name: "Preguntas", icon: CircleHelp },
  { key: "business", name: "El espacio", icon: Heart },
  { key: "booking", name: "Reserva", icon: CalendarCheck },
  { key: "contact", name: "Contacto", icon: Phone },
  { key: "domain", name: "Dominio", icon: Globe },
] as const;
type Section = typeof sections[number]["key"];

export default function RitualEditor(props: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(props.initial), [subdomain, setSubdomain] = useState(props.subdomain), [section, setSection] = useState<Section>("design"), [viewport, setViewport] = useState<"desktop" | "mobile">("desktop"), [message, setMessage] = useState(""), [pending, start] = useTransition(), [uploads, setUploads] = useState(0), [visualMedia, setVisualMedia] = useState<Record<string, string>>({});
  const [autosave] = useState(() => new DraftAutosave<{ config: RitualConfig; subdomain: string }>({ config: props.initial, subdomain: props.subdomain }, props.revision, async (draft, revision) => {
    const parsed = ritualConfigSchema.safeParse({ ...draft.config, ...(draft.config.mediaAssets ? { mediaAssets: referencedAssets(draft.config) } : {}) });
    if (!parsed.success) return { error: "Revisa los datos antes de guardar." };
    return saveWebsiteDraft(parsed.data, revision, draft.subdomain, "ritual");
  }));
  const save = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot, autosave.getSnapshot), frame = useRef<HTMLIFrameElement>(null), payload = useRef<unknown>(null), sequence = useRef(0), focus = useRef<string | undefined>(undefined);
  const active = hasWebsiteEntitlement(props.addon, new Date(), props.offer), controls = useRef<HTMLDivElement>(null);
  const visualConfig = {
    ...config,
    gallery: config.gallery.map((item, index) => visualMedia[`gallery.${index}`] ? { ...item, image: visualMedia[`gallery.${index}`] } : item),
    ...(visualMedia.galleryNew ? { gallery: [...config.gallery, { image: visualMedia.galleryNew, name: "Tu nueva foto", alt: "Foto del espacio", category: "", categoryIds: [] }] } : {}),
    ...Object.fromEntries(Object.entries(visualMedia).filter(([key]) => ["heroImage", "aboutImage", "logo", "favicon", "socialImage"].includes(key))),
  } as RitualConfig;

  function sendPreview() { if (payload.current) frame.current?.contentWindow?.postMessage(payload.current, window.location.origin); }
  function focusField(key: string) {
    focus.current = key;
    frame.current?.contentWindow?.postMessage({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: ++sequence.current, config: visualConfig, focus: key }, window.location.origin);
  }
  function update(next: (value: RitualConfig) => RitualConfig) { setConfig(next); setMessage(""); }
  function media(key: "heroImage" | "aboutImage" | "logo" | "favicon" | "socialImage", label: string, usage: "hero" | "about" | "logo" | "favicon" | "social") {
    return <MediaPicker label={label} value={config[key]} usage={usage} onChange={(url, asset) => update(c => ({ ...c, [key]: url, ...(asset ? { mediaAssets: [...(c.mediaAssets ?? []).filter(x => x.id !== asset.id), asset] } : {}) }))} onBusy={busy => setUploads(n => Math.max(0, n + (busy ? 1 : -1)))} onLocalPreview={url => setVisualMedia(c => { const next = { ...c }; if (url) next[key] = url; else delete next[key]; return next; })} onFocus={() => focusField(key)} />;
  }
  function field(key: "phone" | "whatsapp" | "contactEmail" | "instagram" | "facebook" | "seoTitle" | "seoDescription", label: string, multiline = false) {
    const value = config[key];
    return <label className={styles.field}>{label}{multiline ? <textarea value={value} onFocus={() => focusField(key)} onChange={event => update(c => ({ ...c, [key]: event.target.value }))} /> : <input value={value} onFocus={() => focusField(key)} onChange={event => update(c => ({ ...c, [key]: event.target.value }))} />}</label>;
  }
  const run = (operation: () => Promise<unknown>, success: string) => start(async () => {
    try {
      const result = await operation();
      if (result && typeof result === "object" && "error" in result && typeof result.error === "string") throw new Error(result.error);
      setMessage(success);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No pudimos completar el cambio");
    }
  });

  useEffect(() => {
    payload.current = { protocol: PREVIEW_PROTOCOL, type: "draft", sequence: ++sequence.current, config: visualConfig, ...(focus.current ? { focus: focus.current } : {}) };
    focus.current = undefined;
    sendPreview();
  });
  useEffect(() => {
    const ready = (event: MessageEvent) => { if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.protocol === PREVIEW_PROTOCOL && event.data?.type === "ready") sendPreview(); };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, []);
  useEffect(() => { autosave.update({ config, subdomain }); }, [autosave, config, subdomain]);
  useEffect(() => { autosave.pause(uploads > 0); }, [autosave, uploads]);
  useEffect(() => { autosave.resume(); return () => autosave.dispose(); }, [autosave]);

  const tokens = ritualTokens(config), unpublished = props.status !== "PUBLISHED" || save.revision !== props.publishedRevision || save.dirty;
  return <div className={styles.builder}>
    <header className={styles.topbar}>
      <div className={styles.title}><h1>Mi sitio</h1><p>Ritual · Masajes / Wellness / Terapias</p></div>
      <span className={styles.saveStatus}>{save.status === "saving" ? <LoaderCircle size={14} /> : <Check size={14} />}{save.status === "saving" ? "Guardando…" : "Guardado"}</span>
      {props.status === "PUBLISHED" ? <a className={styles.secondary} href={props.publicUrl} target="_blank" rel="noopener noreferrer">Ver sitio</a> : null}
      <button className={styles.publish} disabled={pending || uploads > 0 || !active || !unpublished} onClick={() => run(async () => { await autosave.flush(); return publishWebsite(autosave.getSnapshot().revision); }, "¡Tu sitio está publicado!")}><Sparkles size={14} />Publicar cambios</button>
    </header>
    <div className={styles.body}>
      <nav className={styles.navigation} role="tablist" aria-label="Editar mi sitio">{sections.map(item => <button key={item.key} role="tab" aria-selected={section === item.key} onClick={() => setSection(item.key)}><item.icon size={18} />{item.name}</button>)}</nav>
      <div className={styles.controls} ref={controls}>
        {section === "design" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>Diseño</h2><p className={styles.helper}>Una composición cálida y editorial para tu negocio.</p></div><TemplateSelector active={props.templateKey} flush={() => autosave.flush()} revision={() => autosave.getSnapshot().revision} disabled={pending || uploads > 0} /><div className={styles.divider}><h3>Paleta Ritual</h3>{RITUAL_PALETTES.map(palette => <button type="button" key={palette.key} className={styles.palette} aria-pressed={config.paletteMode === "preset" && config.accent === palette.key} onClick={() => update(c => ({ ...c, accent: palette.key, paletteMode: "preset" }))}><span className={styles.swatches}>{palette.colors.map(color => <i key={color} style={{ background: color }} />)}</span><span className={styles.paletteName}>{palette.name}<small>{palette.description}</small></span></button>)}<details className={styles.googleSettings} open={config.paletteMode === "custom"}><summary>Crear mis colores</summary><div className={styles.paletteGrid}>{RITUAL_COLOR_CONTROLS.map(({ key, label }) => <label className={styles.field} key={key}>{label}<input type="color" value={tokens[key]} onChange={event => update(c => ({ ...c, paletteMode: "custom", customPalette: ritualCustomColor(ritualTokens(c), key, event.target.value) }))} /></label>)}</div></details><p className={styles.helper} role={!validRitualPalette(tokens) ? "alert" : undefined}>{validRitualPalette(tokens) ? "Paleta con contraste AA." : "Aumenta el contraste antes de publicar."}</p></div></section> : null}
        {section === "hero" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>Portada</h2><p className={styles.helper}>Edita la primera impresión sin cambiar el flujo de reservas.</p></div><RitualCopyFields area="hero" config={config} update={update} focusField={focusField} />{media("heroImage", "Fotografía principal", "hero")}{media("logo", "Logo", "logo")}{media("favicon", "Icono del sitio", "favicon")}</section> : null}
        {section === "services" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>Tratamientos</h2><p className={styles.helper}>Servicios, precios y duración vienen de Puragenda.</p></div><RitualCopyFields area="services" config={config} update={update} focusField={focusField} /><label className={styles.field}>Tratamiento destacado<select value={config.featuredServiceId} onChange={event => update(c => ({ ...c, featuredServiceId: event.target.value }))}><option value="">Primero de la lista</option>{props.view.catalog.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><div className={styles.toggleGrid}>{(["showFeatured", "showGallery", "showStaff", "showAbout", "showSensory", "showFaq"] as const).map(key => <label className={styles.checkbox} key={key}><input type="checkbox" checked={config.visibility[key]} onChange={event => update(c => ({ ...c, visibility: { ...c.visibility, [key]: event.target.checked } }))} />{{ showFeatured: "Destacado", showGallery: "Galería", showStaff: "Equipo", showAbout: "Espacio", showSensory: "Pausa", showFaq: "Preguntas" }[key]}</label>)}</div><p className={styles.helper}>{props.view.catalog.services.length} servicios conectados. <a href="/dashboard/services">Administrar servicios</a></p></section> : null}
        {section === "staff" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>Equipo</h2><p className={styles.helper}>Nombres, servicios y disponibilidad vienen de Puragenda. Aquí ajustas la presentación.</p></div><RitualCopyFields area="staff" config={config} update={update} focusField={focusField} />{props.view.catalog.staff.map(person => { const editorial = config.staffEditorial[person.id] ?? { label: "", note: "", visible: true }; return <div className={styles.divider} key={person.id}><div className={styles.row}><strong>{person.name}</strong><label className={styles.checkbox}><input type="checkbox" checked={editorial.visible !== false} onChange={event => update(c => ({ ...c, staffEditorial: { ...c.staffEditorial, [person.id]: { ...editorial, visible: event.target.checked } } }))} />Mostrar en la web</label></div><p className={styles.helper}>{props.view.catalog.services.filter(service => !person.serviceIds.length || person.serviceIds.includes(service.id)).map(service => service.name).join(" · ") || "Sin servicios asignados"}</p><label className={styles.field}>Etiqueta visual<input value={editorial.label} placeholder={config.copy.staffDefaultLabel} onChange={event => update(c => ({ ...c, staffEditorial: { ...c.staffEditorial, [person.id]: { ...editorial, label: event.target.value } } }))} /></label><label className={styles.field}>Nota corta<textarea value={editorial.note} onChange={event => update(c => ({ ...c, staffEditorial: { ...c.staffEditorial, [person.id]: { ...editorial, note: event.target.value } } }))} /></label></div>; })}</section> : null}
        {section === "gallery" ? <section className={styles.panel}><RitualCopyFields area="gallery" config={config} update={update} focusField={focusField} /><RitualGalleryPanel config={config} update={update} busy={busy => setUploads(n => Math.max(0, n + (busy ? 1 : -1)))} uploadCount={uploads} onLocal={(key, url) => setVisualMedia(current => { const next = { ...current }; if (url) next[key] = url; else delete next[key]; return next; })} highlight={filter => focusField(filter || "galleryTitle")} /></section> : null}
        {section === "faq" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>Preguntas frecuentes</h2><p className={styles.helper}>Opcional. Añade respuestas prácticas y prudentes.</p></div><RitualCopyFields area="faq" config={config} update={update} focusField={focusField} />{config.faq.map((item, index) => <div className={styles.divider} key={item.id}><label className={styles.field}>Pregunta<input value={item.question} onFocus={() => focusField("faqTitle")} onChange={event => update(c => ({ ...c, faq: c.faq.map((row, rowIndex) => rowIndex === index ? { ...row, question: event.target.value } : row) }))} /></label><label className={styles.field}>Respuesta<textarea value={item.answer} onChange={event => update(c => ({ ...c, faq: c.faq.map((row, rowIndex) => rowIndex === index ? { ...row, answer: event.target.value } : row) }))} /></label><button className={styles.secondary} onClick={() => update(c => ({ ...c, faq: c.faq.filter((_, rowIndex) => rowIndex !== index) }))}>Quitar pregunta</button></div>)}<button className={styles.secondary} onClick={() => update(c => ({ ...c, faq: [...c.faq, { id: `faq-${Date.now()}`, question: "", answer: "" }] }))}>Añadir pregunta</button></section> : null}
        {section === "business" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>El espacio</h2><p className={styles.helper}>Cuenta qué hace especial a tu espacio y cómo llegar preparado.</p></div><RitualCopyFields area="business" config={config} update={update} focusField={focusField} />{media("aboutImage", "Fotografía del espacio", "about")}</section> : null}
        {section === "booking" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>Reserva</h2><p className={styles.helper}>Las etiquetas se pueden adaptar; el flujo y la validación siguen siendo del sistema.</p></div><RitualCopyFields area="booking" config={config} update={update} focusField={focusField} /></section> : null}
        {section === "contact" ? <section className={styles.panel}><div className={styles.panelHeading}><h2>Contacto</h2></div><RitualCopyFields area="contact" config={config} update={update} focusField={focusField} />{field("phone", "Teléfono")}{field("whatsapp", "WhatsApp")}{field("contactEmail", "Correo")}{field("instagram", "Instagram")}{field("facebook", "Facebook")}{media("socialImage", "Imagen para compartir", "social")}<details className={styles.googleSettings}><summary>SEO opcional</summary><div>{field("seoTitle", "Título SEO")}{field("seoDescription", "Descripción SEO", true)}</div></details></section> : null}
        {section === "domain" ? <DomainPanel subdomain={subdomain} rootDomain={props.rootDomain} domains={props.domains} requests={props.requests} onSubdomain={setSubdomain} canManage={props.canManageDomains} /> : null}
      </div>
      <div className={styles.previewArea}><div className={styles.previewToolbar}><div className={styles.segmented}><button aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}><Monitor size={13} />Escritorio</button><button aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}><Smartphone size={13} />Móvil</button></div><span className={styles.previewCaption}>Vista previa en vivo · solo tú puedes verla</span></div><LivePreviewFrame mobile={viewport === "mobile"} frame={frame} onLoad={sendPreview} /></div>
    </div>
    {message ? <div className={styles.notice} role="status">{message}</div> : null}
  </div>;
}
