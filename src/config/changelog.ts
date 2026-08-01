export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  features: string[];
  fixes?: string[];
  notice?: string;
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "v1.6.0",
    date: "2026-08-01",
    title: "Google Calendar y Operación más Clara",
    description:
      "Esta actualización conecta la agenda de Puragenda con Google Calendar y reúne mejoras solicitadas por negocios para atender, ordenar y fidelizar clientes con menos trabajo manual.",
    notice:
      "Aviso temporal de Google: mientras finaliza la verificación oficial puede aparecer el mensaje \"Google no verificó esta app\". Es esperado y la conexión de Puragenda es segura: solo solicita los permisos necesarios para sincronizar calendarios y protege las credenciales de acceso. Puedes continuar desde Opciones avanzadas. El aviso desaparecerá cuando Google apruebe la revisión.",
    features: [
      "Integración con Google Calendar para el calendario principal del negocio y para la agenda individual de cada trabajador.",
      "Las citas se crean, actualizan y cancelan automáticamente en Google; los compromisos externos del profesional bloquean esas horas en el widget público.",
      "El teléfono del cliente ahora aparece directamente en el calendario, en el detalle de la cita, en los correos y en los eventos sincronizados.",
      "Los correos de reserva incluyen un botón para agregar la cita a Google Calendar.",
      "Servicios y categorías se pueden ordenar manualmente, y el widget respeta el orden definido por el negocio.",
      "Fidelización permite personalizar el prefijo de los códigos de descuento únicos para cada cliente.",
      "Cuando una fecha no tiene cupos, el widget muestra un mensaje claro para elegir otro día.",
      "La integración funciona tanto para dueños como para trabajadores con acceso, respetando sus permisos y calendarios seleccionados.",
    ],
    fixes: [
      "Después de autorizar Google Calendar, producción siempre regresa a www.puragenda.cl y nunca al dominio técnico de Vercel.",
      "La portada, la integración y la política de privacidad explican de forma transparente cómo se usan, protegen y eliminan los datos de Google.",
      "Un pago atrasado aprobado vuelve a activar automáticamente la cuenta y los avisos antiguos de rechazo ya no pueden bloquearla otra vez.",
      "La conciliación de pagos ahora recupera notificaciones perdidas y registra con mayor claridad los fallos que requieren revisión.",
    ],
  },
  {
    version: "v1.5.0",
    date: "2026-07-30",
    title: "Recuperación de Pagos y Periodo de Gracia",
    description:
      "Esta actualización mejora la cobranza de suscripciones rechazadas sin cortar el acceso de inmediato ni crear contratos duplicados.",
    features: [
      "Nuevo periodo de gracia móvil de 48 horas después de cada intento de cobro rechazado.",
      "Banner de pago pendiente sobre el calendario con plazo, próximo intento y estado de la cobranza.",
      "Reautorización segura de la tarjeta guardada sobre la misma suscripción de Mercado Pago.",
      "Reconciliación automática de respaldo para recuperar notificaciones perdidas y normalizar pagos.",
      "Correos al detectar un rechazo, antes de terminar la gracia y al confirmar la recuperación.",
      "Nuevo estado de pago pendiente visible también desde la administración de Puragenda.",
    ],
    fixes: [
      "Los rechazos de cobros recurrentes ahora procesan la notificación subscription_authorized_payment.",
      "Una suscripción autorizada ya no se confunde con una cuota efectivamente pagada.",
      "Se impide crear una segunda suscripción cuando existe una cuota atrasada en la actual.",
      "El acceso se bloquea solamente después de agotar la gracia correspondiente al último intento informado.",
    ],
  },
  {
    version: "v1.4.0",
    date: "2026-07-30",
    title: "Control de Agenda y Widget Studio",
    description:
      "Esta actualizacion amplia el control diario de la agenda, permite personalizar y promocionar el widget, y entrega permisos mas precisos para cada integrante del equipo.",
    features: [
      "Nuevo Widget Studio con temas guardados, colores, tipografia, bordes, sombras y alineacion personalizables.",
      "Bloques promocionales con imagen, ubicacion configurable y descuentos reales aplicados al total de la reserva.",
      "Perfiles de acceso reutilizables para decidir que puede ver o administrar cada integrante del equipo.",
      "Creacion y edicion de citas directamente desde el calendario del dashboard, incluyendo notas internas.",
      "Enlaces seguros en los correos para cancelar o reagendar citas cuando el negocio habilita esta opcion.",
      "Pausas configurables en los horarios del negocio y de cada profesional.",
      "Intervalos de agenda con precision de cinco minutos para adaptar los horarios a cada operacion.",
      "Cupos prioritarios que el equipo puede ocupar antes de liberarlos automaticamente al widget publico.",
      "Nueva ayuda contextual accesible desde cada seccion del dashboard.",
      "Mejoras de navegacion, carga y adaptacion responsive en las principales pantallas del panel.",
    ],
    fixes: [
      "Se reforzaron los permisos para impedir que perfiles de solo lectura modifiquen citas o configuraciones.",
      "El reagendamiento ahora respeta dias bloqueados, horarios, pausas y la zona horaria del negocio.",
      "Se corrigio la superposicion del panel de profesionales sobre las tarjetas.",
      "Se mejoro el manejo de errores de Mercado Pago y la compatibilidad de sus dependencias.",
    ],
  },
  {
    version: "v1.3.0",
    date: "2026-07-16",
    title: "Servicios, Imagenes y Analitica",
    description:
      "Esta actualizacion permite vender servicios con opciones variables, mostrar fotos en servicios y profesionales, y entender mejor el rendimiento semanal o mensual del negocio.",
    features: [
      "Nueva pagina de Analitica con resumen semanal o mensual, ingresos estimados, citas, ticket promedio y horas reservadas.",
      "Los servicios ahora pueden tener categorias de opciones, como tamano de mascota, tipo de atencion o extras del servicio.",
      "Cada alternativa puede sumar precio y minutos a la reserva, manteniendo visible el total antes de elegir horario.",
      "El dashboard permite subir fotos optimizadas para servicios y profesionales.",
      "El widget publico muestra un paso de opciones antes del calendario cuando el servicio lo necesita.",
      "La disponibilidad usa la duracion total del servicio, incluyendo extras, para evitar choques de horario.",
      "Las reservas guardan el historial de opciones elegidas por el cliente.",
      "El widget muestra imagenes de servicios y profesionales para que la experiencia de reserva sea mas clara.",
    ],
    fixes: [
      "Se corrigio el guardado de imagenes para que al presionar Guardar cambios no se borren accidentalmente.",
      "Se corrigio la carga de fotos de profesionales cuando el input se limpiaba despues de subir la imagen.",
      "Se reforzo la compatibilidad de base de datos para cuentas que aun no tenian las nuevas columnas aplicadas.",
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-07-01",
    title: "Agenda de Equipo y Roles",
    description:
      "Esta actualizacion mejora la operacion de equipos: cada trabajador ve solo su agenda, los administradores pueden ver todo el negocio y el owner controla quien tiene cada nivel de acceso.",
    features: [
      "Los trabajadores ven unicamente las citas asignadas a su propia agenda.",
      "Admin y recepcionista pueden ver la agenda completa del negocio.",
      "El owner que tambien atiende puede alternar entre Mi agenda y Todo el negocio.",
      "El owner puede cambiar el rol de cada cuenta vinculada: admin, recepcionista o trabajador.",
      "Dos o mas profesionales pueden tener reservas a la misma hora sin bloquearse entre ellos.",
      "La seccion de Configuracion muestra la version actual de Puragenda y enlaza al historial de cambios.",
    ],
    fixes: [
      "Se reforzaron los permisos de acciones de citas y suscripciones recurrentes para respetar la agenda de cada profesional.",
      "Se verifico que los correos de reserva se envien al profesional asignado, no a todo el equipo.",
    ],
  },
  {
    version: "v1.1.1",
    date: "2026-07-01",
    title: "Agendas por Profesional",
    description:
      "Primer ajuste de visibilidad por profesional para equipos con multiples agendas.",
    features: [
      "Los profesionales ven solamente sus propias reservas.",
      "Validacion de reservas simultaneas para distintos profesionales.",
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-06-30",
    title: "Politicas de Agenda",
    description:
      "Mejoras para controlar como se generan los horarios disponibles y las reglas de reserva del negocio.",
    features: [
      "Nueva opcion para permitir o bloquear reservas para el mismo dia.",
      "Control de anticipacion minima obligatoria para reservas del mismo dia.",
      "Configuracion dinamica del intervalo de horarios disponibles.",
    ],
    fixes: [
      "Ajustes de estabilidad en la carga del panel de administracion.",
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-05-15",
    title: "Lanzamiento Oficial",
    description: "La primera version estable de la plataforma, lista para escalar negocios.",
    features: [
      "Gestion de citas y reservas online.",
      "Panel de administracion unificado.",
      "Integracion de pagos mediante MercadoPago.",
      "Creacion dinamica de servicios y gestion de staff.",
    ],
  },
];

export const LATEST_CHANGELOG_VERSION = CHANGELOG_DATA[0].version;
