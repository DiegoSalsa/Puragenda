import type { loadBookingContext } from "@/server/booking/read.service";
import { usesBusinessScheduleOnly } from "@/core/subscription-plan";
import type { SetupStep } from "@/core/onboarding";

type BookingContext = Awaited<ReturnType<typeof loadBookingContext>>;
export type SetupIssue = { code: "NO_LOCATION" | "NO_SERVICE" | "SERVICE_LOCATION" | "BUSINESS_HOURS" | "STAFF_LOCATION" | "SERVICE_STAFF" | "STAFF_HOURS" | "NO_SLOTS"; message: string; step: SetupStep; staffId?: string; serviceId?: string; locationId?: string };
export function diagnoseSetup(data: BookingContext, selection?: { serviceId?: string; locationId?: string }): SetupIssue[] {
  const location = data.locations.find(l => l.id === selection?.locationId) ?? data.locations[0];
  const service = data.services.find(s => s.id === selection?.serviceId) ?? data.services[0];
  if (!location) return [{ code: "NO_LOCATION", message: "El negocio necesita una sucursal activa para recibir reservas. Revísala en Configuración.", step: "hours" }];
  if (!service) return [{ code: "NO_SERVICE", message: "Todavía no hay un servicio activo de citas disponible para reservar. Crea uno con duración y precio revisados.", step: "services" }];
  const refs = { locationId: location.id, serviceId: service.id };
  const issues: SetupIssue[] = [];
  if (!service.locations.some(l => l.locationId === location.id)) issues.push({ ...refs, code: "SERVICE_LOCATION", message: `«${service.name}» no está disponible en ${location.name}. Revisa la disponibilidad del servicio en esa sucursal.`, step: "services" });
  if (!(location.hours.length ? location.hours : data.businessHours).some(h => h.isOpen)) issues.push({ ...refs, code: "BUSINESS_HOURS", message: `${location.name} no tiene días abiertos. Confirma sus horarios de atención.`, step: "hours" });
  if (usesBusinessScheduleOnly(data.subscription?.plan)) return issues;
  const local = data.staff.filter(s => s.locations.some(l => l.locationId === location.id));
  if (!local.length) return [...issues, { ...refs, code: "STAFF_LOCATION", message: `No hay un profesional activo asignado a ${location.name}. Revisa su ficha y la sucursal donde atiende.`, step: "staff" }];
  const eligible = local.filter(s => s.services.length === 0 || s.services.some(a => a.id === service.id));
  if (!eligible.length) return [...issues, { ...refs, staffId: local[0].id, code: "SERVICE_STAFF", message: `«${service.name}» no tiene un profesional habilitado en ${location.name}. Puedes revisar la asociación antes de confirmarla.`, step: "staff" }];
  if (!eligible.some(s => {
    const schedule = s.locations.find(l => l.locationId === location.id)!.schedule;
    return (schedule.length ? schedule : s.schedule).some(h => h.isWorking);
  })) issues.push({ ...refs, staffId: eligible[0].id, code: "STAFF_HOURS", message: `Los profesionales que realizan «${service.name}» no tienen días de trabajo en ${location.name}. Puedes preparar el horario del negocio para uno de ellos y revisarlo.`, step: "staff" });
  return issues;
}
