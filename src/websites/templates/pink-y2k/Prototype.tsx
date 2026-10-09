"use client";
import { useState, type ChangeEvent } from "react";
import {
  SlidersHorizontal,
  LockKeyhole,
  Download,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { contrastRatio } from "../../palettes";
import { dateKey } from "../../booking/validation";
import type { WebsiteView } from "../../types";
import { pinkConfigSchema, type PinkConfig } from "./config";
import PinkY2k, { pinkTokens } from "./PinkY2k";
import s from "./pink.module.css";

export default function Prototype({ view }: { view: WebsiteView<PinkConfig> }) {
  const [config, setConfig] = useState(view.config),
    [draft, setDraft] = useState(view.config),
    [open, setOpen] = useState(false),
    [tab, setTab] = useState("Marca"),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const [json, setJson] = useState(JSON.stringify(view.config, null, 2));
  const [today] = useState(() =>
    dateKey(new Date(), view.catalog.business.timezone),
  );
  const update = <K extends keyof PinkConfig>(key: K, value: PinkConfig[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const copy = (key: keyof PinkConfig["copy"], value: string) =>
    setDraft((current) => ({
      ...current,
      copy: { ...current.copy, [key]: value },
    }));
  function edit() {
    setDraft(structuredClone(config));
    setJson(JSON.stringify(config, null, 2));
    setError("");
    setOpen(true);
  }
  function apply() {
    let input: unknown = draft;
    if (tab === "JSON") {
      try {
        input = JSON.parse(json);
      } catch {
        setError("El JSON no es válido. Revisa comas y comillas.");
        return;
      }
    }
    const parsed = pinkConfigSchema.safeParse(input);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .slice(0, 3)
          .join(" · "),
      );
      return;
    }
    const colors = parsed.data.colors;
    if (
      contrastRatio(colors.ink, colors.background) < 4.5 ||
      contrastRatio(colors.ink, colors.surface) < 4.5 ||
      contrastRatio("#ffffff", colors.accent) < 4.5
    ) {
      setError(
        "Aumenta el contraste: texto oscuro y un acento que permita leer botones blancos (mínimo 4,5:1).",
      );
      return;
    }
    setConfig(parsed.data);
    setRevision((value) => value + 1);
    setOpen(false);
  }
  function exportConfig() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pink-y2k-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importConfig(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 100000) {
      setError("El archivo debe pesar menos de 100 KB.");
      return;
    }
    try {
      const parsed = pinkConfigSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        setError("La configuración no cumple el contrato de pink-y2k.");
        return;
      }
      setDraft(parsed.data);
      setJson(JSON.stringify(parsed.data, null, 2));
      setError("");
    } catch {
      setError("No pudimos leer el archivo JSON.");
    }
  }
  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    multiline = false,
  ) => (
    <label className={s.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
  return (
    <>
      <div
        className={s.previewBar}
        role="region"
        aria-label="Controles del prototipo privado"
      >
        <span>
          <LockKeyhole size={12} />
          <strong>PREVIEW PRIVADO</strong>
          <span className={s.previewDetail}>
            {" "}
            · Datos e imágenes de muestra · No crea reservas
          </span>
        </span>
        <button type="button" onClick={edit}>
          <SlidersHorizontal size={13} />
          Personalizar<span className={s.previewDetail}> prototipo</span>
        </button>
      </div>
      <PinkY2k key={revision} view={{ ...view, config }} today={today} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`${s.root} ${s.editor}`}
          style={pinkTokens(config)}
          showCloseButton={false}
        >
          <div className={s.editorHeading}>
            <DialogTitle>Tu pequeño universo, a tu manera.</DialogTitle>
            <DialogClose
              className={s.roundButton}
              aria-label="Cerrar personalización"
            >
              <X size={20} />
            </DialogClose>
          </div>
          <DialogDescription className={s.editorNote}>
            Editor local de revisión. Los cambios se aplican solo en esta
            pestaña; exporta el borrador para conservarlo. No modifica ni
            publica un negocio.
          </DialogDescription>
          <div className={s.editorTabs}>
            {["Marca", "Álbum", "Love Pocket", "Contenido", "JSON"].map(
              (name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={tab === name}
                  onClick={() => {
                    if (tab === "JSON") {
                      try {
                        const result = pinkConfigSchema.safeParse(
                          JSON.parse(json),
                        );
                        if (!result.success) {
                          setError(
                            "Corrige el JSON antes de cambiar de sección.",
                          );
                          return;
                        }
                        setDraft(result.data);
                      } catch {
                        setError(
                          "Corrige el JSON antes de cambiar de sección.",
                        );
                        return;
                      }
                    }
                    if (name === "JSON")
                      setJson(JSON.stringify(draft, null, 2));
                    setTab(name);
                    setError("");
                  }}
                >
                  {name}
                </button>
              ),
            )}
          </div>
          <div className={s.editorBody}>
            {tab === "Marca" ? (
              <div className={s.editorGrid}>
                {field("Nombre del negocio", draft.displayName, (value) =>
                  update("displayName", value),
                )}
                {field("Ciudad", draft.city, (value) => update("city", value))}
                {field("Titular · primera línea", draft.headline[0], (value) =>
                  update("headline", [value, draft.headline[1]]),
                )}
                {field("Titular · segunda línea", draft.headline[1], (value) =>
                  update("headline", [draft.headline[0], value]),
                )}
                {field(
                  "Introducción",
                  draft.intro,
                  (value) => update("intro", value),
                  true,
                )}
                {field("Botón principal", draft.copy.reserve, (value) =>
                  copy("reserve", value),
                )}
                {field("Botón secundario", draft.copy.secondary, (value) =>
                  copy("secondary", value),
                )}
                {field("Logo · ruta local o Cloudinary", draft.logo, (value) =>
                  update("logo", value),
                )}
                {field(
                  "Foto de portada · ruta local o Cloudinary",
                  draft.heroImage,
                  (value) => update("heroImage", value),
                )}
                {field("Instagram · URL HTTPS", draft.instagram, (value) =>
                  update("instagram", value),
                )}
                <fieldset className={s.colorFields}>
                  <legend>Colores</legend>
                  {Object.entries(draft.colors).map(([name, value]) => (
                    <label key={name}>
                      <span>
                        {
                          (
                            {
                              accent: "Acento",
                              ink: "Texto",
                              background: "Fondo",
                              surface: "Ventanas",
                            } as Record<string, string>
                          )[name]
                        }
                      </span>
                      <input
                        type="color"
                        value={value}
                        onChange={(event) =>
                          update("colors", {
                            ...draft.colors,
                            [name]: event.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <fieldset className={s.visibilityFields}>
                  <legend>Secciones opcionales</legend>
                  {Object.entries(draft.visibility).map(([name, value]) => (
                    <label key={name}>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(event) =>
                          update("visibility", {
                            ...draft.visibility,
                            [name]: event.target.checked,
                          })
                        }
                      />
                      {
                        (
                          {
                            gallery: "Álbum",
                            pocket: "Love Pocket",
                            policies: "Políticas y modalidad",
                          } as Record<string, string>
                        )[name]
                      }
                    </label>
                  ))}
                </fieldset>
              </div>
            ) : null}
            {tab === "Álbum" ? (
              <>
                <p className={s.editorNote}>
                  Fotos y categorías comparten el formato del editor existente.
                  Usa archivos locales o Cloudinary. Las categorías desaparecen
                  al quitar su última foto.
                </p>
                {draft.gallery.map((row, index) => (
                  <fieldset key={index} className={s.galleryEditor}>
                    <legend>Foto {index + 1}</legend>
                    {field("Ruta de imagen", row.image, (value) =>
                      update(
                        "gallery",
                        draft.gallery.map((item, i) =>
                          i === index ? { ...item, image: value } : item,
                        ),
                      ),
                    )}
                    {field("Nombre", row.name, (value) =>
                      update(
                        "gallery",
                        draft.gallery.map((item, i) =>
                          i === index ? { ...item, name: value } : item,
                        ),
                      ),
                    )}
                    {field("Texto alternativo", row.alt, (value) =>
                      update(
                        "gallery",
                        draft.gallery.map((item, i) =>
                          i === index ? { ...item, alt: value } : item,
                        ),
                      ),
                    )}
                    {field("Categoría (opcional)", row.category, (value) =>
                      update(
                        "gallery",
                        draft.gallery.map((item, i) =>
                          i === index ? { ...item, category: value } : item,
                        ),
                      ),
                    )}
                    <button
                      type="button"
                      className={s.editorAction}
                      onClick={() =>
                        update(
                          "gallery",
                          draft.gallery.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={15} />
                      Quitar foto
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className={s.editorAction}
                  disabled={draft.gallery.length >= 30}
                  onClick={() =>
                    update("gallery", [
                      ...draft.gallery,
                      {
                        image: draft.heroImage,
                        name: "Nuevo set",
                        alt: "",
                        category: "",
                      },
                    ])
                  }
                >
                  <Plus size={16} />
                  Agregar foto
                </button>
              </>
            ) : null}
            {tab === "Love Pocket" ? (
              <>
                {field("Nombre del dispositivo", draft.pocket.name, (value) =>
                  update("pocket", { ...draft.pocket, name: value }),
                )}
                {draft.pocket.messages.map((row, index) => (
                  <fieldset key={index} className={s.galleryEditor}>
                    <legend>Pantalla {index + 1}</legend>
                    {field("Título", row.title, (value) =>
                      update("pocket", {
                        ...draft.pocket,
                        messages: draft.pocket.messages.map((item, i) =>
                          i === index ? { ...item, title: value } : item,
                        ),
                      }),
                    )}
                    {field(
                      "Mensaje",
                      row.body,
                      (value) =>
                        update("pocket", {
                          ...draft.pocket,
                          messages: draft.pocket.messages.map((item, i) =>
                            i === index ? { ...item, body: value } : item,
                          ),
                        }),
                      true,
                    )}
                    <button
                      type="button"
                      className={s.editorAction}
                      disabled={draft.pocket.messages.length <= 1}
                      onClick={() =>
                        update("pocket", {
                          ...draft.pocket,
                          messages: draft.pocket.messages.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      Quitar pantalla
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className={s.editorAction}
                  disabled={draft.pocket.messages.length >= 6}
                  onClick={() =>
                    update("pocket", {
                      ...draft.pocket,
                      messages: [
                        ...draft.pocket.messages,
                        {
                          title: "Tu mensaje",
                          body: "Un pequeño detalle para tu universo.",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  Agregar pantalla
                </button>
                <p className={s.editorNote}>
                  No hay promociones activas. Para mostrar una, primero debe
                  existir y confirmarse en Puragenda.
                </p>
              </>
            ) : null}
            {tab === "Contenido" ? (
              <div className={s.editorGrid}>
                {Object.entries(draft.copy)
                  .filter(([key]) => key !== "steps")
                  .map(([key, value]) => (
                    <div key={key}>
                      {field(
                        key,
                        value as string,
                        (next) => copy(key as keyof PinkConfig["copy"], next),
                        true,
                      )}
                    </div>
                  ))}
                {draft.copy.steps.map((row, index) => (
                  <fieldset key={index} className={s.galleryEditor}>
                    <legend>Cómo reservar · paso {index + 1}</legend>
                    {field("Título", row.title, (value) =>
                      update("copy", {
                        ...draft.copy,
                        steps: draft.copy.steps.map((item, i) =>
                          i === index ? { ...item, title: value } : item,
                        ),
                      }),
                    )}
                    {field(
                      "Texto",
                      row.body,
                      (value) =>
                        update("copy", {
                          ...draft.copy,
                          steps: draft.copy.steps.map((item, i) =>
                            i === index ? { ...item, body: value } : item,
                          ),
                        }),
                      true,
                    )}
                  </fieldset>
                ))}
                {field("Título de políticas", draft.policy.title, (value) =>
                  update("policy", { ...draft.policy, title: value }),
                )}
                {field(
                  "Políticas y garantía",
                  draft.policy.body,
                  (value) => update("policy", { ...draft.policy, body: value }),
                  true,
                )}
                {field(
                  "Modalidad y dirección",
                  draft.policy.modality,
                  (value) =>
                    update("policy", { ...draft.policy, modality: value }),
                  true,
                )}
              </div>
            ) : null}
            {tab === "JSON" ? (
              <>
                {field(
                  "Configuración completa del borrador",
                  json,
                  setJson,
                  true,
                )}
                <label className={s.field}>
                  <span>Importar borrador JSON</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={importConfig}
                  />
                </label>
              </>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className={s.editorError}>
              {error}
            </p>
          ) : null}
          <div className={s.editorFooter}>
            <button
              type="button"
              onClick={exportConfig}
              className={s.editorAction}
            >
              <Download size={15} />
              Exportar actual
            </button>
            <button type="button" className={s.primary} onClick={apply}>
              Aplicar al preview ♡
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
