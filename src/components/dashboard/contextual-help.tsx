"use client";

import { CircleHelp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

type TourStepSpec = {
  selectors: string[];
  popover: NonNullable<DriveStep["popover"]>;
};

type TourDefinition = {
  title: string;
  steps: TourStepSpec[];
};

const pageHeading = (title: string, description: string): TourStepSpec => ({
  selectors: ["[data-tour='page-header']", "#tutorial-main h1", "#tutorial-main"],
  popover: { title, description, side: "bottom", align: "start" },
});

const TOURS: Record<string, TourDefinition> = {
  "/dashboard": {
    title: "Ayuda de Citas",
    steps: [
      pageHeading(
        "Agenda de citas",
        "Aquí administras las reservas del negocio. Puedes cambiar de fecha, revisar el estado de cada cita y abrir su detalle."
      ),
      {
        selectors: [
          "[data-tour='appointments-calendar']",
          "#tutorial-main [role='tablist']",
          "#tutorial-main main",
          "#tutorial-main",
        ],
        popover: {
          title: "Calendario y vistas",
          description:
            "Usa las vistas disponibles para organizar el día o la semana. Los profesionales con acceso limitado solo ven su propia agenda.",
          side: "top",
          align: "start",
        },
      },
      {
        selectors: ["#tutorial-nav"],
        popover: {
          title: "Secciones del negocio",
          description:
            "Desde este menú accedes a profesionales, servicios, clientes, marketing, apariencia y configuración según tus permisos.",
          side: "right",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/analytics": {
    title: "Ayuda de Analítica",
    steps: [
      pageHeading(
        "Rendimiento del negocio",
        "Esta pantalla resume reservas, asistencia, ingresos y rendimiento para que puedas detectar tendencias."
      ),
      {
        selectors: [
          "[data-tour='analytics-filters']",
          "#tutorial-main select",
          "#tutorial-main form",
          "#tutorial-main",
        ],
        popover: {
          title: "Periodo y filtros",
          description:
            "Ajusta el periodo para comparar semanas o meses. Si eres profesional, las métricas pueden limitarse únicamente a tu actividad.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selectors: [
          "[data-tour='analytics-charts']",
          "#tutorial-main canvas",
          "#tutorial-main .grid",
          "#tutorial-main",
        ],
        popover: {
          title: "Indicadores y gráficos",
          description:
            "Revisa la evolución de citas e ingresos, identifica horarios fuertes y observa cancelaciones o inasistencias.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/staff/roles": {
    title: "Ayuda de Roles y funcionalidades",
    steps: [
      pageHeading(
        "Perfiles de acceso",
        "Crea tipos de usuario reutilizables y decide exactamente qué puede ver o administrar cada persona."
      ),
      {
        selectors: ["[data-tour='profiles-grid']", "#tutorial-main section", "#tutorial-main"],
        popover: {
          title: "Roles guardados",
          description:
            "Cada tarjeta muestra un perfil, sus permisos y cuántas personas lo utilizan. Puedes editarlo, duplicarlo o eliminarlo si no está asignado.",
          side: "top",
          align: "start",
        },
      },
      {
        selectors: ["#tutorial-main button", "#tutorial-main"],
        popover: {
          title: "Crear un perfil",
          description:
            "Parte desde una recomendación o crea un rol propio, por ejemplo encargado de agenda, profesional o responsable del widget.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/staff": {
    title: "Ayuda de Profesionales",
    steps: [
      pageHeading(
        "Equipo y accesos",
        "Aquí administras profesionales, cuentas de acceso, servicios, horarios, pausas y bloqueos de agenda."
      ),
      {
        selectors: ["#btn-add-staff"],
        popover: {
          title: "Agregar profesional",
          description:
            "Crea la ficha de una persona, asígnale servicios y decide si tendrá una cuenta para entrar a Puragenda.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selectors: ["[data-tour='staff-list']", "#tutorial-main section", "#tutorial-main"],
        popover: {
          title: "Configurar cada persona",
          description:
            "Abre un profesional para ajustar rol, funcionalidades, servicios, horario laboral, pausas, imagen y bloqueos.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/services": {
    title: "Ayuda de Servicios",
    steps: [
      pageHeading(
        "Catálogo de servicios",
        "Gestiona todo lo que tus clientes pueden reservar: nombre, duración, precio, descripción y disponibilidad."
      ),
      {
        selectors: [
          "[data-tour='service-create']",
          "#tutorial-main form",
          "#tutorial-main button",
          "#tutorial-main",
        ],
        popover: {
          title: "Crear o editar",
          description:
            "Añade un servicio nuevo o abre uno existente para modificar sus datos. La duración influye directamente en los horarios disponibles.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selectors: [
          "[data-tour='services-list']",
          "#tutorial-main [class*='grid']",
          "#tutorial-main",
        ],
        popover: {
          title: "Disponibilidad y profesionales",
          description:
            "Relaciona cada servicio con los profesionales que pueden realizarlo. Si no asignas ninguno, quedará disponible para todo el equipo.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/clients": {
    title: "Ayuda de Clientes",
    steps: [
      pageHeading(
        "CRM de clientes",
        "Aquí se guardan las personas que reservan contigo junto con su contacto, historial y comportamiento."
      ),
      {
        selectors: [
          "#tutorial-main input[placeholder*='Buscar']",
          "#tutorial-main input[type='search']",
          "#tutorial-main table",
        ],
        popover: {
          title: "Buscar y encontrar",
          description:
            "Busca por nombre, correo o teléfono para llegar rápidamente a una ficha sin recorrer toda la lista.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selectors: ["#tutorial-main table", "#tutorial-main"],
        popover: {
          title: "Historial y métricas",
          description:
            "La tabla muestra citas, asistencias, inasistencias y gasto acumulado. Abre un cliente para revisar detalles y notas privadas.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/recurring": {
    title: "Ayuda de Suscripciones",
    steps: [
      pageHeading(
        "Reservas recurrentes",
        "Administra servicios que se repiten durante varios meses y revisa solicitudes pendientes, activas o pausadas."
      ),
      {
        selectors: ["#tutorial-main table", "#tutorial-main [class*='grid']", "#tutorial-main"],
        popover: {
          title: "Estado de cada suscripción",
          description:
            "Comprueba servicio, cliente, frecuencia y vigencia. Las solicitudes pendientes requieren aprobación antes de generar reservas.",
          side: "top",
          align: "start",
        },
      },
      {
        selectors: ["#tutorial-main button", "#tutorial-main"],
        popover: {
          title: "Acciones disponibles",
          description:
            "Desde cada registro puedes aprobar, pausar, reactivar o cancelar según su estado actual.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/loyalty": {
    title: "Ayuda de Fidelización",
    steps: [
      pageHeading(
        "Fidelización de clientes",
        "Configura beneficios para premiar la recurrencia y dar una razón clara para que tus clientes vuelvan."
      ),
      {
        selectors: ["#tutorial-main form", "#tutorial-main [class*='grid']", "#tutorial-main"],
        popover: {
          title: "Reglas del programa",
          description:
            "Define el objetivo, la recompensa y las condiciones. Revisa el resultado antes de activarlo para evitar beneficios ambiguos.",
          side: "top",
          align: "start",
        },
      },
      {
        selectors: ["#tutorial-main button[type='submit']", "#tutorial-main button", "#tutorial-main"],
        popover: {
          title: "Guardar y activar",
          description:
            "Guarda los cambios cuando termines. La configuración comenzará a aplicarse a la actividad futura del negocio.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/marketing": {
    title: "Ayuda de Marketing",
    steps: [
      pageHeading(
        "Marketing y recuperación",
        "Prepara campañas para volver a contactar clientes inactivos y medir el resultado de cada envío."
      ),
      {
        selectors: ["#tutorial-main form", "#tutorial-main textarea", "#tutorial-main"],
        popover: {
          title: "Preparar una campaña",
          description:
            "Selecciona la audiencia, revisa el contenido y confirma que el mensaje sea útil antes de enviarlo.",
          side: "top",
          align: "start",
        },
      },
      {
        selectors: ["#tutorial-main table", "#tutorial-main [class*='grid']", "#tutorial-main"],
        popover: {
          title: "Seguimiento",
          description:
            "Consulta campañas y estados para saber qué acciones se ejecutaron y evitar envíos repetidos.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/appearance/personalizado": {
    title: "Ayuda del editor visual",
    steps: [
      {
        selectors: ["[data-tour='appearance-preview']"],
        popover: {
          title: "Vista previa en vivo",
          description:
            "Este es el widget que verán tus clientes. Permanece visible mientras modificas la identidad y los bloques promocionales.",
          side: "right",
          align: "start",
        },
      },
      {
        selectors: ["[data-tour='appearance-controls']"],
        popover: {
          title: "Diseño y contenido",
          description:
            "Ajusta colores, tipografía, radio, sombras y alineación. También puedes subir imágenes y decidir dónde aparecen.",
          side: "left",
          align: "start",
        },
      },
      {
        selectors: ["[data-tour='save-theme']"],
        popover: {
          title: "Guardar como tema",
          description:
            "Ponle nombre y categoría a esta combinación para reutilizarla más tarde desde la galería de temas.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/appearance/temas": {
    title: "Ayuda de Temas",
    steps: [
      pageHeading(
        "Galería de temas",
        "Explora diseños preparados y tus propias configuraciones guardadas sin alterar el widget hasta que decidas aplicarlas."
      ),
      {
        selectors: ["[data-tour='theme-filters']"],
        popover: {
          title: "Búsqueda y filtros",
          description:
            "Filtra por categoría, origen o color predominante. La búsqueda encuentra coincidencias mientras escribes.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selectors: ["[data-tour='theme-gallery']"],
        popover: {
          title: "Previsualizar y aplicar",
          description:
            "Abre una vista ampliada antes de aplicar. Los temas creados por ti también pueden duplicarse o eliminarse.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/referrals": {
    title: "Ayuda de Referidos",
    steps: [
      pageHeading(
        "Programa de referidos",
        "Consulta tu enlace personal, las invitaciones registradas y las recompensas asociadas."
      ),
      {
        selectors: ["#tutorial-main input", "#tutorial-main [class*='grid']", "#tutorial-main"],
        popover: {
          title: "Compartir el enlace",
          description:
            "Copia tu enlace único y compártelo. Las altas realizadas desde ese enlace se relacionan automáticamente con tu cuenta.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selectors: ["#tutorial-main table", "#tutorial-main"],
        popover: {
          title: "Seguimiento",
          description:
            "Revisa el estado de cada referido y cuándo una recompensa cumple sus condiciones.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/rewards": {
    title: "Ayuda de Recompensas",
    steps: [
      pageHeading(
        "Recompensas obtenidas",
        "Aquí aparecen beneficios, premios y estados derivados del programa de referidos."
      ),
      {
        selectors: ["#tutorial-main [class*='grid']", "#tutorial-main table", "#tutorial-main"],
        popover: {
          title: "Estado de los beneficios",
          description:
            "Comprueba si una recompensa está pendiente, disponible o utilizada y revisa su fecha de vigencia.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/settings": {
    title: "Ayuda de Configuración",
    steps: [
      pageHeading(
        "Configuración del negocio",
        "Aquí defines identidad, ubicación, cobros, políticas de reserva, horarios e integraciones."
      ),
      {
        selectors: ["#business-hours"],
        popover: {
          title: "Horarios de atención",
          description:
            "Activa cada día, define su rango y añade una pausa. Puedes copiar un horario a lunes–viernes o cerrar el fin de semana.",
          side: "top",
          align: "start",
        },
      },
      {
        selectors: ["#business-api"],
        popover: {
          title: "API Key protegida",
          description:
            "La clave aparece oculta por seguridad. Usa el ojo solo cuando necesites verla y copiarla para una integración autorizada.",
          side: "top",
          align: "start",
        },
      },
      {
        selectors: ["#business-embed"],
        popover: {
          title: "Instalar el widget",
          description:
            "Copia este fragmento para insertar el sistema de reservas dentro de otra página web.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
  "/dashboard/changelog": {
    title: "Ayuda de Novedades",
    steps: [
      pageHeading(
        "Novedades de Puragenda",
        "Consulta los cambios recientes para saber qué funciones se añadieron o modificaron."
      ),
      {
        selectors: ["#tutorial-main article", "#tutorial-main section", "#tutorial-main"],
        popover: {
          title: "Historial de versiones",
          description:
            "Cada entrada resume una actualización y su impacto. Las más recientes aparecen primero.",
          side: "top",
          align: "start",
        },
      },
    ],
  },
};

function getTour(pathname: string): TourDefinition {
  const exact = TOURS[pathname];
  if (exact) return exact;

  const prefix = Object.keys(TOURS)
    .filter((path) => path !== "/dashboard" && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (prefix) return TOURS[prefix];

  return {
    title: "Ayuda contextual",
    steps: [
      pageHeading(
        "Esta pantalla",
        "Revisa el encabezado y los controles visibles de este módulo. La ayuda se adapta automáticamente cuando cambias de sección."
      ),
    ],
  };
}

function resolveSteps(steps: TourStepSpec[]): DriveStep[] {
  return steps.flatMap((step) => {
    const selector = step.selectors.find((candidate) => document.querySelector(candidate));
    return selector ? [{ element: selector, popover: step.popover }] : [];
  });
}

export function ContextualHelpButton() {
  const pathname = usePathname();
  const activeTour = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    return () => {
      activeTour.current?.destroy();
      activeTour.current = null;
    };
  }, [pathname]);

  function startTour() {
    activeTour.current?.destroy();
    const tour = getTour(pathname);
    const steps = resolveSteps(tour.steps);
    const safeSteps = steps.length > 0
      ? steps
      : [{
          element: "#tutorial-main",
          popover: {
            title: tour.title,
            description: "Esta sección aún no tiene controles visibles para explicar.",
            side: "top" as const,
            align: "start" as const,
          },
        }];

    const instance = driver({
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      allowClose: true,
      smoothScroll: true,
      showProgress: true,
      stagePadding: 8,
      stageRadius: 14,
      overlayColor: "#09090B",
      overlayOpacity: 0.72,
      popoverClass: "neo-brutalism-driver",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Finalizar",
      progressText: "{{current}} de {{total}}",
      steps: safeSteps,
    });

    activeTour.current = instance;
    instance.drive();
  }

  return (
    <button
      type="button"
      onClick={startTour}
      className="fixed right-3 top-2 z-50 flex h-10 items-center justify-center gap-2 rounded-xl border border-black bg-[#7C3AED] px-3 text-white shadow-[2px_2px_0_#111] transition-transform hover:-translate-y-0.5 active:translate-y-0 md:static md:z-auto md:h-9 md:shadow-none"
      aria-label="Abrir ayuda de esta página"
      title="Ayuda de esta página"
      data-tour="contextual-help"
    >
      <CircleHelp className="h-5 w-5" />
      <span className="hidden text-xs font-bold lg:inline">Ayuda</span>
    </button>
  );
}
