import type { FeatureSolution } from "./feature-solutions";
import type { ContentLink, ContentSection } from "./seo-expansion";

export type FeatureDetail = {
  preview: "email" | "guest" | "embed" | "locations" | "gift";
  previewTitle: string;
  previewRows: { label: string; value: string }[];
  sections: ContentSection[];
  example: { heading: string; paragraphs: string[] };
  links: ContentLink[];
  cta: { heading: string; description: string; label: string };
  updatedAt: string;
};

export const expansionFeatureSolutions: (FeatureSolution & { detail: FeatureDetail })[] = [
  {
    slug: "recordatorios-citas-email",
    title: "Recordatorios de citas por email",
    description: "Conoce cuándo envía Puragenda los recordatorios de citas por email, qué información incluyen y qué ocurre con las reservas de última hora.",
    eyebrow: "Comunicación de citas",
    headline: "Recordatorios de citas por email, con un horario claro",
    directAnswer: "Puragenda envía recordatorios por email en una ejecución diaria programada a las 14:00 UTC. Se seleccionan las citas del día siguiente según la zona horaria de cada negocio que aún no tienen recordatorio enviado y siguen en un estado elegible. No es un envío exactamente 24 horas antes de cada cita.",
    keywords: ["recordatorios de citas", "recordatorios automáticos de citas", "recordatorio de hora por email"],
    benefits: [
      { title: "Datos para llegar preparado", description: "El correo recuerda servicio, profesional, fecha y hora en la zona horaria del negocio. Así el cliente puede comprobar a qué atención corresponde el aviso." },
      { title: "Una acción desde el correo", description: "El recordatorio incluye enlaces para confirmar o cancelar la cita. Esas acciones están sujetas a la validación y las reglas de gestión de la reserva." },
      { title: "Seguimiento del envío", description: "La cita se marca como recordatorio enviado después de que el proveedor acepta el correo. Esa marca evita volver a seleccionarla en las siguientes ejecuciones ordinarias." },
    ],
    steps: [
      { title: "Reserva y contacto", description: "El cliente informa su email al reservar. La confirmación de reserva y el recordatorio previo son comunicaciones distintas: una no sustituye a la otra." },
      { title: "Selección del día siguiente", description: "En la ejecución diaria se revisa qué citas ocurren mañana en la zona horaria del negocio. El horario local del envío cambia según la zona y el horario de verano." },
      { title: "Aviso por email", description: "Se prepara el resumen de la cita y sus enlaces de acción. Si el proveedor devuelve un error, la cita no se marca como enviada en esa ejecución." },
    ],
    faq: [
      { question: "¿El email llega exactamente 24 horas antes?", answer: "No. La ejecución está programada a las 14:00 UTC y toma las citas del día siguiente en la zona horaria del negocio. La anticipación depende de la hora de cada cita." },
      { question: "¿Qué pasa si alguien reserva para mañana después del envío diario?", answer: "Esa reserva no estuvo en la selección de la ejecución anterior. En la siguiente ejecución ya podría ser una cita de hoy y quedar fuera del recordatorio para mañana. Por eso una reserva tardía puede no recibir este aviso previo." },
      { question: "¿Se recuerdan las citas canceladas o ya atendidas?", answer: "El proceso excluye citas canceladas, con llegada registrada, completadas o marcadas como inasistencia. También excluye las que ya tienen la marca de recordatorio enviado." },
      { question: "¿Puragenda manda estos recordatorios por WhatsApp o SMS?", answer: "Esta funcionalidad utiliza email. No incluye recordatorios automáticos por WhatsApp ni SMS." },
      { question: "¿Puedo elegir varios avisos y sus horas de envío?", answer: "El flujo descrito tiene una ejecución diaria para las citas de mañana. No se presenta como una secuencia configurable de varios avisos por cita." },
      { question: "¿Un recordatorio asegura que el cliente asistirá?", answer: "No. El aviso facilita revisar la cita, pero no garantiza asistencia ni entrega en la bandeja de entrada. Conviene mantener un email correcto y una política clara para los cambios." },
    ],
    detail: {
      preview: "email", previewTitle: "Recordatorio de una cita",
      previewRows: [{ label: "Selección", value: "Citas de mañana" }, { label: "Ejecución diaria", value: "14:00 UTC" }, { label: "Canal", value: "Email" }, { label: "Contenido", value: "Servicio · profesional · fecha y hora" }],
      updatedAt: "2026-10-03",
      sections: [
        { heading: "La diferencia entre confirmar una reserva y recordarla", paragraphs: [
          "Una persona puede reservar con varios días de anticipación y guardar la confirmación sin volver a abrirla. El recordatorio retoma esa información cerca de la atención. Su utilidad está en hacer visible la cita que ya existe; no crea un nuevo horario ni reemplaza la disponibilidad de la agenda.",
          "Si tu servicio requiere abono, revisa también el estado del pago y la confirmación de la reserva. Un recordatorio no funciona como comprobante de pago ni como una promesa de devolución. Cada comunicación cumple una tarea distinta dentro del recorrido del cliente.",
        ] },
        { heading: "Qué significa «mañana» para este envío", paragraphs: [
          "La fecha se determina con la zona horaria configurada para el negocio. Un aviso para una cita de la mañana y otro para una cita de la tarde pueden salir en la misma ejecución. En Chile, la equivalencia local de las 14:00 UTC varía con el horario de verano; por eso no conviene publicarla como una hora local fija durante todo el año.",
          "La programación permite describir cuándo se intenta enviar el correo, pero la entrega final depende del proveedor y del servicio de email del destinatario. Pide que el cliente revise sus datos de contacto y, si falta un aviso, que consulte también las carpetas de correo no deseado.",
        ] },
        { heading: "Cómo incorporarlo a tu operación", paragraphs: [
          "Al comunicar tu política de reservas, separa la hora reservada, el canal del recordatorio y la forma de gestionar un cambio. Si atiendes muchas reservas para el mismo día o para mañana después de la ejecución, acuerda un procedimiento de recepción para esas citas; no dependas de un aviso que puede no entrar en la selección diaria.",
          "Mide inasistencias con tus propias citas y en un período comparable. El correo es una ayuda operativa y puede combinarse con información de llegada o con abonos configurados por servicio. No permite atribuir por sí solo un porcentaje de reducción de ausencias.",
        ] },
      ],
      example: { heading: "Ejemplo: una cita a las 09:00 y otra a las 18:00", paragraphs: [
        "Imagina dos citas para mañana, ambas creadas antes de la ejecución diaria. Si siguen elegibles y no tienen recordatorio enviado, se seleccionan juntas a las 14:00 UTC de hoy. La cita de las 18:00 tendrá más anticipación que la de las 09:00.",
        "Si una tercera persona reserva para mañana después de esa ejecución, no recibió el envío anterior. Este ejemplo explica el criterio temporal; no representa una prueba de entrega a clientes reales.",
      ] },
      links: [
        { href: "/guias/reducir-inasistencias-reservas", label: "Cómo abordar las inasistencias", description: "Combina avisos, política de cambios y seguimiento." },
        { href: "/sistema-de-agendamiento-online", label: "El recorrido completo de una reserva" },
        { href: "/funciones/reservas-online-con-abono", label: "Reservas con abono por servicio" },
      ],
      cta: { heading: "Revisa cómo se comunica una cita", description: "Evalúa el flujo de reserva y los emails dentro de tu operación, incluidos los casos de última hora.", label: "Explorar la demo" },
    },
  },
  {
    slug: "reservas-sin-cuenta",
    title: "Reservas online sin crear cuenta",
    description: "Tus clientes reservan desde un enlace o widget en el navegador, sin cuenta de Puragenda ni app. Conoce los datos y pasos del flujo real.",
    eyebrow: "Acceso del cliente",
    headline: "Tus clientes reservan sin crear una cuenta",
    directAnswer: "Para una reserva ordinaria, el cliente abre el enlace o widget de Puragenda en su navegador, elige servicio, profesional cuando corresponde y una hora disponible, y completa nombre, email y teléfono. No necesita una cuenta de Puragenda ni instalar una app. Si el negocio exige abono, debe completar el paso de pago correspondiente.",
    keywords: ["reservas sin registro", "agenda online sin crear cuenta", "clientes reservan sin app"],
    benefits: [
      { title: "Un enlace que puedes compartir", description: "Publica la agenda en tu biografía, en un botón de tu web o en una conversación. El destino abre el mismo flujo de reservas en el navegador." },
      { title: "Contacto sin contraseña", description: "Pedir nombre, email y teléfono sirve para identificar y comunicar la cita. Completar esos campos no obliga al cliente a registrarse en Puragenda." },
      { title: "Disponibilidad antes de confirmar", description: "El cliente elige entre las horas ofrecidas para el servicio y el profesional. La disponibilidad se vuelve a validar al procesar la reserva." },
    ],
    steps: [
      { title: "Abre la agenda", description: "Desde un móvil o computador, entra al enlace. Si hay varias sucursales y ninguna viene seleccionada, elige dónde quiere atenderse." },
      { title: "Elige la atención", description: "Selecciona servicio y opciones disponibles, profesional cuando corresponde, fecha y hora. El flujo depende del catálogo y la configuración del negocio." },
      { title: "Completa y revisa", description: "Informa los datos de contacto y revisa el resumen. Si se solicita abono, continúa al pago; una reserva pendiente de pago no equivale a una confirmación pagada." },
    ],
    faq: [
      { question: "¿Mi cliente necesita una cuenta para pedir una hora?", answer: "No para una reserva ordinaria. El formulario solicita datos de contacto, pero no una contraseña de Puragenda." },
      { question: "¿Hace falta instalar una app?", answer: "No. El enlace de reservas y el widget se utilizan desde el navegador del móvil o del computador." },
      { question: "¿Sin registro significa que no se piden datos?", answer: "No. Se solicitan nombre, email y teléfono para gestionar la cita. Una opción de atención a domicilio puede requerir dirección." },
      { question: "¿Reservar sin cuenta elimina el abono?", answer: "No. Si el negocio configura un abono para la atención, el cliente debe seguir el paso de pago indicado. La ausencia de registro no elimina esa condición." },
      { question: "¿Para qué sirve entonces el portal del cliente?", answer: "Es un acceso separado para quienes quieren gestionar su cuenta y funciones asociadas. Reclamar y utilizar una Gift Card en la reserva requiere una cuenta del portal; esa excepción no es un requisito de la reserva ordinaria." },
      { question: "¿Puedo poner la misma agenda dentro de mi sitio?", answer: "Sí. El widget embebible se inserta mediante iframe y utiliza el catálogo y la disponibilidad de Puragenda." },
    ],
    detail: {
      preview: "guest", previewTitle: "Reserva desde el navegador",
      previewRows: [{ label: "1 · Servicio", value: "Atención elegida" }, { label: "2 · Disponibilidad", value: "Profesional · día · hora" }, { label: "3 · Contacto", value: "Nombre · email · teléfono" }, { label: "Cuenta de Puragenda", value: "No requerida para la reserva ordinaria" }],
      updatedAt: "2026-10-03",
      sections: [
        { heading: "Compartir disponibilidad sin abrir otro registro", paragraphs: [
          "Cuando una persona pregunta por una hora, puedes enviarle un enlace con la agenda disponible. Así no necesita esperar a que recepción enumere las alternativas ni crear un usuario nuevo antes de entender qué servicio está reservando. El enlace también puede quedar publicado para consultas fuera de tu horario de atención.",
          "Esto cambia la forma de solicitar una cita, no la responsabilidad de configurar la agenda. Tu negocio sigue definiendo servicios, duraciones, horarios y profesionales. Antes de compartir el enlace, revisa que una persona nueva pueda reconocer la atención, el lugar y el precio sin recurrir a otra conversación.",
        ] },
        { heading: "Datos de contacto y cuenta son pasos diferentes", paragraphs: [
          "El formulario de reserva utiliza nombre, email y teléfono. Esos datos permiten asociar la cita con una persona y enviar las comunicaciones que correspondan. No deben confundirse con la creación de una cuenta con contraseña.",
          "El portal del cliente es un recorrido adicional. En particular, las Gift Cards se reclaman en una cuenta y el canje se vincula a su titular. Si vas a ofrecerlas, explica esa diferencia desde el inicio: «puedes reservar sin registrarte; para usar tu Gift Card, entra a tu cuenta».",
        ] },
        { heading: "Qué revisar al reservar desde el móvil", paragraphs: [
          "Abre el enlace como lo haría un cliente que llega por primera vez. Comprueba que ve los servicios correctos, que puede escoger un profesional elegible y que reconoce la fecha y la dirección del local. Un enlace directo a una selección concreta puede facilitar el recorrido, pero el resumen final sigue siendo necesario.",
          "Cuando hay abono, el cliente continúa al paso de pago que muestra la reserva. El proveedor de pago puede tener su propio flujo de identificación; esta página explica la ausencia de una cuenta obligatoria de Puragenda para reservar, no los requisitos de terceros.",
        ] },
      ],
      example: { heading: "Ejemplo: responder una consulta sin coordinar cada hora", paragraphs: [
        "Una clienta escribe al terminar tu jornada: «¿Tienes una hora para el viernes?». Puedes responder con el enlace de reservas y una breve explicación del servicio que necesita. Ella revisa los cupos, elige una atención e informa sus datos desde el navegador.",
        "Si la atención requiere orientación previa, conserva la conversación para resolverla antes de reservar. La agenda evita el intercambio manual de horarios; no reemplaza una evaluación o una cotización que tu negocio necesite realizar.",
      ] },
      links: [
        { href: "/sistema-de-agendamiento-online", label: "Cómo funciona el sistema de agendamiento" },
        { href: "/funciones/widget-reservas-web", label: "Insertar la reserva en tu página web" },
        { href: "/guias/dejar-de-agendar-por-whatsapp", label: "Pasar del chat a un enlace de reservas" },
      ],
      cta: { heading: "Prueba el recorrido como un cliente nuevo", description: "Abre la demo y revisa la selección de servicio y horario antes de preparar tu propia agenda.", label: "Ver el flujo en la demo" },
    },
  },
  {
    slug: "widget-reservas-web",
    title: "Widget de reservas para tu página web",
    description: "Inserta la agenda de Puragenda mediante iframe en un sitio existente. Conecta catálogo, profesionales y disponibilidad sin duplicar reservas.",
    eyebrow: "Agenda en tu sitio existente",
    headline: "Un widget de reservas dentro de tu página web",
    directAnswer: "El widget embebible de Puragenda permite insertar el flujo de reservas en una web existente mediante un iframe. El cliente reserva desde el navegador con el catálogo y la disponibilidad del negocio. Desde el panel puedes personalizar la presentación del widget y obtener el enlace o código de inserción.",
    keywords: ["widget de reservas para página web", "insertar agenda en página web", "agenda iframe web"],
    benefits: [
      { title: "Catálogo conectado", description: "El iframe abre la agenda del negocio; no crea una lista independiente de servicios ni un segundo calendario que debas mantener a mano." },
      { title: "Presentación de tu marca", description: "La apariencia del widget permite ajustar colores, tamaño de texto, esquinas y sombras, además de usar la identidad del negocio." },
      { title: "Enlace como segunda entrada", description: "La misma agenda puede abrirse desde un enlace directo. Es útil si tu sitio aún no admite bloques HTML o quieres ofrecer un botón de reserva." },
    ],
    steps: [
      { title: "Prepara la agenda", description: "Define catálogo, servicios, profesionales y horarios en Puragenda. Comprueba una reserva de ejemplo antes de insertar el widget." },
      { title: "Obtén el iframe", description: "En Configuración encuentras el código de inserción y el enlace del widget. Tu sitio debe permitir añadir un bloque HTML o iframe." },
      { title: "Revisa el espacio", description: "Inserta la agenda con un ancho adaptable y una altura suficiente. Prueba móvil, desplazamiento y el recorrido de pago cuando corresponda." },
    ],
    faq: [
      { question: "¿El widget incluye la construcción de una web completa?", answer: "No. Esta función inserta la agenda de reservas en un sitio que ya tienes. No incluye crear el sitio completo ni contratar un dominio." },
      { question: "¿Qué es el iframe de reservas?", answer: "Es un bloque HTML que muestra la página del widget de Puragenda dentro de otra web. La reserva sigue conectada al negocio en Puragenda." },
      { question: "¿Puedo cambiar la apariencia de la agenda?", answer: "Sí. El panel de apariencia permite configurar colores, tamaño de texto, esquinas y sombras del widget. La apariencia de la web anfitriona se administra en esa web." },
      { question: "¿Debo copiar las horas disponibles a mi sitio?", answer: "No. El iframe muestra el catálogo y la disponibilidad de Puragenda. Debes mantener correctamente la agenda del negocio, no una copia manual en la web." },
      { question: "¿El cliente puede reservar sin instalar nada?", answer: "Sí. El flujo se utiliza desde el navegador y una reserva ordinaria no exige una cuenta de Puragenda." },
      { question: "¿Puedo insertarlo en cualquier plataforma web?", answer: "El requisito es que tu plataforma permita HTML o iframes y que sus políticas acepten la inserción. Si no lo permite, puedes usar un botón con el enlace directo de reservas." },
    ],
    detail: {
      preview: "embed", previewTitle: "Tu web + agenda embebida",
      previewRows: [{ label: "Web existente", value: "Presentación del negocio" }, { label: "Iframe Puragenda", value: "Catálogo · profesional · hora" }, { label: "Gestión", value: "Reservas en el panel de Puragenda" }],
      updatedAt: "2026-10-03",
      sections: [
        { heading: "Una entrada web para la misma agenda", paragraphs: [
          "Si tu negocio ya tiene una página con servicios, ubicación y contacto, puedes añadir la reserva en el lugar donde el visitante decide pedir una hora. El widget ocupa ese espacio y muestra el recorrido conectado a Puragenda. No necesitas escribir una segunda aplicación de reservas ni mantener otra tabla de cupos.",
          "El sitio anfitrión sigue siendo responsable de su navegación y su diseño. Dentro del iframe se encuentra la agenda del negocio. Este alcance es distinto de encargar un sitio completo: aquí se integra una función de reservas en una web que ya existe.",
        ] },
        { heading: "Qué puedes personalizar y dónde", paragraphs: [
          "La configuración de apariencia controla la presentación del widget: colores de la interfaz, tamaño de texto, esquinas y sombras. Usa valores que permitan leer los servicios y distinguir las acciones; un color de marca muy claro puede necesitar un contraste diferente en botones o textos.",
          "El contenedor del iframe se configura en tu sitio. Ajusta el ancho para que se adapte al espacio disponible y la altura para que el visitante pueda completar el recorrido. El código de inserción del panel es un punto de partida; revisa cómo lo interpreta tu editor web.",
        ] },
        { heading: "Una comprobación útil antes de compartir la web", paragraphs: [
          "Prueba el bloque en una pantalla angosta y comprueba que el título del iframe describe su función. Recorre servicio, profesional, fecha, datos de contacto y resumen. Si usas varias sucursales, comprueba que la selección de local aparece cuando corresponde.",
          "Si una atención requiere abono, revisa la salida al proveedor de pago y el regreso al resultado de la reserva. Conserva también el enlace directo como una entrada visible y fácil de compartir. Estos pasos verifican tu integración concreta; no implican compatibilidad automática con todos los constructores de sitios.",
        ] },
      ],
      example: { heading: "Ejemplo: añadir reservas a una página de servicios", paragraphs: [
        "Un negocio tiene una web con una sección de tratamientos. Puede colocar un bloque de reservas después de explicar sus servicios, junto con un enlace para abrir la agenda en otra página. Ambos destinos utilizan la misma configuración de Puragenda.",
        "Cuando cambia la duración de una atención o bloquea una jornada en la agenda, no debe actualizar una copia de horarios escrita en su sitio. El widget consulta el recorrido de reservas; la descripción editorial de la web sigue a cargo del negocio.",
      ] },
      links: [
        { href: "/funciones/reservas-sin-cuenta", label: "Qué necesita el cliente para reservar" },
        { href: "/caracteristicas", label: "Revisar las funciones de Puragenda" },
        { href: "/sistema-de-agendamiento-online", label: "Catálogo y disponibilidad en el sistema de reservas" },
      ],
      cta: { heading: "Evalúa la agenda que insertarás en tu web", description: "Revisa primero el flujo en la demo. Al configurar tu negocio, podrás obtener su enlace y código iframe.", label: "Explorar el widget en la demo" },
    },
  },
  {
    slug: "agenda-multiples-sucursales",
    title: "Agenda para múltiples sucursales",
    description: "Organiza ubicaciones, servicios, profesionales y horarios por sucursal. Conoce cómo el cliente elige el local al reservar con Puragenda.",
    eyebrow: "Ubicaciones y disponibilidad",
    headline: "Organiza reservas para varias sucursales",
    directAnswer: "Puragenda permite configurar ubicaciones activas con dirección y horarios, asociar servicios y profesionales a ellas y ofrecer una selección de sucursal en el widget cuando hay varias y ninguna está preseleccionada. La reserva utiliza la disponibilidad y las asignaciones de la ubicación elegida.",
    keywords: ["agenda para varias sucursales", "sistema reservas múltiples locales", "agenda multi sucursal"],
    benefits: [
      { title: "Local reconocible", description: "Cada ubicación tiene nombre y dirección; puede incluir un enlace de mapa. El cliente identifica dónde está solicitando la atención." },
      { title: "Oferta por ubicación", description: "Los servicios y los profesionales se relacionan con las sucursales donde están disponibles. Una misma marca puede ofrecer una atención en un local y otra en el segundo." },
      { title: "Horarios del lugar y del equipo", description: "Se consideran los horarios del local y los del profesional asociado, con descansos y excepciones configuradas. Tener dos locales no convierte cualquier hora en reservable." },
    ],
    steps: [
      { title: "Crea las ubicaciones", description: "Define nombre, dirección, zona horaria y horario de atención. Mantén activas las sucursales que recibirán reservas." },
      { title: "Asigna catálogo y equipo", description: "Relaciona cada servicio con sus locales y cada profesional con sus ubicaciones y jornadas. Revisa la configuración tras crear una nueva sucursal." },
      { title: "Prueba la elección de local", description: "Abre el widget sin una sucursal preseleccionada y confirma que el cliente ve solo la oferta compatible al elegir dónde atenderse." },
    ],
    faq: [
      { question: "¿Cuándo aparece la selección de sucursal?", answer: "Cuando el widget tiene varias ubicaciones activas y no hay una ubicación preseleccionada. Con una sola ubicación, el flujo puede usarla directamente." },
      { question: "¿Puedo ofrecer servicios distintos en cada local?", answer: "Sí. Los servicios se asocian a ubicaciones. El flujo filtra la oferta y valida que los servicios elegidos correspondan a la sucursal de la reserva." },
      { question: "¿Un profesional puede estar asociado a más de una sucursal?", answer: "Sí. La relación de profesional y ubicación admite horarios por local. Debes configurarlos para reflejar dónde trabaja en cada jornada." },
      { question: "¿Puedo enviar un enlace que ya seleccione el local?", answer: "El widget admite una sucursal inicial mediante el parámetro location con su slug. Antes de compartirlo, comprueba que la ubicación sigue activa y que la oferta mostrada es la correcta." },
      { question: "¿Esta página incluye stock, caja o reporting consolidado por sucursal?", answer: "No se incluyen esas capacidades en el alcance descrito. Aquí se explica la organización de ubicaciones, catálogo, profesionales, horarios y reservas." },
      { question: "¿Se calculan automáticamente los traslados del equipo?", answer: "No se promete cálculo de tiempos de traslado. Si un profesional se mueve entre locales, organiza sus jornadas y bloqueos para dejar el tiempo necesario." },
    ],
    detail: {
      preview: "locations", previewTitle: "Ejemplo de ubicaciones",
      previewRows: [{ label: "Local Centro", value: "Servicios y equipo asignados al Centro" }, { label: "Local Norte", value: "Servicios y equipo asignados al Norte" }, { label: "La reserva", value: "Sucursal → atención → horario compatible" }],
      updatedAt: "2026-10-03",
      sections: [
        { heading: "Una sucursal es parte de la disponibilidad", paragraphs: [
          "La dirección es importante, pero no basta para organizar reservas en varios locales. El cliente debe poder pedir un servicio donde realmente se ofrece y con una persona que atiende allí. Por eso la ubicación forma parte de la selección y de las validaciones de la reserva.",
          "Al crear una sucursal, revisa su catálogo aunque los servicios del negocio se hayan asociado inicialmente. Una nueva dirección no demuestra que todas las atenciones estén listas para ofrecerse en ese lugar. La revisión del equipo y sus horarios completa esa configuración.",
        ] },
        { heading: "Evita confundir horario de apertura con jornada profesional", paragraphs: [
          "Un local puede abrir toda la semana y un integrante trabajar allí solo algunos días. La apertura del local y la jornada de ese profesional describen disponibilidades distintas. Configurar ambas ayuda a que el cliente no elija una combinación de sucursal y atención que el equipo no puede realizar.",
          "Si el mismo profesional atiende en dos ubicaciones, reserva tiempo para desplazarse y comprueba sus citas ya ocupadas. El sistema valida disponibilidad, pero no calcula cuánto demora el trayecto entre direcciones ni administra un recurso físico compartido como una cabina.",
        ] },
        { heading: "Un enlace general o una entrada para un local", paragraphs: [
          "El enlace general resulta útil cuando el cliente necesita elegir entre las ubicaciones del negocio. Un enlace que preselecciona la sucursal puede servir en la página de contacto de ese local. Ambos recorridos deben dejar claro el lugar de la atención antes de confirmar.",
          "Cuando cambias una dirección o dejas una ubicación inactiva, vuelve a comprobar los enlaces publicados. La gestión de reservas por ubicación no implica que esta página ofrezca caja, inventario o informes comerciales consolidados por sucursal.",
        ] },
      ],
      example: { heading: "Ejemplo: dos locales con especialidades diferentes", paragraphs: [
        "El Local Centro ofrece corte y color; el Local Norte ofrece corte. Una profesional realiza color únicamente en el Centro durante dos jornadas. Al elegir Norte, el cliente no debería encontrar color como si se atendiera allí.",
        "La prueba correcta combina ubicación, servicio y profesional. No basta con que ambos locales tengan el mismo horario de apertura. Este escenario es ilustrativo y no corresponde a un cliente publicado.",
      ] },
      links: [
        { href: "/funciones/agenda-multiples-profesionales", label: "Cómo se organiza la disponibilidad del equipo" },
        { href: "/guias/organizar-agenda-varios-profesionales", label: "Guía para organizar jornadas y asignaciones" },
        { href: "/sistema-de-agendamiento-online", label: "El flujo del sistema de reservas" },
      ],
      cta: { heading: "Valida la configuración de tus locales", description: "Revisa cómo se relacionan catálogo, equipo y disponibilidad antes de compartir el enlace del negocio.", label: "Explorar la agenda en la demo" },
    },
  },
  {
    slug: "gift-cards",
    title: "Gift Cards para negocios de servicios",
    description: "Crea Gift Cards por monto o servicios, registra ventas manuales y habilita venta online con Mercado Pago. Gestiona entrega y canje desde Puragenda.",
    eyebrow: "Regalar una atención",
    headline: "Gift Cards por monto o servicios para tu negocio",
    directAnswer: "Puragenda permite crear Gift Cards de saldo o de servicios, registrar una venta manual y ofrecer compra online de plantillas públicas cuando el negocio tiene Mercado Pago habilitado y una moneda compatible. La tarjeta incluye código, destinatario y mensaje cuando es un regalo. Para reclamarla y utilizarla al reservar, el destinatario necesita una cuenta del portal del cliente.",
    keywords: ["gift cards para negocios", "gift cards para salón", "vender gift cards online"],
    benefits: [
      { title: "Saldo o una atención definida", description: "Una plantilla de saldo dispone de un monto utilizable. Una de servicios contiene atenciones del catálogo y cantidades, con un precio de venta configurado por el negocio." },
      { title: "Venta manual u online", description: "El panel permite registrar una venta manual con efectivo, transferencia u otro medio. La compra online utiliza Mercado Pago cuando la configuración del negocio lo permite." },
      { title: "Entrega y seguimiento", description: "El regalo admite destinatario, remitente y mensaje. Desde el panel se gestionan plantillas y ventas, y se puede reenviar el correo de una tarjeta emitida." },
    ],
    steps: [
      { title: "Define la tarjeta", description: "Crea una plantilla de saldo o servicios, su precio y presentación. Revisa si estará activa y disponible públicamente para la compra online." },
      { title: "Registra la compra", description: "En una venta manual, registra el pago recibido. En la venta online, la tarjeta se emite cuando el pago queda aprobado; abrir el checkout no equivale a emitirla." },
      { title: "Entrega y canje", description: "El destinatario recibe el correo con el código y acceso para reclamar la tarjeta. Luego entra al portal y la usa en una reserva compatible de ese negocio." },
    ],
    faq: [
      { question: "¿Puedo crear una Gift Card por monto y otra por servicio?", answer: "Sí. Las plantillas admiten saldo o servicios del catálogo con cantidades. El precio de venta se configura en la plantilla." },
      { question: "¿Necesito Mercado Pago para una venta manual?", answer: "No. El panel permite registrar una venta manual pagada por transferencia, efectivo u otro medio. La integración con Mercado Pago se utiliza para la compra online." },
      { question: "¿Cuándo está disponible la venta online?", answer: "Cuando hay una plantilla activa y pública, el negocio tiene Mercado Pago conectado y la moneda es compatible. El negocio también debe tener acceso operativo a la plataforma." },
      { question: "¿Puedo enviarla a otra persona con un mensaje?", answer: "Sí. En el modo regalo se informa destinatario y su email, el nombre del remitente y un mensaje opcional." },
      { question: "¿Se canjea el código sin una cuenta del cliente?", answer: "No en el flujo descrito. El código o enlace permite reclamar la tarjeta dentro de una cuenta del portal del cliente. El canje en la reserva verifica que la tarjeta pertenece a esa cuenta." },
      { question: "¿Sirve para cualquier negocio de Puragenda?", answer: "No. La tarjeta está asociada al negocio que la emitió y el canje valida esa relación, además del saldo o los servicios disponibles." },
      { question: "¿Qué ocurre si falla el correo de entrega?", answer: "Una venta manual puede emitir la tarjeta y dejar un aviso de correo pendiente. El panel permite reenviar el email desde la gestión de ventas; la entrega no se garantiza por el solo hecho de emitirla." },
    ],
    detail: {
      preview: "gift", previewTitle: "Ejemplo de Gift Card de servicio",
      previewRows: [{ label: "Tipo", value: "Servicio del catálogo" }, { label: "Destinatario", value: "Persona que recibe el regalo" }, { label: "Mensaje", value: "Un momento para ti" }, { label: "Canje", value: "Tarjeta reclamada en el portal del cliente" }],
      updatedAt: "2026-10-03",
      sections: [
        { heading: "Elige qué podrá utilizar quien recibe el regalo", paragraphs: [
          "Una Gift Card de saldo y una de servicios responden a decisiones distintas. El saldo deja un monto disponible para una reserva compatible. La de servicios identifica atenciones concretas y su cantidad; resulta útil cuando el regalo busca una experiencia definida del catálogo.",
          "Revisa la duración, el precio y las opciones del servicio antes de preparar una tarjeta. El canje de servicios considera las atenciones incluidas; no conviene comunicar que cualquier extra o diferencia de precio queda cubierto sin comprobar el resumen de la reserva.",
        ] },
        { heading: "Registra una venta sin confundir emisión y cobro", paragraphs: [
          "En una venta manual, el negocio registra que recibió el pago mediante transferencia, efectivo u otro medio. La plataforma genera la tarjeta dentro de ese recorrido; registrar «transferencia» no procesa una transferencia bancaria por sí mismo.",
          "En la compra online, el cliente completa sus datos y continúa a Mercado Pago. La aprobación del pago permite emitir la tarjeta. Una compra pendiente o fallida no debe comunicarse como un regalo ya disponible para usar.",
        ] },
        { heading: "Del correo de regalo a la reserva", paragraphs: [
          "Cuando el comprador elige regalarla, informa quién la recibirá y a qué correo se enviará, junto con su nombre como remitente y un mensaje opcional. La entrega presenta el código y el acceso para reclamar la tarjeta. Conviene comprobar el email del destinatario antes de completar la compra.",
          "El destinatario reclama la tarjeta en su cuenta del portal. Al reservar, el sistema verifica negocio, titular y disponibilidad de saldo o servicios. Esto es distinto del flujo ordinario de reserva sin cuenta: explica ese paso adicional para que el regalo no sorprenda a quien lo recibe.",
        ] },
        { heading: "Qué gestionar después de la venta", paragraphs: [
          "El panel reúne plantillas, ventas y tarjetas emitidas. Puedes revisar el estado de la compra y reenviar el correo cuando corresponde. La configuración de una plantilla y la tarjeta ya vendida son objetos distintos: no atribuyas a una edición posterior condiciones que no se comunicaron al comprador.",
          "Antes de anunciar Gift Cards, define cómo explicarás su uso, los servicios cubiertos y qué hacer si el cliente necesita ayuda. Esta función no establece por sí sola una política universal de vencimiento, reembolso o condiciones comerciales para todos los negocios.",
        ] },
      ],
      example: { heading: "Ejemplo: regalar una atención concreta", paragraphs: [
        "Un salón prepara una Gift Card que incluye una atención de su catálogo. En una venta manual registra el pago recibido, el nombre de quien regala y el email de quien recibe. El mensaje puede acompañar la entrega sin cambiar el contenido de la tarjeta.",
        "La persona destinataria reclama la tarjeta en su cuenta y elige una hora para el servicio cubierto. El regalo no reserva automáticamente un horario ni garantiza que cualquier profesional tenga disponibilidad cuando quiera utilizarlo.",
      ] },
      links: [
        { href: "/caracteristicas", label: "Funciones para gestionar tu negocio" },
        { href: "/funciones/reservas-sin-cuenta", label: "Reserva ordinaria y excepción del canje" },
        { href: "/alternativa-fresha", label: "Evaluar una agenda para servicios y regalos" },
        { href: "/sistema-de-agendamiento-online", label: "Cómo se elige la hora al reservar" },
      ],
      cta: { heading: "Revisa cómo encajan los regalos en tu catálogo", description: "Evalúa el panel y consulta el recorrido de venta y canje antes de ofrecer tus primeras tarjetas.", label: "Explorar el panel en la demo" },
    },
  },
];
