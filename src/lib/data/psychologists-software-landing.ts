import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import type { FaqItem } from "@/lib/json-ld";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";

/** The commercial hub for psychologists. Keep this page about appointment administration. */
export const PSYCHOLOGISTS_SOFTWARE_PATH = "/software-agenda-psicologos";
/** Alias kept for callers that use the singular industry name. */
export const PSYCHOLOGY_SOFTWARE_PATH = PSYCHOLOGISTS_SOFTWARE_PATH;

export const psychologistsSoftwareMetadata = {
  title: "Software de agenda para psicólogos",
  description: "Organiza tipos de cita, profesionales, horarios y reservas para tu consulta de psicología. Agenda online con recordatorios por email, cambios y abonos opcionales.",
  keywords: [
    "software de agenda para psicólogos",
    "agenda online para psicólogos",
    "sistema de reservas para psicólogos",
    "agenda para consulta de psicología",
    "programa de agenda para psicólogos",
  ],
};

export const psychologistsSoftwareCopy = {
  h1: "Agenda online para organizar tu consulta de psicología",
  hero: "Ordena los tipos de cita, la disponibilidad de cada profesional y las reglas de reserva en un solo lugar. Puragenda está pensado para la gestión administrativa de tus citas, no para documentar la atención profesional.",
  definition: "Un software de agenda para psicólogos permite publicar servicios con la duración y el precio que defina cada profesional, asignarlos a quienes los ofrecen y mostrar horarios disponibles. La persona reserva desde un enlace o widget; la consulta administra la cita, sus cambios y la información necesaria para coordinarla.",
  softwareDescription: "Software de agenda para psicólogos: servicios con duración y precio definidos por el profesional, reservas por integrante, horarios, bloqueos, abonos configurables y recordatorios por email.",
};

// Fictional editorial data. Durations and prices illustrate configuration only.
export const psychologistsCatalogExample = [
  { service: "Primera cita", duration: 60, price: 35000, professional: "Profesional A", availability: "Lunes y miércoles" },
  { service: "Seguimiento", duration: 45, price: 30000, professional: "Profesional A", availability: "Lunes y miércoles" },
];

export const psychologistsCoordinationProblems = [
  {
    title: "Tipos de cita con tiempos distintos",
    description: "Una primera cita y un seguimiento pueden ocupar bloques diferentes. El profesional define el nombre, la duración y el precio de cada servicio para que la agenda ofrezca un espacio suficiente.",
  },
  {
    title: "Jornadas que cambian por profesional",
    description: "Si trabajan varias personas, cada una puede tener servicios y horarios propios. La agenda muestra únicamente las combinaciones que el equipo haya configurado.",
  },
  {
    title: "Horas que no deben aparecer",
    description: "Añade bloqueos para reuniones, pausas, vacaciones u otros períodos sin atención. Esas horas quedan fuera de la disponibilidad pública.",
  },
  {
    title: "Menos coordinación manual",
    description: "Comparte un enlace de reservas o integra el widget en tu web. La persona elige el tipo de cita, el profesional cuando corresponda y una hora libre, sin intercambiar mensajes para cada alternativa.",
  },
];

export const psychologistsWorkflow = [
  { title: "Crea los tipos de cita", description: "Añade Primera cita, Seguimiento u otros servicios administrativos que ofrezcas." },
  { title: "Define duración y precio", description: "El profesional decide cuánto dura cada servicio y qué precio mostrar, cuando corresponda." },
  { title: "Configura profesionales", description: "En el plan Equipo, asigna cada servicio a las personas que lo realizan." },
  { title: "Define jornadas", description: "Configura el horario individual de cada profesional o el horario de tu negocio en el plan Individual." },
  { title: "Añade bloqueos", description: "Marca períodos sin atención para que no se publiquen como disponibles." },
  { title: "Comparte la agenda", description: "Publica el enlace, usa el widget o intégralo mediante iframe en tu sitio." },
  { title: "La persona reserva", description: "Elige tipo de cita, profesional cuando corresponda, horario y datos de contacto." },
  { title: "Abono opcional", description: "Si lo activas y conectas Mercado Pago, la reserva puede solicitar el abono configurado." },
  { title: "Gestiona la cita", description: "Puragenda registra la reserva, envía el recordatorio por email y permite cancelar o reagendar según las reglas." },
  { title: "Consulta el historial", description: "Revisa reservas anteriores, servicios agendados e información administrativa del cliente." },
];

export function psychologistsSoftwareFaqs(): FaqItem[] {
  return [
    {
      question: "¿Puragenda reemplaza una ficha clínica?",
      answer: "No. Puragenda se enfoca en organizar reservas, horarios y comunicación administrativa de citas. La documentación clínica debe mantenerse en la herramienta o proceso que el profesional utilice para ese propósito.",
    },
    {
      question: "¿Puedo definir distintas duraciones según el tipo de cita?",
      answer: "Sí. Cada servicio puede tener la duración y el precio que defina el profesional. La agenda usa esos datos junto con las jornadas, las citas y los bloqueos para mostrar horarios disponibles.",
    },
    {
      question: "¿Cada psicólogo tiene su propio horario?",
      answer: "Sí. En el plan Equipo cada profesional puede tener servicios y jornada propios. En el plan Individual la disponibilidad se organiza con el horario del negocio.",
    },
    {
      question: "¿Puedo bloquear horas no disponibles?",
      answer: "Sí. Puedes añadir bloqueos para pausas, reuniones, vacaciones u otros períodos en que no quieras recibir reservas.",
    },
    {
      question: "¿Cómo se cancelan o reagendan las citas?",
      answer: "Los enlaces de gestión funcionan según la configuración del negocio, el plazo de anticipación y la disponibilidad. Una cita con abono aprobado requiere coordinar el cambio o la cancelación directamente con el profesional.",
    },
    {
      question: "¿Los recordatorios son por email?",
      answer: "Sí. Puragenda envía el recordatorio por email para las citas del día siguiente, siempre que la reserva siga activa y tenga un correo válido.",
    },
    {
      question: "¿Puedo conectar Google Calendar?",
      answer: "Sí. La integración puede crear, actualizar y eliminar en Google Calendar los eventos de las citas y considerar compromisos externos como horas ocupadas, según la conexión y configuración elegidas. No implica crear una videollamada.",
    },
    {
      question: "¿Puedo solicitar un abono?",
      answer: "Sí, cuando el negocio activa los abonos, configura el monto del servicio y conecta su cuenta de Mercado Pago. El abono es una condición administrativa de la reserva, no un cobro de prestaciones clínicas.",
    },
    {
      question: "¿Puragenda incluye videollamada?",
      answer: "No. Puragenda no crea una videollamada automática ni ofrece teleconsulta integrada. Google Calendar tampoco debe interpretarse como una videollamada incluida.",
    },
    {
      question: "¿Cuánto cuesta Puragenda para psicólogos?",
      answer: `El plan ${PRICING.INDIVIDUAL.name} cuesta ${formatLandingClp(PRICING.INDIVIDUAL.monthly)} CLP al mes e incluye ${STAFF_LIMITS.INDIVIDUAL} profesional. El plan ${PRICING.EQUIPO.name} cuesta ${formatLandingClp(PRICING.EQUIPO.monthly)} CLP al mes e incluye ${STAFF_LIMITS.EQUIPO} profesionales; cada profesional adicional cuesta ${formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP al mes. La prueba dura ${TRIAL_DURATION_DAYS} días. Revisa los planes y condiciones vigentes en Precios.`,
    },
  ];
}
