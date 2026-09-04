import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import type { FaqItem } from "@/lib/json-ld";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";

export const MANICURE_SOFTWARE_PATH = "/software-agenda-manicure";

export const manicureSoftwareMetadata = {
  title: "Software de agenda para manicure y uñas",
  description: "Organiza esmaltado, retiro y diseños con su duración, precio y profesional. Reservas online para manicuristas y nail studios, con abonos y recordatorios por email.",
  keywords: ["software de agenda para manicure", "agenda para manicuristas", "sistema de reservas para manicure", "agenda online para uñas", "software para nail studio", "programa para salón de uñas"],
};

export const manicureSoftwareCopy = {
  h1: "Software de agenda para manicure y nail studios",
  hero: "Antes de elegir una hora, la clienta necesita elegir bien el servicio. Publica esmaltado, retiro y mantenimiento con el tiempo que les dedicas, su precio y la manicurista que los realiza.",
  definition: "Un software de agenda para manicure organiza las reservas a partir del catálogo del estudio. En Puragenda defines servicios, duración, precio, profesionales y horarios; la clienta elige desde un enlace y la cita queda en tu panel. Es una herramienta para administrar tu trabajo, tanto si atiendes sola como si coordinas un nail studio.",
  softwareDescription: "Software de agenda para manicure: catálogo de uñas con duración y precio por servicio, reservas por profesional, bloqueos, abonos configurables y recordatorios por email.",
};

// Fictional editorial data. These are service prices, never subscription prices.
// Separate services deliberately avoid the unverified single-service option-duration flow.
export const manicureCatalogExample = [
  { service: "Esmaltado permanente", duration: 60, price: 18000, professional: "Profesional A o B", availability: "Cabe en un espacio libre de 60 minutos, dentro de su jornada." },
  { service: "Esmaltado permanente con retiro", duration: 90, price: 23000, professional: "Profesional B", availability: "Necesita 90 minutos libres de B; un espacio de 60 minutos no basta." },
];

export const manicureProblems = [
  { title: "El retiro que no se contó", description: "Si la clienta llega con un esmaltado anterior, el trabajo puede necesitar otro bloque. Define qué incluye cada servicio y publica una alternativa con retiro cuando corresponda." },
  { title: "Un diseño no ocupa siempre lo mismo", description: "Separa diseños y mantenimientos según los tiempos que hayas definido. Si necesitas evaluar el diseño antes de darle duración y precio, acuerda esos detalles antes de reservar." },
  { title: "La técnica y la profesional adecuada", description: "No todas las integrantes del estudio realizan los mismos servicios. Asigna cada servicio a quienes lo ofrecen y configura su disponibilidad en el plan Equipo." },
  { title: "Disponibilidad entre una atención y otra", description: "Mientras estás esmaltando, las consultas por horario siguen llegando. Comparte el catálogo con horas disponibles y deja las dudas sobre la técnica para una conversación contigo." },
];

export const manicureWorkflow = [
  { title: "Define qué incluye cada servicio", description: "Crea el catálogo de esmaltado, retiro, mantenimiento y diseño que realmente ofreces. Explica si el retiro está incluido y configura duración y precio completos para cada servicio." },
  { title: "Configura las opciones que correspondan", description: "Puedes ofrecer alternativas de precio dentro de un servicio. Para este recorrido, usa opciones que mantengan su duración; si una variante necesita más tiempo, publícala como otro servicio con su duración completa." },
  { title: "Asigna profesionales y jornadas", description: "En Equipo, relaciona los servicios con cada manicurista y configura sus horarios. Si trabajas con Individual, la disponibilidad usa el horario del negocio. Añade bloqueos para los períodos que no atenderás." },
  { title: "Comparte y recibe la reserva", description: "Publica el enlace en Instagram o integra el widget en tu web. La clienta elige servicio, las opciones disponibles, profesional cuando corresponda y una hora; completa sus datos y paga el abono si está configurado." },
  { title: "Gestiona la cita y la siguiente visita", description: "El recordatorio llega por email. Gestiona cancelaciones o cambios según las condiciones de la cita y consulta el historial administrativo para revisar qué servicio se reservó anteriormente." },
];

export function manicureSoftwareFaqs(): FaqItem[] {
  return [
    { question: "¿Cómo organizo servicios de uñas con duraciones diferentes?", answer: "Crea cada servicio con su duración y precio completos. Por ejemplo, separa esmaltado de esmaltado con retiro. Puragenda utiliza la duración del servicio, la jornada y las reservas o bloqueos existentes para determinar qué horarios se pueden ofrecer." },
    { question: "¿Puedo añadir opciones a un servicio de manicure?", answer: "Sí, puedes configurar opciones y alternativas de precio. En el recorrido descrito aquí, las opciones mantienen la duración del servicio. Si el retiro o un diseño requiere más tiempo, crea un servicio separado con la duración completa para reservar el bloque correspondiente." },
    { question: "¿Cada manicurista puede tener su propio horario?", answer: "Sí, en el plan Equipo puedes asignar servicios y horarios a cada profesional. En el plan Individual, la disponibilidad de quien atiende se organiza con el horario del negocio. Los bloqueos permiten marcar períodos no disponibles." },
    { question: "¿Se puede pedir un abono para una reserva de manicure?", answer: "Sí. Activa los abonos, configura el monto del servicio y conecta Mercado Pago para usar ese medio de pago. La clienta ve el abono antes de pagarlo. Si una cita ya tiene un abono aprobado, su cancelación o cambio requiere contactar al negocio; no se resuelve automáticamente desde el enlace." },
    { question: "¿Cómo reserva una clienta desde Instagram o mi web?", answer: "Abre tu enlace de reservas o el widget integrado en tu web, selecciona servicio y opciones disponibles, elige profesional cuando corresponde y una hora, y completa sus datos. El flujo funciona en el navegador y no le exige instalar una aplicación." },
    { question: "¿Cómo funcionan los recordatorios y los cambios de hora?", answer: "Puragenda envía recordatorios por email para las citas del día siguiente. El reagendamiento por enlace depende de que el negocio lo habilite, de su plazo de anticipación y de la disponibilidad. Las citas con abono aprobado requieren coordinación con el negocio para cambiarse o cancelarse." },
    { question: "¿Qué puedo consultar antes de un mantenimiento?", answer: "Puedes revisar el historial administrativo de citas de la clienta y los servicios reservados anteriormente. Si necesitas acordar un nuevo diseño o conocer el estado actual de sus uñas, conversa con ella: el historial no determina por sí solo qué servicio necesita." },
    { question: "¿Cuánto cuesta Puragenda para una manicurista o un nail studio?", answer: `El plan ${PRICING.INDIVIDUAL.name} cuesta ${formatLandingClp(PRICING.INDIVIDUAL.monthly)} CLP al mes e incluye ${STAFF_LIMITS.INDIVIDUAL} profesional. El plan ${PRICING.EQUIPO.name} cuesta ${formatLandingClp(PRICING.EQUIPO.monthly)} CLP al mes e incluye ${STAFF_LIMITS.EQUIPO} profesionales; cada profesional adicional cuesta ${formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP al mes. La prueba dura ${TRIAL_DURATION_DAYS} días. Consulta los planes y condiciones vigentes en Precios.` },
  ];
}
