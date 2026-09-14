import { ESTETICA_BELLA_DEMO_SLUG } from "@/lib/marketplace/visibility";
import { averageFromSum } from "@/lib/reviews/rating";

export const ESTETICA_BELLA_DEMO_NAME = "Estética Bella";
export const ESTETICA_BELLA_DEMO_REVIEW_PREFIX = "clevrebella";
export const ESTETICA_BELLA_DEMO_EMAIL_DOMAIN = "reviews.estetica-bella.puragenda.test";

export type EsteticaBellaDemoReviewSpec = {
  key: string;
  customerName: string;
  rating: 2 | 3 | 4 | 5;
  comment: string;
  visibility: "PRIVATE" | "PUBLIC";
  status: "PENDING" | "PUBLISHED" | "REPORTED";
  daysAgo: number;
  hour: number;
  serviceHint: "nails" | "hair";
  reply?: string;
  reportReason?: "NOT_ABOUT_SERVICE";
};

export function demoAppointmentId(key: string) {
  return `${ESTETICA_BELLA_DEMO_REVIEW_PREFIX}${key}appt`;
}

export function demoClientEmail(key: string) {
  return `demo.review.${key}@${ESTETICA_BELLA_DEMO_EMAIL_DOMAIN}`;
}

export function isEsteticaBellaDemoBusiness(business: { slug: string; name: string; deletedAt?: Date | null }) {
  if (business.deletedAt) return false;
  if (business.slug !== ESTETICA_BELLA_DEMO_SLUG) return false;
  return /^est[eé]tica bella$/i.test(business.name.trim());
}

export const ESTETICA_BELLA_DEMO_REVIEWS: EsteticaBellaDemoReviewSpec[] = [
  { key: "01", customerName: "Camila Soto", rating: 5, comment: "Muy buena atención.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 4, hour: 11, serviceHint: "nails" },
  { key: "02", customerName: "Javiera Núñez", rating: 5, comment: "Me atendieron a la hora y el resultado quedó impecable.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 7, hour: 16, serviceHint: "hair" },
  { key: "03", customerName: "Daniela Rojas", rating: 5, comment: "Todo súper ordenado. Salí contenta con las uñas.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 9, hour: 12, serviceHint: "nails", reply: "¡Gracias Daniela! Nos alegra que hayas salido contenta." },
  { key: "04", customerName: "Fernanda Díaz", rating: 5, comment: "Buena experiencia, volvería sin problema.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 12, hour: 10, serviceHint: "hair" },
  { key: "05", customerName: "Constanza Vega", rating: 5, comment: "La chica que me atendió fue muy amable y cuidadosa.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 15, hour: 18, serviceHint: "nails" },
  { key: "06", customerName: "Antonia Fuentes", rating: 5, comment: "Quedé conforme. El local está limpio y se nota el orden.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 18, hour: 13, serviceHint: "hair" },
  { key: "07", customerName: "Francisca Morales", rating: 5, comment: "Me hice las uñas en gel y duraron impecables. Atención rápida y sin apuro.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 21, hour: 17, serviceHint: "nails" },
  { key: "08", customerName: "Paula Araya", rating: 5, comment: "Todo bien, puntual y buena onda.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 24, hour: 11, serviceHint: "hair" },
  { key: "09", customerName: "Valentina Campos", rating: 5, comment: "Me explicaron bien el procedimiento y el resultado me gustó.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 28, hour: 15, serviceHint: "nails" },
  { key: "10", customerName: "Catalina Herrera", rating: 5, comment: "Súper conforme. Agendé por Puragenda y no tuve que esperar.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 33, hour: 10, serviceHint: "hair", reply: "Gracias por agendar con nosotras, Catalina. Te esperamos de nuevo." },
  { key: "11", customerName: "Isidora Paredes", rating: 5, comment: "Atención cercana y profesional. El corte quedó como lo pedí.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 37, hour: 14, serviceHint: "hair" },
  { key: "12", customerName: "Martina Silva", rating: 5, comment: "Salí feliz con el color. Se tomaron el tiempo de preguntar qué quería.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 41, hour: 16, serviceHint: "hair" },
  { key: "13", customerName: "Florencia Castro", rating: 5, comment: "Recomendable. Ambiente tranquilo y buena atención.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 46, hour: 12, serviceHint: "nails" },
  { key: "14", customerName: "Trinidad Muñoz", rating: 5, comment: "Llegué un poco nerviosa y me hicieron sentir cómoda de inmediato.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 52, hour: 11, serviceHint: "nails" },
  { key: "15", customerName: "Belén Ortiz", rating: 5, comment: "El manicure quedó precioso. Precio claro y sin sorpresas.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 58, hour: 17, serviceHint: "nails" },
  { key: "16", customerName: "Amanda Reyes", rating: 5, comment: "Puntuales y detallistas. Ya agendé la próxima hora.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 64, hour: 13, serviceHint: "hair" },
  { key: "17", customerName: "Nicole Bravo", rating: 4, comment: "Buena atención en general. El resultado me gustó, aunque el local estaba un poco lleno.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 11, hour: 18, serviceHint: "nails" },
  { key: "18", customerName: "Camila Pinto", rating: 4, comment: "Me atendieron bien y a la hora. Solo se demoraron un poco más al final.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 26, hour: 15, serviceHint: "hair" },
  { key: "19", customerName: "Josefina Lagos", rating: 4, comment: "Quedé conforme con las uñas. La atención fue amable, aunque tuve que esperar unos minutos.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 39, hour: 12, serviceHint: "nails" },
  { key: "20", customerName: "Emilia Soto", rating: 4, comment: "Buena experiencia. Volvería, tal vez pediría un poco más de tiempo para el diseño.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 71, hour: 16, serviceHint: "nails" },
  { key: "21", customerName: "Pía Contreras", rating: 3, comment: "La atención fue muy amable, aunque tuve que esperar un poco más de lo esperado. El resultado igual quedó bien.", visibility: "PUBLIC", status: "PUBLISHED", daysAgo: 19, hour: 14, serviceHint: "hair" },
  { key: "22", customerName: "Renata Vidal", rating: 5, comment: "Todo excelente, muy profesionales.", visibility: "PUBLIC", status: "PENDING", daysAgo: 1, hour: 17, serviceHint: "nails" },
  { key: "23", customerName: "Macarena León", rating: 4, comment: "Me atendieron bien, pero el comentario del horario no coincidió con lo que tenía agendado.", visibility: "PUBLIC", status: "REPORTED", daysAgo: 2, hour: 11, serviceHint: "hair", reportReason: "NOT_ABOUT_SERVICE" },
  { key: "24", customerName: "Ignacia Tapia", rating: 5, comment: "Les dejo esto solo para el local: me gustó harto la atención de Francisca.", visibility: "PRIVATE", status: "PENDING", daysAgo: 6, hour: 18, serviceHint: "nails" },
];

export function publicPublishedDemoReviews() {
  return ESTETICA_BELLA_DEMO_REVIEWS.filter((review) => review.visibility === "PUBLIC" && review.status === "PUBLISHED");
}

export function esteticaBellaDemoRatingSummary() {
  const published = publicPublishedDemoReviews();
  const sum = published.reduce((total, review) => total + review.rating, 0);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of published) distribution[review.rating] += 1;
  return {
    count: published.length,
    sum,
    average: averageFromSum(sum, published.length),
    distribution,
    pending: ESTETICA_BELLA_DEMO_REVIEWS.filter((review) => review.visibility === "PUBLIC" && review.status === "PENDING").length,
    reported: ESTETICA_BELLA_DEMO_REVIEWS.filter((review) => review.status === "REPORTED").length,
    private: ESTETICA_BELLA_DEMO_REVIEWS.filter((review) => review.visibility === "PRIVATE").length,
    withReply: ESTETICA_BELLA_DEMO_REVIEWS.filter((review) => Boolean(review.reply)).length,
  };
}
