import type { DashboardPermission } from "./permissions";

export type LearningStep = { title: string; body: string; target?: string; event?: string };
export type LearningTutorial = { id: string; version: number; title: string; route: string; permissions: DashboardPermission[]; anyPermission?: boolean; capability?: "website.editor" | "puri.plus"; steps: LearningStep[] };
export const TUTORIALS: LearningTutorial[] = [
  { id: "client-booking", version: 1, title: "Registrar un cliente con su primera cita", route: "/dashboard/agenda", permissions: ["clients.manage", "appointments.manage_all"], steps: [
    { title: "El cliente nace con su reserva", body: "Puragenda registra la ficha al crear una cita. No hay un botón separado de alta de clientes en esta pantalla.", target: "[data-tour='appointments-calendar']" },
    { title: "Abrir Nueva cita", body: "Abre el formulario. Puedes explorar y cerrarlo sin guardar ninguna reserva.", target: "[data-tour='appointment-create']", event: "appointment-form-opened" },
    { title: "Datos del cliente", body: "Selecciona Nuevo cliente y escribe sus datos reales. Después revisa servicio, profesional y fecha. Guarda solo si necesitas crear esa cita; para practicar, cierra sin guardar.", target: "[data-tour='appointment-customer']" },
  ] },
  { id: "today", version: 2, title: "Preparar tu día", route: "/dashboard", permissions: ["appointments.view_own", "appointments.view_all"], anyPermission: true, steps: [
    { title: "Tu operación de hoy", body: "Revisa la próxima atención y las reservas que necesitan seguimiento.", target: "#tutorial-main" },
    { title: "Abrir la agenda", body: "Continúa en Agenda para buscar otra fecha o gestionar una atención.", target: "[data-tour='nav-agenda']" },
  ] },
  { id: "appointments", version: 2, title: "Gestionar una reserva", route: "/dashboard/agenda", permissions: ["appointments.manage_own", "appointments.manage_all"], anyPermission: true, steps: [
    { title: "Busca una fecha", body: "Usa las vistas y las fechas para ubicar la atención.", target: "[data-tour='appointments-calendar']" },
    { title: "Crear una reserva", body: "Abre Nueva cita. Elige servicio, fecha y un horario disponible. Cierra el formulario si solo estás explorando.", target: "[data-tour='appointment-create']", event: "appointment-form-opened" },
    { title: "Revisar una atención", body: "Abre una reserva existente para ver su detalle. Reagenda o cancela solo cuando corresponda; esta guía no cambia reservas.", target: "[data-tour='appointments-calendar']" },
  ] },
  { id: "staff", version: 2, title: "Agregar un profesional", route: "/dashboard/staff", permissions: ["staff.manage"], steps: [
    { title: "Tu equipo", body: "Revisa las personas existentes para evitar duplicarlas.", target: "[data-tour='staff-list']" },
    { title: "Agregar una persona", body: "Abre Agregar profesional. La capacidad disponible se comprueba según tu plan.", target: "#btn-add-staff", event: "staff-form-opened" },
    { title: "Servicios y horario", body: "Después de crear la ficha, abre al profesional para asignar servicios, sucursales y su horario. Si solo exploras, cierra el formulario." },
  ] },
  { id: "services", version: 2, title: "Crear un servicio reservable", route: "/dashboard/services", permissions: ["services.manage"], steps: [
    { title: "Revisa tu catálogo", body: "Comprueba si el servicio ya existe antes de crear otro.", target: "[data-tour='services-list']" },
    { title: "Nuevo servicio", body: "Abre Nuevo servicio. Completa el nombre, duración y precio que tú hayas definido.", target: "#btn-nuevo-servicio", event: "service-form-opened" },
    { title: "Disponibilidad", body: "Guarda cuando hayas revisado los datos. Desde Profesionales puedes limitar quién realiza el servicio. Sin asignaciones, el servicio queda disponible para todo el equipo." },
  ] },
  { id: "hours", version: 2, title: "Configurar días y pausas", route: "/dashboard/settings", permissions: ["settings.manage"], steps: [
    { title: "Horario del negocio", body: "Activa los días de atención y ajusta apertura y cierre. Revisa la sucursal seleccionada.", target: "#business-hours" },
    { title: "Pausas y copia", body: "Añade una pausa dentro de la jornada. Puedes copiar el horario a lunes–viernes.", target: "[data-tour='business-hours-list']" },
    { title: "Guardar el horario", body: "Guarda solo después de revisar los días. Los profesionales pueden tener una disponibilidad más acotada.", target: "[data-tour='hours-save']", event: "hours-saved" },
  ] },
  { id: "block-day", version: 2, title: "Cerrar un día de atención", route: "/dashboard/settings", permissions: ["settings.manage"], steps: [
    { title: "Excepciones por fecha", body: "En Horarios especiales puedes cerrar una fecha concreta sin cambiar tu semana habitual.", target: "[data-tour='schedule-overrides']" },
    { title: "Revisar antes de guardar", body: "Selecciona la fecha y la sucursal, marca el día como cerrado y revisa las reservas existentes. No cancela citas automáticamente.", target: "[data-tour='schedule-overrides']" },
  ] },
  { id: "clients", version: 2, title: "Encontrar un cliente", route: "/dashboard/clients", permissions: ["clients.manage"], steps: [
    { title: "Buscar un cliente", body: "Busca por nombre, correo o teléfono para encontrar su ficha.", target: "[data-tour='client-search']" },
    { title: "Revisar el historial", body: "Abre una ficha para consultar las atenciones y notas a las que tienes acceso.", target: "[data-tour='clients-list']" },
  ] },
  { id: "payments", version: 2, title: "Revisar pagos y abonos", route: "/dashboard/agenda", permissions: ["appointments.manage_all"], steps: [
    { title: "Detalle de una cita", body: "Abre una reserva para revisar su estado de pago y el saldo pendiente.", target: "[data-tour='appointments-calendar']" },
    { title: "Verificar el cobro", body: "Comprueba los registros de pago antes de registrar un abono manual. Esta guía no genera cobros ni cambia pagos." },
  ] },
  { id: "settings", version: 2, title: "Revisar tu negocio", route: "/dashboard/settings", permissions: ["settings.manage"], steps: [
    { title: "Información del negocio", body: "Revisa el nombre, país, zona horaria y sucursales de tu negocio.", target: "#tutorial-main" },
    { title: "Tu enlace público", body: "Puedes revisar y compartir tu enlace desde Puri Setup. Las opciones de pago y políticas se configuran cuando las necesites.", target: "#business-embed" },
  ] },
  { id: "website", version: 2, title: "Preparar tu sitio web", route: "/dashboard/website", permissions: ["website.manage"], capability: "website.editor", steps: [
    { title: "Editor del sitio", body: "Revisa los datos, imágenes y contenido de tu sitio desde el editor.", target: "#tutorial-main" },
    { title: "Vista previa y publicación", body: "Usa la vista previa antes de publicar. El sitio es opcional: tu enlace de reservas funciona de manera independiente." },
  ] },
  { id: "puri", version: 2, title: "Pedir ayuda a Puri", route: "/dashboard", permissions: ["appointments.view_own", "appointments.view_all"], anyPermission: true, steps: [
    { title: "Ayuda contextual", body: "Abre Puri para consultar tu agenda o pedir una guía de la función que necesitas.", target: "[data-tour='puri-launcher']" },
    { title: "Te puedo mostrar", body: "Prueba «¿cómo agrego otro profesional?» o «¿cómo bloqueo un día?». Puri ofrece una guía que tú decides iniciar." },
  ] },
];
export function tutorialById(id: string) { return TUTORIALS.find(t => t.id === id); }
export function allowedTutorials(permissions: readonly DashboardPermission[], capabilities: readonly string[] = []) {
  return TUTORIALS.filter(t => (t.anyPermission ? t.permissions.some(p => permissions.includes(p)) : t.permissions.every(p => permissions.includes(p))) && (!t.capability || capabilities.includes(t.capability)));
}
export function recommendTutorial(message: string, tutorials: readonly LearningTutorial[]) {
  const m = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/como|ayuda|mostrar|ensena|tutorial|guia|configur|how|help/.test(m)) return null;
  const id = /(?:agreg|crea|registr|anad).*client|client.*(?:nuevo|agreg)/.test(m) ? "client-booking" : /bloque|cerrar.*dia|no.*reserv|vacacion/.test(m) ? "block-day" : /profesional|equipo|staff/.test(m) ? "staff" : /horari|pausa|descanso/.test(m) ? "hours" : /servicio/.test(m) ? "services" : /client/.test(m) ? "clients" : /pago|abono|cobr/.test(m) ? "payments" : /sitio|web/.test(m) ? "website" : /reserva|cita|agenda/.test(m) ? "appointments" : /puri/.test(m) ? "puri" : /negocio|configur/.test(m) ? "settings" : null;
  return tutorials.find(t => t.id === id) ?? null;
}
export function tutorialNeedsUpdate(progress: { version: number; status: string } | undefined, tutorial: LearningTutorial) { return !progress || progress.version !== tutorial.version || progress.status !== "completed"; }
export function tutorialMatchesSearch(tutorial: LearningTutorial, search: string) {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const text = normalize(`${tutorial.title} ${learningGroup(tutorial)} ${tutorial.steps.map(step => `${step.title} ${step.body}`).join(" ")}`);
  return normalize(search).trim().split(/\s+/).every(term => text.includes(term.length > 3 && term.endsWith("s") ? term.slice(0, -1) : term));
}
export function tutorialHref(id: string) { const t = tutorialById(id); return t ? `${t.route}?learn=${encodeURIComponent(t.id)}` : "/dashboard"; }

export const LEARNING_GROUPS = ["Primeros pasos", "Agenda y reservas", "Negocio y equipo", "Clientes", "Pagos", "Sitio web", "Puri"] as const;
export function learningGroup(t: LearningTutorial): typeof LEARNING_GROUPS[number] {
  if (t.id === "today") return "Primeros pasos";
  if (t.id === "puri") return "Puri";
  if (t.id === "payments") return "Pagos";
  if (t.id === "website") return "Sitio web";
  if (["clients", "client-booking"].includes(t.id)) return "Clientes";
  return ["appointments", "block-day"].includes(t.id) ? "Agenda y reservas" : "Negocio y equipo";
}
export function contextualTutorials(tutorials: readonly LearningTutorial[], pathname: string) {
  const matching = tutorials.filter(t => t.route === pathname || (pathname === "/dashboard/clients" && t.id === "client-booking"));
  return (matching.length ? matching : tutorials.filter(t => ["today", "hours", "services", "staff"].includes(t.id))).slice(0, 4);
}
