"use client";
import { useId } from "react";
import { PINK_STYLE_PRESETS, type PinkAppearance } from "@/websites/templates/pink-y2k/config";
import { pinkDisplay, pinkScript } from "@/websites/templates/pink-y2k/fonts";
import styles from "@/websites/templates/pink-y2k/appearance.module.css";

export default function Y2kAppearancePanel({ value, onChange, patternColor = "#ffc1dc" }: { value: PinkAppearance; onChange: (next: PinkAppearance) => void; patternColor?: string }) {
  const coverageId = useId();
  function change<K extends keyof PinkAppearance>(key: K, next: PinkAppearance[K]) { onChange({ ...value, [key]: next }); }
  return <div className={`${styles.panel} ${pinkDisplay.variable} ${pinkScript.variable}`}>
    <div><h3>Tu universo Y2K</h3><p className={styles.hint}>Elige un estilo y mezcla sus detalles. Verás los cambios al instante en tu sitio.</p></div>
    <fieldset className={styles.fieldset}><legend>Estilos para empezar</legend><div className={styles.choices}>
      {PINK_STYLE_PRESETS.map(preset => <button type="button" key={preset.name} className={styles.choice} aria-pressed={Object.entries(preset.appearance).every(([key, setting]) => value[key as keyof PinkAppearance] === setting)} onClick={() => onChange({ ...preset.appearance })}>
        <span className={styles.sample} data-title-finish={preset.appearance.titleFinish} data-title-font={preset.appearance.titleFont} aria-hidden="true"><span data-title-sample="">Aa</span></span><strong>{preset.name}</strong><small>{preset.description}</small>
      </button>)}
    </div></fieldset>
    {([{ label: "arriba", finish: "titleTopFinish", font: "titleTopFont" }, { label: "abajo", finish: "titleFinish", font: "titleFont" }] as const).map(line => <fieldset className={styles.fieldset} key={line.label}><legend>Letras de la línea de {line.label}</legend><p className={styles.hint}>Elige el acabado y la forma de esta línea por separado.</p><div className={styles.choices}>
      {([{ key: "jelly", name: "Caramelo" }, { key: "pink-chrome", name: "Cromado rosa" }, { key: "silver-chrome", name: "Cromado plateado" }] as const).map(option => <button type="button" key={option.key} className={styles.choice} aria-pressed={value[line.finish] === option.key} onClick={() => change(line.finish, option.key)}><span className={styles.sample} data-title-finish={option.key} data-title-font={value[line.font]} aria-hidden="true"><span data-title-sample="">Aa</span></span><strong>{option.name}</strong></button>)}
    </div><label className={styles.select}>Forma de las letras de {line.label}<select aria-label={`Forma de las letras de ${line.label}`} value={value[line.font]} onChange={event => change(line.font, event.target.value as PinkAppearance["titleFont"])}><option value="bubble">Burbuja</option><option value="script">Cursiva retro</option></select></label></fieldset>)}
    <fieldset className={styles.fieldset}><legend>Textura de fondo</legend><div className={styles.choices}>
      {([{ key: "grid", name: "Cuadrícula suave" }, { key: "satin", name: "Satén" }, { key: "glitter", name: "Glitter" }, { key: "leopard", name: "Leopardo" }, { key: "zebra", name: "Cebra" }] as const).map(option => <button type="button" key={option.key} className={styles.choice} aria-pressed={value.background === option.key} onClick={() => change("background", option.key)}><span className={styles.texture} data-background={option.key} aria-hidden="true" /><strong>{option.name}</strong></button>)}
    </div></fieldset>
    {value.background === "leopard" || value.background === "zebra" ? <>
      <label className={styles.colorField}>Color del marco animal print<input type="color" aria-label="Color del marco animal print" value={value.patternColor || patternColor} onChange={event => change("patternColor", event.target.value)} /></label>
      <p className={styles.hint}>Elige el color del marco sin cambiar el fondo de tu página.</p>
      <fieldset className={styles.fieldset}><legend>Dónde mostrar el estampado</legend><div className={styles.choices}>
        {([{ key: "hero", name: "Solo portada", description: "Un marco alrededor de la sección principal." }, { key: "page", name: "Toda la web", description: "Un marco continuo hasta el final de la página." }] as const).map(option => <button type="button" key={option.key} className={styles.choice} aria-pressed={value.patternScope === option.key} onClick={() => change("patternScope", option.key)}><strong>{option.name}</strong><small>{option.description}</small></button>)}
      </div></fieldset>
      <div className={styles.rangeField}>
      <label htmlFor={coverageId}>Presencia del estampado <output htmlFor={coverageId}>{value.patternCoverage}%</output></label>
      <input id={coverageId} type="range" min={0} max={100} step={1} value={value.patternCoverage} aria-describedby={`${coverageId}-hint`} aria-valuetext={value.patternCoverage === 0 ? "Sin estampado" : `${value.patternCoverage}% de presencia`} onChange={event => change("patternCoverage", Number(event.target.value))} />
      <div className={styles.rangeLabels} aria-hidden="true"><span>Discreto</span><span>Protagonista</span></div>
      <p id={`${coverageId}-hint`} className={styles.hint}>Ajusta el grosor del marco {value.patternScope === "page" ? "de toda la web" : "de la portada"}. En 0, el estampado queda oculto.</p>
    </div></> : null}
    <label className={styles.select}>Intensidad del fondo<select aria-label="Intensidad del fondo" value={value.textureStrength} onChange={event => change("textureStrength", event.target.value as PinkAppearance["textureStrength"])}><option value="soft">Suave</option><option value="bold">Intensa</option></select></label>
    <label className={styles.select}>Adornos<select aria-label="Adornos" value={value.decorations} onChange={event => change("decorations", event.target.value as PinkAppearance["decorations"])}><option value="classic">Destellos clásicos</option><option value="chrome">Estrellas cromadas</option><option value="hearts">Corazones metálicos</option></select></label>
    <p className={styles.hint}>Las texturas decoran el fondo; tus servicios y la reserva conservan una superficie clara para leerlos con comodidad.</p>
  </div>;
}
