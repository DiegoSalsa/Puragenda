import { z } from "zod";

const copyText = (max: number, fallback: string) => z.string().trim().max(max).default(fallback);

export const bellaCopySchema = z.object({
  nav: z.preprocess(value => value ?? {}, z.object({
    gallery: copyText(60, "Trabajos"), services: copyText(60, "Tratamientos"), about: copyText(60, "El estudio"),
    reserve: copyText(60, "Reservar"), menu: copyText(40, "Menú"), close: copyText(40, "Cerrar"), aria: copyText(100, "Navegación principal"),
  }).strict()),
  hero: z.preprocess(value => value ?? {}, z.object({
    fallbackHeadline: copyText(200, "Tu próximo\nmomento"), reserve: copyText(80, "Reservar mi momento"), gallery: copyText(80, "Ver trabajos"),
  }).strict()),
  gallery: z.preprocess(value => value ?? {}, z.object({
    title: copyText(160, "En primer plano."), subtitle: copyText(240, "Explora color, forma y acabado."), filterLabel: copyText(100, "Filtrar trabajos"),
    previous: copyText(80, "Trabajos anteriores"), next: copyText(80, "Trabajos siguientes"), expand: copyText(80, "Mirar de cerca"),
    countSingular: copyText(50, "composición"), countPlural: copyText(50, "composiciones"), note: copyText(120, "Desliza. El detalle sigue."),
    countSuffix: copyText(60, "portfolio"), pause: copyText(80, "Pausar movimiento"), resume: copyText(80, "Reanudar movimiento"), dialogLabel: copyText(120, "Imagen ampliada del portfolio"),
    closeDialog: copyText(80, "Cerrar imagen"), marquee: z.array(copyText(120, "COLOR. FORMA. DETALLE.")).max(8).default(["COLOR. FORMA. DETALLE."]),
  }).strict()),
  services: z.preprocess(value => value ?? {}, z.object({
    title: copyText(160, "Tu próximo\ndetalle."), subtitle: copyText(160, "Duración, precio y elección."), aria: copyText(100, "Explorar tratamientos"),
    choose: copyText(80, "Elegir tratamiento"), unavailable: copyText(180, "No hay tratamientos disponibles en este momento."),
    retry: copyText(80, "Volver a consultar"), loading: copyText(80, "Consultando…"),
  }).strict()),
  studio: z.preprocess(value => value ?? {}, z.object({
    title: copyText(160, "El resultado\nempieza antes."), processAria: copyText(100, "Explorar el proceso"), spaceCaption: copyText(80, "El estudio"),
  }).strict()),
  booking: z.preprocess(value => value ?? {}, z.object({
    mode: copyText(80, "Agenda · Puragenda"), demoMode: copyText(80, "Agenda de muestra"), title: copyText(160, "Hagamos\nespacio."),
    idleSummary: copyText(240, "Una elección a la vez.\nEl contacto, al final."), anyStaffCaption: copyText(120, "El momento disponible decide."), noStaffTitle: copyText(100, "La agenda del estudio."),
    resultDemo: copyText(120, "El detalle está elegido."), resultConfirmed: copyText(120, "Nos vemos pronto."), resultReceived: copyText(120, "Cita recibida."),
    intro: copyText(240, "Primero, el tratamiento.\nDespués, tu momento."), panelEyebrow: copyText(120, "TU AGENDA"), panelTitle: copyText(180, "Un detalle.\nUn momento para ti."),
    panelIntro: copyText(300, "Elige qué te harás, con quién y cuándo.\nTu elección se queda contigo en cada paso."), start: copyText(100, "Comenzar mi reserva"),
    steps: z.array(copyText(60, "Paso")).length(5).default(["Tratamiento", "Profesional", "Momento", "Tus datos", "Revisión"]),
    flowTitles: z.array(copyText(100, "Tu momento.")).length(5).default(["¿Qué te harás?", "¿Con quién?", "¿Cuándo te vemos?", "Ahora, tus datos.", "Tu momento, listo."]),
  }).strict()),
  footer: z.preprocess(value => value ?? {}, z.object({ gallery: copyText(80, "Mira los detalles"), reserve: copyText(80, "Reserva tu momento"), preview: copyText(160, "Vista previa. No se crean reservas."), credit: copyText(100, "Reservas con Puragenda") }).strict()),
}).strict();

export type BellaCopy = z.infer<typeof bellaCopySchema>;
export const defaultBellaCopy = (): BellaCopy => bellaCopySchema.parse({});

/** Fills a legacy V1 copy object without replacing intentionally empty custom text. */
export function bellaCopy(config: { copy?: Partial<BellaCopy> }, businessName?: string): BellaCopy {
  const configuredMarquee = (config.copy as { gallery?: { marquee?: string[] } } | undefined)?.gallery?.marquee;
  const parsed = bellaCopySchema.parse(config.copy ?? {});
  if (configuredMarquee === undefined) parsed.gallery.marquee = [`COLOR. FORMA. DETALLE. ${(businessName || "").trim().toUpperCase()}.`].filter(Boolean);
  return parsed;
}

