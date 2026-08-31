export type FeatureSolution = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  directAnswer: string;
  keywords: string[];
  benefits: Array<{ title: string; description: string }>;
  steps: Array<{ title: string; description: string }>;
  faq: Array<{ question: string; answer: string }>;
};

export const featureSolutions: FeatureSolution[] = [
  {
    slug: "reservas-online-con-abono",
    title: "Reservas online con abono en Chile",
    description: "Recibe reservas con abono, informa el saldo pendiente y confirma el cupo cuando el pago queda aprobado. Configuración por servicio y sin comisión de Puragenda.",
    eyebrow: "Reservas con pago",
    headline: "Protege tus horas con reservas online y abono",
    directAnswer: "Puragenda permite definir un abono por servicio, mostrarlo antes del pago y asociar la confirmación a la reserva. El negocio conserva el control del precio total, el monto anticipado y el saldo pendiente.",
    keywords: ["reservas online con abono", "agenda con pago online", "cobrar seña reserva", "sistema reservas Mercado Pago Chile"],
    benefits: [
      { title: "Regla por servicio", description: "Decide qué servicios requieren abono y protege únicamente los horarios o trabajos que realmente lo necesitan." },
      { title: "Información transparente", description: "El cliente ve precio, abono y saldo antes de pagar, reduciendo dudas y conversaciones posteriores." },
      { title: "Confirmación verificable", description: "La plataforma procesa el estado informado por el proveedor de pago antes de considerar confirmado el cupo." },
    ],
    steps: [
      { title: "Configura", description: "Asigna el monto de abono a cada servicio desde el panel." },
      { title: "El cliente reserva", description: "Selecciona servicio, profesional y horario desde tu enlace o sitio web." },
      { title: "Paga y confirma", description: "Completa el pago y recibe la confirmación con el resumen de la reserva." },
    ],
    faq: [
      { question: "¿Puragenda cobra comisión por cada abono?", answer: "Puragenda no agrega una comisión por reserva. El proveedor de pago puede aplicar sus tarifas de procesamiento vigentes." },
      { question: "¿Puedo cobrar abonos distintos según el servicio?", answer: "Sí. El monto se configura por servicio, de modo que una cita breve puede no requerirlo y un tratamiento largo sí." },
      { question: "¿El cliente sabe cuánto queda pendiente?", answer: "Sí. El flujo puede mostrar precio total, abono pagado y saldo pendiente para evitar que el anticipo se confunda con el pago completo." },
      { question: "¿Funciona para encargos con entrega futura?", answer: "Sí. El modo Encargos combina cupos por período, archivos de referencia, fecha estimada y abono." },
    ],
  },
  {
    slug: "agenda-multiples-profesionales",
    title: "Agenda online para múltiples profesionales",
    description: "Organiza horarios, servicios y reservas de cada integrante del equipo sin cruces. Ideal para peluquerías, barberías, estética y consultas en Chile.",
    eyebrow: "Agenda de equipos",
    headline: "Una agenda para todo tu equipo, sin dobles reservas",
    directAnswer: "Puragenda centraliza la disponibilidad de varios profesionales y permite que cada uno tenga horarios, servicios y acceso propios. El cliente elige profesional o ve la disponibilidad compatible con el servicio.",
    keywords: ["agenda múltiples profesionales", "software agenda equipo", "agenda online peluquería", "sistema reservas profesionales"],
    benefits: [
      { title: "Disponibilidad individual", description: "Configura jornada, descansos, vacaciones y excepciones para cada integrante sin cerrar la agenda completa." },
      { title: "Servicios asignados", description: "Muestra solo los profesionales que realizan el servicio elegido y evita combinaciones imposibles." },
      { title: "Roles de acceso", description: "Dueño, recepción y profesionales pueden trabajar con el nivel de visibilidad que corresponde a su función." },
    ],
    steps: [
      { title: "Invita al equipo", description: "Crea cada profesional y define su acceso al panel." },
      { title: "Asigna horarios y servicios", description: "Relaciona disponibilidad, ubicación y catálogo con cada persona." },
      { title: "Comparte una sola agenda", description: "Tus clientes reservan desde un único enlace que coordina a todo el equipo." },
    ],
    faq: [
      { question: "¿Cada profesional puede tener un horario diferente?", answer: "Sí. Cada integrante configura sus días, tramos, descansos, bloqueos y servicios disponibles." },
      { question: "¿Cómo evita Puragenda las reservas duplicadas?", answer: "La disponibilidad se valida antes de confirmar y los horarios ocupados dejan de ofrecerse para ese profesional." },
      { question: "¿Los trabajadores ven toda la agenda?", answer: "Los permisos permiten limitar a un profesional a sus propias reservas, mientras administración y recepción gestionan el conjunto." },
      { question: "¿Cuántos profesionales incluye el Plan Equipo?", answer: "El Plan Equipo incluye cinco profesionales. Se pueden añadir profesionales adicionales según el precio vigente publicado en la página de planes." },
    ],
  },
  {
    slug: "agenda-google-calendar",
    title: "Agenda de reservas integrada con Google Calendar",
    description: "Sincroniza tus citas de Puragenda y bloquea horarios ocupados en Google Calendar para reducir cruces y administrar tu día desde una sola vista.",
    eyebrow: "Integración de calendario",
    headline: "Conecta tus reservas con Google Calendar",
    directAnswer: "La integración crea y actualiza en el calendario conectado las citas administradas por Puragenda, y consulta intervalos ocupados para impedir que un cliente reserve sobre un compromiso existente.",
    keywords: ["agenda reservas Google Calendar", "sincronizar citas Google Calendar", "software reservas calendario", "agenda online Chile"],
    benefits: [
      { title: "Menos cruces", description: "Los intervalos ocupados del calendario conectado se consideran al calcular la disponibilidad pública." },
      { title: "Cambios sincronizados", description: "Las citas creadas por Puragenda se actualizan o retiran cuando una reserva cambia o se cancela." },
      { title: "Control de privacidad", description: "La integración utiliza los permisos para sincronizar citas y consultar disponibilidad, no para publicidad ni perfiles." },
    ],
    steps: [
      { title: "Conecta tu cuenta", description: "Autoriza Google Calendar desde la configuración del negocio." },
      { title: "Elige el calendario", description: "Selecciona dónde se crearán las citas y qué disponibilidad debe respetarse." },
      { title: "Trabaja normalmente", description: "Puragenda mantiene el calendario alineado cuando las reservas cambian." },
    ],
    faq: [
      { question: "¿Puragenda lee el contenido de mis eventos personales?", answer: "Para bloquear horarios se consultan intervalos libre/ocupado. Puragenda no necesita mostrar el título ni la descripción de tus eventos externos." },
      { question: "¿Qué pasa cuando un cliente cancela?", answer: "El evento de la cita administrada por Puragenda se retira y la disponibilidad se recalcula." },
      { question: "¿Puedo desconectar Google Calendar?", answer: "Sí. Puedes revocar la conexión desde el panel y también desde la configuración de tu cuenta de Google." },
      { question: "¿La integración sirve para varios profesionales?", answer: "Sí. Cada conexión se asocia con el profesional correspondiente para respetar su agenda y sus horarios ocupados." },
    ],
  },
];

export function getFeatureSolution(slug: string) {
  return featureSolutions.find((solution) => solution.slug === slug);
}
