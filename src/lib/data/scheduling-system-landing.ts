import {
  EXTRA_STAFF_COST,
  PRICING,
  STAFF_LIMITS,
  TRIAL_DURATION_DAYS,
} from "@/core/constants";
import type { FaqItem } from "@/lib/json-ld";

export const SCHEDULING_SYSTEM_PATH = "/sistema-de-agendamiento-online";

export const schedulingSystemMetadata = {
  title: "Sistema de agendamiento online para negocios",
  description:
    "Puragenda es un sistema de agendamiento online para negocios en Chile: reservas 24/7, disponibilidad real, abonos, recordatorios y agenda por profesional. Prueba 30 días gratis.",
  keywords: [
    "sistema de agendamiento online",
    "software de agendamiento",
    "sistema de reservas online",
    "agenda online para negocios",
    "agenda de reservas",
    "agendamiento online",
    "software para agendar clientes",
  ],
} as const;

export const schedulingSystemCopy = {
  h1: "Sistema de agendamiento online para negocios",
  eyebrow: "Software de reservas",
  heroLead:
    "Puragenda es un sistema de agendamiento online para negocios de servicios. Configuras tu catálogo y tu disponibilidad, publicas un enlace, y el cliente reserva solo. Tú administras la agenda desde un panel.",
  heroNote: `${TRIAL_DURATION_DAYS} días de prueba sin tarjeta. Sin comisión de Puragenda por cada reserva.`,
  definitionHeading: "Qué es un sistema de agendamiento online",
  definition:
    "Un sistema de agendamiento online es un software que muestra la disponibilidad real de un negocio y permite que el cliente reserve un servicio, un profesional y un horario sin coordinar por mensajes. Puragenda es ese sistema para negocios de servicios en Chile.",
  softwareDescription:
    "Sistema de agendamiento online para negocios en Chile: reservas 24/7, disponibilidad por profesional, abonos, recordatorios por correo y administración de clientes desde un panel web.",
} as const;

export const schedulingSystemSteps = [
  {
    title: "El negocio configura",
    description:
      "Defines servicios, duración, precios, profesionales, horarios y reglas de reserva desde el panel.",
  },
  {
    title: "Publica su disponibilidad",
    description:
      "Compartes un enlace de reservas o insertas el widget en tu sitio. El cliente ve solo horas realmente disponibles.",
  },
  {
    title: "El cliente reserva",
    description:
      "Elige servicio, profesional si corresponde y un horario. Completa sus datos y, si el servicio lo pide, paga el abono.",
  },
  {
    title: "El negocio administra",
    description:
      "La cita aparece en el panel. Puedes confirmar, mover o completar atenciones, y consultar el historial del cliente.",
  },
] as const;

export const schedulingSystemFeatures = [
  {
    title: "Reservas online 24/7",
    description:
      "El cliente agenda desde el celular, sin instalar una app y sin pedirte horas por chat. El enlace funciona de noche y el fin de semana.",
    href: "/caracteristicas",
    hrefLabel: "Ver características",
  },
  {
    title: "Disponibilidad real",
    description:
      "Puragenda valida el horario antes de confirmar. Si un cupo ya está ocupado, deja de ofrecerse para ese profesional.",
    href: "/funciones/agenda-multiples-profesionales",
    hrefLabel: "Ver agenda para equipos",
  },
  {
    title: "Servicios, profesionales y horarios",
    description:
      "Cada servicio tiene duración y precio. Cada profesional puede tener su jornada, descansos, bloqueos y servicios asignados.",
    href: "/funciones/agenda-multiples-profesionales",
    hrefLabel: "Cómo se coordina el equipo",
  },
  {
    title: "Abonos por servicio",
    description:
      "Puedes pedir un anticipo en los servicios que lo necesitan. El cliente ve precio, abono y saldo antes de pagar. Puragenda no agrega una comisión por reserva.",
    href: "/funciones/reservas-online-con-abono",
    hrefLabel: "Ver reservas con abono",
  },
  {
    title: "Recordatorios y autogestión",
    description:
      "El sistema envía un recordatorio por correo para las citas del día siguiente. El cliente puede confirmar, cancelar o reprogramar con los enlaces de su reserva.",
    href: "/guias/reducir-inasistencias-reservas",
    hrefLabel: "Cómo reducir inasistencias",
  },
  {
    title: "Google Calendar y panel",
    description:
      "Sincroniza citas con Google Calendar y bloquea horarios ocupados. El panel reúne agenda, clientes, servicios y la configuración del widget.",
    href: "/funciones/agenda-google-calendar",
    hrefLabel: "Ver Google Calendar",
  },
] as const;

export const schedulingSystemBenefits = [
  {
    feature: "Reserva online",
    result: "Menos ida y vuelta por WhatsApp o Instagram para coordinar una hora.",
  },
  {
    feature: "Disponibilidad validada",
    result: "Menos dobles reservas y menos cruces entre profesionales.",
  },
  {
    feature: "Abono configurable",
    result: "Proteges bloques de alta demanda sin cobrar el servicio completo por adelantado.",
  },
  {
    feature: "Recordatorio por correo",
    result: "El cliente recibe un aviso el día anterior, con enlaces para gestionar la cita.",
  },
  {
    feature: "Ficha e historial",
    result: "Antes de atender, ves visitas, inasistencias y datos de contacto del cliente.",
  },
  {
    feature: "Un enlace o widget",
    result: "Publicas la agenda en Instagram, WhatsApp, Google o tu sitio web.",
  },
] as const;

export const schedulingSystemAudiences = [
  {
    slug: "barberias",
    name: "Barberías",
    description: "Reservas por barbero, horarios propios y abonos para horas demandadas.",
  },
  {
    slug: "peluquerias",
    name: "Peluquerías",
    description: "Varios estilistas, servicios de distinta duración y una sola agenda pública.",
  },
  {
    slug: "estetica",
    name: "Estética y spa",
    description: "Tratamientos largos, profesionales asignados y un widget con tu marca.",
  },
  {
    slug: "psicologos",
    name: "Psicólogos",
    description: "Sesiones presenciales u online, abono opcional y agenda privada por profesional.",
  },
] as const;

export const schedulingSystemCustomerSteps = [
  "Abre el enlace de reservas o el widget del negocio.",
  "Elige el servicio y, si hay equipo, el profesional.",
  "Ve solo los horarios disponibles y confirma uno.",
  "Deja sus datos. No necesita crear una contraseña para completar la reserva.",
  "Si el servicio pide abono, paga el anticipo informado.",
  "Recibe la confirmación por correo y puede gestionar la cita desde ahí o en Mi agenda.",
] as const;

export const schedulingSystemBusinessSteps = [
  "Crea servicios, profesionales y horarios de atención.",
  "Define si algún servicio requiere abono.",
  "Copia el enlace o el código del widget.",
  "Revisa las citas en el panel, marca asistencia y consulta clientes.",
] as const;

export function formatLandingClp(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function schedulingSystemFaqs(): FaqItem[] {
  const individual = formatLandingClp(PRICING.INDIVIDUAL.monthly);
  const team = formatLandingClp(PRICING.EQUIPO.monthly);
  const extraStaff = formatLandingClp(EXTRA_STAFF_COST.EQUIPO);

  return [
    {
      question: "¿Qué es un sistema de agendamiento online?",
      answer:
        "Es un software que publica la disponibilidad de un negocio y permite que el cliente reserve solo. En Puragenda, el cliente elige servicio, profesional y horario; el negocio ve y administra esa reserva en el panel.",
    },
    {
      question: "¿Qué es Puragenda?",
      answer:
        "Puragenda es un sistema de agendamiento online para negocios de servicios en Chile. Reúne reservas, disponibilidad, profesionales, clientes, abonos y recordatorios por correo en un panel web.",
    },
    {
      question: "¿Cómo se configura la agenda?",
      answer:
        "Creas la cuenta del negocio, cargas servicios y horarios, invitas profesionales si trabajas en equipo y publicas el enlace de reservas. Puedes probar el flujo completo durante la prueba gratuita.",
    },
    {
      question: "¿Cómo reserva un cliente?",
      answer:
        "Abre el enlace o el widget, elige servicio y horario disponible, y confirma con sus datos. No necesita instalar una aplicación ni administrar una contraseña para completar la reserva.",
    },
    {
      question: "¿Funciona en el celular?",
      answer:
        "Sí. El cliente reserva desde el navegador del teléfono. El negocio también usa Puragenda como aplicación web: el panel se abre en el celular y se puede instalar como PWA.",
    },
    {
      question: "¿Cuánto cuesta un sistema de agendamiento como Puragenda?",
      answer: `El plan ${PRICING.INDIVIDUAL.name} cuesta ${individual} al mes para un profesional. El plan ${PRICING.EQUIPO.name} cuesta ${team} al mes e incluye ${STAFF_LIMITS.EQUIPO} profesionales. Los profesionales extra del plan Equipo valen ${extraStaff} al mes cada uno. La prueba dura ${TRIAL_DURATION_DAYS} días y no pide tarjeta.`,
    },
    {
      question: "¿Puragenda sirve para cualquier rubro?",
      answer:
        "Está pensado para negocios que venden horas de atención: barberías, peluquerías, estética, consultas y oficios similares. Hay páginas específicas por rubro y una vista general de soluciones.",
    },
    {
      question: "¿Los recordatorios llegan por WhatsApp?",
      answer:
        "No. Los recordatorios de cita se envían por correo electrónico. WhatsApp se usa para que el negocio comparta su enlace de reservas, no como canal automático de recordatorios.",
    },
  ];
}
