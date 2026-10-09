import { z } from "zod";
import { galleryImageSchema, galleryCategorySchema, media, safeLink } from "../../shared-config";
import { websiteAssetSchema } from "../../media";
import { contrastRatio } from "../../palettes";
const text = (max: number, fallback = "") =>
  z.string().trim().max(max).default(fallback);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Y2K template settings. Business content and stock demo assets stay separate. */
export const pinkConfigSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    displayName: text(160),
    logo: media,
    favicon: media,
    headline: z.tuple([text(55), text(55)]).default(["Tus uñas,", "tu universo."]),
    intro: text(600),
    city: text(100),
    heroImage: media,
    heroCaption: text(180, "pink is a personality ♡"),
    instagram: text(2000).refine(safeLink),
    facebook: text(2000).refine(safeLink),
    phone: text(30),
    whatsapp: text(20).refine(v => !v || /^\+?\d{8,15}$/.test(v)),
    contactEmail: z.union([z.literal(""), z.email()]).default(""),
    about: text(3000),
    aboutImage: media,
    seoTitle: text(160),
    seoDescription: text(300),
    socialImage: media,
    mediaAssets: z.array(websiteAssetSchema).max(100).optional(),
    colors: z
      .object({ accent: hex, ink: hex, background: hex, surface: hex })
      .strict().default({ accent: "#b71863", ink: "#541536", background: "#fff0f6", surface: "#fffafd" }),
    gallery: z.array(galleryImageSchema).max(30).default([]),
    galleryCategories: z.array(galleryCategorySchema).max(20).default([]),
    visibility: z
      .object({
        gallery: z.boolean(),
        pocket: z.boolean(),
        policies: z.boolean(),
      })
      .strict().default({ gallery: true, pocket: true, policies: false }),
    pocket: z
      .object({
        name: text(40),
        messages: z
          .array(z.object({ title: text(45), body: text(100) }).strict())
          .min(1)
          .max(6),
      })
      .strict().default({ name: "LOVE POCKET", messages: [{ title: "¡Hola, nail lover!", body: "Tu próximo set empieza con una idea ♡" }, { title: "Tu idea, tu estilo", body: "Color, brillos y un universo de posibilidades." }, { title: "¿Creamos tu set?", body: "Toca el corazón para explorar la agenda." }] }),
    policy: z
      .object({ title: text(120), body: text(1000), modality: text(240) })
      .strict().prefault({ title: "Antes de tu cita" }),
    copy: z
      .object({
        navServices: text(60, "Servicios & precios"),
        navGallery: text(60, "Mis trabajos"),
        navGuide: text(60, "Antes de tu cita"),
        brandTagline: text(80, "NAIL ART STUDIO"),
        albumAll: text(60, "Todos los sets"),
        heroFile: text(100, "UN SET, MIL FORMAS DE SER TÚ"),
        servicesLove: text(120, "Cada set tiene su historia."),
        servicesLoveStrong: text(100, "Hagamos la tuya."),
        finalEyebrow: text(120, "TU PRÓXIMA OBSESIÓN ESTÁ A UN CLIC"),
        reserve: text(60, "Reservar hora"),
        secondary: text(60, "Ver mis trabajos"),
        eyebrow: text(100, "NAIL ART CON MUCHA PERSONALIDAD"),
        sticker: text(80, "más es más ♡"),
        heroNote: text(100, "hechas para ser muy tú"),
        servicesTitle: text(120, "Elige tu próximo crush."),
        servicesIntro: text(300, "Un color, un detalle o un set que lo tenga todo.\nEncuentra el punto de partida para tu idea."),
        servicesNote: text(300),
        galleryTitle: text(120, "Pequeñas obras. Mucho amor."),
        galleryIntro: text(300, "Un álbum de inspiración para imaginar tu próximo set."),
        guideTitle: text(120, "De tu moodboard a tus manos."),
        guideIntro: text(300, "Elegir tu hora debería ser la parte fácil."),
        steps: z
          .array(z.object({ title: text(80), body: text(300) }).strict())
          .max(5).default([{ title: "Encuentra tu idea", body: "Guarda una referencia para conversar con la profesional." }, { title: "Elige tu servicio", body: "Selecciona tu técnica y personaliza tu cita." }, { title: "Hazle espacio", body: "Elige profesional, día y hora. Revisa tu elección, sin crear una cuenta." }]),
        finalTitle: text(120, "¿Lista para tu próximo set?"),
        finalBody: text(300, "Un poquito de brillo. Un montón de ti."),
        footer: text(180, "Diseños con personalidad. Hechos con amor."),
      })
      .strict().prefault({}),
  })
  .strict().superRefine((config, ctx) => {
    const ids = new Set<string>(), labels = new Set<string>();
    config.galleryCategories.forEach((row, i) => {
      if (ids.has(row.id) || labels.has(row.label.toLocaleLowerCase()) || row.order !== i) ctx.addIssue({ code: "custom", path: ["galleryCategories", i], message: "Categoría repetida o fuera de orden" });
      ids.add(row.id); labels.add(row.label.toLocaleLowerCase());
    });
    config.gallery.forEach((row, i) => { if (row.categoryIds?.some(id => !ids.has(id))) ctx.addIssue({ code: "custom", path: ["gallery", i, "categoryIds"], message: "Categoría no disponible" }); });
  });
export type PinkConfig = z.infer<typeof pinkConfigSchema>;
export const emptyPinkConfig = () => pinkConfigSchema.parse({});
export const readPinkConfig = (input: unknown) => pinkConfigSchema.parse(input);
export function validPinkPalette(config: PinkConfig) {
  const c = config.colors;
  return contrastRatio(c.accent, "#ffffff") >= 4.5 && contrastRatio(c.ink, c.background) >= 4.5 && contrastRatio(c.ink, c.surface) >= 4.5 && contrastRatio(c.accent, c.background) >= 4.5 && contrastRatio(c.accent, c.surface) >= 4.5;
}
export function pinkPublicationError(config: PinkConfig) {
  if (!validPinkPalette(config)) return "La paleta necesita más contraste antes de publicar";
  if (!config.heroImage || !config.headline.some(line => line.trim())) return "Agrega una portada y un titular antes de publicar";
  if (config.visibility.policies && (!config.policy.title || !config.policy.body)) return "Completa las condiciones de tu negocio o desactiva esa sección";
  return null;
}
