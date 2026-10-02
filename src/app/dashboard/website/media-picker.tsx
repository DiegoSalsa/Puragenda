"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { MAX_WEBSITE_IMAGE_BYTES, websiteAssetSchema, type MediaUsage, type WebsiteAsset } from "@/websites/media";
import styles from "./website-builder.module.css";
export default function MediaPicker({ label, value, usage, onChange, onBusy, onLocalPreview, onFocus }: {
  label: string; value: string; usage: MediaUsage; onChange: (url: string, asset?: WebsiteAsset) => void;
  onBusy: (busy: boolean) => void; onLocalPreview: (url: string | null) => void; onFocus?: () => void;
}) {
  const [local, setLocal] = useState(""), [progress, setProgress] = useState<number | null>(null), [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null), active = useRef<XMLHttpRequest | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  function upload(file?: File) {
    if (!file || active.current) return;
    if (!file.size || file.size > MAX_WEBSITE_IMAGE_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Elige JPG, PNG o WebP de hasta 5 MB."); return; }
    onFocus?.();
    const objectUrl = URL.createObjectURL(file); setLocal(objectUrl); onLocalPreview(objectUrl); setProgress(0); setMessage(""); onBusy(true);
    const xhr = new XMLHttpRequest(); active.current = xhr;
    xhr.open("POST", "/api/website/media"); xhr.timeout = 60000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded * 100 / event.total)); };
    const complete = (error?: string) => { active.current = null; setProgress(null); setLocal(""); onLocalPreview(null); URL.revokeObjectURL(objectUrl); onBusy(false); setMessage(error || "Foto lista. Guardamos tus cambios automáticamente."); };
    xhr.onload = () => {
      try { const response = JSON.parse(xhr.responseText); if (xhr.status !== 200) throw new Error(response.error || "No pudimos subir la foto"); const asset = websiteAssetSchema.parse(response.asset); onChange(asset.secureUrl, asset); complete(); }
      catch (error) { complete(error instanceof Error ? error.message : "No pudimos subir la foto"); }
    };
    xhr.onerror = () => complete("Se interrumpió la conexión. Prueba de nuevo."); xhr.ontimeout = () => complete("La foto está tardando demasiado. Prueba de nuevo."); xhr.onabort = () => complete("Subida cancelada");
    const form = new FormData(); form.set("image", file); form.set("usage", usage); xhr.send(form);
  }
  const src = local || value;
  return <div className={styles.mediaPicker} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); upload(event.dataTransfer.files[0]); }}>
    <p className={styles.label}>{label}</p>
    <button type="button" className={styles.photo} disabled={progress !== null} onClick={() => input.current?.click()} aria-label={`Cambiar ${label}`}>
      {/* Native img also displays the temporary browser blob without an optimizer request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={label} /> : <span><ImagePlus size={28} />Añade una foto</span>}
      <span className={styles.photoBadge}>{progress !== null ? <><LoaderCircle size={15} className={styles.spin} />{progress < 100 ? `Subiendo ${progress}%` : "Preparando tu foto…"}</> : <><Upload size={14} />{src ? "Cambiar" : "Subir imagen"}</>}</span>
    </button>
    <input ref={input} className={styles.visuallyHidden} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Subir ${label}`} onChange={event => { upload(event.target.files?.[0]); event.target.value = ""; }} />
    {progress !== null ? <progress aria-label={`Progreso de ${label}`} max={100} value={progress} /> : null}
    <div className={styles.mediaHelp}><span>JPG, PNG o WebP · hasta 5 MB</span>{value ? <button type="button" disabled={progress !== null} onClick={() => onChange("")} aria-label={`Quitar ${label}`}><Trash2 size={14} />Quitar</button> : null}</div>
    {message ? <p className={styles.helper} role="status">{message}</p> : null}
  </div>;
}
