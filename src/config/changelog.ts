export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  features: string[];
  fixes?: string[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
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
