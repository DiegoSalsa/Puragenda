import { PRICING, STAFF_LIMITS } from "@/core/constants";
import type { ContentSection, ContentTable } from "./seo-expansion";
import { formatLandingClp } from "./scheduling-system-landing";

export const BOOKING_COMPARISON_REVIEWED_AT = "2026-10-14";
export const AGENDAPRO_PLANS_URL = "https://agendapro.com/cl/planes";

// Monthly prices for the professional counts selected on the official Chile
// page on the review date. Additional professionals can change those prices.
export const agendaproPlanSnapshot = [
  { name: "Individual", monthlyClp: 15900, professionals: 1 },
  { name: "Básico", monthlyClp: 34900, professionals: 2 },
  { name: "Premium", monthlyClp: 54900, professionals: 5 },
  { name: "Pro", monthlyClp: 249900, professionals: 10 },
] as const;

export const agendaproPlansTable: ContentTable = {
  caption: "Precios mensuales de AgendaPro en Chile, revisados el 14 de octubre de 2026. Configuraciones mostradas en su página oficial.",
  columns: ["Plan", "Mensualidad", "Profesionales de la selección", "Impuestos"],
  rows: agendaproPlanSnapshot.map((plan) => [plan.name, `${formatLandingClp(plan.monthlyClp)} CLP`, String(plan.professionals), "+ IVA"]),
};

export const bookingSystemComparison: ContentSection = {
  heading: "Comparativa de sistemas de reservas online en Chile",
  paragraphs: [
    "Compara una configuración concreta, no solo el nombre del proveedor. Esta tabla resume información publicada en las fuentes oficiales consultadas el 14 de octubre de 2026. Los planes internacionales requieren confirmar disponibilidad, moneda, impuestos y medios de pago para tu negocio en Chile.",
    "La mensualidad no siempre incluye mensajes adicionales, procesamiento de pagos o captación desde un marketplace. Antes de decidir, calcula el costo para tus profesionales y reservas, y prueba la reserva desde el celular de un cliente.",
  ],
  table: {
    caption: "Comparación orientativa para negocios de servicios en Chile. No es un ranking ni una cotización.",
    columns: ["Proveedor", "Plan o capacidad de referencia", "Precio o límite publicado", "Reservas y pagos", "Recordatorios"],
    rows: [
      ["Puragenda", `Individual: ${STAFF_LIMITS.INDIVIDUAL} profesional. Equipo: ${STAFF_LIMITS.EQUIPO}.`, `${formatLandingClp(PRICING.INDIVIDUAL.monthly)} y ${formatLandingClp(PRICING.EQUIPO.monthly)} CLP/mes; reservas ilimitadas.`, "Enlace y widget; abonos por servicio con Mercado Pago configurado.", "Email para las citas del día siguiente."],
      ["AgendaPro", "Individual: 1 profesional. Otros planes varían con el equipo.", `${formatLandingClp(agendaproPlanSnapshot[0].monthlyClp)} CLP/mes + IVA en Individual.`, "Agenda de citas y clases; pago online publicado con tarifas propias.", "Recordatorios y confirmaciones de WhatsApp según plan; revisar los productos adicionales."],
      ["Fresha", "Independent: 1 profesional. Team: cobro por integrante reservable.", "Suscripción mensual; captación de clientes nuevos por marketplace tiene una comisión adicional.", "Enlaces directos e Instagram; anticipos con Fresha Payments donde esté disponible.", "Avisos automáticos; mensajes incluidos y cargos adicionales según consumo."],
      ["Booksy", "Suscripción base; profesionales adicionales tienen un cargo mensual.", "Tarifa publicada para el mercado de la fuente; confirmar contratación y precio para Chile.", "Reservas ilimitadas y perfil en marketplace; cobros según los medios disponibles.", "Confirmaciones y recordatorios incluidos según su página de precios."],
      ["SimplyBook.me", "Free: 1 profesional. Basic: 5 profesionales y 100 reservas/mes.", "Free: 50 reservas/mes y 1 función personalizada. Basic es de pago.", "Web y widget; pagos y abonos disponibles en planes que los incluyen.", "Emails automáticos; SMS y WhatsApp se ofrecen mediante créditos adicionales."],
      ["Reservio", "Free y planes de pago con distinta capacidad de reservas.", "Free: 40 reservas por 30 días y 100 clientes. Confirmar la tarifa local del plan de pago.", "Sitio de reservas; revisar disponibilidad y tarifas del procesamiento de pagos.", "Mensajes de reserva por email; SMS como adicional en los planes que lo permiten."],
    ],
  },
  links: [
    { href: "/pricing", label: "Planes de Puragenda" },
    { href: AGENDAPRO_PLANS_URL, label: "Planes oficiales de AgendaPro" },
    { href: "https://www.fresha.com/es/pricing", label: "Precios oficiales de Fresha" },
    { href: "https://biz.booksy.com/pricing", label: "Precios oficiales de Booksy" },
    { href: "https://simplybook.me/en/pricing", label: "Planes oficiales de SimplyBook.me" },
    { href: "https://www.reservio.com/pricing", label: "Planes oficiales de Reservio" },
  ],
};

export const bookingSystemByOperation: ContentSection = {
  heading: "Qué sistema de reservas elegir si trabajas solo, con un equipo o con encargos",
  paragraphs: [
    "Si trabajas solo, empieza por tu catálogo, la duración de cada atención y una jornada que incluya las pausas. Comprueba que el cliente pueda elegir una hora desde el celular y que puedas registrar también las citas que recibes por teléfono o presencialmente.",
    "Si coordinas un equipo, prueba servicios que solo realiza parte de los profesionales, jornadas diferentes y un cambio gestionado por recepción. Compara permisos, cantidad de integrantes incluidos y el costo de añadir otra persona. Un calendario compartido debe representar la disponibilidad de cada integrante.",
    "Si recibes encargos, compara cupos de producción y fechas de entrega, además del abono. Una entrega dentro de varios meses necesita una ventana con capacidad, archivos de referencia y un saldo identificado; no se evalúa igual que una cita que ocupa una hora de atención.",
  ],
  links: [
    { href: "/sistema-de-agendamiento-online", label: "Reserva de citas para una persona" },
    { href: "/funciones/agenda-multiples-profesionales", label: "Agenda para un equipo" },
    { href: "/guias/agenda-encargos-con-abono", label: "Cupos y abonos para encargos" },
    { href: "/alternativa-agendapro", label: "Comparación detallada con AgendaPro" },
  ],
};
