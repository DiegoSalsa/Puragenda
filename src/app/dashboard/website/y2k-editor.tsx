"use client";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Globe, Heart, Scissors, Images, LayoutTemplate, LoaderCircle, Monitor, Palette, Phone, Smartphone, Sparkles } from "lucide-react";
import { pinkConfigSchema, validPinkPalette, type PinkConfig } from "@/websites/templates/pink-y2k/config";
import type { WebsiteEditorProps } from "@/websites/editor-types";
import TemplateSelector from "./template-selector";
import type { WebsiteAsset } from "@/websites/media";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import type { PreviewField } from "@/websites/preview-protocol";
import { DraftAutosave } from "@/websites/autosave";
import { normalizeSocial, referencedAssets } from "@/websites/editor-utils";
import { websiteMetadata } from "@/websites/metadata";
import { hasWebsiteEntitlement } from "@/websites/policy";
import { saveWebsiteDraft, publishWebsite } from "@/server/actions/website.actions";
import MediaPicker from "./media-picker";
import MatchdayGalleryPanel from "./matchday-gallery-panel";
import LivePreviewFrame from "./live-preview-frame";
import MediaLibrary from "./media-library";
import DomainPanel from "./domain-panel";
import BillingPanel from "./billing-panel";
import styles from "./website-builder.module.css";
type Props = WebsiteEditorProps<PinkConfig>;
const sections = [
  { key: "design", name: "Diseño", icon: Palette }, { key: "hero", name: "Portada", icon: LayoutTemplate },
  { key: "services", name: "Servicios", icon: Scissors }, { key: "gallery", name: "Galería", icon: Images }, { key: "business", name: "Mi negocio", icon: Heart },
  { key: "contact", name: "Contacto", icon: Phone }, { key: "domain", name: "Dominio", icon: Globe },
] as const;
type Section = typeof sections[number]["key"];
type Draft = { config: PinkConfig; subdomain: string };
type ImageKey = "logo" | "favicon" | "heroImage" | "aboutImage" | "socialImage";
type TextKey = "displayName" | "intro" | "heroCaption" | "city" | "about" | "phone" | "whatsapp" | "contactEmail" | "seoTitle" | "seoDescription";
export default function WebsiteEditor(props: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(props.initial), [subdomain, setSubdomain] = useState(props.subdomain);
  const [section, setSection] = useState<Section>("design"), [viewport, setViewport] = useState<"desktop" | "mobile">("desktop"), [mode, setMode] = useState<"edit" | "preview">("edit");
  const [customizeGoogle, setCustomizeGoogle] = useState(Boolean(config.seoTitle || config.seoDescription));
  const [message, setMessage] = useState(""), [pending, start] = useTransition(), [uploadCount, setUploadCount] = useState(0);
  const [visualMedia, setVisualMedia] = useState<Record<string, string>>({});
  const [autosave] = useState(() => new DraftAutosave<Draft>({ config: props.initial, subdomain: props.subdomain }, props.revision, async (draft, revision) => {
    const result = pinkConfigSchema.safeParse({ ...draft.config, ...(draft.config.mediaAssets ? { mediaAssets: referencedAssets(draft.config) } : {}) });
    if (!result.success) return { error: "Revisa los datos de contacto o espera a que termine la foto." };
    return saveWebsiteDraft(result.data, revision, draft.subdomain, "y2k");
  }));
  const save = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot, autosave.getSnapshot);
  const frame = useRef<HTMLIFrameElement>(null), sequence = useRef(0), focus = useRef<PreviewField | undefined>(undefined), payload = useRef<unknown>(null);
  const controls = useRef<HTMLDivElement>(null);
  const active = hasWebsiteEntitlement(props.addon, new Date(), props.offer);
  const visualConfig = { ...config };
  for (const [key, value] of Object.entries(visualMedia)) {
    if (key.startsWith("gallery.")) { const index = Number(key.slice(8)); visualConfig.gallery = visualConfig.gallery.map((item, i) => i === index ? { ...item, image: value } : item); }
    else if (key === "galleryNew") visualConfig.gallery = [...visualConfig.gallery, { image: value, name: "Tu nueva foto", alt: "Foto del trabajo del negocio", category: "" }];
    else visualConfig[key as ImageKey] = value;
  }
  function sendPreview() { if (payload.current) frame.current?.contentWindow?.postMessage(payload.current, window.location.origin); }
  useEffect(() => { payload.current = { protocol: PREVIEW_PROTOCOL, type: "draft", sequence: ++sequence.current, config: visualConfig, ...(focus.current ? { focus: focus.current } : {}) }; focus.current = undefined; sendPreview(); });
  useEffect(() => {
    function ready(event: MessageEvent) { if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.protocol === PREVIEW_PROTOCOL && event.data?.type === "ready") sendPreview(); }
    window.addEventListener("message", ready); return () => window.removeEventListener("message", ready);
  }, []);
  useEffect(() => { autosave.update({ config, subdomain }); }, [config, subdomain, autosave]);
  useEffect(() => { autosave.pause(uploadCount > 0); }, [uploadCount, autosave]);
  useEffect(() => { autosave.resume(); return () => autosave.dispose(); }, [autosave]);
  useEffect(() => {
    function leave(event: BeforeUnloadEvent) { if (save.dirty || uploadCount > 0) { event.preventDefault(); event.returnValue = ""; } }
    window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave);
  }, [save.dirty, uploadCount]);
  useEffect(() => {
    function navigate(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target || event.ctrlKey || event.metaKey || !save.dirty && !uploadCount) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      if (uploadCount) { setMessage("Espera a que termine la subida antes de salir del editor."); return; }
      void autosave.flush().then(() => router.push(destination.pathname + destination.search)).catch(() => setMessage("No pudimos guardar tus cambios. Reintenta antes de salir."));
    }
    document.addEventListener("click", navigate, true); return () => document.removeEventListener("click", navigate, true);
  }, [save.dirty, uploadCount, autosave, router]);
  function highlight(field: PreviewField) { focus.current = field; frame.current?.contentWindow?.postMessage({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: ++sequence.current, config: visualConfig, focus: field }, window.location.origin); }
  function update(next: (current: PinkConfig) => PinkConfig) { setConfig(next); setMessage(""); }
  function change<K extends keyof PinkConfig>(key: K, value: PinkConfig[K]) { update(previous => ({ ...previous, [key]: value })); }
  function localPreview(key: string, url: string | null) { setVisualMedia(previous => { const next = { ...previous }; if (url) next[key] = url; else delete next[key]; return next; }); }
  function busy(value: boolean) { setUploadCount(previous => Math.max(0, previous + (value ? 1 : -1))); }
  function applyImage(key: ImageKey, url: string, asset?: WebsiteAsset) { update(previous => ({ ...previous, [key]: url, ...(asset ? { mediaAssets: [...(previous.mediaAssets ?? []).filter(item => item.id !== asset.id), asset] } : {}) })); }
  const media = (key: ImageKey, label: string, usage: "hero" | "about" | "logo" | "favicon" | "social") => <MediaPicker label={label} value={config[key]} usage={usage} onChange={(url, asset) => applyImage(key, url, asset)} onBusy={busy} onLocalPreview={url => localPreview(key, url)} onFocus={() => highlight(key === "socialImage" || key === "favicon" ? "heroImage" : key)} />;
  const field = (key: TextKey, label: string, multiline = false, helper?: string) => {
    const limits = { displayName: 160, intro: 600, heroCaption: 180, city: 100, about: 3000, phone: 30, whatsapp: 20, contactEmail: 320, seoTitle: 160, seoDescription: 300 };
    const target: PreviewField = ["phone", "whatsapp", "contactEmail", "city"].includes(key) ? "contact" : ["seoTitle", "seoDescription"].includes(key) ? "headline" : key as PreviewField;
    return <label className={styles.field}>{label}{multiline ? <textarea rows={key === "about" ? 6 : 3} maxLength={limits[key]} value={config[key]} onFocus={() => highlight(target)} onChange={e => change(key, e.target.value)} /> : <input value={config[key]} maxLength={limits[key]} onFocus={() => highlight(target)} onChange={e => change(key, key === "whatsapp" ? e.target.value.replace(/[^+0-9]/g, "") : e.target.value)} />}{helper ? <span className={styles.helper}>{helper}</span> : null}</label>;
  };
  function copyText(key: Exclude<keyof PinkConfig["copy"], "steps">, label: string) {
    const shape = pinkConfigSchema.shape.copy.unwrap().shape[key];
    const max = shape.unwrap().maxLength ?? 300;
    return <label className={styles.field}>{label}<textarea maxLength={max} value={config.copy[key]} onChange={e => update(c => ({ ...c, copy: { ...c.copy, [key]: e.target.value } }))} /></label>;
  }
  const google = websiteMetadata({ ...props.view, config });
  function run(operation: () => Promise<unknown>, success: string) {
    start(async () => { try { const result = await operation(); if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error)); setMessage(success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos completar el cambio"); } });
  }
  const unpublished = props.status !== "PUBLISHED" || save.revision !== props.publishedRevision || save.dirty;
  return <div className={styles.builder} data-mode={mode}>
    <header className={styles.topbar}>
      <div className={styles.title}><h1>Mi sitio</h1><p>{props.status === "PUBLISHED" ? unpublished ? "Publicado · cambios pendientes" : "Tu sitio está publicado" : props.status === "SUSPENDED" ? "Tu sitio está pausado" : "Tu próximo sitio empieza aquí"}</p></div>
      <span className={styles.saveStatus} data-error={save.status === "error"} role="status">{save.status === "saving" || uploadCount ? <LoaderCircle size={14} className={styles.spin} /> : save.status === "saved" ? <CheckCircle2 size={14} /> : null}{uploadCount ? "Preparando fotos" : save.status === "saving" ? "Guardando…" : save.status === "pending" ? "Cambios pendientes" : save.status === "error" ? "No se pudo guardar" : "Guardado"}</span>
      {props.status === "PUBLISHED" ? <a className={styles.secondary} href={props.publicUrl} target="_blank" rel="noopener noreferrer">Ver sitio<ExternalLink size={13} /></a> : null}
      <button className={styles.publish} disabled={pending || uploadCount > 0 || !active || !unpublished} onClick={() => run(async () => { await autosave.flush(); return publishWebsite(autosave.getSnapshot().revision); }, "¡Tu sitio está publicado!")}>{pending ? <LoaderCircle size={14} className={styles.spin} /> : <Sparkles size={14} />}Publicar cambios</button>
    </header>
    <div className={styles.mobileTabs}><button aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>Editar</button><button aria-pressed={mode === "preview"} onClick={() => { setViewport("mobile"); setMode("preview"); }}>Vista previa</button></div>
    {save.status === "error" ? <div className={styles.notice} role="alert">{save.error}<button onClick={() => run(() => autosave.flush(), "Cambios guardados")}>Reintentar</button><button onClick={() => { if (window.confirm("Recargar recupera la última versión guardada y descarta los cambios locales. ¿Continuar?")) window.location.reload(); }}>Recargar</button></div> : null}
    {message ? <div className={styles.notice} role="status">{message}<button aria-label="Cerrar aviso" onClick={() => setMessage("")}>Cerrar</button></div> : null}
    {!active ? <div className={styles.notice}>Puedes preparar tu sitio. Activa Sitio Web para publicarlo.<button onClick={() => { setSection("business"); window.setTimeout(() => document.getElementById("website-billing")?.scrollIntoView({ behavior: "smooth" }), 100); }}>Ver suscripción</button></div> : null}
    <div className={styles.body}>
      <nav className={styles.navigation} role="tablist" aria-label="Editar mi sitio">{sections.map(item => <button key={item.key} id={`website-tab-${item.key}`} role="tab" aria-selected={section === item.key} aria-controls={`website-panel-${item.key}`} onClick={() => { setSection(item.key); controls.current?.scrollTo(0, 0); if (item.key === "hero") highlight("headline"); if (item.key === "gallery") highlight("gallery"); if (item.key === "business") highlight("about"); if (item.key === "contact") highlight("contact"); }}><item.icon size={19} strokeWidth={1.6} />{item.name}</button>)}</nav>
      <div className={styles.controls} ref={controls}>
        <section className={styles.panel} hidden={section !== "design"} id="website-panel-design" role="tabpanel" aria-labelledby="website-tab-design">
          <div className={styles.panelHeading}><h2>Diseño</h2><p className={styles.helper}>Y2K · Nail art con personalidad</p></div>
          <TemplateSelector active={props.templateKey} flush={async () => { await autosave.flush(); }} revision={() => autosave.getSnapshot().revision} disabled={pending || uploadCount > 0} />
          <div className={styles.divider}><h3>Los colores de tu sitio</h3>{(["accent", "ink", "background", "surface"] as const).map(token => <label className={styles.field} key={token}>{{ accent: "Acento", ink: "Texto", background: "Fondo", surface: "Ventanas y tarjetas" }[token]}<span className={styles.row}><input type="color" aria-label={`Color ${token}`} value={config.colors[token]} onChange={e => update(c => ({ ...c, colors: { ...c.colors, [token]: e.target.value } }))} /><span>{config.colors[token]}</span></span></label>)}{!validPinkPalette(config) ? <p className={styles.helper} role="alert">Aumenta el contraste entre texto y fondo antes de publicar.</p> : null}</div>
          <div className={styles.divider}><h3>Secciones visibles</h3>{(["gallery", "pocket", "policies"] as const).map(key => <label key={key} className={styles.field}><span><input type="checkbox" checked={config.visibility[key]} onChange={e => update(c => ({ ...c, visibility: { ...c.visibility, [key]: e.target.checked } }))} /> {{ gallery: "Galería", pocket: "Love Pocket", policies: "Condiciones antes de la cita" }[key]}</span></label>)}</div>
        </section>
        <section className={styles.panel} hidden={section !== "hero"} id="website-panel-hero" role="tabpanel" aria-labelledby="website-tab-hero">
          <div className={styles.panelHeading}><h2>Portada</h2><p className={styles.helper}>Tu identidad, una foto y un universo propio.</p></div>
          {field("displayName", "Nombre visible", false, `Si queda vacío, usamos ${props.view.business.name}.`)}
          {config.headline.map((line, i) => <label className={styles.field} key={i}>Titular · línea {i + 1}<input maxLength={55} value={line} onFocus={() => highlight("headline")} onChange={e => change("headline", config.headline.map((text, j) => j === i ? e.target.value : text) as PinkConfig["headline"])} /></label>)}
          {field("intro", "Bajada", true)}{field("city", "Ciudad o ubicación", false, "La dirección y los horarios del negocio aparecen en Contacto.")}
          {copyText("eyebrow", "Texto pequeño superior")}{copyText("brandTagline", "Descripción bajo el nombre")}{copyText("reserve", "Botón de reserva")}{copyText("secondary", "Botón secundario")}{copyText("sticker", "Sticker")}{copyText("heroNote", "Nota manuscrita")}{copyText("heroFile", "Texto al pie de la portada")}
          {media("heroImage", "Foto principal", "hero")}{field("heroCaption", "Descripción de la foto")}{media("logo", "Logo", "logo")}{media("favicon", "Icono del sitio", "favicon")}
          <details className={styles.googleSettings}><summary>Love Pocket</summary><div><label className={styles.field}>Nombre del dispositivo<input maxLength={40} value={config.pocket.name} onChange={e => update(c => ({ ...c, pocket: { ...c.pocket, name: e.target.value } }))} /></label>{config.pocket.messages.map((row, i) => <div className={styles.divider} key={i}><h3>Mensaje {i + 1}</h3>{(["title", "body"] as const).map(key => <label className={styles.field} key={key}>{key === "title" ? "Título" : "Mensaje"}<input maxLength={key === "title" ? 45 : 100} value={row[key]} onChange={e => update(c => ({ ...c, pocket: { ...c.pocket, messages: c.pocket.messages.map((message, j) => j === i ? { ...message, [key]: e.target.value } : message) } }))} /></label>)}<button className={styles.secondary} disabled={config.pocket.messages.length === 1} onClick={() => update(c => ({ ...c, pocket: { ...c.pocket, messages: c.pocket.messages.filter((_, j) => j !== i) } }))}>Retirar mensaje</button></div>)}<button className={styles.secondary} disabled={config.pocket.messages.length >= 6} onClick={() => update(c => ({ ...c, pocket: { ...c.pocket, messages: [...c.pocket.messages, { title: "Nuevo mensaje", body: "" }] } }))}>Añadir mensaje</button></div></details>
          <details className={styles.googleSettings}><summary>Navegación</summary><div>{copyText("navServices", "Enlace a servicios")}{copyText("navGallery", "Enlace a galería")}{copyText("navGuide", "Enlace a la guía")}</div></details>
        </section>
        <section className={styles.panel} hidden={section !== "services"} id="website-panel-services" role="tabpanel" aria-labelledby="website-tab-services">
          <div className={styles.panelHeading}><h2>Servicios</h2><p className={styles.helper}>Los servicios, precios, opciones y profesionales se toman de tu agenda.</p></div>
          {copyText("servicesTitle", "Título")}{copyText("servicesIntro", "Introducción")}{copyText("servicesNote", "Nota bajo los precios")}{copyText("servicesLove", "Frase manuscrita")}{copyText("servicesLoveStrong", "Cierre de la frase")}
          {props.view.catalog.services.map(service => <div className={styles.divider} key={service.id}><h3>{service.name}</h3><p className={styles.helper}>{service.duration} min · {new Intl.NumberFormat("es-CL", { style: "currency", currency: props.view.catalog.business.currency }).format(service.price)}</p></div>)}
          <a className={styles.secondary} href="/dashboard/services">Administrar servicios</a>
        </section>
        <section className={styles.panel} hidden={section !== "gallery"} id="website-panel-gallery" role="tabpanel" aria-labelledby="website-tab-gallery">
          <div className={styles.panelHeading}><h2>Galería</h2></div>{copyText("galleryTitle", "Título")}{copyText("galleryIntro", "Introducción")}{copyText("albumAll", "Filtro de todas las fotos")}
          <MatchdayGalleryPanel config={config} update={update} busy={busy} uploadCount={uploadCount} onLocal={localPreview} helper="Sube tus trabajos, ordénalos y agrúpalos por categoría. Las fotos de la demo no se incorporan a tu negocio." />
        </section>
        <section className={styles.panel} hidden={section !== "business"} id="website-panel-business" role="tabpanel" aria-labelledby="website-tab-business">
          <div className={styles.panelHeading}><h2>Mi negocio</h2></div>{field("about", "Sobre tu negocio", true)}{media("aboutImage", "Foto del espacio", "about")}
          <div className={styles.divider}><h3>Antes de la cita</h3>{copyText("guideTitle", "Título de la guía")}{copyText("guideIntro", "Introducción de la guía")}{config.copy.steps.map((row, i) => <div key={i} className={styles.divider}><h3>Paso {i + 1}</h3>{(["title", "body"] as const).map(key => <label className={styles.field} key={key}>{key === "title" ? "Título del paso" : "Descripción del paso"}<textarea maxLength={key === "title" ? 80 : 300} value={row[key]} onChange={e => update(c => ({ ...c, copy: { ...c.copy, steps: c.copy.steps.map((step, j) => j === i ? { ...step, [key]: e.target.value } : step) } }))} /></label>)}<button className={styles.secondary} onClick={() => update(c => ({ ...c, copy: { ...c.copy, steps: c.copy.steps.filter((_, j) => j !== i) } }))}>Retirar paso</button></div>)}<button className={styles.secondary} disabled={config.copy.steps.length >= 5} onClick={() => update(c => ({ ...c, copy: { ...c.copy, steps: [...c.copy.steps, { title: "Nuevo paso", body: "" }] } }))}>Añadir paso</button></div>
          <div className={styles.divider}><h3>Condiciones de tu negocio</h3><p className={styles.helper}>Activa esta sección en Diseño cuando hayas completado tus condiciones.</p>{(["title", "body", "modality"] as const).map(key => <label className={styles.field} key={key}>{{ title: "Título de condiciones", body: "Condiciones y cuidados", modality: "Modalidad de atención" }[key]}<textarea maxLength={key === "body" ? 1000 : key === "modality" ? 240 : 120} value={config.policy[key]} onChange={e => update(c => ({ ...c, policy: { ...c.policy, [key]: e.target.value } }))} /></label>)}</div>
          <BillingPanel key={`${props.offer?.trialStartedAt}:${props.addon?.status}:${props.addon?.cancelAt}:${props.addon?.validUntil}:${props.addon?.agreementStatus}`} addon={props.addon} offer={props.offer} price={props.price} canManage={props.canManageDomains} />
        </section>
        <section className={styles.panel} hidden={section !== "contact"} id="website-panel-contact" role="tabpanel" aria-labelledby="website-tab-contact">
          <div className={styles.panelHeading}><h2>Contacto</h2><p className={styles.helper}>La dirección y los horarios vienen de la configuración del negocio.</p></div>
          {field("phone", "Teléfono")}{field("whatsapp", "WhatsApp")}{field("contactEmail", "Email")}
          <SocialField network="instagram" value={config.instagram} onFocus={() => highlight("contact")} onChange={value => change("instagram", value)} /><SocialField network="facebook" value={config.facebook} onFocus={() => highlight("contact")} onChange={value => change("facebook", value)} />
          {copyText("finalEyebrow", "Texto pequeño del cierre")}{copyText("finalTitle", "Título del cierre")}{copyText("finalBody", "Bajada del cierre")}{copyText("footer", "Frase al pie")}
          <div className={styles.googlePreview}><p className={styles.helper}>Cómo aparecerá tu negocio en Google</p><strong>{google.title}</strong><p>{google.description}</p></div><label className={styles.field}><span><input type="checkbox" checked={customizeGoogle} onChange={e => setCustomizeGoogle(e.target.checked)} /> Personalizar vista de Google</span></label>{customizeGoogle ? <>{field("seoTitle", "Título de Google")}{field("seoDescription", "Descripción", true)}{media("socialImage", "Imagen al compartir", "social")}</> : null}
          <MediaLibrary before={async () => { await autosave.flush(); }} disabled={pending || uploadCount > 0} />
        </section>
        <section hidden={section !== "domain"} id="website-panel-domain" role="tabpanel" aria-labelledby="website-tab-domain"><DomainPanel subdomain={subdomain} rootDomain={props.rootDomain} domains={props.domains} requests={props.requests} onSubdomain={setSubdomain} canManage={props.canManageDomains} /></section>
      </div>
      <div className={styles.previewArea}><div className={styles.previewToolbar}><div className={styles.segmented}><button aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}><Monitor size={13} />Escritorio</button><button aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}><Smartphone size={13} />Móvil</button></div><span className={styles.previewCaption}>Vista previa en vivo · solo tú puedes verla</span></div><LivePreviewFrame mobile={viewport === "mobile"} frame={frame} onLoad={sendPreview} /></div>
    </div>
  </div>;
}
function SocialField({ network, value, onChange, onFocus }: { network: "instagram" | "facebook"; value: string; onChange: (value: string) => void; onFocus: () => void }) {
  const [raw, setRaw] = useState(value), [error, setError] = useState("");
  return <label className={styles.field}>{network === "instagram" ? "Instagram" : "Facebook"}<input placeholder="@usuario o enlace" value={raw} onFocus={onFocus} onChange={event => { setRaw(event.target.value); try { onChange(normalizeSocial(event.target.value, network)); setError(""); } catch { /* Save the last valid URL while typing. */ } }} onBlur={() => { try { onChange(normalizeSocial(raw, network)); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Revisa tu enlace"); } }} aria-invalid={Boolean(error)} />{error ? <span className={styles.helper} role="alert">{error}</span> : null}</label>;
}
