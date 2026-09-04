import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import type { FaqItem } from "@/lib/json-ld";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";

export const AESTHETICS_SOFTWARE_PATH = "/software-agenda-estetica";

export const aestheticsSoftwareMetadata = {
  title: "Software de agenda para centros de estética",
  description: "Organiza faciales, cejas y pestañas por duración, profesional y horario. Reservas online para centros de estética, con abonos y recordatorios por email.",
  keywords: [
    "software de agenda para centros de estética",
    "sistema de reservas para centro de estética",
    "agenda online para centro estético",
    "software para estética",
    "programa para centro de estética",
    "agenda para esteticistas",
  ],
};

export const aestheticsSoftwareCopy = {
  h1: "Sistema de reservas para centros de estética",
  hero: "Coordina un catálogo variado sin tratar todas las citas como si ocuparan el mismo tiempo. Define cada servicio, asígnalo a las profesionales que lo realizan y publica únicamente los horarios que corresponden.",
  definition: "Un software de agenda para centros de estética organiza citas según el servicio elegido, su duración, la profesional asignada y su horario disponible. En Puragenda puedes publicar el catálogo, recibir reservas desde un enlace o widget y administrar las citas desde un panel, tanto si atiendes de forma independiente como si coordinas un equipo.",
  softwareDescription: "Software de agenda para centros de estética no clínica: servicios con duración y precio, reservas por profesional, horarios, bloqueos, abonos configurables y recordatorios por email.",
};

// Fictional editorial data. Prices illustrate service configuration and are not
// customer rates, recommendations, or Puragenda subscription prices.
export const aestheticsCatalogExample = [
  { service: "Limpieza facial", duration: 60, price: 32000, professional: "Profesional A o B", schedule: "Según la jornada libre de A o B" },
  { service: "Diseño de cejas", duration: 30, price: 15000, professional: "Profesional A", schedule: "Solo muestra horas disponibles de A" },
  { service: "Extensiones de pestañas", duration: 90, price: 45000, professional: "Profesional B", schedule: "Necesita 90 minutos continuos de B" },
];

export const aestheticsCoordinationProblems = [
  { title: "Duraciones que no son intercambiables", description: "Una cita de cejas puede necesitar un bloque distinto al de un facial o unas extensiones. Cada servicio debe tener el tiempo que el centro realmente reserva para realizarlo." },
  { title: "Profesionales con catálogos diferentes", description: "Una integrante puede ofrecer cejas y otra pestañas. Asigna los servicios que realiza cada profesional para que la clienta elija entre opciones válidas." },
  { title: "Jornadas y pausas individuales", description: "La disponibilidad del equipo cambia por día. Configura horarios por profesional y añade bloqueos para vacaciones, trámites, descansos u otros períodos sin atención." },
  { title: "Consultas mientras el equipo atiende", description: "El enlace de reservas mantiene visible el catálogo y las horas disponibles. Las preguntas que requieren evaluación profesional se siguen resolviendo directamente con el centro." },
];

export const aestheticsWorkflow = [
  { title: "Prepara el catálogo", description: "Crea faciales, cejas, pestañas y los demás servicios no clínicos que ofreces. Define nombre, descripción, duración y precio; añade opciones solo cuando ayuden a elegir correctamente." },
  { title: "Relaciona servicios y profesionales", description: "En el plan Equipo, asigna a cada integrante los servicios que realiza. En el plan Individual, la disponibilidad se organiza con el horario del negocio." },
  { title: "Configura jornadas y bloqueos", description: "Define los horarios de atención y marca períodos no disponibles. La agenda considera esas reglas junto con las citas existentes al mostrar horas." },
  { title: "Publica la reserva", description: "Comparte el enlace desde Instagram o integra el widget mediante iframe en tu sitio web. La clienta entra desde su navegador, sin instalar una aplicación." },
  { title: "La clienta elige", description: "Selecciona el servicio, la profesional cuando corresponde y una hora disponible. Completa sus datos y paga un abono mediante Mercado Pago si el negocio lo activó y configuró." },
  { title: "Administra la cita", description: "La reserva queda en el panel. Puragenda envía un recordatorio por email para las citas del día siguiente y permite gestionar cambios según la configuración; el negocio conserva el historial administrativo." },
];

export function aestheticsSoftwareFaqs(): FaqItem[] {
  return [
    { question: "¿Puedo configurar servicios con distinta duración?", answer: "Sí. Cada servicio tiene su propia duración y precio. Puragenda combina esa duración con la jornada, las citas y los bloqueos existentes para mostrar los horarios que están disponibles." },
    { question: "¿Cada profesional puede ofrecer servicios diferentes?", answer: "Sí. En el plan Equipo puedes asignar a cada profesional los servicios que realiza. Así, una clienta que elige extensiones de pestañas ve únicamente a las profesionales configuradas para ese servicio." },
    { question: "¿Cada profesional tiene su propio horario?", answer: "Sí. En Equipo, cada integrante puede tener su jornada, pausas y bloqueos. En Individual, la disponibilidad de quien atiende se organiza con el horario del negocio." },
    { question: "¿Puedo solicitar un abono al reservar?", answer: "Sí, cuando el negocio activa los abonos, configura el monto del servicio y conecta Mercado Pago. La clienta ve el monto antes de pagar. Una cita con abono aprobado requiere contactar al negocio para cancelarla o cambiarla." },
    { question: "¿Puedo integrar la agenda en mi sitio web?", answer: "Sí. Puedes insertar el widget mediante iframe o compartir el enlace directo de reservas. Ambos abren el flujo en el navegador de la clienta." },
    { question: "¿Puedo compartir la agenda desde Instagram?", answer: "Sí. Puedes poner el enlace de reservas en la biografía o compartirlo en tus contenidos. La clienta abre el catálogo, elige servicio, profesional y hora desde su navegador." },
    { question: "¿Los recordatorios se envían por WhatsApp?", answer: "No. Los recordatorios de cita descritos en esta página se envían por email para las citas del día siguiente; la clienta debe ingresar correctamente su correo al reservar." },
    { question: "¿Puragenda administra cabinas, salas o aparatología?", answer: "No. La disponibilidad de Puragenda se organiza por profesional, servicio y horario. Si el centro comparte una cabina, sala, cama o equipo físico, debe controlar ese recurso por separado." },
    { question: "¿Puragenda reemplaza una ficha clínica?", answer: "No. Puragenda conserva datos de contacto y un historial administrativo de citas. No es una ficha clínica ni un sistema para diagnósticos, indicaciones o tratamientos médicos." },
    { question: "¿Cuánto cuesta Puragenda para un centro de estética?", answer: `El plan ${PRICING.INDIVIDUAL.name} cuesta ${formatLandingClp(PRICING.INDIVIDUAL.monthly)} CLP al mes e incluye ${STAFF_LIMITS.INDIVIDUAL} profesional. El plan ${PRICING.EQUIPO.name} cuesta ${formatLandingClp(PRICING.EQUIPO.monthly)} CLP al mes e incluye ${STAFF_LIMITS.EQUIPO} profesionales; cada profesional adicional cuesta ${formatLandingClp(EXTRA_STAFF_COST.EQUIPO)} CLP al mes. La prueba dura ${TRIAL_DURATION_DAYS} días. Los planes y condiciones vigentes están en Precios.` },
  ];
}
