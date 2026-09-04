export type IndustrySoftwareHub = {
  href: string;
  title: string;
  description: string;
  context: string;
};

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
  softwareHub?: IndustrySoftwareHub;
};

export const industriesData: IndustrySEOData[] = [
  {
    slug: "peluquerias",
    name: "Peluquerías",
    singularName: "Peluquería",
    title: "Puragenda para peluquerías",
    description: "Cómo encaja Puragenda en un salón: reservas desde el enlace, estilistas con jornada propia y un panel para el local. El software de agenda está en una landing aparte.",
    heroHeadline: "Puragenda para peluquerías",
    heroSubheadline: "Página del rubro: la clienta reserva desde tu enlace y cada estilista mantiene su jornada. Si evalúas un software de agenda para el salón, usa la landing comercial.",
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
        question: "¿Esta página es el software de agenda para peluquerías?",
        answer: "No. Esta es la ficha del rubro dentro de Soluciones. El software de agenda para peluquerías —duraciones, estilistas, opciones y reservas— está en su landing comercial.",
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
    keywords: ["Puragenda para peluquerías", "reservas para peluquerías", "salón con agenda digital"],
    relatedSlugs: ["barberias", "estetica", "manicure"],
    softwareHub: {
      href: "/software-agenda-peluquerias",
      title: "Software de agenda para peluquerías",
      description: "Landing comercial: cómo el salón organiza duraciones, estilistas y reservas.",
      context: "cómo el salón organiza color versus corte, estilistas y clientas recurrentes.",
    },
  },
  {
    slug: "barberias",
    name: "Barberías",
    singularName: "Barbería",
    title: "Puragenda para barberías",
    description: "Cómo encaja Puragenda en una barbería: reservas desde Instagram o WhatsApp, horario por barbero y un panel para el local. El software de agenda está en una landing aparte.",
    heroHeadline: "Puragenda para barberías",
    heroSubheadline: "Página del rubro: el cliente reserva desde tu enlace y cada barbero mantiene su jornada. Si estás evaluando un software de agenda para el local, usa la landing comercial.",
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
        question: "¿Esta página es el software de agenda para barberías?",
        answer: "No. Esta es la ficha del rubro dentro de Soluciones. El software de agenda para barberías —horarios por barbero, duraciones, abonos y flujo de reserva— está en su landing comercial.",
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
    keywords: ["Puragenda para barberías", "reservas para barberías", "barbería con agenda digital"],
    relatedSlugs: ["peluquerias", "tatuadores"],
    softwareHub: {
      href: "/software-agenda-barberias",
      title: "Software de agenda para barberías",
      description: "Landing comercial: cómo el local organiza barberos, servicios y reservas.",
      context: "cómo el local organiza horarios por barbero, duraciones y abonos.",
    },
  },
  {
    slug: "estetica",
    name: "Centros de Estética",
    singularName: "Centro de Estética",
    title: "Puragenda para centros de estética",
    description: "Cómo configurar Puragenda en un centro de estética no clínica: prepara el catálogo, asigna servicios a cada profesional y comparte las horas disponibles.",
    heroHeadline: "Cómo organizar las citas de tu centro con Puragenda",
    heroSubheadline: "Página práctica del rubro: carga tus servicios, relaciona cada uno con las profesionales que lo realizan y comparte la agenda con tus clientas.",
    benefits: [
      {
        title: "Prepara el catálogo",
        description: "Carga faciales, cejas, pestañas y otros servicios no clínicos con la duración, el precio y la descripción que define tu centro.",
      },
      {
        title: "Asigna a cada profesional",
        description: "Relaciona cada servicio con quienes lo realizan para que la clienta elija entre profesionales configuradas para esa atención.",
      },
      {
        title: "Organiza y comparte la jornada",
        description: "Define horarios y bloqueos, luego comparte el enlace de reservas o integra el widget en el sitio web del centro.",
      },
    ],
    faq: [
      {
        question: "¿Por dónde empiezo a configurar la agenda del centro?",
        answer: "Crea primero los servicios con su duración y precio. Después asigna las profesionales que los realizan, configura sus jornadas y revisa el flujo desde el enlace público.",
      },
      {
        question: "¿Cómo comparto las horas disponibles con mis clientas?",
        answer: "Puedes compartir el enlace de reservas desde Instagram o cualquier canal del centro. Si tienes un sitio web, también puedes insertar el widget mediante iframe.",
      },
      {
        question: "¿Qué hago cuando una profesional no estará disponible?",
        answer: "Añade un bloqueo a su agenda para vacaciones, trámites, descansos u otros períodos sin atención. El resto del equipo conserva sus propios horarios.",
      },
      {
        question: "¿Dónde reviso el funcionamiento comercial completo?",
        answer: "La landing de agenda para centros de estética explica duraciones, profesionales, abonos, recordatorios, alcance y planes. Esta página se concentra en la configuración dentro del rubro.",
      },
    ],
    keywords: ["Puragenda para centros de estética", "configurar agenda de centro estético", "reservas para servicios estéticos"],
    relatedSlugs: ["peluquerias", "manicure"],
    softwareHub: {
      href: "/software-agenda-estetica",
      title: "Software de agenda para centros de estética",
      description: "Landing comercial: servicios de distinta duración, profesionales, horarios y reservas.",
      context: "cómo coordinar un catálogo variado con profesionales que realizan servicios diferentes.",
    },
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
    title: "Puragenda para manicuristas y nail studios",
    description: "Cómo aplicar Puragenda al trabajo del estudio: aclarar qué incluye el esmaltado, separar el retiro y preparar la jornada de cada manicurista.",
    heroHeadline: "Así organiza sus citas un nail studio con Puragenda",
    heroSubheadline: "Empieza por los servicios que ofreces: qué incluye el esmaltado, cuándo se necesita retiro y quién realiza cada técnica. Esas decisiones dan forma a tu agenda diaria.",
    benefits: [
      { title: "Nombra lo que está incluido", description: "Distingue un esmaltado de un esmaltado con retiro. Si dedicas más tiempo a un diseño, crea su servicio con la duración completa y explica cuándo elegirlo." },
      { title: "Prepara la jornada", description: "Revisa qué servicios realiza cada integrante y configura los períodos sin atención. En Equipo se usan horarios por profesional; en Individual, el horario del negocio." },
      { title: "Revisa la visita anterior", description: "Antes de coordinar un mantenimiento, consulta el historial de citas y conversa con la clienta sobre el servicio que necesita esta vez." },
    ],
    faq: [
      { question: "¿Qué conviene escribir en la descripción de un esmaltado?", answer: "Aclara si incluye retiro, qué trabajo comprende y cuándo la clienta debe consultarte antes de elegirlo. El estudio define esas condiciones." },
      { question: "¿Cómo preparo la agenda cuando una manicurista no atenderá?", answer: "Configura un bloqueo para el período que no estará disponible y revisa su jornada. No hace falta cambiar las descripciones de los servicios para reflejar esa ausencia." },
      { question: "¿El historial decide qué mantenimiento necesita una clienta?", answer: "No. El historial muestra citas y servicios anteriores. Confirma con la clienta el trabajo actual antes de acordar su próxima reserva." },
    ],
    keywords: ["Puragenda para manicuristas", "configurar catálogo de manicure", "organizar citas nail studio"],
    relatedSlugs: ["estetica", "peluquerias"],
    softwareHub: {
      href: "/software-agenda-manicure",
      title: "Software de agenda para manicure y uñas",
      description: "Evalúa las reservas para tu estudio con un ejemplo de catálogo, funciones y planes.",
      context: "consulta cómo se reservan esmaltado y retiro, qué funciones incluye y cuáles son los planes.",
    },
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
