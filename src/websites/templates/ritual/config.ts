import { z } from "zod";
import { safeLink, safeMediaUrl, galleryImageSchema, galleryCategorySchema } from "../../shared-config";
import { websiteAssetSchema } from "../../media";

const text = (max: number, fallback = "") => z.string().trim().max(max).default(fallback);
const media = text(2000).refine(safeMediaUrl, "Sube una imagen local o de Cloudinary");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const faq = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), question: text(180), answer: text(800) }).strict();
const visibility = z.object({ showFeatured: z.boolean().default(true), showGallery: z.boolean().default(true), showStaff: z.boolean().default(true), showAbout: z.boolean().default(true), showSensory: z.boolean().default(true), showFaq: z.boolean().default(true) }).strict().prefault({});
const customPalette = z.object({ background: hex, surface: hex, text: hex, muted: hex, accent: hex, accentContrast: hex, line: hex, warm: hex, dark: hex }).strict();

export const ritualConfigSchema = z.object({
  schemaVersion: z.literal(2).default(2), displayName: text(160), brandEyebrow: text(100, "Un espacio para bajar el ritmo"), brandTitle: text(160),
  headline: text(240, "Una pausa hecha a tu medida."), intro: text(700), heroCaption: text(180), heroImage: media, logo: media, favicon: media,
  about: text(3000), aboutImage: media, accent: z.enum(["earth", "sage", "stone", "ember"]).default("earth"), paletteMode: z.enum(["preset", "custom"]).default("preset"), customPalette: customPalette.optional(),
  visibility,
  featuredServiceId: text(160),
  gallery: z.array(galleryImageSchema).max(30).default([]), galleryCategories: z.array(galleryCategorySchema).max(20).default([]), faq: z.array(faq).max(12).default([]),
  sensorial: z.object({ eyebrow: text(80, "Antes de tu cita"), title: text(180), body: text(1200) }).strict().prefault({}),
  staffEditorial: z.record(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), z.object({ label: text(100), note: text(240), visible: z.boolean().default(true) }).strict()).default({}),
  copy: z.object({
    nav: z.object({ services: text(60, "Tratamientos"), staff: text(60, "Profesionales"), gallery: text(60, "Detalles"), about: text(60, "El espacio"), faq: text(60, "Preguntas"), reserve: text(60, "Reservar") }).strict().default({ services: "Tratamientos", staff: "Profesionales", gallery: "Detalles", about: "El espacio", faq: "Preguntas", reserve: "Reservar" }),
    reserve: text(80, "Elegir un momento"), secondary: text(80, "Ver detalles"), servicesTitle: text(180, "Elige tu tratamiento"), servicesNote: text(300), serviceAction: text(80, "Reservar este tratamiento"), allServices: text(80, "Ver todos los tratamientos"),
    featuredEyebrow: text(80, "Tratamiento destacado"), featuredTitle: text(180, "Un momento para ti"), pauseTitle: text(180, "Baja el ritmo antes de llegar"), pauseBody: text(600),
    staffTitle: text(180, "Las manos que te acompañan"), staffNote: text(300), galleryTitle: text(180, "Detalles del espacio"), galleryNote: text(300), galleryAll: text(60, "Todos"),
    aboutTitle: text(180, "El espacio"), bookingTitle: text(180, "Elige tu momento"), bookingNote: text(300), bookingSteps: z.tuple([text(80, "Tratamiento"), text(80, "Profesional"), text(80, "Día y hora"), text(80, "Tus datos"), text(80, "Confirma")]).default(["Tratamiento", "Profesional", "Día y hora", "Tus datos", "Confirma"]),
    faqTitle: text(180, "Preguntas frecuentes"), contactTitle: text(100, "Encuéntranos"), hoursTitle: text(80, "Horarios"), mapsLabel: text(80, "Cómo llegar"), footerStatement: text(240)
  }).strict().prefault({}),
  contactEmail: z.union([z.literal(""), z.email()]).default(""), phone: text(30), whatsapp: text(20).refine(v => !v || /^\+?[0-9]{8,15}$/.test(v)), instagram: text(2000).refine(safeLink), facebook: text(2000).refine(safeLink), seoTitle: text(160), seoDescription: text(300), socialImage: media, mediaAssets: z.array(websiteAssetSchema).max(100).optional(),
}).strict().superRefine((config, ctx) => {
  const ids = new Set<string>(), labels = new Set<string>();
  config.galleryCategories.forEach((row, i) => { if (ids.has(row.id) || labels.has(row.label.toLocaleLowerCase()) || row.order !== i) ctx.addIssue({ code: "custom", path: ["galleryCategories", i], message: "Categoría repetida o fuera de orden" }); ids.add(row.id); labels.add(row.label.toLocaleLowerCase()); });
  config.gallery.forEach((row, i) => row.categoryIds?.forEach(id => { if (!ids.has(id)) ctx.addIssue({ code: "custom", path: ["gallery", i, "categoryIds"], message: "Categoría no disponible" }); }));
});
export type RitualConfig = z.infer<typeof ritualConfigSchema>;

const defaultPalette = { background: "#f3ede3", surface: "#fffaf2", text: "#2f241e", muted: "#78685b", accent: "#a85b3b", accentContrast: "#fffaf2", line: "#d8cabe", warm: "#d9b79c", dark: "#2f241e" };
const defaultVisibility = { showFeatured: true, showGallery: true, showStaff: true, showAbout: true, showSensory: true, showFaq: true };
/** Migrate Ritual V1 content without changing the public registry identity. */
export function readRitualConfig(input: unknown): RitualConfig {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? { ...(input as Record<string, unknown>) } : {};
  const oldPalette = raw.customPalette && typeof raw.customPalette === "object" ? raw.customPalette as Record<string, unknown> : undefined;
  const palette = oldPalette && "background" in oldPalette ? oldPalette : oldPalette ? { ...defaultPalette, accent: oldPalette.accent, accentContrast: oldPalette.onAccent, background: oldPalette.paper, surface: oldPalette.paper, text: oldPalette.ink, dark: oldPalette.ink, muted: oldPalette.muted } : undefined;
  return ritualConfigSchema.parse({ ...raw, schemaVersion: 2, customPalette: palette, visibility: { ...defaultVisibility, ...(raw.visibility as object | undefined) } });
}
export const emptyRitualConfig = () => readRitualConfig({});
