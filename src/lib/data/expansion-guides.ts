import type { Guide } from "./guides";
import type { ContentLink, ContentSource } from "./seo-expansion";

export type GuideDetail = {
  directAnswer: string;
  links: ContentLink[];
  sources?: ContentSource[];
  cta: { heading: string; description: string; label: string; href: string };
};

export const expansionGuides: (Guide & { detail: GuideDetail })[] = [
  {
    slug: "dejar-de-agendar-por-whatsapp",
    title: "Cómo dejar de agendar por WhatsApp, paso a paso",
    description: "Pasa de coordinar cada hora por chat a un enlace de reservas. Mantén WhatsApp para conversar y define una agenda compartida para tu negocio.",
    eyebrow: "Organización y comunicación",
    updatedAt: "2026-10-03", readingMinutes: 7,
    sections: [
      { heading: "El problema aparece cuando el chat guarda la disponibilidad", paragraphs: [
        "WhatsApp es útil para responder dudas, orientar a una persona antes de reservar y mantener el contacto. La dificultad aparece cuando cada conversación contiene una versión distinta de las horas disponibles. Una oferta de horario escrita por la mañana puede seguir visible aunque otra persona haya reservado ese cupo por la tarde.",
        "También se pierde contexto entre mensajes: qué servicio pidió el cliente, cuánto dura, con quién se atiende y si quedó una hora confirmada o solo sugerida. Si recepción cambia de turno, el siguiente integrante debe reconstruir la conversación antes de poder responder. El problema operativo es usar el chat como única base de datos de la agenda.",
      ] },
      { heading: "Define qué cuenta como una reserva confirmada", paragraphs: [
        "Antes de cambiar de herramienta, acuerda una regla con el equipo. Una pregunta por disponibilidad no es una reserva; proponer dos horas tampoco significa ocupar las dos. Define dónde se registra la cita y qué datos mínimos debe tener para que cualquier integrante pueda reconocerla.",
        "Por ejemplo: servicio, duración, fecha, hora, profesional cuando corresponde y contacto del cliente. Si exiges abono, separa la hora pendiente del pago de la confirmación pagada. La regla debe aplicarse tanto a quien entra por el enlace como a quien recibe ayuda de recepción.",
      ], bullets: [
        "Registra las citas en una agenda común antes de responder que un horario está tomado.",
        "Distingue consulta, propuesta de horario y reserva confirmada.",
        "Acordar un cambio por chat debe ir acompañado de su actualización en la agenda.",
      ] },
      { heading: "Prepara un enlace que responda las preguntas repetidas", paragraphs: [
        "Un enlace útil muestra qué se puede reservar y cuándo. Revisa nombres de servicios, duración, precios y asignación de profesionales. Si una atención requiere diagnóstico, evaluación o cotización previa, acláralo antes de dirigir al cliente a una reserva que todavía no corresponde.",
        "Abre la agenda desde un teléfono como si fueras una persona nueva. Comprueba que encuentras una atención concreta, reconoces el local y entiendes el resumen. En Puragenda, una reserva ordinaria se completa en el navegador con datos de contacto, sin exigir una cuenta de Puragenda ni una app.",
      ] },
      { heading: "Haz una transición gradual, con mensajes que ayuden", paragraphs: [
        "Puedes comenzar enviando el enlace a quienes preguntan por horas de servicios ya definidos. Acompáñalo de una frase breve que explique el siguiente paso: «Puedes revisar las horas y elegir la que te acomode en este enlace. Si tienes dudas sobre el servicio, te ayudo por aquí». El mensaje orienta sin cerrar la conversación.",
        "Después incorpora el enlace a tu biografía o a un botón de tu web. Evita mantener dos listas de horarios en paralelo: si una persona necesita ayuda para reservar, registra su cita en la misma agenda. La transición funciona cuando el cliente conserva apoyo y el equipo deja de duplicar la disponibilidad.",
      ], bullets: [
        "Empieza con servicios cuyo nombre y duración ya estén claros.",
        "Conserva atención asistida para quien no puede completar el enlace.",
        "Comprueba las primeras reservas y corrige la configuración que genere dudas.",
      ] },
      { heading: "Reservas fuera de tu jornada, atención dentro de tu horario", paragraphs: [
        "Publicar un enlace permite que una persona consulte y solicite una hora mientras el negocio está cerrado. Eso no significa que debas responder todas las dudas a cualquier hora. Comunica el horario de atención del canal y deja que la agenda muestre las opciones reservables según tu configuración.",
        "Si permites reservas para el mismo día, revisa la anticipación mínima y cómo se entera el equipo de una nueva cita. Si no quieres aceptar horas con poca preparación, configura el recorrido en consecuencia. Una disponibilidad publicada debe reflejar lo que puedes atender, no solo huecos aparentemente vacíos.",
      ] },
      { heading: "Sigue usando WhatsApp para lo que necesita conversación", paragraphs: [
        "El chat puede seguir siendo el lugar para aclarar una opción, avisar una dificultad de llegada o orientar sobre el servicio correcto. La agenda queda como registro de horarios, personas y estados de las citas. Separar esas tareas ayuda a que una conversación incompleta no determine la disponibilidad de todo el negocio.",
        "Un ejemplo: una clienta pregunta qué atención elegir. Resuelves esa duda por WhatsApp y luego le envías el enlace para el servicio indicado. Si pide un cambio después, verifica y actualiza la cita en el sistema antes de decir que quedó resuelto. No necesitas abandonar el canal para organizar mejor las reservas.",
      ] },
      { heading: "Evalúa el cambio con señales de tu propia operación", paragraphs: [
        "Durante las primeras semanas observa dónde se detienen los clientes y qué preguntas siguen llegando al chat. Si muchos preguntan cuánto dura una atención, revisa el catálogo. Si se confunden de local, revisa cómo presentas las sucursales. El enlace necesita ajustes de información, además de una dirección que compartir.",
        "También puedes registrar cuántas reservas requieren ayuda y cuánto tiempo dedica el equipo a coordinar horarios. Compara períodos similares y evita atribuir cualquier variación a una sola herramienta. No hay una reducción garantizada de mensajes o de inasistencias por publicar una agenda.",
      ] },
    ],
    faq: [
      { question: "¿Tengo que dejar de usar WhatsApp para atender clientes?", answer: "No. Puedes conservarlo para comunicación y orientación. El cambio consiste en registrar disponibilidad y reservas en una agenda común." },
      { question: "¿Qué hago con quien prefiere reservar por chat?", answer: "Ayúdale a elegir la atención y registra la cita en la misma agenda que utiliza el enlace. Así no mantienes una segunda lista de horarios." },
      { question: "¿Cuándo conviene enviar el enlace?", answer: "Cuando el servicio ya está definido y el cliente necesita elegir una hora. Si falta una evaluación o cotización previa, resuelve primero esa parte." },
      { question: "¿El enlace exige que el cliente se registre?", answer: "En una reserva ordinaria de Puragenda no se exige cuenta ni app. Se piden nombre, email y teléfono para gestionar la cita." },
      { question: "¿Puragenda responde o envía recordatorios automáticos por WhatsApp?", answer: "Esta guía propone compartir un enlace y mantener el chat como comunicación manual. Los recordatorios de citas descritos para Puragenda utilizan email, no WhatsApp automático." },
    ],
    related: ["reducir-inasistencias-reservas", "organizar-agenda-varios-profesionales"],
    detail: {
      directAnswer: "Para dejar de agendar cada hora por WhatsApp, define una agenda como registro único de disponibilidad y comparte un enlace para elegir servicio y horario. Haz la transición de forma gradual: mantén el chat para dudas y asistencia, y registra allí solo la conversación; las citas y sus cambios deben quedar en la agenda.",
      links: [
        { href: "/sistema-de-agendamiento-online", label: "Revisar un sistema de agendamiento para este flujo" },
        { href: "/funciones/reservas-sin-cuenta", label: "Cómo reserva un cliente sin crear cuenta" },
        { href: "/funciones/widget-reservas-web", label: "Poner el enlace o widget en tu web" },
        { href: "/funciones/recordatorios-citas-email", label: "Cuándo se envían los recordatorios por email" },
      ],
      cta: { heading: "Comprueba cómo se ve tu próximo paso", description: "Revisa el recorrido de un sistema de agendamiento antes de cambiar la forma de responder las consultas.", label: "Ver el sistema de agendamiento", href: "/sistema-de-agendamiento-online" },
    },
  },
  {
    slug: "google-calendar-vs-sistema-reservas",
    title: "Google Calendar vs sistema de reservas: qué elegir",
    description: "Distingue calendario y operación de reservas: disponibilidad, servicios, equipo y abonos. Conoce cómo Puragenda se integra con Google Calendar.",
    eyebrow: "Herramientas que pueden convivir",
    updatedAt: "2026-10-03", readingMinutes: 7,
    sections: [
      { heading: "Empieza por la decisión que necesita tomar tu cliente", paragraphs: [
        "Si solo necesitas ver tus compromisos y ordenar el día, un calendario puede resolver la parte principal del trabajo. Si quien reserva debe escoger entre varias atenciones, duraciones, profesionales o locales, la pregunta cambia: necesitas definir qué combinaciones puede ofrecer tu negocio y cómo quedan registradas.",
        "Antes de elegir una herramienta, escribe un recorrido real. Por ejemplo: una persona selecciona una atención de 45 minutos, escoge un profesional habilitado y paga el abono configurado para ese servicio. Usa ese caso al evaluar cada opción; mirar una cuadrícula de horas vacías no demuestra que el recorrido completo esté cubierto.",
      ] },
      { heading: "Google Calendar también permite ofrecer citas", paragraphs: [
        "Google Calendar organiza eventos y dispone de calendarios de citas con páginas de reserva. Su ayuda oficial explica cómo definir duración, disponibilidad, zona horaria y fechas especiales. No es correcto describirlo como una herramienta que únicamente permite escribir eventos a mano.",
        "Algunas funciones de los calendarios de citas dependen de una suscripción elegible de Google Workspace o Google One. La comprobación de conflictos depende de los calendarios seleccionados y de su configuración. Revisa esas condiciones en tu cuenta antes de concluir qué necesitas cambiar.",
      ] },
      { heading: "Un sistema de reservas organiza una atención del negocio", paragraphs: [
        "En Puragenda, el recorrido utiliza un catálogo con duración y precio, opciones de servicio cuando se configuran y profesionales que pueden realizar las atenciones. El cliente ve las combinaciones compatibles y solicita la hora desde el enlace o widget. Si hay varias sucursales, la ubicación también forma parte de esa selección.",
        "El abono se define según la configuración del negocio y del servicio. La reserva guarda datos de contacto y un estado de cita para que el equipo pueda gestionarla desde el panel. Este enfoque resulta relevante cuando tu necesidad es coordinar la atención comercial, además de visualizar compromisos.",
      ], bullets: [
        "Catálogo: qué atención se puede pedir, cuánto dura y cuál es su precio.",
        "Equipo: quién puede realizarla y en qué jornada.",
        "Reserva: qué combinación de servicio, profesional, ubicación y hora eligió el cliente.",
        "Abono: qué pago anticipado corresponde y en qué estado está.",
      ] },
      { heading: "Disponibilidad significa más que no tener un evento", paragraphs: [
        "Una hora puede estar libre y aun así no ser adecuada para un servicio. Quizás la atención dura más que el espacio disponible, el profesional no la realiza o ese local no la ofrece. Define primero las reglas de operación y luego comprueba cómo se traducen en horas que el cliente pueda reservar.",
        "Al preparar una agenda de equipo, revisa jornadas individuales, descansos, bloqueos y excepciones. Evita deducir que todos trabajan durante todo el horario de apertura. En la evaluación de herramientas, pide una demostración de tu escenario completo y de lo que ocurre cuando la disponibilidad cambia justo antes de confirmar.",
      ] },
      { heading: "Cómo conviven Puragenda y Google Calendar", paragraphs: [
        "La integración de Puragenda crea y actualiza en el calendario conectado los eventos correspondientes a sus citas, y retira el evento administrado cuando la cita se cancela. Además consulta intervalos libre/ocupado para considerar compromisos externos al calcular disponibilidad.",
        "Una conexión puede asociarse al negocio o al profesional, según su configuración. Mantén la gestión de la reserva en Puragenda: editar un evento en Google Calendar no se presenta aquí como una edición bidireccional completa del servicio, cliente, abono o estado de la cita.",
      ] },
      { heading: "Prueba dos cambios antes de decidir", paragraphs: [
        "Primero crea un compromiso externo en el calendario conectado y revisa que esa franja no se ofrezca en la agenda correspondiente. Después cambia o cancela una cita desde el recorrido de gestión de Puragenda y comprueba el evento asociado. Son dos pruebas diferentes: consultar ocupación y mantener eventos de citas.",
        "Si un cambio no aparece, revisa autorización, calendario seleccionado y estado de la conexión. Las integraciones dependen también de la disponibilidad de Google y de sus permisos. No conviene prometer una sincronización instantánea e infalible ni asumir que cualquier edición externa cambia automáticamente una reserva.",
      ] },
      { heading: "Elige a partir de tu operación, sin descartar lo que ya sirve", paragraphs: [
        "Una persona con un solo tipo de reunión puede necesitar un recorrido distinto al de recepción en un negocio con varios profesionales. Evalúa qué debe decidir el cliente, qué debe administrar el equipo y qué información necesitas conservar después de la atención.",
        "Puedes seguir utilizando Google Calendar para tus compromisos y sumar un sistema de reservas para el catálogo y la operación de citas. Si la herramienta que ya tienes cubre tu caso, no hay una obligación de reemplazarla. La elección se comprueba con tus servicios y reglas reales.",
      ] },
    ],
    faq: [
      { question: "¿Google Calendar permite que otras personas reserven una hora?", answer: "Sí. Tiene calendarios de citas y páginas de reserva. Las funciones disponibles dependen de la cuenta, la configuración y, en algunos casos, una suscripción elegible." },
      { question: "¿Debo abandonar Google Calendar para usar Puragenda?", answer: "No. Puragenda tiene integración con Google Calendar para mantener eventos de sus citas y consultar intervalos ocupados." },
      { question: "¿Qué diferencia aporta un catálogo de servicios?", answer: "Permite relacionar cada atención con duración, precio, opciones y profesionales compatibles. Así la reserva se organiza a partir del servicio del negocio." },
      { question: "¿Editar un evento en Google modifica toda mi reserva en Puragenda?", answer: "No se promete una edición bidireccional completa. Gestiona los cambios de servicio, estado y demás datos de la reserva en Puragenda." },
      { question: "¿Puragenda necesita mostrar los títulos de mis eventos externos?", answer: "La consulta de disponibilidad utiliza intervalos libre/ocupado. No necesita mostrar en el widget títulos o descripciones de compromisos externos." },
      { question: "¿Cómo evalúo la opción para un equipo?", answer: "Prueba servicios que realizan personas distintas, jornadas individuales y un compromiso externo. Comprueba tanto la selección del cliente como la gestión posterior de la cita." },
    ],
    related: ["organizar-agenda-varios-profesionales", "como-elegir-sistema-reservas-chile"],
    detail: {
      directAnswer: "Google Calendar ayuda a organizar compromisos y también ofrece páginas de citas. Un sistema como Puragenda organiza la reserva alrededor del catálogo del negocio, los profesionales, los datos del cliente y los abonos configurados. Pueden convivir: Puragenda integra los eventos de sus citas con Google Calendar y consulta sus intervalos ocupados.",
      sources: [{ label: "Google: crear un calendario de citas y requisitos de cuenta", url: "https://support.google.com/calendar/answer/10729749?hl=es", consultedAt: "2026-10-03" }],
      links: [
        { href: "/funciones/agenda-google-calendar", label: "Alcance de la integración con Google Calendar" },
        { href: "/sistema-de-agendamiento-online", label: "Catálogo, disponibilidad y gestión de reservas" },
        { href: "/funciones/reservas-online-con-abono", label: "Cómo se configura un abono por servicio" },
        { href: "/alternativa-calendly", label: "Evaluar Puragenda si ya utilizas un enlace de reuniones" },
      ],
      cta: { heading: "Evalúa tu recorrido de reserva completo", description: "Revisa cómo se relacionan catálogo, profesionales y disponibilidad, y conserva el calendario que ya utilizas para tus compromisos.", label: "Explorar el sistema de reservas", href: "/sistema-de-agendamiento-online" },
    },
  },
  {
    slug: "organizar-agenda-varios-profesionales",
    title: "Cómo organizar la agenda de varios profesionales",
    description: "Define jornadas, servicios, descansos, bloqueos y permisos del equipo. Una guía práctica para centralizar varias agendas sin perder la disponibilidad individual.",
    eyebrow: "Guía operativa para equipos",
    updatedAt: "2026-10-03", readingMinutes: 7,
    sections: [
      { heading: "Haz una matriz de personas y atenciones antes de abrir horas", paragraphs: [
        "Comienza por una lista de integrantes y de servicios. Para cada atención, identifica quién la realiza, cuánto dura y dónde puede ofrecerse. El objetivo es evitar que una hora aparentemente libre termine asignada a alguien que no realiza ese trabajo.",
        "Una tabla simple de servicios por profesional ayuda a detectar excepciones: una persona hace corte y color, otra solo corte, y una tercera atiende una especialidad determinados días. Verifica estas relaciones con el equipo antes de trasladarlas a la configuración pública.",
      ], bullets: [
        "Responsable: quién puede realizar cada servicio.",
        "Tiempo: duración que debe reservarse para esa atención.",
        "Lugar: sucursal o ubicación donde se ofrece.",
        "Jornada: días y tramos en que trabaja esa persona.",
      ] },
      { heading: "Separa apertura del negocio y jornada individual", paragraphs: [
        "El horario de apertura indica cuándo funciona el local; la jornada individual indica cuándo atiende cada integrante. Copiar la apertura a todo el equipo puede publicar horas que alguien nunca podrá atender. Registra jornadas reales, incluidos cambios habituales entre días de la semana.",
        "Si una persona trabaja en más de una ubicación, define qué parte de la jornada corresponde a cada local. Deja tiempo para el traslado y para tareas que no son atención al cliente. Una agenda centralizada no debe confundirse con disponibilidad permanente.",
      ] },
      { heading: "Registra descansos, vacaciones y excepciones con anticipación", paragraphs: [
        "Un descanso repetido puede formar parte de la jornada. Una ausencia puntual necesita un bloqueo o una excepción para esa fecha. Decide quién registra vacaciones y quién verifica que las horas dejaron de ofrecerse antes de que el cliente encuentre una opción que no podrán atender.",
        "Cuando una ausencia afecta citas existentes, revisa cada reserva y contacta a los clientes que necesitan un cambio. Bloquear un tramo futuro no significa que las citas ya creadas se reasignen por sí solas ni que las personas hayan aceptado otro horario.",
      ], bullets: [
        "Descansos habituales: configúralos como parte de la jornada.",
        "Ausencias puntuales: registra bloqueo o excepción con el alcance correcto.",
        "Citas existentes: verifica cuáles necesitan gestión y comunicación.",
      ] },
      { heading: "Acuerda cómo se elige el profesional al reservar", paragraphs: [
        "Hay clientes que buscan una persona concreta y otros que priorizan una hora disponible. Decide cómo presentar esa elección y comprueba que la agenda ofrece profesionales compatibles con el servicio. Si una atención requiere una especialidad, no basta con que cualquier integrante esté libre.",
        "En Puragenda, la configuración del catálogo y del equipo interviene en la disponibilidad del flujo público. La página de función explica esas capacidades; esta guía se concentra en las decisiones previas que hacen que la agenda represente correctamente tu operación.",
      ] },
      { heading: "Define quién puede ver y cambiar cada agenda", paragraphs: [
        "Recepción necesita coordinar citas del conjunto; un profesional puede necesitar trabajar principalmente con las suyas. Asigna acceso de acuerdo con tareas concretas y revisa quién puede cambiar jornadas, servicios o estados. Tener una agenda centralizada no exige que todas las personas administren todo.",
        "Usa una lista de responsabilidades: quién añade integrantes, quién configura horarios, quién gestiona un cambio solicitado y quién verifica los abonos cuando corresponde. Los permisos de la plataforma ayudan a aplicar esa separación, pero el procedimiento debe quedar entendido por el equipo.",
      ] },
      { heading: "Prueba combinaciones difíciles, además de la primera hora libre", paragraphs: [
        "Prueba un servicio largo cerca del final de jornada, una persona con descanso al mediodía y otra que no realiza la atención elegida. También revisa una fecha con vacaciones y una sucursal donde el servicio no se ofrece. Estas pruebas dicen más que reservar una cita breve en un día vacío.",
        "Al confirmar, la disponibilidad debe volver a comprobarse porque otro cliente o recepción pueden haber tomado una hora mientras se completaba el formulario. Organiza las reservas asistidas dentro de la misma agenda para que el flujo público no compita con una planilla o una lista de mensajes.",
      ] },
      { heading: "Errores comunes que una agenda compartida no corrige sola", paragraphs: [
        "Centralizar una configuración incorrecta solo la hace visible a más personas. Revisa duraciones demasiado cortas, servicios asignados por defecto, jornadas copiadas sin confirmar y vacaciones avisadas por chat pero no registradas. Cada uno puede producir una reserva que parece válida y resulta difícil de atender.",
        "Tampoco deduzcas la disponibilidad de una cabina o un equipo compartido a partir de la agenda del profesional. Si dos personas necesitan el mismo recurso, acuerda un control adicional hasta comprobar que tu herramienta resuelve ese recurso específico. No confundas varias agendas con gestión automática de todos los recursos físicos.",
      ] },
      { heading: "Cuándo conviene centralizar y cómo mantenerlo útil", paragraphs: [
        "Una agenda común resulta especialmente útil cuando recepción atiende a varios profesionales, los clientes pueden escoger quién los atiende o las jornadas cambian con frecuencia. El beneficio operativo depende de que las citas y los cambios terminen en el mismo registro.",
        "Haz una revisión breve con el equipo cuando cambia el catálogo o se incorpora una persona. Verifica elegibilidad, duración, jornada y acceso. Mantener esas relaciones al día evita que la configuración inicial quede desfasada respecto del negocio real.",
      ] },
    ],
    faq: [
      { question: "¿Por dónde empiezo si hoy cada profesional tiene su agenda?", answer: "Por una matriz de servicios, personas y jornadas. Después acuerda dónde se registrarán las citas y quién mantendrá cada configuración." },
      { question: "¿Debo copiar el horario del local a todas las personas?", answer: "No. Registra la jornada real de cada integrante, sus descansos y las ubicaciones donde atiende." },
      { question: "¿Qué hago cuando alguien avisa vacaciones?", answer: "Registra la ausencia con un bloqueo o excepción y revisa las citas ya existentes. Gestiona por separado los cambios que requieren comunicación al cliente." },
      { question: "¿Cómo compruebo que la reserva elige un profesional adecuado?", answer: "Prueba un servicio que solo realiza parte del equipo. Revisa que la selección y los horarios correspondan a personas habilitadas." },
      { question: "¿Esta guía reemplaza la página de múltiples profesionales?", answer: "No. La guía explica cómo organizar el negocio; la página de función detalla qué hace Puragenda para coordinar la disponibilidad del equipo." },
      { question: "¿Varias agendas controlan automáticamente una cabina compartida?", answer: "No debe asumirse. La agenda del profesional no demuestra disponibilidad de un recurso físico compartido. Comprueba ese requisito específico antes de depender de él." },
    ],
    related: ["dejar-de-agendar-por-whatsapp", "google-calendar-vs-sistema-reservas"],
    detail: {
      directAnswer: "Para organizar varias agendas, relaciona cada servicio con sus profesionales, registra jornadas individuales y ausencias, define permisos y utiliza un registro común de citas. Después prueba la reserva de combinaciones reales. Una agenda centralizada funciona cuando la disponibilidad refleja a cada persona, no cuando replica el horario del local para todos.",
      links: [
        { href: "/funciones/agenda-multiples-profesionales", label: "Qué hace Puragenda para coordinar varias agendas" },
        { href: "/funciones/agenda-multiples-sucursales", label: "Ubicaciones y jornadas por sucursal" },
        { href: "/funciones/agenda-google-calendar", label: "Considerar los compromisos de Google Calendar" },
        { href: "/sistema-de-agendamiento-online", label: "Revisar el recorrido de reserva del equipo" },
      ],
      cta: { heading: "Lleva tus reglas a una agenda compartida", description: "Después de preparar servicios y jornadas, revisa cómo Puragenda relaciona las disponibilidades del equipo.", label: "Ver la función para varios profesionales", href: "/funciones/agenda-multiples-profesionales" },
    },
  },
];
