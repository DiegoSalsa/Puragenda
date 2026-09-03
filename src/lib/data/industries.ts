export type IndustrySEOData = {
  slug: string;
  name: string;
  singularName: string;
  title: string;
  description: string;
  heroHeadline: string;
  heroSubheadline: string;
  benefits: {
    title: string;
    description: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
  keywords: string[];
  relatedSlugs: string[];
};

export const industriesData: IndustrySEOData[] = [
  {
    slug: "peluquerias",
    name: "Peluquerías",
    singularName: "Peluquería",
    title: "Software de Reservas para Peluquerías y Salones",
    description: "La agenda online perfecta para peluquerías. Tus clientes agendan 24/7, evitas llamadas perdidas y coordinas a tus estilistas sin solapamientos.",
    heroHeadline: "Agenda más cortes, contesta menos llamadas",
    heroSubheadline: "El sistema de reservas diseñado específicamente para peluquerías y salones de belleza. Tus clientes se agendan solos mientras tú te enfocas en tu arte.",
    benefits: [
      {
        title: "Agenda multi-estilista",
        description: "Cada peluquero tiene su propio horario, días libres y servicios asignados. Todo sincronizado en tiempo real.",
      },
      {
        title: "Menos ausencias (No Shows)",
        description: "Envía recordatorios y mantén un historial de asistencia de cada cliente para cobrar señas a los impuntuales.",
      },
      {
        title: "Agendamiento 24/7",
        description: "Tus clientes pueden reservar a medianoche o el domingo. No pierdas ventas por estar fuera de horario.",
      },
    ],
    faq: [
      {
        question: "¿Puedo tener diferentes duraciones de servicio por estilista?",
        answer: "Sí, puedes configurar qué servicios realiza cada estilista y ajustar sus horarios individualmente.",
      },
      {
        question: "¿Mis clientes necesitan bajar una app?",
        answer: "No, agendan directamente desde el enlace en tu Instagram o desde el widget en tu página web sin instalar nada.",
      },
      {
        question: "¿Puedo pedir un abono antes de confirmar una hora?",
        answer: "Sí. Puedes configurar el abono por servicio y el cliente ve el monto antes de pasar al pago.",
      },
      {
        question: "¿Qué ocurre si un estilista está de vacaciones?",
        answer: "Puedes bloquear sus días o períodos no disponibles sin cerrar la agenda del resto del equipo.",
      },
    ],
    keywords: ["software peluquería", "agenda online salón", "reservas peluquería", "sistema citas peluqueros"],
    relatedSlugs: ["barberias", "estetica", "manicure"],
  },
  {
    slug: "barberias",
    name: "Barberías",
    singularName: "Barbería",
    title: "Agenda online para barberías en Chile",
    description: "Agenda online para barberías en Chile: recibe reservas 24/7, organiza horarios por barbero, cobra abonos y reduce inasistencias. Prueba 30 días gratis.",
    heroHeadline: "Agenda online para barberías en Chile",
    heroSubheadline: "Tus clientes eligen servicio, barbero y una hora realmente disponible desde Instagram, WhatsApp o Google. Tú reduces mensajes, choques de horario e inasistencias.",
    benefits: [
      {
        title: "Reservas 24/7 desde tu enlace",
        description: "Comparte la agenda en Instagram, WhatsApp o Google Business Profile para recibir reservas incluso mientras estás atendiendo.",
      },
      {
        title: "Horario propio para cada barbero",
        description: "Cada integrante define sus servicios, jornada, descansos y bloqueos. La disponibilidad se valida antes de confirmar una cita.",
      },
      {
        title: "Abonos e historial de clientes",
        description: "Protege los horarios más demandados con un abono por servicio y consulta visitas e inasistencias antes de la próxima atención.",
      },
    ],
    faq: [
      {
        question: "¿Cómo funciona una agenda online para barberías?",
        answer: "Configuras servicios, duración, horarios y barberos. El cliente abre tu enlace, elige a quién quiere reservar y ve solo las horas disponibles. Al confirmar, la cita aparece en el panel del negocio.",
      },
      {
        question: "¿Cada barbero puede tener un horario diferente?",
        answer: "Sí. Cada barbero puede tener servicios, jornada, descansos, vacaciones y bloqueos propios. Administración mantiene una vista conjunta de la barbería.",
      },
      {
        question: "¿Se puede cobrar un abono antes de confirmar la reserva?",
        answer: "Sí. Puedes definir un abono por servicio. El cliente ve el precio total, el monto anticipado y el saldo pendiente antes de completar el pago.",
      },
      {
        question: "¿Necesito una página web o una app para usarla?",
        answer: "No. Puragenda entrega un enlace de reservas que puedes compartir directamente. Tus clientes reservan desde el navegador del celular sin instalar una aplicación.",
      },
      {
        question: "¿Cuánto cuesta Puragenda para una barbería?",
        answer: "El precio depende de si trabaja un profesional o un equipo. Los valores vigentes, profesionales incluidos y condiciones de la prueba gratuita están publicados en la página de planes.",
      },
    ],
    keywords: ["agenda online para barberías", "agenda barbería Chile", "software para barberías", "reservas online barbería", "agenda para barberos"],
    relatedSlugs: ["peluquerias", "tatuadores"],
  },
  {
    slug: "estetica",
    name: "Centros de Estética",
    singularName: "Centro de Estética",
    title: "Software de Gestión para Centros de Estética y Spa",
    description: "Gestiona cabinas, profesionales y tratamientos estéticos con un sistema de reservas que proyecta la misma elegancia que tu marca.",
    heroHeadline: "Gestión Premium para tu Centro de Estética",
    heroSubheadline: "Atrae, agenda y fideliza a tus pacientes con una experiencia de reserva fluida y profesional desde el primer click.",
    benefits: [
      {
        title: "Diseño elegante y personalizable",
        description: "Tu widget de reservas utiliza los colores de tu marca, manteniendo una experiencia estética impecable.",
      },
      {
        title: "Servicios complejos organizados",
        description: "Desde masajes de 30 minutos hasta tratamientos faciales de 2 horas, configura tu catálogo con precisión.",
      },
      {
        title: "Privacidad y seguridad",
        description: "La información y el historial de tus pacientes se mantiene confidencial, segura y respaldada en la nube.",
      },
    ],
    faq: [
      {
        question: "¿Puragenda es adecuado para Spas con varios boxes/cabinas?",
        answer: "Sí, puedes asignar a cada profesional a una cabina y asegurar que no haya solapamiento en los tratamientos.",
      },
      {
        question: "¿Qué pasa si un paciente cancela?",
        answer: "El bloque se libera automáticamente para que otro paciente pueda tomar esa hora en el momento.",
      },
      {
        question: "¿Puedo vender tratamientos de varias sesiones?",
        answer: "Puedes llevar el historial del cliente y organizar servicios recurrentes o planes de sesiones desde el panel.",
      },
      {
        question: "¿El widget puede usar los colores de mi centro?",
        answer: "Sí. Puedes personalizar colores, tipografía y logo para que el flujo de reserva se vea integrado con tu marca.",
      },
    ],
    keywords: ["software estética", "agenda centro estético", "reservas spa", "sistema gestión clínica estética"],
    relatedSlugs: ["peluquerias", "manicure"],
  },
  {
    slug: "clinicas",
    name: "Clínicas y Consultas",
    singularName: "clínica o consulta",
    title: "Software de Agendamiento Médico y Consultas",
    description: "Agenda electrónica para profesionales de la salud. Organiza pacientes, médicos y consultas con máxima confiabilidad y seguridad.",
    heroHeadline: "Agendamiento Médico Confiable e Inteligente",
    heroSubheadline: "Optimiza los tiempos de tu consulta clínica. Menos llamadas a recepción, más horas efectivas de atención médica.",
    benefits: [
      {
        title: "Filtro de profesionales",
        description: "Tus pacientes pueden seleccionar a su especialista de confianza y ver su disponibilidad real en segundos.",
      },
      {
        title: "Reducción de inasistencias",
        description: "Un porcentaje alto de inasistencias médicas es por olvido. Puragenda te ayuda a gestionar los pacientes que no asisten.",
      },
      {
        title: "Acceso móvil para doctores",
        description: "Los especialistas pueden ver su agenda del día directamente desde su celular sin depender de recepción.",
      },
    ],
    faq: [
      {
        question: "¿Es seguro para los datos de los pacientes?",
        answer: "El acceso al panel requiere autenticación y cada negocio administra sus propios usuarios. Si necesitas requisitos clínicos o regulatorios específicos, consúltanos antes de contratar.",
      },
      {
        question: "¿Funciona para psicólogos o terapeutas independientes?",
        answer: "Sí. El Plan Individual está pensado para un profesional e incluye 30 días de prueba sin tarjeta antes de activar la suscripción.",
      },
      {
        question: "¿Los pacientes pueden reprogramar sin llamar a recepción?",
        answer: "Sí. El flujo puede entregar enlaces de gestión para confirmar, cancelar o solicitar un cambio de la reserva.",
      },
      {
        question: "¿Puragenda reemplaza una ficha clínica electrónica?",
        answer: "No. Puragenda organiza reservas y clientes; no se presenta como una ficha clínica certificada ni reemplaza el software médico que tu consulta pueda requerir.",
      },
    ],
    keywords: ["software médico", "agenda clínica", "reservas médicos", "sistema gestión pacientes"],
    relatedSlugs: ["psicologos", "kinesiologos"],
  },
  {
    slug: "psicologos",
    name: "Psicólogos y Terapeutas",
    singularName: "consulta psicológica",
    title: "Agenda Online para Psicólogos y Terapeutas",
    description: "Sistema de reservas online para psicólogos en Chile. Organiza sesiones presenciales y remotas, solicita abonos y reduce la coordinación por WhatsApp.",
    heroHeadline: "Tu agenda de pacientes, clara y disponible 24/7",
    heroSubheadline: "Comparte un enlace para que cada paciente elija una hora disponible, reciba la información de su sesión y gestione su reserva sin intercambiar decenas de mensajes.",
    benefits: [
      { title: "Sesiones presenciales y online", description: "Configura servicios con distinta duración, precio y modalidad para que el paciente elija la atención correcta." },
      { title: "Abonos antes de confirmar", description: "Protege horas de alta demanda solicitando un abono visible durante el proceso de reserva." },
      { title: "Agenda privada por profesional", description: "Cada terapeuta revisa sus propias sesiones desde el celular y el equipo mantiene una vista coordinada." },
    ],
    faq: [
      { question: "¿Puragenda reemplaza una ficha clínica?", answer: "No. Puragenda gestiona reservas y datos de contacto; no reemplaza una ficha clínica electrónica ni el registro profesional que tu atención requiera." },
      { question: "¿Puedo ofrecer terapia online y presencial?", answer: "Sí. Puedes crear ambos servicios, asignarles duración y precio distintos e incluir instrucciones específicas para cada modalidad." },
      { question: "¿Un psicólogo independiente puede usarlo?", answer: "Sí. El plan Individual está pensado para un profesional y permite probar el flujo durante 30 días sin tarjeta." },
      { question: "¿Puedo solicitar un abono por la sesión?", answer: "Sí. Puedes definir el monto del abono por servicio para reducir reservas que luego no se concretan." },
    ],
    keywords: ["agenda para psicólogos", "software psicólogos Chile", "reservas psicólogo online", "agenda pacientes psicología"],
    relatedSlugs: ["clinicas", "kinesiologos"],
  },
  {
    slug: "kinesiologos",
    name: "Kinesiólogos",
    singularName: "consulta de kinesiología",
    title: "Agenda Online para Kinesiólogos en Chile",
    description: "Agenda digital para kinesiólogos y centros de rehabilitación. Coordina profesionales, tipos de sesión y reservas online desde un solo panel.",
    heroHeadline: "Más sesiones atendidas, menos tiempo coordinando",
    heroSubheadline: "Ordena evaluaciones, controles y sesiones de rehabilitación con disponibilidad real por profesional y un enlace de reserva fácil de compartir.",
    benefits: [
      { title: "Servicios con distinta duración", description: "Separa evaluaciones iniciales, controles y terapias con tiempos y valores definidos para cada atención." },
      { title: "Equipo sincronizado", description: "Asigna servicios y horarios a cada kinesiólogo para evitar cruces entre agendas." },
      { title: "Reservas desde Google o Instagram", description: "Comparte el enlace de la agenda donde tus pacientes ya buscan tu centro, sin exigirles instalar una aplicación." },
    ],
    faq: [
      { question: "¿Sirve para un centro con varios kinesiólogos?", answer: "Sí. El plan Equipo permite coordinar profesionales con sus horarios y servicios asignados desde un panel común." },
      { question: "¿Puedo diferenciar evaluación y tratamiento?", answer: "Sí. Cada tipo de sesión puede tener su propia duración, precio, descripción y profesionales disponibles." },
      { question: "¿El paciente necesita crear una cuenta?", answer: "No. Puede completar la reserva desde el enlace público con sus datos de contacto." },
      { question: "¿Es una ficha clínica electrónica?", answer: "No. Puragenda organiza la agenda y los clientes, pero no reemplaza una ficha clínica ni un software médico especializado." },
    ],
    keywords: ["agenda kinesiólogos", "software kinesiología Chile", "reservas centro kinesiológico", "agenda rehabilitación"],
    relatedSlugs: ["clinicas", "psicologos"],
  },
  {
    slug: "manicure",
    name: "Manicure y Nail Studios",
    singularName: "nail studio",
    title: "Agenda Online para Manicure y Nail Studios",
    description: "Sistema de reservas para manicuristas y nail studios. Publica servicios, coordina profesionales y solicita abonos para proteger tus horas.",
    heroHeadline: "Una agenda tan cuidada como cada diseño",
    heroSubheadline: "Convierte visitas desde Instagram en reservas confirmadas y organiza servicios de distinta duración sin responder disponibilidad manualmente.",
    benefits: [
      { title: "Catálogo claro de servicios", description: "Separa manicure, retiro, esmaltado y diseños con tiempos y precios para evitar errores al reservar." },
      { title: "Abonos configurables", description: "Solicita una seña para servicios largos o bloques de alta demanda antes de confirmar la hora." },
      { title: "Agenda para todo el estudio", description: "Cada profesional administra su disponibilidad y el negocio conserva una visión general de las reservas." },
    ],
    faq: [
      { question: "¿Puedo poner el enlace en Instagram?", answer: "Sí. El enlace funciona desde la biografía, historias, WhatsApp o tu perfil de Google, sin que la clienta instale una app." },
      { question: "¿Puedo pedir un abono para diseños complejos?", answer: "Sí. Puedes definir el abono de cada servicio antes de publicarlo en la agenda." },
      { question: "¿Cómo manejo servicios con distinta duración?", answer: "Cada servicio tiene su propio tiempo, evitando que una reserva corta ocupe lo mismo que un diseño detallado." },
      { question: "¿Funciona para una manicurista independiente?", answer: "Sí. Puedes comenzar con el plan Individual y probarlo 30 días sin tarjeta." },
    ],
    keywords: ["agenda para manicuristas", "software nail studio", "reservas manicure Chile", "agenda online uñas"],
    relatedSlugs: ["estetica", "peluquerias"],
  },
  {
    slug: "tatuadores",
    name: "Tatuadores y Estudios",
    singularName: "estudio de tatuajes",
    title: "Agenda Online para Tatuadores y Estudios",
    description: "Agenda para tatuadores y estudios en Chile. Recibe solicitudes con referencias, organiza sesiones y solicita abonos antes de reservar bloques largos.",
    heroHeadline: "Del primer contacto a una sesión bien coordinada",
    heroSubheadline: "Centraliza referencias, disponibilidad y abonos para que cada artista dedique menos tiempo a coordinar y más tiempo a crear.",
    benefits: [
      { title: "Referencias en la solicitud", description: "El cliente puede adjuntar archivos e información útil para evaluar el encargo antes de asignar capacidad." },
      { title: "Abonos para proteger bloques", description: "Solicita un pago inicial antes de confirmar sesiones que reservan varias horas de trabajo." },
      { title: "Capacidad por artista", description: "Organiza la disponibilidad de cada tatuador y evita comprometer más trabajos de los que el estudio puede atender." },
    ],
    faq: [
      { question: "¿El cliente puede adjuntar una imagen de referencia?", answer: "Sí. El flujo de encargos permite solicitar archivos y detalles antes de revisar el trabajo." },
      { question: "¿Puedo cobrar un abono antes de reservar?", answer: "Sí. Puedes definir un abono para proteger el bloque de trabajo y comunicarlo durante la solicitud." },
      { question: "¿Sirve para varios artistas?", answer: "Sí. Cada integrante puede tener servicios y disponibilidad propia dentro de la agenda del estudio." },
      { question: "¿Puedo revisar una solicitud antes de aceptarla?", answer: "Sí. El modo de encargos está pensado para evaluar requisitos, capacidad y fecha estimada antes de avanzar." },
    ],
    keywords: ["agenda tatuadores", "software estudio tatuajes", "reservas tatuajes Chile", "abonos tatuadores"],
    relatedSlugs: ["barberias", "estetica"],
  },
];

export function getRelatedIndustries(slug: string): IndustrySEOData[] {
  const current = industriesData.find((industry) => industry.slug === slug);
  if (!current) return [];

  return current.relatedSlugs
    .map((relatedSlug) => industriesData.find((industry) => industry.slug === relatedSlug))
    .filter((industry): industry is IndustrySEOData => Boolean(industry));
}
