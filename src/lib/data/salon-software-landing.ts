import {
  EXTRA_STAFF_COST,
  PRICING,
  STAFF_LIMITS,
  TRIAL_DURATION_DAYS,
} from "@/core/constants";
import type { FaqItem } from "@/lib/json-ld";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";

export const SALON_SOFTWARE_PATH = "/software-agenda-peluquerias";

export const salonSoftwareMetadata = {
  title: "Software de agenda para peluquerías",
  description:
    "Sistema de reservas para peluquerías y salones: corte, color y tratamientos con su duración, estilistas con jornada propia y un enlace para que la clienta reserve sola. Prueba 30 días gratis.",
  keywords: [
    "software de agenda para peluquerías",
    "software para peluquería",
    "agenda para peluquería",
    "sistema de reservas para peluquería",
    "agenda online para peluquería",
    "software para salón de belleza",
    "programa para peluquería",
    "sistema de citas para peluquería",
  ],
} as const;

export const salonSoftwareCopy = {
  h1: "Software de agenda para peluquerías y salones",
  eyebrow: "Para dueñas, dueños y recepción del salón",
  heroLead:
    "Puragenda ordena el catálogo del salón: un corte no ocupa el mismo bloque que una coloración. Cada estilista queda con su jornada y especialidad. La clienta reserva desde un enlace; recepción deja de cuadrar horas por teléfono.",
  heroNote: `${TRIAL_DURATION_DAYS} días de prueba sin tarjeta. Sin comisión de Puragenda por cada reserva.`,
  definitionHeading: "Qué es Puragenda para una peluquería",
  definition:
    "Puragenda es un sistema de reservas para peluquerías y salones de belleza. El salón publica servicios con duración y precio, asigna estilistas y comparte un enlace. La clienta elige el servicio, a quién la atiende y una hora libre. La cita queda en el panel. No es un buscador de peluquerías cerca.",
  softwareDescription:
    "Software de agenda para peluquerías: servicios con duración propia, opciones que ajustan tiempo o precio, estilistas con horario individual, historial de clientas y abonos opcionales.",
} as const;

export const salonDurationExamples = [
  {
    name: "Corte",
    duration: "45 min",
    note: "Bloque corto. Si la agenda lo trata igual que un color, se come el día.",
  },
  {
    name: "Coloración",
    duration: "2 h",
    note: "Ejemplo de servicio largo. El tiempo lo defines tú; Puragenda reserva exactamente esa duración.",
  },
  {
    name: "Tratamiento",
    duration: "90 min",
    note: "Puede vivir en otra categoría del catálogo, con otro precio y otros estilistas asignados.",
  },
] as const;

export const salonProblems = [
  {
    title: "El teléfono no para en recepción",
    description: "Mientras un estilista colorea, alguien llama a preguntar si queda cupo. La hora se promete sin mirar la agenda real.",
  },
  {
    title: "El color no cabe donde cabía el corte",
    description: "Una coloración de dos horas no puede entrar en un hueco de cuarenta minutos. Sin duración por servicio, el salón se pisa solo.",
  },
  {
    title: "La clienta pide “la misma persona”",
    description: "Quien corta no siempre colorea. Si el enlace no filtra por estilista, la reserva cae en alguien que no hace ese servicio.",
  },
  {
    title: "Las fijas se coordinan por chat",
    description: "Las clientas recurrentes escriben cada mes. Sin ficha a mano, recepción vuelve a preguntar el servicio y el horario preferido.",
  },
] as const;

export const salonSteps = [
  {
    title: "Armas el catálogo del salón",
    description: "Cortes, peinados, color y tratamientos quedan con duración, precio y, si hace falta, opciones que suman tiempo o valor.",
  },
  {
    title: "Asignas estilistas",
    description: "Cada persona tiene jornada, bloqueos y los servicios que realmente realiza. Recepción no vende una combinación imposible.",
  },
  {
    title: "Publicas un solo enlace",
    description: "Instagram, WhatsApp o el sitio del salón. La clienta no instala una aplicación.",
  },
  {
    title: "La cita entra al panel",
    description: "Recepción y el estilista ven el bloque ocupado. Si el servicio pide abono, la confirmación sigue al pago informado.",
  },
] as const;

export const salonFeatures = [
  {
    title: "Duración y precio por servicio",
    description:
      "El corte, el peinado y la coloración no comparten el mismo bloque. Cada ítem del catálogo tiene su tiempo. Si el salón vende extras, las opciones pueden sumar minutos o precio al elegir.",
    href: "/caracteristicas",
    hrefLabel: "Ver características",
  },
  {
    title: "Estilistas con jornada propia",
    description:
      "Días, descansos y vacaciones se configuran por persona. La clienta elige profesional después del servicio y solo ve horas de quien puede atenderla.",
    href: "/funciones/agenda-multiples-profesionales",
    hrefLabel: "Agenda para varios profesionales",
  },
  {
    title: "Historial de la clienta",
    description:
      "La ficha guarda visitas e inasistencias. No es una ficha técnica de coloración: es el historial de reservas y contacto para no partir de cero cada mes.",
    href: "/guias/reducir-inasistencias-reservas",
    hrefLabel: "Seguimiento de inasistencias",
  },
  {
    title: "Timbres cuando la cita se completa",
    description:
      "Si activas fidelización, el salón otorga un timbre al marcar la cita como completada. Al cumplir la meta, la clienta recibe un código de premio. No reemplaza un CRM de marketing.",
    href: "/caracteristicas",
    hrefLabel: "Fidelización en características",
  },
] as const;

export const salonCustomerSteps = [
  "Abre el enlace o el widget del salón.",
  "Elige el servicio del catálogo. Si hay opciones, ajusta lo que corresponda (por ejemplo un extra que sume tiempo).",
  "Selecciona al estilista que realiza ese servicio.",
  "Ve las horas libres de esa persona y confirma una.",
  "Deja sus datos. No necesita crear una contraseña para completar la reserva.",
  "Si el servicio pide abono, paga el anticipo informado y recibe la confirmación por correo.",
] as const;

export function salonSoftwareFaqs(): FaqItem[] {
  const individual = formatLandingClp(PRICING.INDIVIDUAL.monthly);
  const team = formatLandingClp(PRICING.EQUIPO.monthly);
  const extraStaff = formatLandingClp(EXTRA_STAFF_COST.EQUIPO);

  return [
    {
      question: "¿Puedo configurar servicios con distinta duración en la peluquería?",
      answer:
        "Sí. Cada servicio tiene su propia duración y precio. Un corte y una coloración no ocupan el mismo bloque. También puedes agrupar el catálogo en categorías y, si el servicio lo necesita, añadir opciones que cambian tiempo o valor.",
    },
    {
      question: "¿Cada estilista puede tener un horario distinto?",
      answer:
        "Sí. Jornada, descansos, vacaciones y bloqueos se configuran por profesional. Puedes cerrar a una persona un día y dejar el resto del salón disponible.",
    },
    {
      question: "¿La clienta puede elegir a su estilista?",
      answer:
        "Sí. Después de elegir el servicio, ve a quienes lo realizan y toma una hora de esa persona. Si alguien no hace color, no aparece en ese flujo.",
    },
    {
      question: "¿Las clientas pueden reagendar o cancelar?",
      answer:
        "Sí. La confirmación incluye enlaces para gestionar la cita. También pueden consultar próximas horas en Mi agenda. El salón ve el cambio en el panel.",
    },
    {
      question: "¿Puedo pedir un abono por una coloración u otro servicio largo?",
      answer:
        "Sí, el abono se define por servicio. La clienta ve precio, anticipo y saldo antes de pagar. Eso no elimina las inasistencias; reduce reservas poco comprometidas en bloques largos.",
    },
    {
      question: "¿Puragenda guarda la fórmula de color de cada clienta?",
      answer:
        "No. La ficha registra reservas, contacto e inasistencias. No reemplaza una ficha técnica de coloración ni un software de formulación.",
    },
    {
      question: "¿Funciona con Google Calendar?",
      answer:
        "Sí. Puedes conectar el calendario de un profesional para crear las citas de Puragenda y respetar horarios ya ocupados.",
    },
    {
      question: "¿Cuánto cuesta el software de agenda para una peluquería?",
      answer: `El plan ${PRICING.INDIVIDUAL.name} cuesta ${individual} al mes para un profesional. El plan ${PRICING.EQUIPO.name} cuesta ${team} al mes e incluye ${STAFF_LIMITS.EQUIPO} profesionales. Extra en Equipo: ${extraStaff} al mes cada uno. La prueba dura ${TRIAL_DURATION_DAYS} días y no pide tarjeta.`,
    },
  ];
}
