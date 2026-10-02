"use client";
/* eslint-disable @next/next/no-img-element -- Native thumbnails display local browser blobs. */
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, ExternalLink, Globe, Heart, Users, Scissors, Images, LayoutTemplate, LoaderCircle, Monitor, Palette, Phone, Smartphone, Sparkles } from "lucide-react";
import { matchdayConfigSchema, type MatchdayConfig } from "@/websites/templates/matchday/config";
import type { WebsiteEditorProps } from "@/websites/editor-types";
import TemplateSelector from "./template-selector";
import type { WebsiteAsset } from "@/websites/media";
import { MATCHDAY_PALETTES, matchdayTokens, validMatchdayPalette } from "@/websites/templates/matchday/palettes";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import type { PreviewField } from "@/websites/preview-protocol";
import { DraftAutosave } from "@/websites/autosave";
import { normalizeSocial, referencedAssets } from "@/websites/editor-utils";
import { websiteMetadata } from "@/websites/metadata";
import { hasWebsiteEntitlement } from "@/websites/policy";
import { saveWebsiteDraft, publishWebsite } from "@/server/actions/website.actions";
import MediaPicker from "./media-picker";
import MatchdayGalleryPanel from "./matchday-gallery-panel";
import { templateRegistry } from "@/websites/registry";
import LivePreviewFrame from "./live-preview-frame";
import MediaLibrary from "./media-library";
import DomainPanel from "./domain-panel";
import BillingPanel from "./billing-panel";
import styles from "./website-builder.module.css";
type Props = WebsiteEditorProps<MatchdayConfig>;
const sections = [
  { key: "design", name: "Diseño", icon: Palette }, { key: "hero", name: "Portada", icon: LayoutTemplate },
  { key: "services", name: "Servicios", icon: Scissors }, { key: "staff", name: "Equipo", icon: Users }, { key: "gallery", name: "Galería", icon: Images }, { key: "business", name: "Mi negocio", icon: Heart },
  { key: "contact", name: "Contacto", icon: Phone }, { key: "domain", name: "Dominio", icon: Globe },
] as const;
type Section = typeof sections[number]["key"];
type Draft = { config: MatchdayConfig; subdomain: string };
type ImageKey = "logo" | "favicon" | "heroImage" | "aboutImage" | "socialImage";
type TextKey = "displayName" | "brandEyebrow" | "brandTitle" | "headline" | "intro" | "heroCaption" | "graphicPhrase" | "about" | "phone" | "whatsapp" | "contactEmail" | "seoTitle" | "seoDescription";
export default function WebsiteEditor(props: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(props.initial), [subdomain, setSubdomain] = useState(props.subdomain);
  const [section, setSection] = useState<Section>("design"), [viewport, setViewport] = useState<"desktop" | "mobile">("desktop"), [mode, setMode] = useState<"edit" | "preview">("edit");
  const [customizeGoogle, setCustomizeGoogle] = useState(Boolean(config.seoTitle || config.seoDescription));
  const [message, setMessage] = useState(""), [pending, start] = useTransition(), [uploadCount, setUploadCount] = useState(0);
  const [visualMedia, setVisualMedia] = useState<Record<string, string>>({});
  const [autosave] = useState(() => new DraftAutosave<Draft>({ config: props.initial, subdomain: props.subdomain }, props.revision, async (draft, revision) => {
    const result = matchdayConfigSchema.safeParse({ ...draft.config, ...(draft.config.mediaAssets ? { mediaAssets: referencedAssets(draft.config) } : {}) });
    if (!result.success) return { error: "Revisa los datos de contacto o espera a que termine la foto." };
    return saveWebsiteDraft(result.data, revision, draft.subdomain, "matchday");
  }));
  const save = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot, autosave.getSnapshot);
  const frame = useRef<HTMLIFrameElement>(null), sequence = useRef(0), focus = useRef<PreviewField | undefined>(undefined), payload = useRef<unknown>(null);
  const controls = useRef<HTMLDivElement>(null);
  const active = hasWebsiteEntitlement(props.addon, new Date(), props.offer);
  const missingServiceImages = props.view.catalog.services.filter(service => !service.image).length;
  const missingStaffImages = props.view.catalog.staff.filter(person => !person.image).length;
  const missingEditorialImages = [!config.heroImage ? "la portada" : "", !config.aboutImage ? "la foto del espacio" : "", missingServiceImages ? `${missingServiceImages} servicio${missingServiceImages === 1 ? "" : "s"}` : "", missingStaffImages ? `${missingStaffImages} profesional${missingStaffImages === 1 ? "" : "es"}` : ""].filter(Boolean);
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
  function update(next: (current: MatchdayConfig) => MatchdayConfig) { setConfig(next); setMessage(""); }
  function change<K extends keyof MatchdayConfig>(key: K, value: MatchdayConfig[K]) { update(previous => ({ ...previous, [key]: value })); }
  function localPreview(key: string, url: string | null) { setVisualMedia(previous => { const next = { ...previous }; if (url) next[key] = url; else delete next[key]; return next; }); }
  function busy(value: boolean) { setUploadCount(previous => Math.max(0, previous + (value ? 1 : -1))); }
  function applyImage(key: ImageKey, url: string, asset?: WebsiteAsset) { update(previous => ({ ...previous, [key]: url, ...(asset ? { mediaAssets: [...(previous.mediaAssets ?? []).filter(item => item.id !== asset.id), asset] } : {}) })); }
  const media = (key: ImageKey, label: string, usage: "hero" | "about" | "logo" | "favicon" | "social") => <MediaPicker label={label} value={config[key]} usage={usage} onChange={(url, asset) => applyImage(key, url, asset)} onBusy={busy} onLocalPreview={url => localPreview(key, url)} onFocus={() => highlight(key === "socialImage" || key === "favicon" ? "heroImage" : key)} />;
  const field = (key: TextKey, label: string, multiline = false, helper?: string) => {
    const previewField = ["phone", "whatsapp", "contactEmail"].includes(key) ? "contact" : ["seoTitle", "seoDescription"].includes(key) ? "headline" : key as PreviewField;
    const limit = key === "about" ? 3000 : key === "intro" ? 600 : key === "seoDescription" ? 300 : key === "brandEyebrow" ? 80 : key === "heroCaption" ? 180 : key === "phone" ? 30 : key === "whatsapp" ? 20 : key === "headline" ? 200 : 160;
    return <label className={styles.field}>{label}{multiline ? <textarea rows={key === "about" ? 7 : 3} maxLength={limit} value={config[key]} onFocus={() => highlight(previewField as PreviewField)} onChange={event => change(key, event.target.value)} /> : <input value={config[key]} maxLength={limit} onFocus={() => highlight(previewField as PreviewField)} onChange={event => change(key, key === "whatsapp" ? event.target.value.replace(/[^+0-9]/g, "") : event.target.value)} />}{helper ? <span className={styles.helper}>{helper}</span> : null}</label>;
  };
  function copyText(key: Exclude<keyof MatchdayConfig["copy"], "nav" | "bookingSteps">, label: string) { return <label className={styles.field}>{label}<textarea maxLength={key.endsWith("Note") ? 250 : 160} value={config.copy[key]} onChange={e => update(c => ({ ...c, copy: { ...c.copy, [key]: e.target.value } }))} /></label>; }
  const google = websiteMetadata({ ...props.view, config });
  function run(operation: () => Promise<unknown>, success: string) { start(async () => { try { const result = await operation(); if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error)); setMessage(success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos completar el cambio"); } }); }
  const unpublished = props.status !== "PUBLISHED" || save.revision !== props.publishedRevision || save.dirty;
  return <div className={styles.builder} data-mode={mode}>
    <header className={styles.topbar}><div className={styles.title}><h1>Mi sitio</h1><p>{props.status === "PUBLISHED" ? unpublished ? "Publicado · cambios pendientes" : "Tu sitio está publicado" : props.status === "SUSPENDED" ? "Tu sitio está pausado" : "Tu próximo sitio empieza aquí"}</p></div><span className={styles.saveStatus} data-error={save.status === "error"} role="status">{save.status === "saving" || uploadCount ? <LoaderCircle size={14} className={styles.spin} /> : save.status === "saved" ? <CheckCircle2 size={14} /> : null}{uploadCount ? "Preparando fotos" : save.status === "saving" ? "Guardando…" : save.status === "pending" ? "Cambios pendientes" : save.status === "error" ? "No se pudo guardar" : "Guardado"}</span>{props.status === "PUBLISHED" ? <a className={styles.secondary} href={props.publicUrl} target="_blank" rel="noopener noreferrer">Ver sitio<ExternalLink size={13} /></a> : null}<button className={styles.publish} disabled={pending || uploadCount > 0 || !active || !unpublished} onClick={() => run(async () => { await autosave.flush(); return publishWebsite(autosave.getSnapshot().revision); }, "¡Tu sitio está publicado!")}>{pending ? <LoaderCircle size={14} className={styles.spin} /> : <Sparkles size={14} />}Publicar cambios</button></header>
    <div className={styles.mobileTabs}><button aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>Editar</button><button aria-pressed={mode === "preview"} onClick={() => { setViewport("mobile"); setMode("preview"); }}>Vista previa</button></div>
    {save.status === "error" ? <div className={styles.notice} role="alert">{save.error}<button onClick={() => run(() => autosave.flush(), "Cambios guardados")}>Reintentar</button><button onClick={() => { if (window.confirm("Recargar recupera la última versión guardada y descarta los cambios locales. ¿Continuar?")) window.location.reload(); }}>Recargar</button></div> : null}
    {message ? <div className={styles.notice} role="status">{message}<button aria-label="Cerrar aviso" onClick={() => setMessage("")}>Cerrar</button></div> : null}
    {!active ? <div className={styles.notice}>Puedes preparar tu sitio. Activa Sitio Web para publicarlo.<button onClick={() => setSection("business")}>Ver suscripción</button></div> : null}
    {missingEditorialImages.length ? <div className={styles.notice} role="status">Faltan imágenes en {missingEditorialImages.join(", ")}. El sitio público mantiene una composición limpia; puedes completar las fotos desde Portada, Servicios y Equipo.</div> : null}
    <div className={styles.body}>
      <nav className={styles.navigation} role="tablist" aria-label="Editar mi sitio">{sections.filter(item => templateRegistry.matchday.editor.sections.includes(item.key)).map(item => <button key={item.key} id={`website-tab-${item.key}`} role="tab" aria-selected={section === item.key} aria-controls={`website-panel-${item.key}`} onClick={() => { setSection(item.key); controls.current?.scrollTo(0, 0); if (item.key === "hero") highlight("brandTitle"); if (item.key === "gallery") highlight("gallery"); if (item.key === "business") highlight("about"); if (item.key === "contact") highlight("contact"); }}><item.icon size={19} strokeWidth={1.6} />{item.name}</button>)}</nav>
      <div className={styles.controls} ref={controls}>
        <section className={styles.panel} hidden={section !== "design"} id="website-panel-design" role="tabpanel" aria-labelledby="website-tab-design">
          <div className={styles.panelHeading}><h2>Diseño</h2><p className={styles.helper}>Matchday · Editorial / Barbería / Grooming</p></div>
          <TemplateSelector active={props.templateKey} flush={async () => { await autosave.flush(); }} revision={() => autosave.getSnapshot().revision} disabled={pending || uploadCount > 0} />
          <div className={styles.divider}><h3>Los colores de tu sitio</h3>{MATCHDAY_PALETTES.map(p => <button className={styles.palette} key={p.key} aria-pressed={config.paletteMode === "preset" && config.accent === p.key} onClick={() => update(c => ({ ...c, accent: p.key, paletteMode: "preset" }))}><span className={styles.swatches}>{p.colors.map(color => <i key={color} style={{ background: color }} />)}</span><span className={styles.paletteName}>{p.name}<small>{p.description}</small></span>{config.accent === p.key && config.paletteMode === "preset" ? <Check size={16} /> : null}</button>)}</div>
          <details className={styles.googleSettings} open={config.paletteMode === "custom"}><summary>Crear mis colores</summary><div>{(["accent", "onAccent", "paper", "ink"] as const).map(token => <label className={styles.field} key={token}>{{accent:"Acento",onAccent:"Texto sobre acento",paper:"Fondo",ink:"Tinta"}[token]}<span className={styles.row}><input type="color" aria-label={`Color ${token}`} value={matchdayTokens(config)[token]} onChange={e => update(c => ({ ...c, paletteMode: "custom", customPalette: { ...matchdayTokens(c), [token]: e.target.value } }))} /><input aria-label={`Color ${token} hexadecimal`} maxLength={7} value={matchdayTokens(config)[token]} onChange={e => update(c => ({ ...c, paletteMode: "custom", customPalette: { ...matchdayTokens(c), [token]: e.target.value } }))} /></span></label>)}{!validMatchdayPalette(matchdayTokens(config)) ? <p className={styles.helper} role="alert">Aumenta el contraste entre texto y fondo antes de publicar.</p> : null}</div></details>
          <label className={styles.field}><span><input type="checkbox" checked={config.showNumbers} onChange={e => change("showNumbers", e.target.checked)} /> Numeración editorial</span></label>
        </section>
        <section className={styles.panel} hidden={section !== "hero"} id="website-panel-hero" role="tabpanel" aria-labelledby="website-tab-hero"><div className={styles.panelHeading}><h2>Portada</h2><p className={styles.helper}>El nombre, la fotografía y tu declaración visual.</p></div>{field("brandEyebrow", "Texto pequeño superior")}{field("brandTitle", "Nombre visual", false, `Si queda vacío, usamos ${props.view.business.name}.`)}{field("headline", "Titular", true)}{field("graphicPhrase", "Frase gráfica")}{field("intro", "Bajada", true)}{copyText("reserve", "Botón de reserva")}{copyText("secondary", "Botón secundario")}{media("heroImage", "Foto principal", "hero")}{field("heroCaption", "Descripción de la foto")}{media("logo", "Logo", "logo")}{media("favicon", "Icono del sitio", "favicon")}<details className={styles.googleSettings}><summary>Navegación</summary><div>{Object.entries(config.copy.nav).map(([key,value]) => <label className={styles.field} key={key}>{{services:"Servicios",staff:"Equipo",gallery:"Galería",about:"Estudio",reserve:"Reserva"}[key]}<input maxLength={60} value={value} onChange={e => update(c => ({ ...c, copy: { ...c.copy, nav: { ...c.copy.nav, [key]: e.target.value } } }))} /></label>)}</div></details></section>
        <section className={styles.panel} hidden={section !== "services"} id="website-panel-services" role="tabpanel" aria-labelledby="website-tab-services"><div className={styles.panelHeading}><h2>Servicios</h2><p className={styles.helper}>Nombre, precio, duración y fotografía se administran en Puragenda.</p></div>{copyText("servicesTitle", "Título")}{copyText("servicesNote", "Nota editorial")}{copyText("serviceAction", "Botón del servicio")}{props.view.catalog.services.map(service => <div className={styles.divider} key={service.id}><h3>{service.name}</h3><p className={styles.helper}>{service.duration} min · {new Intl.NumberFormat("es-CL",{style:"currency",currency:props.view.catalog.business.currency}).format(service.price)}</p></div>)}<a className={styles.secondary} href="/dashboard/services">Administrar servicios</a></section>
        <section className={styles.panel} hidden={section !== "staff"} id="website-panel-staff" role="tabpanel" aria-labelledby="website-tab-staff"><div className={styles.panelHeading}><h2>Equipo</h2><p className={styles.helper}>Estos son los profesionales de Puragenda. Aquí solo cambias su presentación en el sitio.</p></div>{copyText("staffTitle", "Título del equipo")}{copyText("staffNote", "Nota editorial")}{props.view.catalog.staff.map((person,i) => { const editorial=config.staffEditorial[person.id] ?? { visualNumber:"",label:"",visible:true }; const edit=(patch:Partial<typeof editorial>) => update(c => ({ ...c, staffEditorial:{...c.staffEditorial,[person.id]:{...editorial,...patch}} })); return <div className={styles.divider} key={person.id}>{person.image ? <img src={person.image} alt={person.name} style={{width:80,height:100,objectFit:"cover"}} /> : null}<h3>{person.name}</h3><p className={styles.helper}>{props.view.catalog.services.filter(service=>!person.serviceIds.length||person.serviceIds.includes(service.id)).map(s=>s.name).join(" / ")}</p><label className={styles.field}>Número visual<input maxLength={4} placeholder={String(i+1).padStart(2,"0")} value={editorial.visualNumber} onChange={e=>edit({visualNumber:e.target.value})} /></label><label className={styles.field}>Frase visual<input maxLength={100} value={editorial.label} onChange={e=>edit({label:e.target.value})} /></label><label className={styles.field}><span><input type="checkbox" checked={editorial.visible} onChange={e=>edit({visible:e.target.checked})} /> Visible en la sección Equipo</span></label></div>; })}<a className={styles.secondary} href="/dashboard/staff">Administrar profesionales</a></section>
        <section className={styles.panel} hidden={section !== "gallery"} id="website-panel-gallery" role="tabpanel" aria-labelledby="website-tab-gallery"><div className={styles.panelHeading}><h2>Galería</h2></div>{copyText("galleryTitle", "Título")}{copyText("galleryNote", "Nota editorial")}{copyText("galleryAll", "Filtro de todas las fotos")}<label className={styles.field}><span><input type="checkbox" checked={config.showGalleryCategories} onChange={e=>change("showGalleryCategories",e.target.checked)} /> Mostrar categorías</span></label><MatchdayGalleryPanel config={config} update={update} busy={busy} uploadCount={uploadCount} onLocal={localPreview} /></section>
        <section className={styles.panel} hidden={section !== "business"} id="website-panel-business" role="tabpanel" aria-labelledby="website-tab-business"><div className={styles.panelHeading}><h2>Mi negocio</h2></div>{field("displayName", "Nombre visible", false, props.view.business.name)}{copyText("aboutTitle", "Título del estudio")}{field("about", "Historia", true)}{media("aboutImage", "Foto del espacio", "about")}<div className={styles.divider}><h3>Franja en movimiento</h3><label className={styles.field}><span><input type="checkbox" checked={config.showMarquee} onChange={e=>change("showMarquee",e.target.checked)} /> Mostrar franja</span></label><label className={styles.field}>Una frase por línea<textarea maxLength={808} value={config.marquee.join("\n")} onChange={e=>change("marquee",e.target.value.split("\n").filter(v=>v.trim()).slice(0,8))} /></label></div><div className={styles.divider}><h3>Reserva</h3>{copyText("bookingTitle", "Título de reservas")}{copyText("bookingNote", "Nota de reservas")}{config.copy.bookingSteps.map((value,i)=><label className={styles.field} key={i}>Paso {i+1}<input maxLength={80} value={value} onChange={e=>update(c=>({...c,copy:{...c.copy,bookingSteps:c.copy.bookingSteps.map((v,j)=>j===i?e.target.value:v) as MatchdayConfig["copy"]["bookingSteps"]}}))} /></label>)}</div><BillingPanel addon={props.addon} offer={props.offer} price={props.price} canManage={props.canManageDomains} /></section>
        <section className={styles.panel} hidden={section !== "contact"} id="website-panel-contact" role="tabpanel" aria-labelledby="website-tab-contact"><div className={styles.panelHeading}><h2>Contacto</h2><p className={styles.helper}>Dirección y horarios vienen de la configuración del negocio.</p></div>{copyText("contactTitle", "Título")}{copyText("footerStatement", "Frase de cierre")}{copyText("hoursTitle", "Título de horarios")}{copyText("mapsLabel", "Enlace al mapa")}{field("phone", "Teléfono")}{field("whatsapp", "WhatsApp")}{field("contactEmail", "Email")}<SocialField network="instagram" value={config.instagram} onFocus={()=>highlight("contact")} onChange={value=>change("instagram",value)} /><SocialField network="facebook" value={config.facebook} onFocus={()=>highlight("contact")} onChange={value=>change("facebook",value)} /><div className={styles.googlePreview}><p className={styles.helper}>Cómo aparecerá tu negocio en Google</p><strong>{google.title}</strong><p>{google.description}</p></div><label className={styles.field}><span><input type="checkbox" checked={customizeGoogle} onChange={e=>setCustomizeGoogle(e.target.checked)} /> Personalizar vista de Google</span></label>{customizeGoogle ? <>{field("seoTitle", "Título de Google")}{field("seoDescription", "Descripción",true)}{media("socialImage", "Imagen al compartir", "social")}</> : null}<MediaLibrary before={async () => { await autosave.flush(); }} disabled={pending || uploadCount > 0} /></section>
        <section hidden={section !== "domain"} id="website-panel-domain" role="tabpanel" aria-labelledby="website-tab-domain"><DomainPanel subdomain={subdomain} rootDomain={props.rootDomain} domains={props.domains} requests={props.requests} onSubdomain={setSubdomain} canManage={props.canManageDomains} /></section>
      </div>
      <div className={styles.previewArea}><div className={styles.previewToolbar}><div className={styles.segmented}><button aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}><Monitor size={13} />Escritorio</button><button aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}><Smartphone size={13} />Móvil</button></div><span className={styles.previewCaption}>Vista previa en vivo · solo tú puedes verla</span></div><LivePreviewFrame mobile={viewport === "mobile"} frame={frame} onLoad={sendPreview} /></div>
    </div>
  </div>;
}
function SocialField({ network, value, onChange, onFocus }: { network: "instagram" | "facebook"; value: string; onChange: (value: string) => void; onFocus: () => void }) {
  const [raw, setRaw] = useState(value), [error, setError] = useState("");
  return <label className={styles.field}>{network === "instagram" ? "Instagram" : "Facebook"}<input placeholder="@usuario o enlace" value={raw} onFocus={onFocus} onChange={event => { setRaw(event.target.value); try { onChange(normalizeSocial(event.target.value, network)); setError(""); } catch { /* Keep the last valid URL until the new input is complete. */ } }} onBlur={() => { try { const normalized = normalizeSocial(raw, network); onChange(normalized); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Revisa tu enlace"); } }} aria-invalid={Boolean(error)} />{error ? <span className={styles.helper} role="alert">{error}</span> : null}</label>;
}
