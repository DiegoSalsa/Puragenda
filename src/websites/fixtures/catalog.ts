import type { AvailabilityQuery, BookingProvider, Catalog, StudioService } from "../booking/types";
import { addDays, dateKey, quoteService, validateSelection } from "../templates/bella/_lib/puragenda/validation";
import { BookingError } from "../templates/bella/_lib/puragenda/errors";

const locationIds = ["bella-demo"];
const service = (id: string, name: string, duration: number, price: number, description: string, image: string, category = "Uñas"): StudioService => ({ id, name, duration, price, description, image, category, categoryId: category.toLowerCase(), categoryPosition: 0, locationIds, optionCategories: [] });
export const demoCatalog: Catalog = {
  mode: "demo", business: { name: "Estética Bella", timezone: "America/Santiago", currency: "CLP" },
  supportsAnyStaff: true, locations: [{ id: "bella-demo", name: "Estudio Bella · sede de muestra", timezone: "America/Santiago" }],
  services: [
    service("permanente", "Manicure permanente", 60, 18000, "Color parejo. Acabado brillante.", "/websites/bella/services/permanente.webp"),
    service("nivelacion", "Nivelación", 75, 24000, "Una base uniforme, hasta el último detalle.", "/websites/bella/portfolio/french.webp"),
    { ...service("nail-art", "Nail art", 60, 22000, "Líneas, formas y una idea sobre tus uñas.", "/websites/bella/portfolio/art.webp"), optionCategories: [{ id: "diseno", name: "Diseño", isRequired: true, maxSelections: 1, alternatives: [
      { id: "basico", name: "Básico", priceDelta: 0, durationDelta: 0, isHomeService: false },
      { id: "medio", name: "Medio", priceDelta: 5000, durationDelta: 15, isHomeService: false },
      { id: "avanzado", name: "Avanzado", priceDelta: 10000, durationDelta: 30, isHomeService: false },
    ] }] },
    service("retiro", "Retiro", 30, 8000, "Volver a empezar, con cuidado.", "/websites/bella/studio/process.webp"),
    service("lifting", "Lifting de pestañas", 60, 25000, "Curva y definición, vistas de cerca.", "/websites/bella/services/lashes.webp", "Mirada"),
    service("perfilado", "Perfilado de cejas", 30, 12000, "La forma está en los detalles.", "/websites/bella/services/brows.webp", "Mirada"),
    service("laminado", "Laminado de cejas", 45, 22000, "Dirección, textura y definición.", "/websites/bella/services/brows.webp", "Mirada"),
  ],
  staff: [
    { id: "antonia", name: "Antonia", image: null, locationIds, serviceIds: ["permanente", "nivelacion", "nail-art", "retiro"] },
    { id: "camila", name: "Camila", image: null, locationIds, serviceIds: ["permanente", "retiro", "lifting", "perfilado", "laminado"] },
  ],
};

/** Demo-only fixtures; deliberately NOT an implementation of Puragenda scheduling. */
export function demoAvailability(query: AvailabilityQuery, now = new Date(), catalog = demoCatalog) {
  const service = validateSelection(catalog, query);
  const today = dateKey(now, catalog.business.timezone);
  if (query.date <= today || query.date > addDays(today, 90)) throw new BookingError("VALIDATION", "Elige un día dentro de los próximos tres meses.");
  const weekday = new Date(`${query.date}T12:00:00Z`).getUTCDay();
  const { duration } = quoteService(service, query.optionIds);
  // Fixed UTC fixtures. Labels derived in Santiago; no imitation of real scheduling rules.
  const hours = weekday === 0 ? [] : [13, 14, 15, 17, 18, 19, 20];
  const staff = query.staffId === "any" ? catalog.staff.find((item) => item.serviceIds.includes(service.id))!.id : query.staffId;
  const slots = hours.filter((_, index) => (index + weekday + (staff === "camila" ? 1 : 0)) % 4 !== 0).map((hour) => {
    const start = new Date(`${query.date}T${String(hour).padStart(2, "0")}:00:00Z`);
    return { startTime: start.toISOString(), endTime: new Date(start.getTime() + duration * 60000).toISOString(), staffId: staff, label: new Intl.DateTimeFormat("es-CL", { timeZone: catalog.business.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(start) };
  });
  return { mode: "demo" as const, date: query.date, slots };
}
export const demoProvider: BookingProvider = {
  async getCatalog() { return demoCatalog; },
  async getAvailability(query) { return demoAvailability(query); },
  async createBooking() { return { kind: "demo", message: "Así se vería tu reserva. Este recorrido no crea una cita ni envía tus datos." }; },
};
