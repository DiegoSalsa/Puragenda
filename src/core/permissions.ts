export const DASHBOARD_PERMISSIONS = {
  APPOINTMENTS_VIEW_OWN: "appointments.view_own",
  APPOINTMENTS_VIEW_ALL: "appointments.view_all",
  APPOINTMENTS_MANAGE_OWN: "appointments.manage_own",
  APPOINTMENTS_MANAGE_ALL: "appointments.manage_all",
  ANALYTICS_VIEW_OWN: "analytics.view_own",
  ANALYTICS_VIEW_BUSINESS: "analytics.view_business",
  STAFF_MANAGE: "staff.manage",
  SERVICES_MANAGE: "services.manage",
  CLIENTS_MANAGE: "clients.manage",
  RECURRING_MANAGE: "recurring.manage",
  LOYALTY_MANAGE: "loyalty.manage",
  MARKETING_MANAGE: "marketing.manage",
  APPEARANCE_MANAGE: "appearance.manage",
  REFERRALS_VIEW: "referrals.view",
  REWARDS_VIEW: "rewards.view",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type DashboardPermission = typeof DASHBOARD_PERMISSIONS[keyof typeof DASHBOARD_PERMISSIONS];

export const PERMISSION_CATALOG: {
  code: DashboardPermission;
  group: string;
  label: string;
  description: string;
  critical?: boolean;
}[] = [
  { code: DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN, group: "Agenda", label: "Ver sus propias citas", description: "Acceso a la agenda asignada a esta persona." },
  { code: DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL, group: "Agenda", label: "Ver todas las agendas", description: "Puede consultar las citas de todo el equipo.", critical: true },
  { code: DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN, group: "Agenda", label: "Gestionar sus propias citas", description: "Puede crear, editar y reagendar citas en su propia agenda." },
  { code: DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL, group: "Agenda", label: "Gestionar todas las agendas", description: "Puede crear, editar y reagendar citas para cualquier profesional.", critical: true },
  { code: DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN, group: "Analítica", label: "Ver su analítica", description: "Resumen semanal y mensual de su propia actividad." },
  { code: DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS, group: "Analítica", label: "Ver analítica del negocio", description: "Indicadores globales del negocio.", critical: true },
  { code: DASHBOARD_PERMISSIONS.STAFF_MANAGE, group: "Gestión", label: "Gestionar profesionales y roles", description: "Crear equipo, horarios y perfiles de acceso.", critical: true },
  { code: DASHBOARD_PERMISSIONS.SERVICES_MANAGE, group: "Gestión", label: "Gestionar servicios", description: "Crear y editar servicios, opciones e imágenes." },
  { code: DASHBOARD_PERMISSIONS.CLIENTS_MANAGE, group: "Gestión", label: "Gestionar clientes", description: "Consultar y editar el CRM de clientes." },
  { code: DASHBOARD_PERMISSIONS.RECURRING_MANAGE, group: "Gestión", label: "Gestionar suscripciones", description: "Administrar reservas y planes recurrentes." },
  { code: DASHBOARD_PERMISSIONS.LOYALTY_MANAGE, group: "Crecimiento", label: "Gestionar fidelización", description: "Configurar sellos, premios y códigos." },
  { code: DASHBOARD_PERMISSIONS.MARKETING_MANAGE, group: "Crecimiento", label: "Gestionar marketing", description: "Crear y enviar campañas." },
  { code: DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE, group: "Marca", label: "Editar widget y temas", description: "Cambiar apariencia, banners y presets del widget." },
  { code: DASHBOARD_PERMISSIONS.REFERRALS_VIEW, group: "Cuenta", label: "Ver referidos", description: "Consultar el programa de referidos." },
  { code: DASHBOARD_PERMISSIONS.REWARDS_VIEW, group: "Cuenta", label: "Ver recompensas", description: "Consultar y canjear recompensas." },
  { code: DASHBOARD_PERMISSIONS.SETTINGS_MANAGE, group: "Cuenta", label: "Administrar configuración", description: "Acceso a claves, pagos y políticas.", critical: true },
];

const ALL = PERMISSION_CATALOG.map((permission) => permission.code);
const RECEPTIONIST_EXCLUDED = new Set<DashboardPermission>([
  DASHBOARD_PERMISSIONS.SETTINGS_MANAGE,
  DASHBOARD_PERMISSIONS.REFERRALS_VIEW,
  DASHBOARD_PERMISSIONS.REWARDS_VIEW,
]);

export const LEGACY_ROLE_PERMISSIONS: Record<string, DashboardPermission[]> = {
  SUPERADMIN: ALL,
  ADMIN: ALL,
  RECEPTIONIST: ALL.filter((permission) => !RECEPTIONIST_EXCLUDED.has(permission)),
  STAFF: [
    DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN,
    DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN,
    DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN,
  ],
};

export function normalizeDashboardPermissions(values: string[]): DashboardPermission[] {
  const valid = new Set(PERMISSION_CATALOG.map((permission) => permission.code));
  return [...new Set(values)].filter((value): value is DashboardPermission => valid.has(value as DashboardPermission));
}
