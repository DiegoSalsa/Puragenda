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
  },
  {
    slug: "barberias",
    name: "Barberías",
    singularName: "Barbería",
    title: "Software y Agenda Online para Barberías",
    description: "Moderniza tu barbería con una agenda digital profesional. Organiza a tus barberos y permite reservas automáticas desde Instagram.",
    heroHeadline: "Lleva tu Barbería al siguiente nivel",
    heroSubheadline: "Deja el cuaderno de papel. Usa una agenda digital que tus clientes aman y que elimina los choques de horario entre barberos.",
    benefits: [
      {
        title: "Enlace en tu biografía de Instagram",
        description: "Tus clientes ven un corte que les gusta en tu perfil y agendan en un click directamente al barbero que elijan.",
      },
      {
        title: "Control total de turnos",
        description: "Sistema a prueba de errores. Nunca se asignarán dos clientes al mismo barbero a la misma hora.",
      },
      {
        title: "Historial de clientes",
        description: "Conoce cuántas veces ha venido un cliente y qué corte se hizo la última vez para un servicio premium.",
      },
    ],
    faq: [
      {
        question: "¿Puedo bloquear horas para mi colación?",
        answer: "Absolutamente, cada barbero puede bloquear tiempos de descanso o salidas médicas desde su celular.",
      },
      {
        question: "¿Cómo ven su agenda mis barberos?",
        answer: "Cada barbero ingresa con su propio correo y solo ve y gestiona su propia lista de clientes del día.",
      },
      {
        question: "¿Se puede cobrar una seña para los horarios más demandados?",
        answer: "Sí. La regla de abono se puede aplicar a los servicios que quieras proteger antes de confirmar la reserva.",
      },
      {
        question: "¿Puedo compartir un enlace sin tener una página web?",
        answer: "Sí. El widget tiene un enlace propio que puedes poner en Instagram, WhatsApp o Google Business Profile.",
      },
    ],
    keywords: ["software barbería", "agenda online barberos", "app para barberías", "reservas barbería"],
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
  },
];
