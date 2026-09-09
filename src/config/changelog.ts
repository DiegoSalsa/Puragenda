export interface ChangelogSpotlight {
  id: "gift_cards" | "loyalty" | string;
  preview: "gift_card" | "loyalty_card";
  title: string;
  description: string;
  bullets: string[];
  href: string;
  cta: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  features: string[];
  fixes?: string[];
  notice?: string;
  popupVariant?: "standard" | "launch";
  popupEyebrow?: string;
  popupTitle?: string;
  popupDescription?: string;
  spotlights?: ChangelogSpotlight[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "v2.0.0",
    date: "2026-09-09",
    title: "Gift Cards y una nueva forma de fidelizar",
    description:
      "Puragenda incorpora dos nuevas herramientas para generar nuevas ventas y hacer que tus clientes vuelvan: Gift Cards vendibles desde tu widget y un sistema de fidelización completamente renovado.",
    popupVariant: "launch",
    popupEyebrow: "Nuevo · Puragenda 2.0",
    popupTitle: "Dos nuevas formas de hacer crecer tu negocio",
    popupDescription: "Vende Gift Cards desde tu widget y convierte cada visita en una razón para volver.",
    spotlights: [
      {
        id: "gift_cards",
        preview: "gift_card",
        title: "Gift Cards",
        description: "Vende regalos directamente desde tu widget.",
        bullets: [
          "Por monto o servicios",
          "Para regalar con mensaje personalizado",
          "Cobro automático con Mercado Pago",
        ],
        href: "/dashboard/gift-cards",
        cta: "Crear mi primera Gift Card",
      },
      {
        id: "loyalty",
        preview: "loyalty_card",
        title: "Fidelización V2",
        description: "Convierte cada visita completada en una razón para volver.",
        bullets: [
          "Timbres automáticos",
          "Descuentos, servicios gratis y premios",
          "Tarjeta e historial para cada cliente",
        ],
        href: "/dashboard/loyalty",
        cta: "Configurar fidelización",
      },
    ],
    features: [
      "Crea Gift Cards por monto o por servicios y personaliza su diseño con la identidad de tu negocio.",
      "Puedes vender una Gift Card por un precio diferente a su valor, ideal para campañas como “paga $45.000 y recibe $50.000”.",
      "Tus clientes pueden comprar Gift Cards directamente desde el widget de reservas y pagar con Mercado Pago conectado al negocio.",
      "El comprador puede elegir si la Gift Card es para él o enviarla como regalo con destinatario, mensaje personalizado y un correo preparado especialmente para la ocasión.",
      "Los negocios sin Mercado Pago también pueden emitir Gift Cards manualmente desde el panel para ventas por transferencia, efectivo u otros medios.",
      "Cada Gift Card puede agregarse a una cuenta cliente de Puragenda para consultar su saldo, servicios disponibles e historial.",
      "Las Gift Cards de monto pueden utilizarse parcialmente en distintas reservas hasta consumir todo su saldo.",
      "Las Gift Cards de servicios mantienen las sesiones o beneficios pendientes hasta que sean utilizados.",
      "Al reservar con sesión iniciada, Puragenda detecta automáticamente las Gift Cards disponibles para ese negocio y permite utilizarlas como medio de pago.",
      "Si la Gift Card cubre toda la reserva, la cita se confirma sin solicitar un nuevo pago. Si queda un monto pendiente, continúa el flujo normal del negocio.",
      "Fidelización estrena una nueva tarjeta visual de timbres que los clientes pueden consultar desde Mi Agenda.",
      "Cada cita completada entrega automáticamente un timbre.",
      "Los negocios pueden definir cuántas visitas necesita el cliente para obtener un premio.",
      "Los premios pueden ser descuentos porcentuales, descuentos por monto, servicios gratis o beneficios personalizados.",
      "Los premios pueden configurarse con vigencia y se almacenan directamente en la cuenta del cliente.",
      "El nuevo constructor muestra en tiempo real cómo verá el cliente su tarjeta de fidelización.",
      "El negocio puede consultar clientes participantes, timbres entregados, premios generados y tasa de canje.",
      "Los timbres pueden ajustarse manualmente cuando sea necesario, siempre registrando el motivo del cambio.",
      "Mi Agenda ahora presenta el progreso de fidelización de forma visual, con los timbres obtenidos, la meta y los premios disponibles.",
      "Reservas y Gift Cards ahora comparten una misma experiencia dentro del widget, permitiendo cambiar entre agendar y comprar un regalo sin salir de la página del negocio.",
    ],
    fixes: [
      "Los premios de fidelización ahora se calculan y validan nuevamente en servidor antes de confirmar una reserva.",
      "Los timbres se entregan únicamente al completar una atención y están protegidos contra duplicados.",
      "Los saldos y beneficios de Gift Cards se actualizan de forma segura incluso ante reservas o pagos simultáneos.",
      "Los pagos, descuentos, premios y Gift Cards mantienen registros separados para que los importes de las reservas sean consistentes.",
    ],
    notice: "Gift Cards ya está disponible en tu panel. Para venderlas automáticamente desde el widget solo necesitas tener Mercado Pago conectado; también puedes emitirlas manualmente.",
  },
  {
    version: "v1.9.0",
    date: "2026-08-20",
    title: "Reservas más Rápidas y Servicios Especiales",
    description:
      "Los clientes ahora pueden conservar sus datos para reservar en cualquier negocio de Puragenda, mientras cada negocio obtiene más control sobre promociones, servicios especiales y el cierre real de sus sesiones.",
    features: [
      "Nueva cuenta de cliente con confirmación inicial por correo, contraseña segura y sesiones persistentes para evitar iniciar sesión en cada reserva.",
      "El perfil de Mi Agenda permite editar nombre, teléfono, RUT, dirección y contraseña; el teléfono es obligatorio al crear la cuenta.",
      "Los widgets completan automáticamente los datos del cliente autenticado, incluso al reservar en distintos negocios de Puragenda.",
      "Los widgets embebidos continúan la autenticación en una pestaña segura y regresan conservando sucursal, servicio, profesional y fecha.",
      "Nueva categoría de servicios especiales para limitar promociones u otras prestaciones a días específicos sin complicar los servicios normales.",
      "La agenda permite cerrar una sesión registrando propinas y servicios extra para reflejar con mayor precisión los ingresos reales.",
      "Google Calendar ya está disponible para todos los usuarios autorizados después de completar la verificación oficial de la aplicación.",
    ],
    fixes: [
      "Los accesos antiguos a Mi Agenda ahora ofrecen activar una cuenta completa sin perder el historial existente.",
      "Las sesiones de cliente usan tokens opacos almacenados de forma segura, se renuevan al usarse y se invalidan al cambiar la contraseña.",
      "El retorno desde Mi Agenda acepta únicamente widgets internos de Puragenda para impedir redirecciones externas.",
    ],
  },
  {
    version: "v1.8.0",
    date: "2026-08-08",
    title: "Historias que Convierten y un Panel más Ordenado",
    description:
      "Puragenda transforma la disponibilidad real del negocio en historias listas para Instagram y reorganiza el panel para que cada herramienta sea más fácil de encontrar y aprender.",
    features: [
      "Nuevo estudio de Historias con modos rápido y avanzado, plantillas visuales, zonas seguras de Instagram y descarga directa en PNG.",
      "Las historias pueden mostrar cupos reales, fechas elegidas manualmente o contenido sin horario, según lo que cada negocio quiera promocionar.",
      "Enlaces reservables para el sticker de Instagram, con servicio, profesional, sucursal y fecha preseleccionados cuando corresponde.",
      "Métricas de visitas, reservas e ingresos atribuidos para medir qué historias generan resultados reales.",
      "Presets reutilizables, historial de campañas y recomendaciones automáticas basadas en horas disponibles o cancelaciones.",
      "Diseños adaptados al plan Individual: se ocultan profesional y sucursal cuando no aportan valor, y cada negocio decide si muestra la dirección.",
      "El menú del panel ahora agrupa Agenda, Gestión, Crecimiento y Configuración en secciones desplegables más claras.",
      "Google Calendar, Encargos e Historias incorporan tutoriales completos; todas las secciones principales mantienen ayuda contextual.",
    ],
    fixes: [
      "Los horarios abiertos manualmente por fecha ahora se respetan tanto en el widget como en las historias, incluso cuando reemplazan el horario semanal habitual.",
      "Los bloqueos asociados a una sucursal ya no cierran por error la agenda del profesional en otros locales.",
      "La generación del PNG ocurre en el navegador y no almacena copias innecesarias de las historias en el servidor.",
      "Se reforzaron la validación, los permisos, la protección de presets y la atribución segura de reservas a cada campaña.",
    ],
  },
  {
    version: "v1.7.0",
    date: "2026-08-05",
    title: "Sucursales, Horarios por Local y Operación Internacional",
    description:
      "Puragenda ahora permite operar varias sucursales bajo una misma cuenta, con disponibilidad, horarios y reservas organizadas por local sin cambiar de plan.",
    features: [
      "Todas las cuentas pueden crear y administrar varias sucursales, cada una con dirección, enlace de mapas, zona horaria y servicios disponibles propios.",
      "El widget pide primero la sucursal cuando hay más de una y muestra únicamente los servicios, profesionales y horarios de ese local.",
      "Cada profesional se asigna explícitamente a las sucursales donde atiende y su horario semanal se configura por local; una sucursal no marcada no ofrecerá reservas para esa persona.",
      "Las excepciones de horario por fecha ahora incluyen selector de sucursal, para cerrar o abrir un local sin afectar a los demás.",
      "Las reservas guardan la sucursal elegida y la validación de choques del profesional se mantiene entre todos sus locales.",
      "Nuevos selectores de zona horaria con alternativas por país, incluyendo Chile continental, Magallanes e Isla de Pascua, además de las zonas de México.",
      "La moneda de las reservas se elige desde un selector ISO internacional y se muestra con su código correspondiente.",
      "Las sucursales se pueden editar, archivar o eliminar con confirmación; el sistema protege el historial de reservas antes de permitir un borrado.",
      "El panel de administración muestra directamente el enlace público del widget de cada negocio.",
    ],
    fixes: [
      "Se evita que un profesional aparezca automáticamente disponible en todas las sucursales cuando su asignación no está configurada.",
      "Los horarios y las excepciones de una sucursal ya no modifican la agenda de las demás.",
    ],
  },
  {
    version: "v1.6.0",
    date: "2026-08-01",
    title: "Google Calendar y Operación más Clara",
    description:
      "Esta actualización conecta la agenda de Puragenda con Google Calendar y reúne mejoras solicitadas por negocios para atender, ordenar y fidelizar clientes con menos trabajo manual.",
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
