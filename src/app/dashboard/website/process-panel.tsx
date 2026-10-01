"use client";
import type { BellaConfig } from "@/websites/config";
import { editableProcess, emptyProcessMoment } from "@/websites/templates/bella/process";
import MediaPicker from "./media-picker";
import styles from "./website-builder.module.css";

export default function ProcessPanel({ config, update, onBusy, onFocus, onLocalPreview }: {
  config: BellaConfig;
  update: (next: (current: BellaConfig) => BellaConfig) => void;
  onBusy: (busy: boolean) => void;
  onFocus: () => void;
  onLocalPreview: (index: number, url: string | null) => void;
}) {
  const moments = editableProcess(config.process);
  function change(index: number, fields: Partial<BellaConfig["process"][number]>) {
    update(previous => ({ ...previous, process: editableProcess(previous.process).map((item, position) => position === index ? { ...item, ...fields } : item) }));
  }
  function move(index: number, direction: number) {
    update(previous => { const process = editableProcess(previous.process); [process[index], process[index + direction]] = [process[index + direction], process[index]]; return { ...previous, process }; });
  }
  return <details open className={styles.googleSettings}><summary>Carrusel de tres imágenes</summary><div>
    <p className={styles.helper}>Sube las tres fotos de tu proceso. Puedes cambiar sus textos y orden.</p>
    {moments.map((item, index) => <details key={index} open><summary>Momento {index + 1}</summary><div>
      <MediaPicker label={`Foto del momento ${index + 1}`} value={item.image} usage="about" onBusy={onBusy} onFocus={onFocus} onLocalPreview={url => onLocalPreview(index, url)} onChange={(url, asset) => update(previous => ({ ...previous, process: editableProcess(previous.process).map((moment, position) => position === index ? { ...moment, image: url } : moment), ...(asset ? { mediaAssets: [...(previous.mediaAssets ?? []).filter(existing => existing.id !== asset.id), asset] } : {}) }))} />
      <label className={styles.field}>Nombre del momento<input maxLength={80} value={item.title} onFocus={onFocus} onChange={event => change(index, { title: event.target.value })} /></label>
      <label className={styles.field}>Pie de foto<input maxLength={100} value={item.name} onFocus={onFocus} onChange={event => change(index, { name: event.target.value })} /></label>
      <label className={styles.field}>Descripción de la imagen<input maxLength={240} value={item.alt} onChange={event => change(index, { alt: event.target.value })} /></label>
      <button className={styles.secondary} disabled={index === 0} onClick={() => move(index, -1)}>Mover arriba</button>
      <button className={styles.secondary} disabled={index === moments.length - 1} onClick={() => move(index, 1)}>Mover abajo</button>
      <button className={styles.secondary} onClick={() => update(previous => ({ ...previous, process: moments.length > 3 ? editableProcess(previous.process).filter((_, position) => position !== index) : editableProcess(previous.process).map((moment, position) => position === index ? emptyProcessMoment(index) : moment) }))}>Quitar momento</button>
    </div></details>)}
    {moments.length < 6 ? <button className={styles.secondary} onClick={() => update(previous => { const process = editableProcess(previous.process); return { ...previous, process: [...process, emptyProcessMoment(process.length)] }; })}>Añadir momento</button> : null}
  </div></details>;
}
