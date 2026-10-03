import type { ContentLink, ContentSection, ContentSource } from "./seo-expansion";

export type AlternativePage = {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  headline: string;
  directAnswer: string;
  intro: string;
  audience: string[];
  dimensions: { label: string; puragenda: string; competitor: string; sourceUrl: string }[];
  sections: ContentSection[];
  faq: { question: string; answer: string }[];
  links: ContentLink[];
  sources: ContentSource[];
  updatedAt: string;
  cta: { heading: string; description: string };
};

/** Reviewed content only. Adding a provider does not create or publish a route. */
export const alternatives: AlternativePage[] = [
  {
    slug: "alternativa-calendly", competitor: "Calendly",
    title: "Alternativa a Calendly para negocios de servicios",
    description: "Evalúa Puragenda como alternativa a Calendly si coordinas servicios presenciales, profesionales y abonos. Compara tu recorrido con fuentes oficiales.",
    headline: "Una alternativa a Calendly para evaluar la operación de tu local",
    directAnswer: "Puragenda puede ser una alternativa a evaluar si necesitas organizar un catálogo de servicios presenciales, varios profesionales, clientes y abonos en una agenda de negocio. Calendly ofrece programación de citas y reuniones, con disponibilidad y herramientas para equipos. La elección depende del recorrido que necesitas cubrir, no de un ganador universal.",
    intro: "Esta evaluación la publica el Equipo Puragenda. La información de Calendly procede de su página oficial de programación, consultada el 3 de octubre de 2026. Explicamos el alcance de Puragenda y proponemos pruebas de encaje; no comparamos precios ni atribuimos funciones ausentes a Calendly.",
    audience: [
      "Recepción necesita relacionar una atención del catálogo con quien puede realizarla.",
      "El cliente escoge servicio, profesional cuando corresponde y horario desde el navegador.",
      "El negocio configura abonos y gestiona el estado de las citas desde el panel.",
    ],
    dimensions: [
      { label: "Recorrido", puragenda: "Reserva de servicios con duración, precio y profesionales compatibles.", competitor: "Programación de citas y reuniones con distintos tipos de evento.", sourceUrl: "https://calendly.com/scheduling" },
      { label: "Disponibilidad", puragenda: "Horarios, descansos, bloqueos y consulta de ocupación de Google Calendar conectado.", competitor: "Calendarios conectados, horarios personalizados y tiempos entre reuniones.", sourceUrl: "https://calendly.com/scheduling" },
      { label: "Equipo", puragenda: "Servicios y jornadas individuales para profesionales del negocio.", competitor: "Herramientas para programar con equipos, incluidas distribución de reuniones y plantillas.", sourceUrl: "https://calendly.com/scheduling" },
    ],
    sections: [
      { heading: "Si un enlace de reuniones ya resuelve tu trabajo", paragraphs: [
        "Para coordinar una reunión, encontrar una hora compatible puede ser la tarea principal. La propuesta oficial de Calendly incluye distintos tipos de evento y programación para equipos. Si ese recorrido cubre tu necesidad, evalúa las funciones de tu cuenta antes de buscar un reemplazo.",
        "No conviene asumir que Calendly se limita a una sola persona ni que no permite ofrecer servicios. Aquí la pregunta es más concreta: ¿cómo se representa tu catálogo presencial y qué necesita recepción para administrar la atención después de reservar?",
      ] },
      { heading: "Cuando la reserva comienza por el servicio", paragraphs: [
        "En un local, el cliente puede necesitar escoger una atención antes de saber con quién reservar. Un corte y una coloración tienen duraciones y precios distintos; también pueden requerir profesionales diferentes. En Puragenda esas relaciones forman parte del catálogo y la disponibilidad.",
        "Prueba si el cliente puede identificar la atención correcta, ver sus opciones y elegir un profesional compatible. Si tienes dos locales, añade la ubicación al escenario. Esa prueba permite evaluar Puragenda por su encaje con la operación real sin suponer que todas las herramientas modelan los mismos conceptos.",
      ] },
      { heading: "Del horario elegido a una cita que recepción pueda gestionar", paragraphs: [
        "El formulario ordinario de Puragenda se completa con nombre, email y teléfono, sin una cuenta obligatoria de Puragenda. La cita queda asociada al servicio y al profesional cuando corresponde. El panel sirve al equipo para gestionar sus reservas y datos de contacto.",
        "Si configuras abonos, revisa monto solicitado, estado del pago y saldo pendiente antes de comunicar que la atención está confirmada. Evalúa ese recorrido completo en el contexto del negocio; una comparación de pantallas de disponibilidad no explica la gestión posterior.",
      ] },
      { heading: "Ejemplo de evaluación: corte y color con dos profesionales", paragraphs: [
        "Prepara un escenario ficticio donde ambas personas hacen corte, pero solo una realiza color. Define duraciones distintas y un descanso en la jornada de esa persona. Comprueba cómo se elige el servicio, qué profesionales aparecen y qué ocurre cerca del fin de jornada.",
        "Después registra un cambio desde la gestión de citas y revisa las comunicaciones y el calendario conectado. Es una pauta para demostrar tus requisitos. No representa una migración automática desde Calendly ni un caso de cliente que haya cambiado de proveedor.",
      ] },
      { heading: "Conserva el calendario y comprueba las condiciones actuales", paragraphs: [
        "Puragenda tiene integración con Google Calendar: mantiene eventos de sus citas y consulta intervalos ocupados. Puedes evaluar la operación del local sin abandonar el calendario que utilizas para otros compromisos. Los cambios completos de la reserva se gestionan en Puragenda.",
        "Consulta los planes vigentes de cada proveedor con tus integrantes y necesidades concretas. No publicamos importes, límites de planes ni un ahorro calculado respecto de Calendly. Antes de trasladar la operación, valida cómo conservarás citas futuras, datos y enlaces que tus clientes ya utilizan.",
      ] },
    ],
    faq: [
      { question: "¿En qué casos conviene evaluar Puragenda junto a Calendly?", answer: "No hay un ganador universal. Puragenda se evalúa aquí para negocios con catálogo presencial, profesionales y operación de citas. Si tu necesidad principal es programar reuniones, revisa el recorrido que Calendly ya te ofrece." },
      { question: "¿Calendly solo sirve para una persona?", answer: "No. Su página oficial describe programación para equipos y herramientas de distribución de reuniones. Esta alternativa no parte de esa limitación." },
      { question: "¿Puedo conservar Google Calendar al evaluar Puragenda?", answer: "Sí. Puragenda integra los eventos de sus citas con Google Calendar y consulta intervalos ocupados del calendario conectado." },
      { question: "¿Cómo comparo el costo de las dos opciones?", answer: "Consulta los planes actuales de cada proveedor y las funciones que necesitas. Esta página no presenta precios ni límites comerciales de Calendly." },
      { question: "¿Puragenda importa automáticamente mi cuenta de Calendly?", answer: "Esta página no ofrece una migración automática. Revisa las citas futuras, los datos que necesitas conservar y el procedimiento de transición antes de cambiar la operación." },
      { question: "¿Qué debería probar para un local con varios profesionales?", answer: "Un servicio que solo realiza parte del equipo, jornadas diferentes, una reserva con abono y la gestión posterior de un cambio. Comprueba también la ubicación si atiendes en varias sucursales." },
    ],
    links: [
      { href: "/sistema-de-agendamiento-online", label: "Catálogo y gestión en el sistema de agendamiento" },
      { href: "/funciones/agenda-multiples-profesionales", label: "Servicios y jornadas del equipo" },
      { href: "/funciones/reservas-online-con-abono", label: "Configurar abonos por servicio" },
      { href: "/funciones/reservas-sin-cuenta", label: "Reserva ordinaria sin cuenta de Puragenda" },
      { href: "/guias/google-calendar-vs-sistema-reservas", label: "Cuándo combinar calendario y reservas" },
    ],
    sources: [{ label: "Calendly: capacidades de programación", url: "https://calendly.com/scheduling", consultedAt: "2026-10-03" }],
    updatedAt: "2026-10-03",
    cta: { heading: "Prueba el caso de tu local antes de decidir", description: "Revisa la demo con servicios y profesionales en mente, y consulta los planes vigentes de Puragenda." },
  },
  {
    slug: "alternativa-fresha", competitor: "Fresha",
    title: "Alternativa a Fresha en Chile para evaluar tu agenda",
    description: "Evalúa Puragenda como alternativa a Fresha en Chile: reservas, equipo, sucursales, abonos y Gift Cards. Revisa el alcance sin comparar tarifas no verificadas.",
    headline: "Alternativa a Fresha en Chile: revisa el encaje con tu negocio",
    directAnswer: "Si buscas una alternativa a Fresha en Chile, puedes evaluar Puragenda para organizar reservas, catálogo, profesionales, ubicaciones, abonos y Gift Cards con las condiciones descritas en cada función. Fresha presenta una plataforma para salones y negocios de belleza y bienestar con agenda, pagos y marketplace. Compara los recorridos que necesitas y verifica con cada proveedor las condiciones aplicables a tu negocio.",
    intro: "Esta página está elaborada por el Equipo Puragenda. La descripción de Fresha utiliza su página oficial para negocios, consultada el 3 de octubre de 2026. La evaluación se concentra en la agenda de servicios de Puragenda; no publica comisiones, precios, políticas ni disponibilidad local de prestaciones de Fresha sin comprobar.",
    audience: [
      "Tu salón necesita mantener servicios y duraciones compatibles con cada profesional.",
      "Quieres comprobar el recorrido desde tu enlace o widget hasta la gestión de la cita.",
      "Buscas evaluar abonos y regalos con los requisitos de pago y canje visibles.",
    ],
    dimensions: [
      { label: "Enfoque", puragenda: "Agenda de reservas para negocios de servicios, con catálogo y disponibilidad.", competitor: "Plataforma dirigida a salones y negocios de belleza y bienestar.", sourceUrl: "https://www.fresha.com/for-business" },
      { label: "Operación", puragenda: "Citas, clientes, profesionales y ubicaciones conectadas a la reserva.", competitor: "Su oferta describe gestión de reservas, clientes, ubicaciones y equipo.", sourceUrl: "https://www.fresha.com/for-business" },
      { label: "Entrada online", puragenda: "Enlace directo y widget iframe para una web existente.", competitor: "Su oferta incluye reservas online y un marketplace de belleza y bienestar.", sourceUrl: "https://www.fresha.com/for-business" },
    ],
    sections: [
      { heading: "Evalúa qué necesitas conservar de tu operación", paragraphs: [
        "Un salón que considera otra herramienta ya tiene decisiones tomadas: servicios, precios, duraciones, equipo y un modo de atender consultas. Comienza por identificar cuáles deben mantenerse y dónde hay dificultades. Cambiar de proveedor sin ese inventario puede mover el problema a otra pantalla.",
        "La página oficial de Fresha presenta una oferta amplia, incluida agenda y marketplace. No suponemos que Puragenda sustituye todos sus módulos. Separa tus requisitos de reservas de otros procesos que también utilices y verifica cada uno antes de trasladar el negocio.",
      ] },
      { heading: "Tu catálogo es la primera prueba de la alternativa", paragraphs: [
        "Prepara servicios con duraciones diferentes y asigna quién realiza cada uno. Por ejemplo, una atención básica y otra que añade retiro o una opción del catálogo. En Puragenda la duración y el precio de las opciones intervienen en la selección; el equipo disponible debe poder realizar la atención.",
        "Si el negocio atiende en varios locales, prueba el servicio en la ubicación correcta. Comprueba descansos, jornadas y bloqueos antes de abrir el enlace a clientes. Una agenda para varias sucursales necesita relaciones de catálogo y equipo, además de nombres y direcciones.",
      ] },
      { heading: "Cómo llega el cliente a la reserva de Puragenda", paragraphs: [
        "Puedes compartir el enlace del widget en una conversación o añadirlo a tu biografía. Si ya tienes un sitio, el iframe permite mostrar la agenda dentro de esa web. La reserva ordinaria se realiza en el navegador con datos de contacto, sin una cuenta obligatoria de Puragenda.",
        "Este recorrido no implica que recibirás demanda de un marketplace ni incluye construir un sitio completo. Si un canal de captación externo es esencial para tu negocio, evalúalo por separado. La entrada de reservas y la adquisición de clientes responden a necesidades distintas.",
      ] },
      { heading: "Abonos y Gift Cards: comprueba cada requisito", paragraphs: [
        "Puragenda permite configurar abonos por servicio y revisar el estado de pago de la reserva. Cuando utilizas Mercado Pago, comprueba la conexión y el recorrido de aprobación. No confundas un anticipo con el precio total ni con una política automática de devolución.",
        "Las Gift Cards pueden ser de saldo o servicios. La venta manual registra un pago recibido; la venta online requiere Mercado Pago habilitado y una moneda compatible. El destinatario reclama la tarjeta en una cuenta del portal del cliente antes de utilizarla en una reserva de ese negocio.",
      ] },
      { heading: "Ejemplo de prueba para un salón con regalos", paragraphs: [
        "Configura un escenario ficticio con dos profesionales y una Gift Card que incluye un servicio concreto. Revisa quién puede realizarlo y cuándo. Después recorre la entrega, el acceso al portal y la elección de una hora compatible para utilizar la tarjeta.",
        "Este caso ayuda a detectar requisitos que una lista de funciones no explica, como la cuenta necesaria para el canje o los servicios que cubre el regalo. No representa una venta real ni demuestra una importación de tarjetas o saldos emitidos en Fresha.",
      ] },
      { heading: "Antes de cambiar, valida continuidad y condiciones en Chile", paragraphs: [
        "Haz un inventario de citas futuras, clientes, enlaces publicados y obligaciones relacionadas con pagos o tarjetas vendidas. Define una fecha de transición y comprueba cómo evitarás dos agendas activas ofreciendo la misma hora. Revisa con cada proveedor qué datos puedes conservar y cómo obtenerlos.",
        "No afirmamos tarifas, comisiones ni políticas actuales de Fresha para Chile. Consulta sus condiciones vigentes y los planes de Puragenda para tu caso. Tampoco se promete migración automática de historial, saldos o reservas: esos puntos necesitan una comprobación específica antes de tomar la decisión.",
      ] },
    ],
    faq: [
      { question: "¿Esta página compara las comisiones actuales de Fresha en Chile?", answer: "No. No se publican precios, comisiones ni políticas de Fresha. Verifica con el proveedor las condiciones vigentes para tu negocio y país." },
      { question: "¿Puragenda reemplaza todas las funciones de Fresha?", answer: "No se presenta como un reemplazo de todos sus módulos. Evalúa las funciones de reservas descritas y comprueba por separado otros procesos que tu negocio utilice." },
      { question: "¿Puedo integrar Puragenda en la web de mi salón?", answer: "Sí. El widget embebible utiliza iframe y muestra el flujo conectado al catálogo y la disponibilidad. La función descrita no construye la web completa." },
      { question: "¿La venta online de Gift Cards siempre está habilitada?", answer: "No. Requiere plantillas públicas activas, acceso operativo del negocio y Mercado Pago habilitado con una moneda compatible. La venta manual tiene un recorrido distinto." },
      { question: "¿Puedo traer automáticamente reservas o tarjetas desde Fresha?", answer: "Esta página no ofrece importación automática de reservas, tarjetas ni saldos de Fresha. Define cómo conservarás y atenderás los compromisos existentes antes de cambiar." },
      { question: "¿Qué prueba sirve para evaluar la agenda de un salón?", answer: "Usa servicios de distinta duración, profesionales con especialidades diferentes, una ausencia y, si corresponde, una sucursal adicional. Revisa además un abono y el canje de una Gift Card." },
    ],
    links: [
      { href: "/sistema-de-agendamiento-online", label: "Revisar el flujo completo de reservas" },
      { href: "/funciones/gift-cards", label: "Venta y canje de Gift Cards" },
      { href: "/funciones/agenda-multiples-sucursales", label: "Catálogo y equipo por ubicación" },
      { href: "/funciones/widget-reservas-web", label: "Añadir el widget a una web existente" },
      { href: "/guias/organizar-agenda-varios-profesionales", label: "Preparar jornadas y especialidades del equipo" },
    ],
    sources: [{ label: "Fresha: plataforma para negocios", url: "https://www.fresha.com/for-business", consultedAt: "2026-10-03" }],
    updatedAt: "2026-10-03",
    cta: { heading: "Comprueba la agenda con los servicios de tu salón", description: "Revisa el panel y el recorrido del cliente en la demo, y evalúa los planes de Puragenda con tus requisitos concretos." },
  },
];

export function getAlternative(slug: string) {
  return alternatives.find((page) => page.slug === slug);
}
