import type { AvailabilityQuery, BookingRequest, Catalog, Selection, StudioService } from "./types";
import { BookingError } from "./errors";
import { quoteBookingSelection } from "@/core/booking-selection";

export function dateKey(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (name: string) => parts.find((part) => part.type === name)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function addDays(key: string, count: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function validDate(key: unknown): key is string {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(`${key}T12:00:00Z`)) && new Date(`${key}T12:00:00Z`).toISOString().slice(0, 10) === key;
}
function fail(message: string): never { throw new BookingError("VALIDATION", message); }
function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) fail("La selección no es válida.");
  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Solicitud no válida.");
  return value as Record<string, unknown>;
}
export function parseQuery(value: unknown): AvailabilityQuery {
  const data = record(value);
  if (!validDate(data.date)) fail("Elige una fecha válida.");
  if (!Array.isArray(data.optionIds) || data.optionIds.length > 50) fail("Las opciones no son válidas.");
  const optionIds = data.optionIds.map(identifier);
  if (new Set(optionIds).size !== optionIds.length) fail("Hay opciones repetidas.");
  return { serviceId: identifier(data.serviceId), staffId: data.staffId === "" ? "" : identifier(data.staffId), locationId: identifier(data.locationId), optionIds, date: data.date };
}
export function parseBooking(value: unknown): BookingRequest {
  const data = record(value);
  const query = parseQuery(data);
  const trimmed = (key: string, min: number, max: number): string => {
    const raw = data[key];
    if (typeof raw !== "string" || raw.trim().length < min || raw.trim().length > max) fail(`Revisa ${key === "customerName" ? "tu nombre" : key === "customerEmail" ? "tu email" : "tu teléfono"}.`);
    return raw.trim();
  };
  const customerName = trimmed("customerName", 2, 100);
  const customerEmail = trimmed("customerEmail", 3, 255).toLowerCase();
  const customerPhone = trimmed("customerPhone", 8, 18);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) fail("Revisa tu email.");
  if (!/^\+?[0-9\s()-]{8,18}$/.test(customerPhone)) fail("Revisa tu teléfono.");
  if (typeof data.startTime !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(data.startTime) || !Number.isFinite(Date.parse(data.startTime))) fail("El horario no es válido.");
  let customerAddress: string | undefined;
  if (data.customerAddress !== undefined) {
    if (typeof data.customerAddress !== "string" || data.customerAddress.trim().length > 300) fail("Revisa la dirección.");
    customerAddress = data.customerAddress.trim() || undefined;
  }
  // Client price, duration and endTime are intentionally discarded.
  return { ...query, customerName, customerEmail, customerPhone, customerAddress, startTime: data.startTime };
}
export function quoteService(service: StudioService, optionIds: string[]) {
  const { duration, price, requiresAddress } = quoteBookingSelection([service], optionIds);
  return { duration, price, requiresAddress };
}
export function validateSelection(catalog: Catalog, selection: Selection): StudioService {
  const service = catalog.services.find((item) => item.id === selection.serviceId);
  if (!service) fail("Este tratamiento ya no está disponible.");
  if (!catalog.locations.some((location) => location.id === selection.locationId) || !service.locationIds.includes(selection.locationId)) fail("El tratamiento no se ofrece en esa sede.");
  if (catalog.rules?.staffSelection === "NONE") {
    if (selection.staffId !== "") fail("Esta agenda no admite selección de profesional.");
  } else if (selection.staffId === "any") {
    if (!catalog.supportsAnyStaff) fail("Elige una profesional.");
  } else {
    const staff = catalog.staff.find((item) => item.id === selection.staffId);
    if (!staff || !staff.locationIds.includes(selection.locationId) || !staff.serviceIds.includes(service.id)) fail("La profesional no realiza este tratamiento en esa sede.");
  }
  quoteService(service, selection.optionIds);
  return service;
}
export function money(price: number, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(price);
}
