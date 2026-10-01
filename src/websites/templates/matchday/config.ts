import { z } from "zod";
import { safeLink, safeMediaUrl, galleryImageSchema, galleryCategorySchema } from "../../shared-config";
import { websiteAssetSchema } from "../../media";
const text = (max: number, fallback = "") => z.string().trim().max(max).default(fallback);
const media = text(2000).refine(safeMediaUrl, "Sube una imagen de tu negocio");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const matchdayConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  displayName: text(160), brandEyebrow: text(80), brandTitle: text(160), headline: text(200, "Cada corte tiene carácter."),
  graphicPhrase: text(100), intro: text(600), heroCaption: text(180), heroImage: media, logo: media, favicon: media,
  about: text(3000), aboutImage: media,
  accent: z.enum(["signal", "ice", "terrain"]).default("signal"), paletteMode: z.enum(["preset", "custom"]).default("preset"),
  customPalette: z.object({ accent: hex, onAccent: hex, paper: hex, ink: hex }).strict().optional(),
  gallery: z.array(galleryImageSchema).max(30).default([]), galleryCategories: z.array(galleryCategorySchema).max(20).default([]),
  staffEditorial: z.record(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), z.object({ visualNumber: text(4), label: text(100), visible: z.boolean().default(true) }).strict()).default({}),
  showNumbers: z.boolean().default(true), showMarquee: z.boolean().default(true), showGalleryCategories: z.boolean().default(true),
  marquee: z.array(z.string().trim().min(1).max(100)).max(8).default([]),
  copy: z.object({
    nav: z.object({ services: text(60, "Servicios"), staff: text(60, "Equipo"), gallery: text(60, "Trabajos"), about: text(60, "Estudio"), reserve: text(60, "Reservar") }).strict().default({ services: "Servicios", staff: "Equipo", gallery: "Trabajos", about: "Estudio", reserve: "Reservar" }),
    reserve: text(80, "Reserva tu hora"), secondary: text(80, "Ver los trabajos"),
    servicesTitle: text(160, "Elige tu próximo corte"), servicesNote: text(250), serviceAction: text(80, "Reservar este servicio"),
    staffTitle: text(160, "Las manos detrás del corte"), staffNote: text(250),
    galleryTitle: text(160, "En detalle"), galleryNote: text(250), galleryAll: text(60, "Todo"),
    aboutTitle: text(160, "Nuestro espacio"), bookingTitle: text(160, "Tu próxima hora"), bookingNote: text(250),
    bookingSteps: z.tuple([text(80, "Servicio"), text(80, "Profesional"), text(80, "Día y hora"), text(80, "Tus datos"), text(80, "Confirma")]).default(["Servicio", "Profesional", "Día y hora", "Tus datos", "Confirma"]),
    footerStatement: text(200), contactTitle: text(100, "Nos vemos aquí"), hoursTitle: text(80, "Horarios"), mapsLabel: text(80, "Cómo llegar"),
  }).strict().prefault({}),
  contactEmail: z.union([z.literal(""), z.email()]).default(""), phone: text(30), whatsapp: text(20).refine(v => !v || /^\+?\d{8,15}$/.test(v)),
  instagram: text(2000).refine(safeLink), facebook: text(2000).refine(safeLink),
  seoTitle: text(160), seoDescription: text(300), socialImage: media, mediaAssets: z.array(websiteAssetSchema).max(100).optional(),
}).strict().superRefine((config, ctx) => {
  const ids = new Set<string>(), labels = new Set<string>();
  config.galleryCategories.forEach((row, i) => {
    if (ids.has(row.id) || labels.has(row.label.toLocaleLowerCase()) || row.order !== i) ctx.addIssue({ code: "custom", path: ["galleryCategories", i], message: "Categoría repetida o fuera de orden" });
    ids.add(row.id); labels.add(row.label.toLocaleLowerCase());
  });
  config.gallery.forEach((row, i) => { if (row.categoryIds?.some(id => !ids.has(id))) ctx.addIssue({ code: "custom", path: ["gallery", i, "categoryIds"], message: "Categoría no disponible" }); });
});
export type MatchdayConfig = z.infer<typeof matchdayConfigSchema>;
export const emptyMatchdayConfig = () => matchdayConfigSchema.parse({});
