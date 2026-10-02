"use client";

import type { RitualConfig } from "@/websites/templates/ritual/config";
import styles from "./website-builder.module.css";

type Props = {
  area: "hero" | "services" | "staff" | "business" | "gallery" | "faq" | "booking" | "contact";
  config: RitualConfig;
  update: (next: (config: RitualConfig) => RitualConfig) => void;
  focusField: (key: string) => void;
};

type Copy = RitualConfig["copy"];

function Field({ label, value, focus, onFocus, onChange, multiline = false }: { label: string; value: string; focus: string; onFocus: (key: string) => void; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className={styles.field}>{label}{multiline ? <textarea value={value} onFocus={() => onFocus(focus)} onChange={event => onChange(event.target.value)} /> : <input value={value} onFocus={() => onFocus(focus)} onChange={event => onChange(event.target.value)} />}</label>;
}

function copyPatch(update: Props["update"], key: keyof Copy, value: string) {
  update(config => ({ ...config, copy: { ...config.copy, [key]: value } }));
}

export default function RitualCopyFields({ area, config, update, focusField }: Props) {
  const copy = config.copy;
  if (area === "hero") return <>
    <Field label="Texto pequeño" value={config.brandEyebrow} focus="brandEyebrow" onFocus={focusField} onChange={value => update(c => ({ ...c, brandEyebrow: value }))} />
    <Field label="Titular" value={config.headline} focus="headline" onFocus={focusField} onChange={value => update(c => ({ ...c, headline: value }))} multiline />
    <Field label="Descripción" value={config.intro} focus="intro" onFocus={focusField} onChange={value => update(c => ({ ...c, intro: value }))} multiline />
    <Field label="Caption de la fotografía" value={config.heroCaption} focus="heroCaption" onFocus={focusField} onChange={value => update(c => ({ ...c, heroCaption: value }))} />
    <details className={styles.googleSettings} open><summary>Personalizar CTAs y sello</summary><div>
      <Field label="CTA principal" value={copy.reserve} focus="reserve" onFocus={focusField} onChange={value => copyPatch(update, "reserve", value)} />
      <Field label="CTA secundario" value={copy.secondary} focus="secondary" onFocus={focusField} onChange={value => copyPatch(update, "secondary", value)} />
      <Field label="Sello de portada" value={copy.heroStamp} focus="heroStamp" onFocus={focusField} onChange={value => copyPatch(update, "heroStamp", value)} />
    </div></details>
    <details className={styles.googleSettings}><summary>Navegación</summary><div>{(["services", "staff", "gallery", "about", "faq", "reserve"] as const).map(key => <Field key={key} label={{ services: "Tratamientos", staff: "Equipo", gallery: "Galería", about: "El espacio", faq: "Preguntas", reserve: "Reservar" }[key]} value={copy.nav[key]} focus={`nav.${key}`} onFocus={focusField} onChange={value => update(c => ({ ...c, copy: { ...c.copy, nav: { ...c.copy.nav, [key]: value } } }))} />)}</div></details>
  </>;

  if (area === "services") return <>
    <Field label="Título de tratamientos" value={copy.servicesTitle} focus="servicesTitle" onFocus={focusField} onChange={value => copyPatch(update, "servicesTitle", value)} />
    <Field label="Nota editorial" value={copy.servicesNote} focus="servicesNote" onFocus={focusField} onChange={value => copyPatch(update, "servicesNote", value)} multiline />
    <details className={styles.googleSettings}><summary>Personalizar textos de tratamientos</summary><div>
      <Field label="Eyebrow destacado" value={copy.featuredEyebrow} focus="featuredEyebrow" onFocus={focusField} onChange={value => copyPatch(update, "featuredEyebrow", value)} />
      <Field label="Título destacado" value={copy.featuredTitle} focus="featuredTitle" onFocus={focusField} onChange={value => copyPatch(update, "featuredTitle", value)} />
      <Field label="CTA de tratamiento" value={copy.serviceAction} focus="serviceAction" onFocus={focusField} onChange={value => copyPatch(update, "serviceAction", value)} />
      <Field label="Texto de “Todos”" value={copy.servicesAll} focus="servicesAll" onFocus={focusField} onChange={value => copyPatch(update, "servicesAll", value)} />
      <Field label="Texto de mostrar más" value={copy.allServices} focus="allServices" onFocus={focusField} onChange={value => copyPatch(update, "allServices", value)} />
      <p className={styles.helper}>Usa <code>{"{count}"}</code> para conservar el número de tratamientos que se añadirán.</p>
      <Field label="Etiqueta por defecto" value={copy.serviceDefaultLabel} focus="serviceDefaultLabel" onFocus={focusField} onChange={value => copyPatch(update, "serviceDefaultLabel", value)} />
    </div></details>
  </>;

  if (area === "staff") return <>
    <Field label="Título del equipo" value={copy.staffTitle} focus="staffTitle" onFocus={focusField} onChange={value => copyPatch(update, "staffTitle", value)} />
    <Field label="Nota del equipo" value={copy.staffNote} focus="staffNote" onFocus={focusField} onChange={value => copyPatch(update, "staffNote", value)} multiline />
    <details className={styles.googleSettings}><summary>Personalizar etiquetas y notas</summary><div>
      <Field label="Etiqueta por defecto" value={copy.staffDefaultLabel} focus="staffDefaultLabel" onFocus={focusField} onChange={value => copyPatch(update, "staffDefaultLabel", value)} />
      <p className={styles.helper}>Las etiquetas y notas de cada profesional se editan debajo y la disponibilidad sigue viniendo de Puragenda.</p>
    </div></details>
  </>;

  if (area === "business") return <>
    <Field label="Nombre visible" value={config.displayName} focus="displayName" onFocus={focusField} onChange={value => update(c => ({ ...c, displayName: value }))} />
    <Field label="Título del espacio" value={copy.aboutTitle} focus="aboutTitle" onFocus={focusField} onChange={value => copyPatch(update, "aboutTitle", value)} />
    <Field label="Texto del espacio" value={config.about} focus="about" onFocus={focusField} onChange={value => update(c => ({ ...c, about: value }))} multiline />
    <details className={styles.googleSettings} open><summary>Pausa sensorial</summary><div>
      <Field label="Eyebrow" value={config.sensorial.eyebrow} focus="sensorial.eyebrow" onFocus={focusField} onChange={value => update(c => ({ ...c, sensorial: { ...c.sensorial, eyebrow: value } }))} />
      <Field label="Título" value={config.sensorial.title} focus="sensorial.title" onFocus={focusField} onChange={value => update(c => ({ ...c, sensorial: { ...c.sensorial, title: value } }))} />
      <Field label="Cuerpo" value={config.sensorial.body} focus="sensorial.body" onFocus={focusField} onChange={value => update(c => ({ ...c, sensorial: { ...c.sensorial, body: value } }))} multiline />
      <Field label="Etiqueta de acción" value={copy.pauseLabel} focus="pauseLabel" onFocus={focusField} onChange={value => copyPatch(update, "pauseLabel", value)} />
      <Field label="CTA de pausa" value={copy.pauseAction} focus="pauseAction" onFocus={focusField} onChange={value => copyPatch(update, "pauseAction", value)} />
    </div></details>
  </>;

  if (area === "gallery") return <>
    <Field label="Título de galería" value={copy.galleryTitle} focus="galleryTitle" onFocus={focusField} onChange={value => copyPatch(update, "galleryTitle", value)} />
    <Field label="Nota de galería" value={copy.galleryNote} focus="galleryNote" onFocus={focusField} onChange={value => copyPatch(update, "galleryNote", value)} multiline />
    <details className={styles.googleSettings}><summary>Personalizar filtros</summary><div><Field label="Texto de “Todos”" value={copy.galleryAll} focus="galleryAll" onFocus={focusField} onChange={value => copyPatch(update, "galleryAll", value)} /></div></details>
  </>;

  if (area === "faq") return <Field label="Título de preguntas" value={copy.faqTitle} focus="faqTitle" onFocus={focusField} onChange={value => copyPatch(update, "faqTitle", value)} />;

  if (area === "booking") return <>
    <Field label="Título de reserva" value={copy.bookingTitle} focus="bookingTitle" onFocus={focusField} onChange={value => copyPatch(update, "bookingTitle", value)} />
    <Field label="Nota de reserva" value={copy.bookingNote} focus="bookingNote" onFocus={focusField} onChange={value => copyPatch(update, "bookingNote", value)} multiline />
    <Field label="Prompt antes de reservar" value={copy.bookingPrompt} focus="bookingPrompt" onFocus={focusField} onChange={value => copyPatch(update, "bookingPrompt", value)} multiline />
    <details className={styles.googleSettings}><summary>Etiquetas de los cinco pasos</summary><div>{copy.bookingSteps.map((value, index) => <Field key={index} label={`Paso ${index + 1}`} value={value} focus={`bookingSteps.${index}`} onFocus={focusField} onChange={next => update(c => ({ ...c, copy: { ...c.copy, bookingSteps: c.copy.bookingSteps.map((step, stepIndex) => stepIndex === index ? next : step) as Copy["bookingSteps"] } }))} />)}</div></details>
  </>;

  return <>
    <Field label="Título de contacto" value={copy.contactTitle} focus="contactTitle" onFocus={focusField} onChange={value => copyPatch(update, "contactTitle", value)} />
    <Field label="Título de horarios" value={copy.hoursTitle} focus="hoursTitle" onFocus={focusField} onChange={value => copyPatch(update, "hoursTitle", value)} />
    <Field label="Etiqueta de mapas" value={copy.mapsLabel} focus="mapsLabel" onFocus={focusField} onChange={value => copyPatch(update, "mapsLabel", value)} />
    <Field label="Frase del pie" value={copy.footerStatement} focus="footerStatement" onFocus={focusField} onChange={value => copyPatch(update, "footerStatement", value)} multiline />
  </>;
}
