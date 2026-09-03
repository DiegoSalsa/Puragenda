import {
  EXTRA_STAFF_COST,
  PRICING,
  STAFF_LIMITS,
  TRIAL_DURATION_DAYS,
} from "@/core/constants";
import type { FaqItem } from "@/lib/json-ld";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";

export const BARBERSHOP_SOFTWARE_PATH = "/software-agenda-barberias";

export const barbershopSoftwareMetadata = {
  title: "Software de agenda para barberías",
  description:
    "Sistema de reservas para barberías: cada barbero con su horario, servicios con distinta duración, enlace de reserva y panel para el local. Prueba 30 días gratis.",
  keywords: [
    "software de agenda para barberías",
    "software para barbería",
    "sistema de reservas para barbería",
    "agenda para barbería",
    "sistema para barbería",
    "programa para barbería",
    "agenda online para barberos",
  ],
} as const;

export const barbershopSoftwareCopy = {
  h1: "Software de agenda para barberías",
  eyebrow: "Para dueños y administración del local",
  heroLead:
    "Puragenda es un sistema de reservas para barberías. Configuras corte, barba y combos con su duración; cada barbero queda con su jornada; el cliente elige a quién y a qué hora desde un enlace. Tú dejas de coordinar sillas por mensaje.",
  heroNote: `${TRIAL_DURATION_DAYS} días de prueba sin tarjeta. Sin comisión de Puragenda por cada reserva.`,
  definitionHeading: "Qué es Puragenda para una barbería",
  definition:
    "Puragenda es un software de agenda para barberías. El local carga servicios, barberos y horarios. El cliente abre el enlace, elige servicio, barbero y una hora disponible, y la cita queda en el panel. No es un directorio para buscar barberías cerca: está hecho para quien administra el local.",
  softwareDescription:
    "Software de agenda para barberías: reservas por barbero, servicios con duración propia, bloqueos, abonos opcionales y panel web para el local.",
} as const;

export const barbershopProblems = [
  {
    title: "Horas por Instagram o WhatsApp",
    description: "Mientras cortas, alguien pregunta si queda cupo. La respuesta llega tarde o se pierde en el chat.",
  },
  {
    title: "Cada barbero tiene su jornada",
    description: "Uno entra a las 11, otro no trabaja el lunes. Una sola grilla en papel no representa al equipo.",
  },
  {
    title: "Servicios que no duran lo mismo",
    description: "Un corte corto y un corte con barba no ocupan el mismo bloque. Si la agenda no distingue, se pisan las horas.",
  },
  {
    title: "Cambios a última hora",
    description: "Cancelar o mover una hora por mensaje deja huecos que nadie ve hasta que ya pasaron.",
  },
  {
    title: "Varios barberos en el mismo local",
    description: "Sin disponibilidad por persona, dos reservas pueden caer sobre la misma silla a la misma hora.",
  },
  {
    title: "Clientes que no llegan",
    description: "El sábado se llena y un no-show deja el bloque vacío. Hace falta historial y, si aplica, un abono informado.",
  },
] as const;

export const barbershopSteps = [
  {
    title: "El local configura el catálogo",
    description: "Cargas servicios con duración y precio, y asignas qué hace cada barbero.",
  },
  {
    title: "Defines jornadas y bloqueos",
    description: "Cada barbero queda con sus días, descansos y excepciones. La agenda pública usa esa disponibilidad.",
  },
  {
    title: "Publicas el enlace de reserva",
    description: "Lo pones en Instagram, WhatsApp o el sitio. El cliente no instala una app.",
  },
  {
    title: "El cliente elige servicio y barbero",
    description: "Ve solo a quienes realizan ese servicio y las horas que realmente están libres.",
  },
  {
    title: "La cita entra al panel",
    description: "Administración y el barbero ven la reserva. Si hay abono, se confirma con el pago informado.",
  },
] as const;

export const barbershopFeatures = [
  {
    problem: "Coordinar cada hora a mano",
    title: "Reserva online 24/7",
    description:
      "El cliente agenda desde el celular, incluso fuera del horario del local. El enlace o el widget muestra solo cupos disponibles.",
    href: "/sistema-de-agendamiento-online",
    hrefLabel: "Cómo funciona el sistema",
  },
  {
    problem: "Corte, barba y combos mezclados",
    title: "Servicios con duración propia",
    description:
      "Cada servicio tiene su tiempo y su precio. Un combo ocupa el bloque que corresponde, no el de un corte corto.",
    href: "/caracteristicas",
    hrefLabel: "Ver características",
  },
  {
    problem: "Equipo con jornadas distintas",
    title: "Horario por barbero",
    description:
      "Cada integrante tiene días, tramos, descansos y servicios asignados. El cliente elige a una persona o ve quién puede atenderlo.",
    href: "/funciones/agenda-multiples-profesionales",
    hrefLabel: "Agenda para varios profesionales",
  },
  {
    problem: "Vacaciones, turnos y huecos",
    title: "Bloqueos y disponibilidad real",
    description:
      "Puedes cerrar un día o un tramo para un barbero. Puragenda valida el horario antes de confirmar y no ofrece un cupo ya ocupado.",
    href: "/funciones/agenda-multiples-profesionales",
    hrefLabel: "Cómo se evitan los cruces",
  },
  {
    problem: "Sábados con poca seña",
    title: "Abono por servicio",
    description:
      "Si un servicio lo necesita, el cliente ve precio, abono y saldo antes de pagar. Puragenda no agrega una comisión por reserva.",
    href: "/funciones/reservas-online-con-abono",
    hrefLabel: "Reservas con abono",
  },
  {
    problem: "No saber quién falta seguido",
    title: "Clientes e historial",
    description:
      "La ficha guarda visitas e inasistencias. Antes de atender, ves el historial de esa persona. Los recordatorios de cita van por correo, no por WhatsApp automático.",
    href: "/guias/reducir-inasistencias-reservas",
    hrefLabel: "Reducir inasistencias",
  },
] as const;

export const barbershopTeamPoints = [
  {
    title: "Jornada individual",
    description: "Días, hora de entrada, descansos y excepciones se configuran por barbero, no como una sola grilla del local.",
  },
  {
    title: "Servicios asignados",
    description: "Si alguien no hace color o no hace diseños, esa opción no aparece cuando el cliente lo elige.",
  },
  {
    title: "Selección en la reserva",
    description: "Después del servicio, el cliente elige barbero. Solo ve horas de esa persona, calculadas con su horario.",
  },
  {
    title: "Bloqueos sin cerrar el local",
    description: "Puedes bloquear a un barbero un día y dejar al resto disponible.",
  },
] as const;

export const barbershopCustomerSteps = [
  "Abre el enlace o el widget de la barbería.",
  "Elige el servicio (corte, barba, combo u otro que hayas publicado).",
  "Selecciona el barbero que realiza ese servicio.",
  "Ve las horas libres de esa persona y confirma una.",
  "Deja sus datos. No necesita crear una contraseña para completar la reserva.",
  "Si el servicio pide abono, paga el anticipo informado y recibe la confirmación por correo.",
] as const;

export function barbershopSoftwareFaqs(): FaqItem[] {
  const individual = formatLandingClp(PRICING.INDIVIDUAL.monthly);
  const team = formatLandingClp(PRICING.EQUIPO.monthly);
  const extraStaff = formatLandingClp(EXTRA_STAFF_COST.EQUIPO);

  return [
    {
      question: "¿Puedo tener varios barberos en la misma agenda?",
      answer:
        "Sí. El plan Equipo incluye varios profesionales con horario y servicios propios. El cliente elige barbero después del servicio y ve solo su disponibilidad. El detalle está en la página de agenda para múltiples profesionales.",
    },
    {
      question: "¿Cada barbero puede tener un horario distinto?",
      answer:
        "Sí. Cada barbero configura jornada, descansos, vacaciones y bloqueos. Puedes cerrar a una persona un día sin apagar la reserva del resto del local.",
    },
    {
      question: "¿Puedo cobrar un abono en la barbería?",
      answer:
        "Sí, por servicio. El cliente ve el precio total, el abono y el saldo antes de pagar. Un abono no elimina las inasistencias: reduce reservas poco comprometidas cuando lo usas en horas de alta demanda.",
    },
    {
      question: "¿Cómo reserva un cliente en la barbería?",
      answer:
        "Abre el enlace, elige servicio, elige barbero, toma una hora disponible y confirma con sus datos. Reserva desde el navegador del celular, sin instalar una aplicación.",
    },
    {
      question: "¿Puedo bloquear horarios de un barbero?",
      answer:
        "Sí. Hay bloqueos y excepciones por profesional para turnos, vacaciones o un tramo puntual. Esos intervalos dejan de ofrecerse en el enlace público.",
    },
    {
      question: "¿Funciona con Google Calendar?",
      answer:
        "Sí. Puedes conectar el calendario de un profesional para crear las citas de Puragenda y respetar horarios ya ocupados. La integración se explica en la página de Google Calendar.",
    },
    {
      question: "¿Cuánto cuesta el software de agenda para una barbería?",
      answer: `El plan ${PRICING.INDIVIDUAL.name} cuesta ${individual} al mes para un barbero. El plan ${PRICING.EQUIPO.name} cuesta ${team} al mes e incluye ${STAFF_LIMITS.EQUIPO} profesionales. Extra en Equipo: ${extraStaff} al mes cada uno. La prueba dura ${TRIAL_DURATION_DAYS} días y no pide tarjeta.`,
    },
    {
      question: "¿Los recordatorios de la barbería llegan por WhatsApp?",
      answer:
        "No. Los recordatorios de cita se envían por correo el día anterior. WhatsApp sirve para compartir el enlace de reserva, no como envío automático de recordatorios.",
    },
  ];
}
