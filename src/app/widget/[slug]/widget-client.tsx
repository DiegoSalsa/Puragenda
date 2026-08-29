"use client";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useMemo, useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { addDays, addMinutes, addMonths, format } from "date-fns";
import { de, enUS, es, fr, it, ptBR, zhCN } from "date-fns/locale";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, ExternalLink, Gift, Loader2, Mail, MapPin, Percent, Phone, RefreshCw, Sparkles, Star, UserRound, AlertCircle } from "@/components/icons/hover-icons";
import { formatPrice, capitalize } from "@/lib/utils";
import { calculateWidgetPromotion } from "@/core/widget-promotion";
import { ProductionOrderFlow } from "./production-order-flow";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { buildSlots } from "@/core/availability";
import { isServiceAvailableAtTime, isServiceAvailableOnDate } from "@/core/service-availability";
import { track } from "@/lib/analytics/client";

export { buildSlots } from "@/core/availability";

const subscribeToEmbeddingContext = () => () => {};
const readEmbeddingContext = () => window.self !== window.top;
const readServerEmbeddingContext = () => false;


interface RecurringPlan {
  mode: "FIXED_DAYS" | "DAYS_WITH_REST" | "FREE_MINIMUM";
  fixedDays: number[];
  daysPerWeek: number | null;
  minRestDays: number | null;
  durationOptions: number[];
  startDateRangeDays: number;
  requiresApproval: boolean;
  requiresHealthForm: boolean;
  healthQuestions: string[];
  requiresRut: boolean;
  renewalMessage: string | null;
  expirationWarningDays: number;
}

interface ServiceOptionAlternative { id: string; name: string; priceDelta: number; durationDelta: number; isHomeService: boolean; }
interface ServiceOptionCategory { id: string; name: string; isRequired: boolean; maxSelections: number; alternatives: ServiceOptionAlternative[]; }
interface Service {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  duration: number;
  price: number;
  depositAmount: number;
  bookingMode: "APPOINTMENT" | "PRODUCTION";
  productionScheduleMode: "WEEKLY" | "CUSTOM";
  weeklyProductionCapacity: number;
  productionWeeksAhead: number;
  productionLeadTimeWeeks: number;
  productionDepositPercent: number;
  requiresReferenceImages: boolean;
  availabilityType: "NORMAL" | "SPECIAL";
  specialWeekDays: number[];
  specialStartDate: string | null;
  specialEndDate: string | null;
  specialStartTime: string | null;
  specialEndTime: string | null;
  category: { id: string; name: string; position: number } | null;
  optionCategories: ServiceOptionCategory[];
  recurringPlan: RecurringPlan | null;
  locationIds?: string[];
}
interface BusinessHour { dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean; breakStart?: string | null; breakEnd?: string | null; }
interface StaffScheduleEntry { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean; breakStart?: string | null; breakEnd?: string | null; }
interface StaffMember { id: string; name: string; imageUrl: string | null; schedule: StaffScheduleEntry[]; scheduleOverrides?: ScheduleOverride[]; serviceIds: string[]; locationIds?: string[]; locationSchedules?: { locationId: string; schedule: StaffScheduleEntry[] }[]; }
interface Location { id: string; name: string; slug: string; address: string | null; mapsUrl: string | null; timezone: string; hours: BusinessHour[]; scheduleOverrides: ScheduleOverride[]; }
interface PromoBlock {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: "HEADER" | "BETWEEN_SERVICES" | "FOOTER";
  position: number;
  textAlign: string;
  discountType: string | null;
  discountValue: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  discountMinSubtotal: number;
}
interface ScheduleOverride {
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
}
interface Props {
  business: {
    name: string; slug: string; apiKey: string; logoUrl: string | null;
    primaryColor: string; secondaryColor: string; backgroundColor: string; brandColor: string | null;
    textColor?: string; textSecondary?: string; fontSize?: number;
    cornerRadius?: number; shadowStyle?: string; headerAlign?: string;
    timezone: string; currencyCode: string; taxIdLabel: string; taxIdPlaceholder: string;
  };
  services: Service[];
  primaryColor: string;
  businessHours?: BusinessHour[];
  scheduleOverrides?: ScheduleOverride[];
  staffMembers?: StaffMember[];
  maxServicesPerBooking?: number;
  groupServicesByCategory?: boolean;
  depositRequired?: boolean;
  allowSameDayBookings?: boolean;
  slotInterval?: number;
  minAdvanceBookingMinutes?: number;
  promoBlocks?: PromoBlock[];
  locations?: Location[];
  initialLocationSlug?: string;
  initialServiceId?: string;
  initialStaffId?: string;
  initialDate?: string;
  storyCampaignToken?: string;
  previewMode?: boolean;
  useBusinessScheduleOnly?: boolean;
}

type Step = "location" | "service" | "mode-select" | "options" | "production" | "recurring-config" | "health-form" | "recurring-confirm" | "staff" | "datetime" | "details" | "success" | "payment";
type FormState = { name: string; email: string; phone: string; address: string };
type BlockedSlot = { startTime: string; endTime: string; staffId?: string };
type StaffAssignment = { serviceId: string; staffId: string };

const WEEK_DAYS = [
  { value: 1, label: "Lu" }, { value: 2, label: "Ma" }, { value: 3, label: "Mi" },
  { value: 4, label: "Ju" }, { value: 5, label: "Vi" }, { value: 6, label: "Sa" }, { value: 0, label: "Do" },
];
const WEEK_NAMES: Record<number, string> = { 0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miercoles", 4: "Jueves", 5: "Viernes", 6: "Sabado" };

function buildDays(
  timezone: string,
  businessHours?: BusinessHour[],
  allowSameDayBookings?: boolean,
  scheduleOverrides?: ScheduleOverride[],
  acceptsDate: (date: Date) => boolean = () => true,
) {
  const days: Date[] = [];
  let d = toZonedTime(new Date(), timezone);
  // If same-day bookings are allowed, start from today; otherwise from tomorrow
  const startOffset = allowSameDayBookings ? 0 : 1;
  d = addDays(d, startOffset);
  // Build a lookup map for overrides by date key
  const overrideMap = new Map<string, ScheduleOverride>();
  if (scheduleOverrides) {
    for (const o of scheduleOverrides) overrideMap.set(o.date, o);
  }
  // Show up to 60 days ahead (to find enough open days), cap at 10 results
  const maxLookahead = 60;
  let checked = 0;
  while (days.length < 10 && checked < maxLookahead) {
    const dow = d.getDay();
    const dateKey = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    const override = overrideMap.get(dateKey);

    if (override) {
      // Override takes priority: if isOpen, include the day; if not, skip
      if (override.isOpen && acceptsDate(d)) {
        days.push(new Date(d));
      }
    } else {
      // Fall back to weekly schedule
      if (businessHours && businessHours.length > 0) {
        const bh = businessHours.find((h) => h.dayOfWeek === dow);
        if (bh && !bh.isOpen) { d = addDays(d, 1); checked++; continue; }
      }
      if (acceptsDate(d)) days.push(new Date(d));
    }
    d = addDays(d, 1);
    checked++;
  }
  return days;
}

function isBlocked(slot: { start: Date; end: Date }, blocked: BlockedSlot[], timezone: string) {
  const slotStart = fromZonedTime(slot.start, timezone);
  const slotEnd = fromZonedTime(slot.end, timezone);
  for (const b of blocked) {
    const bs = new Date(b.startTime), be = new Date(b.endTime);
    if (slotStart < be && slotEnd > bs) return true;
  }
  return false;
}

function isStaffWorkingOnDay(staff: StaffMember, date: Date, schedule = staff.schedule): boolean {
  const dateKey = format(date, "yyyy-MM-dd");
  const override = staff.scheduleOverrides?.find((entry) => entry.date === dateKey);
  if (override) return override.isOpen;
  if (schedule.length === 0) return true; // No schedule = always available
  const entry = schedule.find((s) => s.dayOfWeek === date.getDay());
  return entry ? entry.isWorking : false;
}

function getStaffScheduleForLocation(staff: StaffMember | null | undefined, locationId?: string): StaffScheduleEntry[] | undefined {
  if (!staff) return undefined;
  return staff.locationSchedules?.find((entry) => entry.locationId === locationId)?.schedule ?? staff.schedule;
}

function timeToMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function scheduleTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function canStaffPerformService(staff: StaffMember, serviceId: string) {
  return !staff.serviceIds || staff.serviceIds.length === 0 || staff.serviceIds.includes(serviceId);
}

function canStaffPerformAllServices(staff: StaffMember, serviceIds: string[]) {
  return serviceIds.every((serviceId) => canStaffPerformService(staff, serviceId));
}

function isStaffAvailableForSlot(staff: StaffMember, slot: { start: Date; end: Date }) {
  const override = staff.scheduleOverrides?.find((entry) => entry.date === format(slot.start, "yyyy-MM-dd"));
  if (override) {
    if (!override.isOpen) return false;
    if (!override.startTime || !override.endTime) return true;
    return timeToMinutes(slot.start) >= scheduleTimeToMinutes(override.startTime)
      && timeToMinutes(slot.end) <= scheduleTimeToMinutes(override.endTime);
  }
  if (staff.schedule.length === 0) return true;
  const entry = staff.schedule.find((s) => s.dayOfWeek === slot.start.getDay());
  if (!entry?.isWorking) return false;
  return timeToMinutes(slot.start) >= scheduleTimeToMinutes(entry.startTime) &&
    timeToMinutes(slot.end) <= scheduleTimeToMinutes(entry.endTime);
}

/**
 * Returns '#000000' or '#FFFFFF' depending on which contrasts better against the given hex color.
 * Uses the YIQ formula for perceptual brightness.
 */
function getContrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#FFFFFF";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#000000" : "#FFFFFF";
}

export function WidgetClient({ business, services, primaryColor, businessHours, scheduleOverrides = [], staffMembers, maxServicesPerBooking = 1, groupServicesByCategory = false, depositRequired = false, allowSameDayBookings = false, slotInterval = 30, minAdvanceBookingMinutes = 120, promoBlocks = [], locations = [], initialLocationSlug, initialServiceId, initialStaffId, initialDate, storyCampaignToken, previewMode = false, useBusinessScheduleOnly = false }: Props) {
  const router = useRouter();
  const legacy = useTranslations("legacy");
  const t = useTranslations("widget");
  const locale = useLocale();
  const previewText = ({
    es: { badge: "Modo simulación", notice: "Recorre el mismo flujo que verá tu cliente. No se creará ninguna reserva ni se iniciará un pago.", finish: "Finalizar simulación", completed: "Simulación completada", completedHint: "El flujo funciona correctamente y no se creó ninguna reserva.", restart: "Reiniciar simulación" },
    en: { badge: "Simulation mode", notice: "Follow the same flow your customer will see. No booking or payment will be created.", finish: "Finish simulation", completed: "Simulation completed", completedHint: "The flow works correctly and no booking was created.", restart: "Restart simulation" },
    it: { badge: "Modalità simulazione", notice: "Segui lo stesso flusso che vedrà il cliente. Non verranno create prenotazioni o pagamenti.", finish: "Termina simulazione", completed: "Simulazione completata", completedHint: "Il flusso funziona correttamente e non è stata creata alcuna prenotazione.", restart: "Riavvia simulazione" },
    pt: { badge: "Modo de simulação", notice: "Siga o mesmo fluxo que o cliente verá. Nenhuma reserva ou pagamento será criado.", finish: "Finalizar simulação", completed: "Simulação concluída", completedHint: "O fluxo funciona corretamente e nenhuma reserva foi criada.", restart: "Reiniciar simulação" },
    fr: { badge: "Mode simulation", notice: "Suivez le même parcours que votre client. Aucune réservation ni aucun paiement ne sera créé.", finish: "Terminer la simulation", completed: "Simulation terminée", completedHint: "Le parcours fonctionne correctement et aucune réservation n’a été créée.", restart: "Recommencer la simulation" },
    de: { badge: "Simulationsmodus", notice: "Durchlaufe denselben Ablauf wie deine Kundschaft. Es wird keine Buchung oder Zahlung erstellt.", finish: "Simulation abschließen", completed: "Simulation abgeschlossen", completedHint: "Der Ablauf funktioniert und es wurde keine Buchung erstellt.", restart: "Simulation neu starten" },
    "zh-CN": { badge: "模拟模式", notice: "体验客户看到的相同流程。不会创建预约或发起付款。", finish: "完成模拟", completed: "模拟已完成", completedHint: "流程运行正常，未创建任何预约。", restart: "重新模拟" },
  } as const)[locale as "es" | "en" | "it" | "pt" | "fr" | "de" | "zh-CN"];
  const dateLocale = ({ es, en: enUS, it, pt: ptBR, fr, de, "zh-CN": zhCN } as const)[locale as "es" | "en" | "it" | "pt" | "fr" | "de" | "zh-CN"] ?? es;
  const pc = `#${primaryColor}`;
  const bgColor = business.backgroundColor || "#0A0A0A";
  const textColor = business.textColor || "#FFFFFF";
  const textSecondary = business.textSecondary || `${textColor}66`;
  const fontSize = business.fontSize || 14;
  const cornerRadius = Math.max(0, Math.min(40, business.cornerRadius ?? 16));
  const shadowStyle = business.shadowStyle || "soft";
  const headerAlign = business.headerAlign || "left";
  const isMultiService = maxServicesPerBooking > 1;
  const initialLocation = locations.find((location) => location.slug === initialLocationSlug) ?? (locations.length === 1 ? locations[0] : null);
  const deepLinkedService = services.find((service) =>
    service.id === initialServiceId
    && service.bookingMode === "APPOINTMENT"
    && (!initialLocation || service.locationIds?.includes(initialLocation.id)),
  ) ?? null;
  const deepLinkedStaff = staffMembers?.find((staff) =>
    staff.id === initialStaffId
    && (!initialLocation || staff.locationIds?.includes(initialLocation.id))
    && (!deepLinkedService || canStaffPerformService(staff, deepLinkedService.id)),
  ) ?? null;
  const deepLinkedDate = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
    ? (() => {
        const [year, month, day] = initialDate.split("-").map(Number);
        const value = new Date(year, month - 1, day, 12, 0, 0, 0);
        return Number.isNaN(value.getTime()) ? null : value;
      })()
    : null;
  const eligibleDeepLinkStaff = deepLinkedService
    ? (staffMembers ?? []).filter((staff) =>
        (!initialLocation || staff.locationIds?.includes(initialLocation.id))
        && canStaffPerformService(staff, deepLinkedService.id),
      )
    : [];
  const initialStep: Step = !initialLocation && locations.length > 1
    ? "location"
    : !deepLinkedService
      ? "service"
      : deepLinkedService.recurringPlan
        ? "mode-select"
        : deepLinkedService.optionCategories.length > 0
          ? "options"
          : !deepLinkedStaff && eligibleDeepLinkStaff.length > 1
            ? "staff"
            : "datetime";
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation);
  const [step, setStep] = useState<Step>(initialStep);
  const [selectedService, setSelectedService] = useState<Service | null>(deepLinkedService);
  const [selectedServices, setSelectedServices] = useState<Service[]>(deepLinkedService && isMultiService ? [deepLinkedService] : []);
  const [expandedServiceCategories, setExpandedServiceCategories] = useState<string[]>([]);
  const [selectedOptionByCategory, setSelectedOptionByCategory] = useState<Record<string, string[]>>({});
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(deepLinkedStaff ?? (eligibleDeepLinkStaff.length === 1 ? eligibleDeepLinkStaff[0] : null));
  const [selectedStaffByServiceId, setSelectedStaffByServiceId] = useState<Record<string, string>>({});
  const [staffSelectionMode, setStaffSelectionMode] = useState<"single" | "split">("single");
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialStep === "datetime" ? deepLinkedDate : null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", address: "" });
  const [portalAccountActive, setPortalAccountActive] = useState(false);
  const [portalProfileComplete, setPortalProfileComplete] = useState(false);
  const isEmbedded = useSyncExternalStore(subscribeToEmbeddingContext, readEmbeddingContext, readServerEmbeddingContext);
  const [activationPassword, setActivationPassword] = useState("");
  const [activationPasswordConfirmation, setActivationPasswordConfirmation] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationMessage, setActivationMessage] = useState("");
  const [activationError, setActivationError] = useState("");
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({ name: false, email: false, phone: false, address: false });
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const blockedRequestRef = useRef(0);

  // ── Reward / Discount code state ──
  const [rewardCode, setRewardCode] = useState("");
  const [rewardStatus, setRewardStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [rewardError, setRewardError] = useState("");
  const [rewardDiscount, setRewardDiscount] = useState<{ type: string; value: number } | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountCodeStatus, setDiscountCodeStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [discountCodeError, setDiscountCodeError] = useState("");
  const [bookingDiscount, setBookingDiscount] = useState<{ type: string; value: number } | null>(null);
  const [activePromotionId, setActivePromotionId] = useState<string | null>(null);

  // ── Recurring booking state ──
  const [recurringMode, setRecurringMode] = useState<"single" | "recurring">("single");
  const [recurringSelectedDays, setRecurringSelectedDays] = useState<number[]>([]);
  const [recurringStartDate, setRecurringStartDate] = useState<string>("");
  const [recurringDurationMonths, setRecurringDurationMonths] = useState<number>(1);
  const [recurringTimes, setRecurringTimes] = useState<Record<number, string>>({});
  const [healthAnswers, setHealthAnswers] = useState<Record<number, string>>({});
  const [healthExtra, setHealthExtra] = useState("");
  const [healthTerms, setHealthTerms] = useState(false);
  const [rut, setRut] = useState("");
  const [recurringSubmitting, setRecurringSubmitting] = useState(false);
  const [recurringError, setRecurringError] = useState("");
  const [recurringSuccess, setRecurringSuccess] = useState<{ requiresApproval: boolean; serviceName: string } | null>(null);

  useEffect(() => {
    track("widget_opened", {
      embedded: isEmbedded,
      has_locations: locations.length > 1,
      has_preselected_service: Boolean(deepLinkedService),
      preview_mode: previewMode,
    }, { businessSlug: business.slug });
  }, [business.slug, deepLinkedService, isEmbedded, locations.length, previewMode]);

  useEffect(() => {
    let active = true;
    fetch("/api/client-portal/profile", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((profile) => {
        if (!active || !profile) return;
        setPortalAccountActive(true);
        setPortalProfileComplete(Boolean(profile.profileComplete));
        setForm((current) => ({
          name: current.name || profile.name || "",
          email: current.email || profile.email || "",
          phone: current.phone || profile.phone || "",
          address: current.address || profile.address || "",
        }));
        setRut((current) => current || profile.rut || "");
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  function continueWithSavedProfile() {
    const params = new URLSearchParams(window.location.search);
    params.delete("preview");
    if (selectedLocation) params.set("location", selectedLocation.slug);
    if (selectedService) params.set("service", selectedService.id);
    if (selectedStaff) params.set("staff", selectedStaff.id);
    if (selectedDate) params.set("date", format(selectedDate, "yyyy-MM-dd"));
    const query = params.toString();
    const returnTo = `/widget/${business.slug}${query ? `?${query}` : ""}`;
    const portalUrl = `/mi-agenda?returnTo=${encodeURIComponent(returnTo)}`;
    if (isEmbedded) {
      window.open(portalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(portalUrl);
  }

  const availableServices = useMemo(() => selectedLocation ? services.filter((service) => service.locationIds?.includes(selectedLocation.id)) : services, [services, selectedLocation]);
  const effectiveHours = selectedLocation?.hours?.length ? selectedLocation.hours : businessHours;
  const effectiveOverrides = selectedLocation?.scheduleOverrides?.length ? selectedLocation.scheduleOverrides : scheduleOverrides;
  const effectiveTimezone = selectedLocation?.timezone || business.timezone;
  const selectedStaffSchedule = getStaffScheduleForLocation(selectedStaff, selectedLocation?.id);
  const serviceGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; position: number; services: Service[] }
    >();

    for (const service of availableServices) {
      const id = service.category?.id ?? "__uncategorized";
      const current = groups.get(id) ?? {
        id,
        name: service.category?.name ?? "Otros servicios",
        position: service.category?.position ?? Number.MAX_SAFE_INTEGER,
        services: [],
      };
      current.services.push(service);
      groups.set(id, current);
    }

    return Array.from(groups.values()).sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name, "es")
    );
  }, [availableServices]);
  const shouldGroupServices =
    groupServicesByCategory && serviceGroups.some((group) => group.id !== "__uncategorized");

  const activeServices = useMemo(
    () => (
      selectedService?.bookingMode === "PRODUCTION"
        ? [selectedService]
        : isMultiService
          ? selectedServices
          : selectedService
            ? [selectedService]
            : []
    ),
    [isMultiService, selectedServices, selectedService]
  );
  const servicesNeedOptions = activeServices.some((service) => service.optionCategories.length > 0);
  const selectedOptionDetails = useMemo(() => {
    return activeServices.flatMap((service) =>
      service.optionCategories.flatMap((category) => {
        const alternativeIds = selectedOptionByCategory[category.id] ?? [];
        return category.alternatives
          .filter((alternative) => alternativeIds.includes(alternative.id))
          .map((alternative) => ({ service, category, alternative }));
      })
    );
  }, [activeServices, selectedOptionByCategory]);
  const selectedOptionAlternativeIds = selectedOptionDetails.map((item) => item.alternative.id);
  const optionDuration = selectedOptionDetails.reduce((sum, item) => sum + item.alternative.durationDelta, 0);
  const optionPrice = selectedOptionDetails.reduce((sum, item) => sum + item.alternative.priceDelta, 0);
  const durationByServiceId = useMemo(() => {
    const totals = new Map(activeServices.map((service) => [service.id, service.duration]));
    for (const item of selectedOptionDetails) {
      totals.set(item.service.id, (totals.get(item.service.id) ?? item.service.duration) + item.alternative.durationDelta);
    }
    return totals;
  }, [activeServices, selectedOptionDetails]);
  const optionsComplete = activeServices.every((service) =>
    service.optionCategories.every((category) => !category.isRequired || (selectedOptionByCategory[category.id]?.length ?? 0) > 0)
  );
  const sequentialDuration = activeServices.reduce((s, sv) => s + sv.duration, 0) + optionDuration;
  const selectedServiceIds = activeServices.map((service) => service.id);
  const commonStaffForSelectedServices = useMemo(() => {
    if (!staffMembers) return [];
    if (selectedServiceIds.length === 0) return staffMembers;
    return staffMembers.filter((staff) => (!selectedLocation || staff.locationIds?.includes(selectedLocation.id)) && canStaffPerformAllServices(staff, selectedServiceIds));
  }, [staffMembers, selectedServiceIds, selectedLocation]);
  const canChooseStaffPerService = useMemo(() => {
    if (!staffMembers || !isMultiService || activeServices.length <= 1) return false;
    return activeServices.every((service) =>
      staffMembers.some((staff) => (!selectedLocation || staff.locationIds?.includes(selectedLocation.id)) && canStaffPerformService(staff, service.id))
    );
  }, [activeServices, isMultiService, staffMembers, selectedLocation]);
  const needsStaffPerService = isMultiService && activeServices.length > 1 && commonStaffForSelectedServices.length === 0;
  const splitStaffMode = canChooseStaffPerService && (needsStaffPerService || staffSelectionMode === "split");
  const splitStaffAssignments = useMemo(() => activeServices
    .map((service) => ({ serviceId: service.id, staffId: selectedStaffByServiceId[service.id] }))
    .filter((assignment): assignment is StaffAssignment => Boolean(assignment.staffId)),
    [activeServices, selectedStaffByServiceId]
  );
  const splitStaffSelectionComplete = !splitStaffMode || splitStaffAssignments.length === activeServices.length;
  const totalDuration = splitStaffMode
    ? Math.max(0, ...activeServices.map((service) => durationByServiceId.get(service.id) ?? service.duration))
    : sequentialDuration;
  const rawTotalPrice = activeServices.reduce((s, sv) => s + sv.price, 0) + optionPrice;
  const activePromotion = promoBlocks.find((block) => block.id === activePromotionId) ?? null;
  const promotionResult = useMemo(() => activePromotion
    ? calculateWidgetPromotion({
        subtotal: rawTotalPrice,
        discountType: activePromotion.discountType,
        discountValue: activePromotion.discountValue,
        discountStartsAt: activePromotion.discountStartsAt,
        discountEndsAt: activePromotion.discountEndsAt,
        discountMinSubtotal: activePromotion.discountMinSubtotal,
      })
    : null,
  [activePromotion, rawTotalPrice]);

  // Reward codes and widget promotions intentionally do not stack.
  const totalPrice = useMemo(() => {
    if (bookingDiscount) {
      if (bookingDiscount.type === "PERCENTAGE") {
        return Math.max(0, rawTotalPrice - Math.round(rawTotalPrice * bookingDiscount.value / 100));
      }
      return Math.max(0, rawTotalPrice - bookingDiscount.value);
    }
    if (rewardDiscount) {
      if (rewardDiscount.type === "PERCENTAGE") {
        return Math.max(0, rawTotalPrice - Math.round(rawTotalPrice * rewardDiscount.value / 100));
      }
      return Math.max(0, rawTotalPrice - rewardDiscount.value);
    }
    return promotionResult?.quote?.discountedTotal ?? rawTotalPrice;
  }, [bookingDiscount, promotionResult, rawTotalPrice, rewardDiscount]);

  // Compute deposit amount dynamically from selected service(s)
  const depositAmount = useMemo(() => {
    if (!depositRequired) return 0;
    if (isMultiService) {
      return selectedServices.reduce((sum, sv) => sum + (sv.depositAmount || 0), 0);
    }
    return selectedService?.depositAmount || 0;
  }, [depositRequired, isMultiService, selectedServices, selectedService]);

  const effectiveDepositAmount = Math.min(depositAmount, totalPrice);
  const showDeposit = depositRequired && effectiveDepositAmount > 0;

  // Filter staff who can perform the selected service(s)
  const filteredStaff = useMemo(() => {
    if (!staffMembers) return [];
    const selectedServiceIds = isMultiService
      ? selectedServices.map((s) => s.id)
      : selectedService ? [selectedService.id] : [];
    if (selectedServiceIds.length === 0) return staffMembers;
    return staffMembers.filter((staff) => (!selectedLocation || staff.locationIds?.includes(selectedLocation.id)) && canStaffPerformAllServices(staff, selectedServiceIds));
  }, [staffMembers, selectedService, selectedServices, isMultiService, selectedLocation]);

  const hasMultipleFilteredStaff = filteredStaff.length > 1;

  const days = useMemo(() => {
    const availableDays = buildDays(
      effectiveTimezone,
      effectiveHours,
      allowSameDayBookings,
      effectiveOverrides,
      (date) => activeServices.every((service) => isServiceAvailableOnDate(service, date)),
    );
    if (!initialDate || !/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return availableDays;
    const [year, month, day] = initialDate.split("-").map(Number);
    const linkedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (Number.isNaN(linkedDate.getTime())) return availableDays;
    if (!activeServices.every((service) => isServiceAvailableOnDate(service, linkedDate))) return availableDays;
    const alreadyIncluded = availableDays.some((date) => format(date, "yyyy-MM-dd") === initialDate);
    return alreadyIncluded
      ? availableDays
      : [...availableDays, linkedDate].sort((left, right) => left.getTime() - right.getTime());
  }, [effectiveTimezone, effectiveHours, allowSameDayBookings, effectiveOverrides, initialDate, activeServices]);
  const slots = useMemo(() => {
    const dur = isMultiService ? totalDuration : selectedService?.duration;
    if (!selectedDate || !dur) return [];
    const staffSched = useBusinessScheduleOnly ? undefined : selectedStaffSchedule;
    const staffOverrides = useBusinessScheduleOnly ? undefined : selectedStaff?.scheduleOverrides;
    // The API returns appointment timestamps in UTC. Convert their end to the
    // business timezone before using it as a wall-clock start candidate.
    const appointmentEndStarts = blockedSlots.map((blocked) =>
      toZonedTime(new Date(blocked.endTime), effectiveTimezone),
    );
    let generated = buildSlots(
      selectedDate,
      dur,
      effectiveHours,
      staffSched,
      slotInterval,
      effectiveOverrides,
      appointmentEndStarts,
      staffOverrides,
    );

    // Same-day filtering logic
    const now = toZonedTime(new Date(), effectiveTimezone);
    const isToday = selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();

    if (isToday) {
      if (!allowSameDayBookings) return [];
      // Filter slots that are at least minAdvanceBookingMinutes in the future
      const cutoff = addMinutes(now, minAdvanceBookingMinutes);
      generated = generated.filter((slot) => slot.start > cutoff);
    }

    generated = generated.filter((slot) =>
      activeServices.every((service) => isServiceAvailableAtTime(service, slot.start, slot.end)),
    );

    return generated;
  }, [selectedDate, selectedService, effectiveHours, selectedStaffSchedule, selectedStaff?.scheduleOverrides, totalDuration, isMultiService, slotInterval, allowSameDayBookings, minAdvanceBookingMinutes, effectiveOverrides, blockedSlots, effectiveTimezone, activeServices, useBusinessScheduleOnly]);

  const requiresHomeAddress = selectedOptionDetails.some((item) => item.alternative.isHomeService);
  const validation = { name: form.name.trim().length >= 3, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), phone: /^\+?[0-9\s()-]{8,18}$/.test(form.phone.trim()), address: !requiresHomeAddress || form.address.trim().length >= 5 };
  const isFormValid = validation.name && validation.email && validation.phone && validation.address;
  const accountReadyForCurrentFlow = portalAccountActive
    && portalProfileComplete
    && validation.name
    && validation.email
    && validation.phone
    && validation.address
    && (!selectedService?.recurringPlan?.requiresRut || Boolean(rut.trim()));

  const assignedStaffIds = useMemo(() => {
    if (splitStaffMode) {
      return Array.from(new Set(splitStaffAssignments.map((assignment) => assignment.staffId)));
    }
    return selectedStaff?.id ? [selectedStaff.id] : [];
  }, [splitStaffMode, splitStaffAssignments, selectedStaff]);

  const fetchBlocked = useCallback(async (date: Date, staffIds: string[] = []) => {
    const requestId = blockedRequestRef.current + 1;
    blockedRequestRef.current = requestId;
    setBlockedSlots([]);
    setLoadingSlots(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const idsToFetch = staffIds.length > 0 ? staffIds : [undefined];
      const responses = await Promise.all(idsToFetch.map(async (staffId) => {
        const staffParam = staffId ? `&staffId=${staffId}` : "";
        const locationParam = selectedLocation ? `&locationId=${encodeURIComponent(selectedLocation.id)}` : "";
        const res = await fetch(`/api/business/${business.slug}/appointments?date=${dateStr}${staffParam}${locationParam}`, { headers: { "x-api-key": business.apiKey } });
        if (!res.ok) return [];
        const data = await res.json();
        return (data as BlockedSlot[]).map((slot) => ({ ...slot, staffId }));
      }));
      if (blockedRequestRef.current === requestId) setBlockedSlots(responses.flat());
    } catch { /* ignore */ } finally {
      if (blockedRequestRef.current === requestId) setLoadingSlots(false);
    }
  }, [business.slug, business.apiKey, selectedLocation]);

  useEffect(() => {
    if (!selectedDate) return;
    const timeoutId = window.setTimeout(() => {
      void fetchBlocked(selectedDate, assignedStaffIds);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedDate, assignedStaffIds, fetchBlocked]);

  const isSlotUnavailable = useCallback((slot: { start: Date; end: Date }) => {
    if (!splitStaffMode) return isBlocked(slot, blockedSlots, effectiveTimezone);

    for (const service of activeServices) {
      const staffId = selectedStaffByServiceId[service.id];
      const staff = staffMembers?.find((item) => item.id === staffId);
      if (!staff) return true;

      const serviceEnd = addMinutes(slot.start, durationByServiceId.get(service.id) ?? service.duration);
      const serviceSlot = { start: slot.start, end: serviceEnd };
      if (!useBusinessScheduleOnly && !isStaffAvailableForSlot({ ...staff, schedule: getStaffScheduleForLocation(staff, selectedLocation?.id) ?? staff.schedule }, serviceSlot)) return true;

      const staffBlockedSlots = blockedSlots.filter((blocked) => blocked.staffId === staffId);
      if (isBlocked(serviceSlot, staffBlockedSlots, effectiveTimezone)) return true;
    }

    return false;
  }, [
    activeServices,
    blockedSlots,
    durationByServiceId,
    selectedStaffByServiceId,
    splitStaffMode,
    staffMembers,
    effectiveTimezone,
    selectedLocation?.id,
    useBusinessScheduleOnly,
  ]);

  useEffect(() => {
    if (!selectedSlot || !isSlotUnavailable(selectedSlot)) return;
    const timeoutId = window.setTimeout(() => {
      setSelectedSlot(null);
      setStep("datetime");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedSlot, isSlotUnavailable]);

  // Helper: filter staff for a given set of service IDs (avoids stale useMemo)
  function getStaffForServices(serviceIds: string[]): StaffMember[] {
    if (!staffMembers) return [];
    if (serviceIds.length === 0) return staffMembers;
    return staffMembers.filter((staff) => (!selectedLocation || staff.locationIds?.includes(selectedLocation.id)) && canStaffPerformAllServices(staff, serviceIds));
  }

  function getStaffForService(serviceId: string): StaffMember[] {
    if (!staffMembers) return [];
    return staffMembers.filter((staff) => (!selectedLocation || staff.locationIds?.includes(selectedLocation.id)) && canStaffPerformService(staff, serviceId));
  }

  function handleSelectService(s: Service) {
    if (!isMultiService) {
      track("booking_service_selected", {
        booking_mode: s.bookingMode.toLowerCase(),
        service_count: 1,
        has_deposit: depositRequired || s.depositAmount > 0,
        has_options: s.optionCategories.length > 0,
      }, { businessSlug: business.slug });
    }
    if (s.bookingMode === "PRODUCTION") {
      setSelectedServices([]);
      setSelectedService(s);
      setSelectedDate(null);
      setSelectedSlot(null);
      setSelectedStaff(null);
      setSelectedOptionByCategory({});
      setStep(s.optionCategories.length > 0 ? "options" : "production");
      return;
    }
    if (isMultiService) {
      setSelectedStaff(null);
      setSelectedStaffByServiceId({});
      setStaffSelectionMode("single");
      setSelectedDate(null);
      setSelectedSlot(null);
      setSelectedServices((prev) => {
        const exists = prev.find((x) => x.id === s.id);
        if (exists) return prev.filter((x) => x.id !== s.id);
        if (prev.length >= maxServicesPerBooking) return prev;
        return [...prev, s];
      });
      return;
    }
    setSelectedService(s); setSelectedDate(null); setSelectedSlot(null); setSelectedStaff(null); setSelectedStaffByServiceId({}); setStaffSelectionMode("single"); setSelectedOptionByCategory({});
    // If service has a recurring plan, let the user choose mode
    if (s.recurringPlan) {
      setRecurringMode("single");
      setStep("mode-select");
      return;
    }
    if (s.optionCategories.length > 0) {
      setStep("options");
      return;
    }
    continueToScheduling([s]);
  }

  function continueToScheduling(servicesToSchedule: Service[]) {
    const serviceIds = servicesToSchedule.map((service) => service.id);
    const nowFiltered = getStaffForServices(serviceIds);
    const canSplitTheseServices = isMultiService && servicesToSchedule.length > 1 && servicesToSchedule.every((service) => getStaffForService(service.id).length > 0);
    if (isMultiService && servicesToSchedule.length > 1 && (nowFiltered.length > 0 || canSplitTheseServices)) {
      setStaffSelectionMode(nowFiltered.length === 0 ? "split" : "single");
      setSelectedStaff(nowFiltered.length === 1 ? nowFiltered[0] : null);
      setSelectedStaffByServiceId({});
      setStep("staff");
    } else if (nowFiltered.length > 1) { setStep("staff"); } else {
      if (nowFiltered.length === 1) setSelectedStaff(nowFiltered[0]);
      setStep("datetime");
    }
  }

  function handleOptionsContinue() {
    if (!optionsComplete) return;
    if (selectedService?.bookingMode === "PRODUCTION") {
      setStep("production");
      return;
    }
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedStaff(null);
    setSelectedStaffByServiceId({});
    setStaffSelectionMode("single");
    continueToScheduling(activeServices);
  }

  function handleOptionsBack() {
    setSelectedOptionByCategory({});
    setStep(selectedService?.recurringPlan && recurringMode === "single" ? "mode-select" : "service");
  }

  function toggleOption(category: ServiceOptionCategory, alternativeId: string) {
    setSelectedOptionByCategory((prev) => {
      const current = prev[category.id] ?? [];
      if (current.includes(alternativeId)) {
        return { ...prev, [category.id]: current.filter((id) => id !== alternativeId) };
      }
      if (category.maxSelections === 1) {
        return { ...prev, [category.id]: [alternativeId] };
      }
      if (current.length >= category.maxSelections) return prev;
      return { ...prev, [category.id]: [...current, alternativeId] };
    });
  }

  function continueSingleSessionFromModeSelect() {
    if (!selectedService) return;
    setSelectedOptionByCategory({});
    if (selectedService.optionCategories.length > 0) {
      setStep("options");
      return;
    }
    continueToScheduling([selectedService]);
  }

  function handleMultiServiceContinue() {
    if (selectedServices.length === 0) return;
    track("booking_service_selected", {
      booking_mode: "appointment",
      service_count: selectedServices.length,
      has_deposit: depositRequired || selectedServices.some((service) => service.depositAmount > 0),
      has_options: selectedServices.some((service) => service.optionCategories.length > 0),
    }, { businessSlug: business.slug });
    setSelectedService(selectedServices[0]);
    setSelectedDate(null); setSelectedSlot(null); setSelectedStaff(null); setSelectedStaffByServiceId({}); setStaffSelectionMode("single"); setSelectedOptionByCategory({});
    if (selectedServices.some((service) => service.optionCategories.length > 0)) {
      setStep("options");
      return;
    }
    continueToScheduling(selectedServices);
  }

  async function handleValidateDiscountCode() {
    const code = discountCode.trim().toUpperCase();
    if (!code) return;
    if (rewardDiscount || promotionResult?.quote) {
      setDiscountCodeStatus("invalid");
      setDiscountCodeError("Los códigos de reserva no se pueden combinar con banners ni premios.");
      return;
    }
    setDiscountCodeStatus("loading");
    setDiscountCodeError("");
    try {
      const res = await fetch(`/api/business/${business.slug}/validate-discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": business.apiKey },
        body: JSON.stringify({ code, subtotal: rawTotalPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDiscountCodeStatus("invalid");
        setDiscountCodeError(data.error || "El código no se puede aplicar.");
        setBookingDiscount(null);
        return;
      }
      setDiscountCodeStatus("valid");
      setBookingDiscount({ type: data.discountType, value: data.discountValue });
      setRewardCode("");
      setRewardStatus("idle");
      setRewardError("");
      setRewardDiscount(null);
      setActivePromotionId(null);
    } catch {
      setDiscountCodeStatus("invalid");
      setDiscountCodeError("No se pudo validar el código.");
      setBookingDiscount(null);
    }
  }

  async function handleValidateReward() {
    const code = rewardCode.trim().toUpperCase();
    if (!code || !form.email) return;
    if (bookingDiscount) {
      setRewardStatus("invalid");
      setRewardError("Los premios no se pueden combinar con un código de reserva.");
      return;
    }
    setRewardStatus("loading");
    setRewardError("");
    try {
      const res = await fetch(`/api/business/${business.slug}/validate-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": business.apiKey },
        body: JSON.stringify({ code, email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatus("invalid");
        setRewardError(data.error || legacy("fJ9HALXMnGQJ"));
        setRewardDiscount(null);
      } else {
        setRewardStatus("valid");
        setRewardDiscount({ type: data.discountType, value: data.discountValue });
        setDiscountCode("");
        setDiscountCodeStatus("idle");
        setDiscountCodeError("");
        setBookingDiscount(null);
        setActivePromotionId(null);
      }
    } catch {
      setRewardStatus("invalid");
      setRewardError(legacy("rJG4kKZIhb1O"));
      setRewardDiscount(null);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, address: requiresHomeAddress });
    if (!selectedService || !selectedSlot || !isFormValid) return;
    if (loadingSlots) {
      setApiError(t("slotChecking"));
      return;
    }
    if (isSlotUnavailable(selectedSlot)) {
      setSelectedSlot(null);
      setStep("datetime");
      setApiError(t("slotUnavailable"));
      return;
    }
    if (previewMode) {
      setApiError("");
      setStep("success");
      return;
    }
    setSubmitting(true); setApiError("");
    try {
      const serviceIds = isMultiService && selectedServices.length > 0
        ? selectedServices.map((s) => s.id)
        : [selectedService.id];
      track("booking_details_submitted", {
        has_deposit: depositRequired,
        service_count: serviceIds.length,
      }, { businessSlug: business.slug });
      const res = await fetch(`/api/business/${business.slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": business.apiKey },
        body: JSON.stringify({
          serviceId: serviceIds[0], serviceIds,
          selectedOptionAlternativeIds,
          customerName: form.name.trim(), customerEmail: form.email.trim(),
          customerPhone: form.phone.trim(), startTime: fromZonedTime(selectedSlot.start, effectiveTimezone).toISOString(),
          customerAddress: requiresHomeAddress ? form.address.trim() : undefined,
          endTime: fromZonedTime(selectedSlot.end, effectiveTimezone).toISOString(),
          locationId: selectedLocation?.id,
          staffId: splitStaffMode ? undefined : selectedStaff?.id,
          staffAssignments: splitStaffMode ? splitStaffAssignments : undefined,
          rewardCode: rewardStatus === "valid" ? rewardCode.trim().toUpperCase() : undefined,
          discountCode: discountCodeStatus === "valid" ? discountCode.trim().toUpperCase() : undefined,
          promotionId: promotionResult?.quote ? activePromotionId || undefined : undefined,
          storyCampaignToken,
        }),
      });
      if (!res.ok) { const p = await res.json(); throw new Error(p.error || "No fue posible confirmar la reserva."); }
      const data = await res.json();
      const paymentRequired = Boolean(data.depositRequired && data.paymentUrl);
      track("booking_created", {
        has_deposit: Boolean(data.depositRequired),
        service_count: serviceIds.length,
        payment_required: paymentRequired,
      }, { businessSlug: business.slug });
      // If deposit is required and we have a payment URL, redirect to MP
      if (paymentRequired) {
        track("booking_payment_required", { payment_mode: "external" }, { businessSlug: business.slug });
        window.location.href = data.paymentUrl;
        return;
      }
      setStep("success");
    } catch (err) {
      track("booking_failed", { reason: "request_failed", stage: "submit" }, { businessSlug: business.slug });
      setApiError(err instanceof Error ? err.message : legacy("6ihSDtQvEFAi"));
    } finally { setSubmitting(false); }
  }

  async function activateClientAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActivationError("");
    if (activationPassword !== activationPasswordConfirmation) {
      setActivationError("Las contraseñas no coinciden");
      return;
    }
    setActivationLoading(true);
    try {
      const response = await fetch("/api/client-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: activationPassword,
          name: form.name,
          phone: form.phone,
          rut,
          defaultAddress: form.address,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No pudimos activar la cuenta");
      setActivationMessage(payload.message);
      setActivationPassword("");
      setActivationPasswordConfirmation("");
    } catch (error) {
      setActivationError(error instanceof Error ? error.message : "No pudimos activar la cuenta");
    } finally {
      setActivationLoading(false);
    }
  }

  function restart() {
    setStep("service"); setSelectedService(null); setSelectedServices([]); setSelectedStaff(null); setSelectedStaffByServiceId({}); setStaffSelectionMode("single"); setSelectedDate(null); setSelectedSlot(null);
    setSelectedOptionByCategory({});
    setForm({ name: "", email: "", phone: "", address: "" }); setTouched({ name: false, email: false, phone: false, address: false }); setApiError(""); setBlockedSlots([]);
    setRewardCode(""); setRewardStatus("idle"); setRewardError(""); setRewardDiscount(null);
    setDiscountCode(""); setDiscountCodeStatus("idle"); setDiscountCodeError(""); setBookingDiscount(null);
    setActivePromotionId(null);
    // Reset recurring state
    setRecurringMode("single"); setRecurringSelectedDays([]); setRecurringStartDate(""); setRecurringDurationMonths(1);
    setRecurringTimes({});
    setHealthAnswers({}); setHealthExtra(""); setHealthTerms(false); setRut(""); setRecurringError(""); setRecurringSuccess(null);
  }

  // ── Recurring helpers ──

  /** Check if adding a day would violate rest-day constraints */
  function isDayBlockedByRest(day: number, currentDays: number[]): boolean {
    if (!selectedService?.recurringPlan) return false;
    const plan = selectedService.recurringPlan;
    if (plan.mode !== "DAYS_WITH_REST") return false;
    const minRest = plan.minRestDays ?? 1;
    for (const d of currentDays) {
      const diff = Math.min(Math.abs(day - d), 7 - Math.abs(day - d));
      if (diff > 0 && diff <= minRest) return true;
    }
    return false;
  }

  /** Get the minimum required days for the current plan mode */
  function getMinDaysRequired(): number {
    if (!selectedService?.recurringPlan) return 1;
    const plan = selectedService.recurringPlan;
    if (plan.mode === "FIXED_DAYS") return 1;
    return plan.daysPerWeek ?? 1;
  }

  /** Get the max days allowed for DAYS_WITH_REST */
  function getMaxDaysAllowed(): number {
    if (!selectedService?.recurringPlan) return 7;
    const plan = selectedService.recurringPlan;
    if (plan.mode === "DAYS_WITH_REST") return plan.daysPerWeek ?? 7;
    return 7;
  }

  function toggleRecurringDay(day: number) {
    setRecurringSelectedDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      // DAYS_WITH_REST: enforce max days
      const max = getMaxDaysAllowed();
      if (prev.length >= max) return prev;
      return [...prev, day];
    });
    // Clear time if day deselected
    setRecurringTimes((prev) => {
      const next = { ...prev };
      if (prev[day]) delete next[day];
      return next;
    });
  }

  async function prefillClientData(email: string) {
    try {
      const res = await fetch(`/api/widget/${business.slug}/client?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setForm((prev) => ({
            ...prev,
            name: prev.name || data.name || "",
            email: prev.email,
            phone: prev.phone || data.phone || "",
          }));
          if (data.rut) setRut(data.rut);
        }
      }
    } catch { /* ignore */ }
  }

  async function handleRecurringConfirm() {
    if (!isFormValid) {
      setTouched({ name: true, email: true, phone: true, address: requiresHomeAddress });
      setRecurringError(legacy("xDRTNKKqtkJT"));
      return;
    }
    if (previewMode) {
      setRecurringError("");
      setRecurringSuccess({
        requiresApproval: false,
        serviceName: selectedService!.name,
      });
      setStep("success");
      return;
    }
    setRecurringSubmitting(true);
    setRecurringError("");
    try {
      const res = await fetch(`/api/widget/${business.slug}/book-recurring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService!.id,
          locationId: selectedLocation?.id,
          staffId: selectedStaff?.id,
          selectedDays: recurringSelectedDays,
          selectedTimes: recurringTimes,
          startDate: recurringStartDate,
          durationMonths: recurringDurationMonths,
          customerName: form.name.trim(),
          customerEmail: form.email.trim(),
          customerPhone: form.phone.trim(),
          customerAddress: requiresHomeAddress ? form.address.trim() : undefined,
          selectedOptionAlternativeIds,
          rut: rut || undefined,
          healthAnswers: Object.keys(healthAnswers).length > 0 ? healthAnswers : undefined,
          healthExtra: healthExtra || undefined,
          healthAccepted: healthTerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRecurringError(data.error || legacy("0Q1y3csNVMEX"));
        return;
      }
      setRecurringSuccess({
        requiresApproval: selectedService!.recurringPlan!.requiresApproval,
        serviceName: selectedService!.name,
      });
      setStep("success");
    } catch {
      setRecurringError(legacy("6ihSDtQvEFAi"));
    } finally {
      setRecurringSubmitting(false);
    }
  }

  const isRecurringFlow = recurringMode === "recurring" && selectedService?.recurringPlan && step !== "service" && step !== "mode-select" && step !== "staff";
  const isProductionFlow = selectedService?.bookingMode === "PRODUCTION" && step !== "service";
  const optionOffset = servicesNeedOptions ? 1 : 0;
  const needsStaffStep = hasMultipleFilteredStaff || needsStaffPerService || (canChooseStaffPerService && activeServices.length > 1);
  const staffOffset = needsStaffStep ? 1 : 0;
  const stepLabels = isProductionFlow
    ? ["Producto", ...(servicesNeedOptions ? ["Opciones"] : []), "Cupo y datos"]
    : isRecurringFlow
    ? ["Servicio", "Configurar plan", "Tus datos"]
    : [
        ...(locations.length > 1 ? ["Sucursal"] : []),
        isMultiService ? "Servicios" : "Servicio",
        ...(servicesNeedOptions ? ["Opciones"] : []),
        ...(needsStaffStep ? [needsStaffPerService ? "Profesionales" : "Profesional"] : []),
        "Fecha y hora",
        "Tus datos",
      ];
  const stepIdx = isProductionFlow
    ? step === "options" ? 1 : step === "production" ? stepLabels.length - 1 : 0
    : isRecurringFlow
    ? (step === "recurring-config" || step === "health-form" ? 1 : step === "recurring-confirm" ? 2 : stepLabels.length)
    : step === "location" ? 0
    : step === "service" || step === "mode-select" ? (locations.length > 1 ? 1 : 0)
    : step === "options" ? 1 + (locations.length > 1 ? 1 : 0)
    : step === "staff" ? 1 + optionOffset + (locations.length > 1 ? 1 : 0)
    : step === "datetime" ? 1 + optionOffset + staffOffset + (locations.length > 1 ? 1 : 0)
    : step === "details" ? 2 + optionOffset + staffOffset + (locations.length > 1 ? 1 : 0)
    : stepLabels.length;

  function renderServiceButton(service: Service) {
    const isSelected =
      isMultiService && selectedServices.some((selected) => selected.id === service.id);

    return (
      <button
        key={service.id}
        type="button"
        onClick={() => handleSelectService(service)}
        className="group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        style={{
          borderColor: isSelected ? `${pc}60` : "var(--wborder)",
          background: isSelected ? `${pc}08` : "var(--wsubtle)",
        }}
        onMouseEnter={(event) => {
          if (!isSelected) event.currentTarget.style.borderColor = `${pc}40`;
        }}
        onMouseLeave={(event) => {
          if (!isSelected) event.currentTarget.style.borderColor = "var(--wborder)";
        }}
      >
        {isSelected && (
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{ background: `linear-gradient(135deg, ${pc}00 0%, ${pc} 100%)` }}
          />
        )}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            {service.imageUrl && (
              <img
                src={service.imageUrl}
                alt={service.name}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 space-y-1">
              <p className="font-medium">{service.name}</p>
              {service.description && (
                <p className="text-sm" style={{ color: textSecondary }}>
                  {service.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: textSecondary }}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium shadow-sm"
                  style={{ borderColor: "var(--wborder)", background: "var(--wbg)" }}
                >
                  {service.bookingMode === "PRODUCTION" ? (
                    <>
                      <CalendarDays className="h-3.5 w-3.5" />
                      {service.productionScheduleMode === "CUSTOM"
                        ? legacy("PcDRhvBUOMbj")
                        : "Cupos semanales"}
                    </>
                  ) : (
                    <>
                      <Clock3 className="h-3.5 w-3.5" />
                      {service.duration} <LocalizedText id="H2-m9p0YXmCG" />
                    </>
                  )}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold shadow-sm"
                  style={{ borderColor: "var(--wborder)", background: "var(--wbg)" }}
                >
                  {formatPrice(service.price, business.currencyCode)}
                </span>
              </div>
            </div>
          </div>
          {isMultiService && service.bookingMode !== "PRODUCTION" ? (
            <div
              className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-all duration-300"
              style={
                isSelected
                  ? { borderColor: pc, background: pc }
                  : { borderColor: "var(--wborder)", background: "var(--wbg)" }
              }
            >
              {isSelected && <span className="text-sm font-bold text-white">✓</span>}
            </div>
          ) : (
            <ChevronRight
              className="mt-1 h-5 w-5 shrink-0 opacity-40 transition-transform group-hover:translate-x-1"
              style={{ color: textColor }}
            />
          )}
        </div>
      </button>
    );
  }

  const shellShadow = shadowStyle === "none"
    ? "none"
    : shadowStyle === "strong"
      ? "0 28px 70px rgba(0,0,0,.42)"
      : "0 18px 45px rgba(0,0,0,.24)";

  function renderPromoBlocks(placement: PromoBlock["placement"]) {
    const blocks = promoBlocks
      .filter((block) => block.placement === placement)
      .sort((a, b) => a.position - b.position);
    if (!blocks.length) return null;
    return (
      <div className="space-y-3 p-4 sm:p-5">
        {blocks.map((block) => {
          const hasDiscount = block.discountType === "PERCENTAGE" || block.discountType === "FIXED";
          const isActive = activePromotionId === block.id;
          const discountLabel = block.discountType === "PERCENTAGE"
            ? `${block.discountValue}% de descuento`
            : block.discountType === "FIXED"
              ? `${formatPrice(block.discountValue ?? 0, business.currencyCode)} de descuento`
              : null;
          const content = (
            <div
              className="group relative min-h-32 overflow-hidden border transition-all"
              style={{
                borderColor: isActive ? pc : "var(--wborder)",
                borderRadius: `${Math.max(8, cornerRadius - 4)}px`,
                boxShadow: isActive ? `0 0 0 2px ${pc}55` : undefined,
              }}
            >
              <img
                src={block.imageUrl}
                alt={block.title}
                loading={placement === "HEADER" ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="relative flex min-h-32 flex-col justify-end p-4" style={{ textAlign: block.textAlign === "center" ? "center" : block.textAlign === "right" ? "right" : "left" }}>
                <p className="text-base font-bold text-white">{block.title}</p>
                {block.subtitle && <p className="mt-1 text-xs text-white/75">{block.subtitle}</p>}
                {hasDiscount && (
                  <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">
                    <Gift className="h-3.5 w-3.5" />
                    {isActive ? "Descuento aplicado" : `Aplicar ${discountLabel}`}
                  </span>
                )}
              </div>
            </div>
          );
          if (hasDiscount) {
            return (
              <div key={block.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  aria-pressed={isActive}
                  onClick={() => {
                    if (!isActive && bookingDiscount) return;
                    setActivePromotionId(isActive ? null : block.id);
                    setDiscountCode("");
                    setDiscountCodeStatus("idle");
                    setDiscountCodeError("");
                    setBookingDiscount(null);
                    setRewardCode("");
                    setRewardStatus("idle");
                    setRewardError("");
                    setRewardDiscount(null);
                  }}
                >
                  {content}
                </button>
                {isActive && promotionResult?.error && (
                  <p className="mt-2 text-xs text-amber-500">{promotionResult.error}</p>
                )}
              </div>
            );
          }
          return block.linkUrl ? <a key={block.id} href={block.linkUrl} target="_blank" rel="noopener noreferrer">{content}</a> : <div key={block.id}>{content}</div>;
        })}
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-screen p-3 sm:p-5 flex justify-center items-start"
      style={{
        background: bgColor,
        ["--wp" as string]: pc,
        ["--wbg" as string]: bgColor,
        ["--wtext" as string]: textColor,
        ["--wtext-secondary" as string]: textSecondary,
        ["--wborder" as string]: business.secondaryColor,
        ["--wsubtle" as string]: `${textColor}08`,
        ["--wfont-size" as string]: `${fontSize}px`,
        fontSize: `${fontSize}px`,
        color: textColor,
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden border transition-all duration-500" style={{ background: bgColor, color: textColor, borderColor: "var(--wborder)", borderRadius: `${cornerRadius}px`, boxShadow: shellShadow }}>
        {/* Header */}
        <div className="border-b px-5 py-4 sm:px-6 relative overflow-hidden" style={{ background: `${bgColor}F2`, borderColor: "var(--wborder)", backdropFilter: "blur(12px)" }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `linear-gradient(135deg, ${pc}00 0%, ${pc}40 100%)` }} />
          <div className="relative flex items-center gap-2" style={{ justifyContent: headerAlign === "center" ? "center" : headerAlign === "right" ? "flex-end" : "space-between" }}>
            <div className="flex items-center gap-3" style={{ textAlign: headerAlign as "left" | "center" | "right" }}>
              {business.logoUrl && <img src={business.logoUrl} alt={business.name} className="h-8 w-8 rounded-lg object-cover" />}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: textSecondary }}>{t("onlineBooking")}</p>
                <h1 className="text-lg font-bold tracking-tight" style={{ color: textColor }}>{business.name}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerAlign === "left" && <span className="hidden rounded-lg px-2.5 py-1 text-xs font-medium sm:inline-flex" style={{ background: `${pc}20`, color: pc }}>{t("stepByStep")}</span>}
            </div>
          </div>
          {step !== "success" && (
            <div className="mt-4 grid gap-1.5 text-[9px] sm:gap-2 sm:text-xs" style={{ gridTemplateColumns: `repeat(${stepLabels.length}, minmax(0, 1fr))` }}>
              {stepLabels.map((label, i) => (
                <div key={label} className="flex min-w-0 items-center justify-center break-words rounded-full px-1 py-1.5 text-center leading-tight transition-all duration-300 sm:px-2" style={stepIdx >= i ? { background: `${pc}20`, color: pc } : { border: `1px solid ${textSecondary}15`, color: textSecondary }}>
                  {label}
                </div>
              ))}
            </div>
          )}
          {previewMode && (
            <div className="mt-3 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: `${pc}35`, background: `${pc}10`, color: textColor }}>
              <span className="font-bold" style={{ color: pc }}>{previewText.badge}:</span> {previewText.notice}
            </div>
          )}
        </div>
        {renderPromoBlocks("HEADER")}

        {isEmbedded && !portalAccountActive && !previewMode && step !== "success" && (
          <div className="border-b px-5 py-4 sm:px-6" style={{ borderColor: "var(--wborder)", background: `${pc}0F` }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: textColor }}>¿Ya tienes una cuenta?</p>
                <p className="mt-1 text-xs" style={{ color: textSecondary }}>Continúa en una pestaña segura para cargar tus datos guardados automáticamente.</p>
              </div>
              <button type="button" onClick={continueWithSavedProfile} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition hover:opacity-90" style={{ background: pc, color: getContrastColor(pc) }}>
                Usar mis datos <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6">
          {step === "location" && (
            <div className="animate-fade-up space-y-4">
              <div><h2 className="text-xl font-bold"><LocalizedText id="OLtF4Z0ixjtF" /></h2><p className="text-sm" style={{ color: textSecondary }}><LocalizedText id="pMnBTuPNxWp5" /></p></div>
              <div className="grid gap-3">
                {locations.map((location) => <button key={location.id} type="button" onClick={() => { setSelectedLocation(location); setSelectedService(null); setSelectedServices([]); setSelectedStaff(null); setSelectedDate(null); setSelectedSlot(null); setStep("service"); }} className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                  <div className="flex gap-3"><span className="mt-0.5 rounded-lg p-2" style={{ background: `${pc}18`, color: pc }}><MapPin className="h-4 w-4" /></span><span><span className="block font-semibold">{location.name}</span><span className="mt-1 block text-sm" style={{ color: textSecondary }}>{location.address || legacy("WQ1YypaGtdT4")}</span>{location.mapsUrl && <span className="mt-1 block text-xs" style={{ color: pc }}><LocalizedText id="0UWUc9ongHfL" /></span>}</span></div>
                </button>)}
              </div>
            </div>
          )}
          {/* Step 1: Service */}
          {step === "service" && (
            <div className="animate-fade-up space-y-4">
              <div><h2 className="text-xl font-bold">1. {isMultiService ? t("selectServices") : t("selectService")}</h2><p className="text-sm" style={{ color: textSecondary }}>{isMultiService ? t("selectUpTo", { count: maxServicesPerBooking }) : t("chooseService")}</p></div>
              {renderPromoBlocks("BETWEEN_SERVICES")}
              {!shouldGroupServices && (
              <div className="grid gap-3">
                {availableServices.map((s) => {
                  const isSelected = isMultiService && selectedServices.some((x) => x.id === s.id);
                  return (
                  <button key={s.id} type="button" onClick={() => handleSelectService(s)}
                    className="group rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
                    style={{ borderColor: isSelected ? `${pc}60` : "var(--wborder)", background: isSelected ? `${pc}08` : "var(--wsubtle)" }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = `${pc}40`; }} onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "var(--wborder)"; }}>
                    {isSelected && <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `linear-gradient(135deg, ${pc}00 0%, ${pc} 100%)` }} />}
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        {s.imageUrl && <img src={s.imageUrl} alt={s.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">{s.name}</p>
                          {s.description && <p className="text-sm" style={{ color: textSecondary }}>{s.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: textSecondary }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wbg)" }}>
                            {s.bookingMode === "PRODUCTION"
                              ? <><CalendarDays className="h-3.5 w-3.5" />{s.productionScheduleMode === "CUSTOM" ? legacy("PcDRhvBUOMbj") : "Cupos semanales"}</>
                              : <><Clock3 className="h-3.5 w-3.5" />{s.duration} <LocalizedText id="H2-m9p0YXmCG" /></>}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wbg)" }}>{formatPrice(s.price, business.currencyCode)}</span>
                        </div>
                        </div>
                      </div>
                      {isMultiService && s.bookingMode !== "PRODUCTION" ? (
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 shadow-sm" style={isSelected ? { borderColor: pc, background: pc } : { borderColor: "var(--wborder)", background: "var(--wbg)" }}>
                          {isSelected && <span className="text-sm text-white font-bold drop-shadow-md">✓</span>}
                        </div>
                      ) : (
                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 opacity-40 transition-transform group-hover:translate-x-1" style={{ color: textColor }} />
                      )}
                    </div>
                  </button>
                  );
                })}
              </div>
              )}
              {availableServices.length === 0 && <p className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--wborder)", color: textSecondary }}><LocalizedText id="jSYhcd_4EvRN" /></p>}
              {shouldGroupServices && (
                <div className="space-y-2">
                  {serviceGroups.map((group) => {
                    const expanded = expandedServiceCategories.includes(group.id);
                    return (
                      <div
                        key={group.id}
                        className="overflow-hidden rounded-2xl border"
                        style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}
                      >
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedServiceCategories((current) =>
                              current.includes(group.id)
                                ? current.filter((id) => id !== group.id)
                                : [...current, group.id]
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-white/5"
                        >
                          <span>
                            <span className="block font-semibold">{group.name}</span>
                            <span className="mt-0.5 block text-xs" style={{ color: textSecondary }}>
                              {group.services.length} <LocalizedText id="yITHWogdS11P" />{group.services.length === 1 ? "" : "s"}
                            </span>
                          </span>
                          {expanded ? (
                            <ChevronUp className="h-5 w-5 shrink-0" style={{ color: pc }} />
                          ) : (
                            <ChevronDown className="h-5 w-5 shrink-0" style={{ color: pc }} />
                          )}
                        </button>
                        {expanded && (
                          <div
                            className="grid gap-3 border-t p-3"
                            style={{ borderColor: "var(--wborder)" }}
                          >
                            {group.services.map(renderServiceButton)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {isMultiService && selectedServices.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl border p-4 text-sm space-y-1.5 shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                    <div className="flex justify-between" style={{ color: textSecondary }}><span><LocalizedText id="1_YsEG9Xmww9" /></span><span className="font-medium" style={{ color: textColor }}>{selectedServices.length}</span></div>
                    <div className="flex justify-between" style={{ color: textSecondary }}><span><LocalizedText id="dgEd0v4uyuOe" /></span><span className="font-medium" style={{ color: textColor }}>{totalDuration} <LocalizedText id="H2-m9p0YXmCG" /></span></div>
                    <div className="flex justify-between" style={{ color: textSecondary }}><span><LocalizedText id="wUXKFMl6EMAc" /></span><span className="font-medium" style={{ color: textColor }}>{formatPrice(totalPrice, business.currencyCode)}</span></div>
                  </div>
                  <button type="button" onClick={handleMultiServiceContinue}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98]" style={{ background: pc, color: getContrastColor(pc) }}>
                    {t("continue")} <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── MODE SELECT (single vs recurring) ── */}
          {step === "options" && activeServices.length > 0 && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={handleOptionsBack} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" />{t("back")}</button>
                <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}><LocalizedText id="gOIHGP3dh-AF" /></span>
              </div>
              <div><h2 className="text-xl font-bold">{t("chooseOptions")}</h2><p className="text-sm" style={{ color: textSecondary }}>{selectedService?.bookingMode === "PRODUCTION" ? t("customizeOrder") : t("adjustOptions")}</p></div>

              <div className="space-y-4">
                {activeServices.map((service) => (
                  service.optionCategories.length > 0 && (
                    <div key={service.id} className="space-y-3">
                      {activeServices.length > 1 && (
                        <p className="text-sm font-semibold" style={{ color: textColor }}>{service.name}</p>
                      )}
                      {service.optionCategories.map((category) => (
                        <div key={category.id} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{category.name}</p>
                            <span className="rounded-lg border px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ borderColor: "var(--wborder)", color: textSecondary }}>
                              {category.isRequired ? t("required") : t("optional")} · {category.maxSelections === 1 ? "1" : `${selectedOptionByCategory[category.id]?.length ?? 0}/${category.maxSelections}`}
                            </span>
                          </div>
                          <div className="grid gap-2">
                            {category.alternatives.map((alternative) => {
                              const active = (selectedOptionByCategory[category.id] ?? []).includes(alternative.id);
                              const selectionLimitReached = !active && (selectedOptionByCategory[category.id]?.length ?? 0) >= category.maxSelections;
                              return (
                                <button
                                  key={alternative.id}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => toggleOption(category, alternative.id)}
                                  disabled={selectionLimitReached}
                                  className="rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
                                  style={active ? { borderColor: `${pc}60`, background: `${pc}15` } : { borderColor: "var(--wborder)", background: "var(--wbg)" }}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <span>
                                      <span className="font-medium">{alternative.name}</span>
                                      {alternative.isHomeService && <span className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: pc }}><MapPin className="h-3 w-3" /><LocalizedText id="Wzupy32cyQJ0" /></span>}
                                    </span>
                                    <span className="text-xs font-semibold" style={{ color: active ? pc : textSecondary }}>
                                      {alternative.priceDelta > 0 ? `+${formatPrice(alternative.priceDelta, business.currencyCode)}` : `+${formatPrice(0, business.currencyCode)}`}
                                      {alternative.durationDelta > 0 ? ` / +${alternative.durationDelta} min` : ""}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>

              <div className="rounded-2xl border p-4 text-sm space-y-1.5" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                {selectedService?.bookingMode !== "PRODUCTION" && <div className="flex justify-between" style={{ color: textSecondary }}><span><LocalizedText id="A6IjhmJpsYHu" /></span><span className="font-medium" style={{ color: textColor }}>{totalDuration} <LocalizedText id="H2-m9p0YXmCG" /></span></div>}
                <div className="flex justify-between" style={{ color: textSecondary }}><span><LocalizedText id="wUXKFMl6EMAc" /></span><span className="font-medium" style={{ color: textColor }}>{formatPrice(rawTotalPrice, business.currencyCode)}</span></div>
              </div>

              <button type="button" disabled={!optionsComplete} onClick={handleOptionsContinue}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none" style={{ background: pc, color: getContrastColor(pc) }}>
                {selectedService?.bookingMode === "PRODUCTION" ? t("chooseSlot") : t("viewTimes")} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === "production" && selectedService?.bookingMode === "PRODUCTION" && (
            <ProductionOrderFlow
              business={{ slug: business.slug, apiKey: business.apiKey, name: business.name, currencyCode: business.currencyCode }}
              service={selectedService}
              selectedOptionAlternativeIds={selectedOptionAlternativeIds}
              totalPrice={rawTotalPrice}
              primaryColor={pc}
              textColor={textColor}
              textSecondary={textSecondary}
              previewMode={previewMode}
              onBack={() => {
                setSelectedOptionByCategory({});
                setSelectedService(null);
                setStep("service");
              }}
            />
          )}

          {step === "mode-select" && selectedService?.recurringPlan && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep("service")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" />{t("back")}</button>
              </div>
              <div><h2 className="text-xl font-bold"><LocalizedText id="cVzYcwGhWzyG" /></h2><p className="text-sm" style={{ color: textSecondary }}>{selectedService.name}</p></div>
              <div className="grid gap-3">
                <button type="button" onClick={() => {
                  setRecurringMode("single");
                  continueSingleSessionFromModeSelect();
                }}
                  className="rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${pc}40`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--wborder)")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold"><LocalizedText id="H4vK8iujJvTU" /></p>
                      <p className="text-sm mt-1" style={{ color: textSecondary }}><LocalizedText id="crvPY_FfU5T4" /></p>
                    </div>
                    <CalendarDays className="h-6 w-6 opacity-40" style={{ color: textColor }} />
                  </div>
                </button>
                <button type="button" onClick={() => {
                  setRecurringMode("recurring");
                  // Auto-select staff if only one
                  const nowFiltered = getStaffForServices([selectedService.id]);
                  if (nowFiltered.length === 1) setSelectedStaff(nowFiltered[0]);
                  setStep("recurring-config");
                }}
                  className="rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: `${pc}40`, background: `${pc}08` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold" style={{ color: pc }}><LocalizedText id="4alI-Y6ed-G0" /></p>
                      <p className="text-sm mt-1" style={{ color: textSecondary }}><LocalizedText id="bFmdqWS0tVZu" /> {selectedService.recurringPlan.durationOptions.map((m) => `${m} ${m === 1 ? "mes" : "meses"}`).join(" / ")}.</p>
                    </div>
                    <RefreshCw className="h-6 w-6" style={{ color: pc }} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── RECURRING CONFIG (Days & Times) ── */}
          {step === "recurring-config" && selectedService?.recurringPlan && (
            <div className="animate-fade-up space-y-6">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep(hasMultipleFilteredStaff && !selectedStaff ? "staff" : "mode-select")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80 transition-opacity" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" /><LocalizedText id="qyaue8o2IZU4" /></button>
                <span className="rounded-lg px-2.5 py-1 text-xs font-medium shadow-sm" style={{ background: `${pc}15`, color: pc }}>{selectedService.name}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight"><LocalizedText id="Ck3-UQR-UCTm" /></h2>
                <p className="text-sm mt-1" style={{ color: textSecondary }}><LocalizedText id="hC5u4S7DjBfN" /></p>
                <p className="mt-1 text-xs" style={{ color: textSecondary }}><LocalizedText id="hmpQuxX0f_-y" /> {business.timezone}.</p>
              </div>

              {/* Staff picker if multiple */}
              {(filteredStaff.length > 1 && !selectedStaff) && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold tracking-wide uppercase opacity-70" style={{ color: textColor }}><LocalizedText id="nem4x9RtHTxV" /></p>
                  <div className="grid gap-2">
                    {filteredStaff.map((st) => (
                      <button key={st.id} type="button" onClick={() => setSelectedStaff(st)}
                        className="flex items-center gap-3 rounded-2xl border p-4 text-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                        style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }}>
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden text-sm font-bold shadow-inner" style={{ background: `${pc}15`, color: pc }}>
                          {st.imageUrl ? <img src={st.imageUrl} alt={st.name} className="h-full w-full object-cover" /> : st.name.charAt(0)}
                        </div>
                        <span className="font-medium text-base">{st.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Dias y Horarios */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-wide uppercase opacity-70" style={{ color: textColor }}>{(filteredStaff.length > 1 && !selectedStaff) ? "2" : "1"}<LocalizedText id="FXrpkgBYdqMU" /></p>
                  <span className="text-xs font-medium" style={{ color: textSecondary }}>
                    {selectedService.recurringPlan.mode === "FIXED_DAYS"
                      ? "Dias fijos"
                      : selectedService.recurringPlan.mode === "FREE_MINIMUM"
                      ? `Minimo ${selectedService.recurringPlan.daysPerWeek ?? 1} dia(s)`
                      : `Elige ${selectedService.recurringPlan.daysPerWeek ?? 1} dia(s)`}
                  </span>
                </div>

                <div className="grid gap-3">
                  {WEEK_DAYS.map((d) => {
                    const plan = selectedService.recurringPlan!;
                    const isFixed = plan.mode === "FIXED_DAYS";
                    const selected = recurringSelectedDays.includes(d.value);
                    
                    let available = true;
                    if (isFixed) available = plan.fixedDays.includes(d.value);
                    if (!selected && plan.mode === "DAYS_WITH_REST") {
                      if (isDayBlockedByRest(d.value, recurringSelectedDays)) available = false;
                      if (recurringSelectedDays.length >= (plan.daysPerWeek ?? 7)) available = false;
                    }

                    if (!available && !selected && isFixed) return null; // Hide totally unavailable fixed days for cleaner UI

                    // Calculate typical slots for this day based on standard hours
                    const dummyDate = new Date(2024, 0, d.value === 0 ? 7 : d.value);
                    const slotsForDay = buildSlots(
                      dummyDate,
                      selectedService.duration,
                      effectiveHours,
                      useBusinessScheduleOnly ? undefined : selectedStaffSchedule,
                      slotInterval,
                      effectiveOverrides,
                      [],
                      useBusinessScheduleOnly ? undefined : selectedStaff?.scheduleOverrides,
                    ).map((slot) => format(slot.start, "HH:mm"));

                    return (
                      <div key={d.value} className="rounded-2xl border transition-all duration-300 overflow-hidden" 
                           style={selected ? { borderColor: `${pc}50`, background: "transparent", boxShadow: `0 4px 20px -5px ${pc}20` } : available ? { borderColor: "var(--wborder)", background: "var(--wsubtle)" } : { borderColor: "var(--wborder)", opacity: 0.4, background: "transparent" }}>
                        
                        {/* Day Toggle Button */}
                        <button type="button" 
                          disabled={!available && !selected}
                          onClick={() => toggleRecurringDay(d.value)}
                          className="w-full flex items-center justify-between p-4 text-left transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md border transition-all" 
                                 style={selected ? { borderColor: pc, background: pc } : { borderColor: "var(--wborder)", background: "transparent" }}>
                              {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
                            </div>
                            <span className="font-bold text-base" style={{ color: selected ? pc : textColor }}>{WEEK_NAMES[d.value]}</span>
                          </div>
                          {selected && recurringTimes[d.value] && (
                             <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: `${pc}15`, color: pc }}>{recurringTimes[d.value]}</span>
                          )}
                        </button>

                        {/* Inline Time Selector (Expandable) */}
                        {selected && (
                          <div className="px-4 pb-4 pt-1 animate-fade-down" style={{ animationDuration: "0.2s" }}>
                            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--wsubtle)", border: "1px solid var(--wborder)" }}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium opacity-70" style={{ color: textColor }}><LocalizedText id="eOB_QN0gix74" /> {WEEK_NAMES[d.value].toLowerCase()}s</span>
                              </div>
                              
                              {slotsForDay.length === 0 ? (
                                <p className="text-xs opacity-50" style={{ color: textColor }}><LocalizedText id="1nYeBgomLcb8" /></p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {slotsForDay.map((slot) => {
                                    const active = recurringTimes[d.value] === slot;
                                    return (
                                      <button key={slot} type="button"
                                        onClick={() => setRecurringTimes((prev) => ({ ...prev, [d.value]: slot }))}
                                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${active ? "shadow-md scale-105" : "hover:-translate-y-0.5 hover:shadow-sm"}`}
                                        style={active ? { borderColor: `${pc}60`, background: pc, color: getContrastColor(pc) } : { borderColor: "var(--wborder)", background: "transparent", color: textColor }}>
                                        {slot}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Fecha de inicio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-wide uppercase opacity-70" style={{ color: textColor }}>{(filteredStaff.length > 1 && !selectedStaff) ? "3" : "2"}<LocalizedText id="dqxLZyLJVGRi" /></p>
                  <span className="text-xs font-medium" style={{ color: pc }}><LocalizedText id="3d3tompK3WE1" /></span>
                </div>
                {recurringSelectedDays.length === 0 ? (
                  <p className="text-sm font-medium text-amber-500 flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> <LocalizedText id="OGv1MPVYtwZF" /></p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {Array.from({ length: selectedService.recurringPlan.startDateRangeDays || 30 }).map((_, i) => {
                      const d = addDays(toZonedTime(new Date(), business.timezone), i);
                      // ONLY show dates that match the selected recurring days!
                      if (!recurringSelectedDays.includes(d.getDay())) return null;
                      const dStr = format(d, "yyyy-MM-dd");
                      const sel = recurringStartDate === dStr;
                      return (
                        <button key={dStr} type="button" onClick={() => setRecurringStartDate(dStr)}
                          className={`rounded-2xl border px-2 py-3 text-center transition-all duration-200 ${sel ? "shadow-md scale-105" : "hover:-translate-y-1 hover:shadow-md"}`}
                          style={sel ? { borderColor: `${pc}60`, background: `${pc}15` } : { borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                          <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: sel ? pc : textSecondary }}>{format(d, "EEE", { locale: dateLocale })}</p>
                          <p className="text-lg font-bold leading-none" style={{ color: textColor }}>{format(d, "d")}</p>
                          <p className="text-xs mt-1" style={{ color: textSecondary }}>{capitalize(format(d, "MMM", { locale: dateLocale }))}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Duracion */}
              <div className="space-y-3">
                <p className="text-sm font-semibold tracking-wide uppercase opacity-70" style={{ color: textColor }}>{(filteredStaff.length > 1 && !selectedStaff) ? "4" : "3"}<LocalizedText id="DuIGIIoMacxm" /></p>
                <div className="flex gap-3 flex-wrap">
                  {selectedService.recurringPlan.durationOptions.map((m) => {
                    const sel = recurringDurationMonths === m;
                    return (
                      <button key={m} type="button"
                        onClick={() => setRecurringDurationMonths(m)}
                        className={`rounded-2xl border px-6 py-3 text-sm font-bold transition-all duration-300 ${sel ? "shadow-md" : "hover:-translate-y-0.5 hover:shadow-sm"}`}
                        style={sel ? { borderColor: `${pc}60`, background: `${pc}20`, color: pc } : { borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }}>
                        {m} {m === 1 ? "mes" : "meses"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4">
                <button type="button"
                  disabled={recurringSelectedDays.length < getMinDaysRequired() || !recurringStartDate || recurringSelectedDays.some((d) => !recurringTimes[d]) || (filteredStaff.length > 1 && !selectedStaff)}
                  onClick={() => {
                    const plan = selectedService.recurringPlan!;
                    if (plan.requiresHealthForm) setStep("health-form");
                    else setStep("recurring-confirm");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all hover:opacity-90 hover:shadow-xl hover:shadow-brand/20 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
                  style={{ background: pc, color: getContrastColor(pc) }}>
                  <LocalizedText id="Y-K7rxySQ5G6" /> <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}



          {/* ── HEALTH FORM ── */}
          {step === "health-form" && selectedService?.recurringPlan?.requiresHealthForm && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep("recurring-config")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" /><LocalizedText id="qyaue8o2IZU4" /></button>
              </div>
              <div><h2 className="text-xl font-bold"><LocalizedText id="LyTjbgn_C_Eu" /></h2><p className="text-sm" style={{ color: textSecondary }}><LocalizedText id="Qh5IzC5LqJW3" /></p></div>

              <div className="space-y-4">
                {selectedService.recurringPlan.healthQuestions.map((q, i) => (
                  <div key={i} className="space-y-1.5">
                    <label className="text-sm" style={{ color: textColor }}>{q}</label>
                    <input
                      type="text"
                      value={healthAnswers[i] || ""}
                      onChange={(e) => setHealthAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder={legacy("YfRU_DqnIwya")}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                      style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-sm" style={{ color: textColor }}><LocalizedText id="s8alv4yIVIoX" /></label>
                  <textarea
                    value={healthExtra}
                    onChange={(e) => setHealthExtra(e.target.value)}
                    rows={3}
                    placeholder={legacy("mv79sQ2Q4bEJ")}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                    style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }}
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={healthTerms} onChange={(e) => setHealthTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded" style={{ accentColor: pc }} />
                  <span className="text-sm" style={{ color: textSecondary }}><LocalizedText id="vI24hOzffnNh" /></span>
                </label>
              </div>

              <button type="button"
                disabled={!healthTerms}
                onClick={() => setStep("recurring-confirm")}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: pc, color: getContrastColor(pc) }}>
                <LocalizedText id="aGMEcnEhnbZL" /> <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── RECURRING CONFIRM ── */}
          {step === "recurring-confirm" && selectedService?.recurringPlan && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep(selectedService.recurringPlan!.requiresHealthForm ? "health-form" : "recurring-config")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" /><LocalizedText id="qyaue8o2IZU4" /></button>
              </div>
              <div>
                <h2 className="text-xl font-bold"><LocalizedText id="r1XEQHIk4blZ" /></h2>
                <p className="text-sm" style={{ color: textSecondary }}><LocalizedText id="NzKFclHirR7t" /></p>
                <p className="mt-1 text-xs" style={{ color: textSecondary }}><LocalizedText id="o7xULAnP2LCe" /> {business.timezone}</p>
              </div>

              {/* Summary table */}
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--wborder)" }}>
                <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textSecondary }}>
                  <div className="grid grid-cols-3 gap-2"><span><LocalizedText id="jtVwlQ2DEs1f" /></span><span><LocalizedText id="UD8xLN4D4hem" /></span><span><LocalizedText id="vdP-FeH1xfCE" /></span></div>
                </div>
                {recurringSelectedDays.map((day) => (
                  <div key={day} className="px-4 py-3 border-b text-sm" style={{ borderColor: "var(--wborder)", color: textColor }}>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="font-medium">{WEEK_NAMES[day]}</span>
                      <span style={{ color: pc, fontWeight: 600 }}>{recurringTimes[day]}</span>
                      <span style={{ color: textSecondary }}>{recurringDurationMonths} {recurringDurationMonths === 1 ? "mes" : "meses"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Service + staff + dates */}
              <div className="rounded-2xl border p-4 text-sm space-y-2" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                <div className="flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="Hvo7RVoGJF6_" /></span><span className="font-medium">{selectedService.name}</span></div>
                {selectedStaff && <div className="flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="sfRNCRcOfyZL" /></span><span className="font-medium">{selectedStaff.name}</span></div>}
                <div className="flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="WPzJRo_h9gcW" /></span><span className="font-medium">{recurringStartDate}</span></div>
                <div className="flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="7EnvYqfSc0cm" /></span><span className="font-medium">{format(addMonths(new Date(recurringStartDate), recurringDurationMonths), "dd/MM/yyyy")}</span></div>
                {selectedService.recurringPlan.requiresApproval && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs" style={{ color: textColor }}>
                    <LocalizedText id="Sx1W6VF0LQMS" />
                  </div>
                )}
              </div>

              {/* Client data mini-form */}
              <div className="space-y-3">
                <p className="text-sm font-medium opacity-70" style={{ color: textColor }}><LocalizedText id="IAkiAUdTqKb9" /></p>
                {accountReadyForCurrentFlow ? (
                  <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: `${pc}55`, background: `${pc}0D` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={{ color: textColor }}>{form.name}</p>
                        <p className="mt-1" style={{ color: textSecondary }}>{form.email} · {form.phone}</p>
                        {requiresHomeAddress && <p className="mt-1" style={{ color: textSecondary }}>{form.address}</p>}
                        {selectedService.recurringPlan.requiresRut && <p className="mt-1" style={{ color: textSecondary }}>{business.taxIdLabel}: {rut}</p>}
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: pc }} />
                    </div>
                    <a href="/mi-agenda#perfil" className="mt-3 inline-flex text-xs font-semibold underline underline-offset-4" style={{ color: pc }}>Editar mis datos</a>
                  </div>
                ) : (
                  <>
                    {([["name", "Nombre y apellido", UserRound, "text"] as const, ["email", legacy("yuPdaXQLQg3R"), Mail, "email"] as const, ["phone", "Telefono", Phone, "tel"] as const]).map(([field, label, Icon, type]) => (
                      <div key={field} className="space-y-1">
                        <label className="flex items-center gap-1.5 text-xs opacity-70" style={{ color: textColor }}><Icon className="h-3 w-3" />{label}</label>
                        <input type={type} value={form[field as keyof FormState]}
                          onChange={(e) => {
                            setForm((p) => ({ ...p, [field]: e.target.value }));
                            if (field === "email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                              prefillClientData(e.target.value);
                            }
                          }}
                          placeholder={label}
                          required
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                          style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }}
                        />
                      </div>
                    ))}
                    {requiresHomeAddress && (
                      <div className="space-y-1 rounded-xl border p-3" style={{ borderColor: `${pc}45`, background: `${pc}08` }}>
                        <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: textColor }}><MapPin className="h-3.5 w-3.5" /><LocalizedText id="nOiX8ucGiUHj" /></label>
                        <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder={legacy("KMhg2VKv-lxV")} required maxLength={300} rows={3}
                          className="w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
                      </div>
                    )}
                    {selectedService.recurringPlan.requiresRut && (
                      <div className="space-y-1">
                        <label className="text-xs opacity-70" style={{ color: textColor }}>{business.taxIdLabel}</label>
                        <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder={business.taxIdPlaceholder} maxLength={20}
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                          style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textColor }} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {recurringError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 font-medium">{recurringError}</div>}

              <button type="button"
                disabled={recurringSubmitting || !isFormValid || (selectedService.recurringPlan.requiresRut && !rut.trim())}
                onClick={handleRecurringConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: pc, color: getContrastColor(pc) }}>
                {recurringSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /><LocalizedText id="ohcdoXn87Q6J" /></> : <><LocalizedText id="r1XEQHIk4blZ" /> <ChevronRight className="h-5 w-5" /></>}
              </button>
            </div>
          )}

          {/* Step 1.5: Staff (only if multi-staff) */}
          {step === "staff" && selectedService && splitStaffMode && (
            <div className="animate-fade-up space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("service")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" /><LocalizedText id="qyaue8o2IZU4" /></button>
                <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}><LocalizedText id="wpRGdUrhm5Ag" /></span>
              </div>
              <div>
                <h2 className="text-xl font-bold">2. {t("chooseProfessionals")}</h2>
                <p className="text-sm" style={{ color: textSecondary }}>{t("assignEach")}</p>
              </div>
              {commonStaffForSelectedServices.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStaffSelectionMode("single");
                    setSelectedStaffByServiceId({});
                    setSelectedDate(null);
                    setSelectedSlot(null);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}
                >
                  <div>
                    <p className="font-semibold">{t("oneForAll")}</p>
                    <p className="text-sm" style={{ color: textSecondary }}><LocalizedText id="e8Kih3-KFYfX" /></p>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-40" style={{ color: textColor }} />
                </button>
              )}
              <div className="space-y-4">
                {activeServices.map((service) => {
                  const staffForService = getStaffForService(service.id);
                  const selectedId = selectedStaffByServiceId[service.id];
                  return (
                    <div key={service.id} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{service.name}</p>
                          <p className="text-xs" style={{ color: textSecondary }}>{durationByServiceId.get(service.id) ?? service.duration} <LocalizedText id="H2-m9p0YXmCG" /></p>
                        </div>
                        {selectedId && <span className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase" style={{ background: `${pc}15`, color: pc }}><LocalizedText id="9K4Q6JxWEUuF" /></span>}
                      </div>
                      <div className="grid gap-2">
                        {staffForService.map((staff) => {
                          const active = selectedId === staff.id;
                          return (
                            <button
                              key={staff.id}
                              type="button"
                              onClick={() => {
                                setSelectedStaffByServiceId((prev) => ({ ...prev, [service.id]: staff.id }));
                                setSelectedDate(null);
                                setSelectedSlot(null);
                              }}
                              className="flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
                              style={active ? { borderColor: `${pc}60`, background: `${pc}15` } : { borderColor: "var(--wborder)", background: "var(--wbg)" }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg text-sm font-bold" style={{ background: `${pc}15`, color: pc }}>
                                  {staff.imageUrl ? <img src={staff.imageUrl} alt={staff.name} className="h-full w-full object-cover" /> : staff.name.charAt(0)}
                                </div>
                                <span className="font-medium">{staff.name}</span>
                              </div>
                              {active && <CheckCircle2 className="h-4 w-4" style={{ color: pc }} />}
                            </button>
                          );
                        })}
                        {staffForService.length === 0 && (
                          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{t("noProfessionals")}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" disabled={!splitStaffSelectionComplete} onClick={() => { setSelectedDate(null); setSelectedSlot(null); setStep("datetime"); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none" style={{ background: pc, color: getContrastColor(pc) }}>
                {t("viewTimes")} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === "staff" && selectedService && filteredStaff.length > 0 && !splitStaffMode && (
            <div className="animate-fade-up space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("service")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" />{t("back")}</button>
                <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}>{selectedService.name}</span>
              </div>
              <div><h2 className="text-xl font-bold">2. {t("chooseProfessional")}</h2><p className="text-sm" style={{ color: textSecondary }}>{t("selectProvider")}</p></div>
              {canChooseStaffPerService && activeServices.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setStaffSelectionMode("split");
                    setSelectedStaff(null);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: `${pc}40`, background: `${pc}08` }}
                >
                  <div>
                    <p className="font-semibold" style={{ color: pc }}>{t("assignByService")}</p>
                    <p className="text-sm" style={{ color: textSecondary }}>{t("chooseDifferent")}</p>
                  </div>
                  <ChevronRight className="h-5 w-5" style={{ color: pc }} />
                </button>
              )}
              <div className="grid gap-3">
                {filteredStaff.map((staff) => (
                  <button key={staff.id} type="button" onClick={() => { setSelectedStaff(staff); setSelectedDate(null); setSelectedSlot(null); setStep("datetime"); }}
                    className="group rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${pc}40`)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--wborder)")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-sm font-bold" style={{ background: `${pc}15`, color: pc }}>
                          {staff.imageUrl ? <img src={staff.imageUrl} alt={staff.name} className="h-full w-full object-cover" /> : staff.name.charAt(0)}
                        </div>
                        <p className="font-medium">{staff.name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-25" style={{ color: textColor }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: DateTime */}
          {step === "datetime" && selectedService && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep(needsStaffStep ? "staff" : "service")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" /><LocalizedText id="qyaue8o2IZU4" /></button>
                <div className="flex gap-2">
                  <span className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: `${pc}15`, color: pc }}>{selectedService.name}</span>
                  {selectedStaff && <span className="rounded-lg px-2.5 py-1 text-xs font-medium border opacity-60" style={{ color: textColor, borderColor: `${textColor}15` }}>{selectedStaff.name}</span>}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">{needsStaffStep ? "3" : "2"}. {t("chooseDateTime")}</h2>
                <p className="text-sm" style={{ color: textSecondary }}>{t("selectDayTime")}</p>
                <p className="mt-1 text-xs" style={{ color: textSecondary }}><LocalizedText id="WfCox5-Gii6b" /> {business.timezone}.</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium opacity-70" style={{ color: textColor }}>{t("availableDays")}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {days.map((day) => {
                    const sel = selectedDate?.toDateString() === day.toDateString();
                    const staffWorking = useBusinessScheduleOnly ? true : splitStaffMode
                      ? activeServices.every((service) => {
                          const staff = staffMembers?.find((item) => item.id === selectedStaffByServiceId[service.id]);
                          return staff ? isStaffWorkingOnDay(staff, day, getStaffScheduleForLocation(staff, selectedLocation?.id)) : false;
                        })
                      : selectedStaff ? isStaffWorkingOnDay(selectedStaff, day, selectedStaffSchedule) : true;
                    return (
                      <button key={day.toISOString()} type="button" disabled={!staffWorking}
                        onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                        className={`rounded-2xl border px-2 py-3 text-center transition-all duration-200 ${!staffWorking ? "opacity-30 cursor-not-allowed" : "hover:-translate-y-1 hover:shadow-md"}`}
                        style={sel ? { borderColor: `${pc}60`, background: `${pc}15` } : { borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                        <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: textSecondary }}>{capitalize(format(day, "EEE", { locale: dateLocale }))}</p>
                        <p className="text-lg font-bold leading-none">{format(day, "d")}</p>
                        <p className="text-xs" style={{ color: textSecondary }}>{capitalize(format(day, "MMMM", { locale: dateLocale }))}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedDate && (
                <div className="space-y-3">
                  <p className="text-sm font-medium opacity-70" style={{ color: textColor }}>{capitalize(format(selectedDate, "PPPP", { locale: dateLocale }))}</p>
                  {loadingSlots ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin opacity-40" style={{ color: textColor }} /></div>
                  ) : slots.length === 0 || slots.every(isSlotUnavailable) ? (
                    <div
                      className="rounded-2xl border px-4 py-5 text-center"
                      style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}
                    >
                      <Clock3 className="mx-auto h-5 w-5 opacity-40" style={{ color: textColor }} />
                      <p className="mt-2 text-sm font-semibold" style={{ color: textColor }}>{t("noTimes")}</p>
                      <p className="mt-1 text-xs" style={{ color: textSecondary }}>{t("tryAnotherDate")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {slots.map((slot) => {
                        const blocked = isSlotUnavailable(slot);
                        const active = selectedSlot?.start.getTime() === slot.start.getTime();
                        return (
                          <button key={slot.start.toISOString()} type="button" disabled={blocked} onClick={() => {
                            setSelectedSlot(slot);
                            track("booking_slot_selected", {
                              lead_days: Math.max(0, Math.ceil((slot.start.getTime() - Date.now()) / 86_400_000)),
                              has_staff: Boolean(selectedStaff) || splitStaffMode,
                              service_count: activeServices.length,
                            }, { businessSlug: business.slug });
                          }}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${blocked ? "cursor-not-allowed opacity-20 line-through" : "hover:border-brand/40 hover:shadow-sm hover:-translate-y-0.5"}`}
                            style={active && !blocked ? { borderColor: `${pc}60`, background: `${pc}20`, color: pc, fontWeight: 700 } : blocked ? { borderColor: "var(--wborder)" } : { borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                            {format(slot.start, "HH:mm")}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <button type="button" disabled={!selectedSlot} onClick={() => setStep("details")}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none mt-6" style={{ background: pc, color: getContrastColor(pc) }}>
                {t("continueDetails")} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 3: Details */}
          {step === "details" && selectedService && selectedSlot && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("datetime")} className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80" style={{ color: textColor }}><ChevronLeft className="h-4 w-4" /><LocalizedText id="qyaue8o2IZU4" /></button>
                <span className="rounded-lg px-2.5 py-1 text-xs" style={{ background: `${pc}15`, color: pc }}><LocalizedText id="p3kaFdeVmZax" /></span>
              </div>
              <div><h2 className="text-xl font-bold">{hasMultipleFilteredStaff ? "4" : "3"}. {t("completeDetails")}</h2><p className="text-sm" style={{ color: textSecondary }}>{t("confirmationSent")}</p></div>
              <div className="rounded-2xl border p-5 text-sm space-y-3 shadow-sm" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "var(--wborder)" }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${pc}15`, color: pc }}>
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{capitalize(format(selectedSlot.start, "PPPP", { locale: dateLocale }))}</p>
                    <p style={{ color: textSecondary }}>{format(selectedSlot.start, "HH:mm")} - {format(selectedSlot.end, "HH:mm")}</p>
                    <p className="text-xs" style={{ color: textSecondary }}>{business.timezone}</p>
                  </div>
                </div>
                <div className="flex justify-between pt-1"><span style={{ color: textSecondary }}><LocalizedText id="Hvo7RVoGJF6_" /></span><span className="font-medium text-right max-w-[60%] truncate">{selectedService.name}</span></div>
                {selectedStaff && <div className="flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="sfRNCRcOfyZL" /></span><span className="font-medium">{selectedStaff.name}</span></div>}
                {selectedOptionDetails.length > 0 && (
                  <div className="space-y-1 border-t pt-3" style={{ borderColor: "var(--wborder)" }}>
                    {selectedOptionDetails.map(({ category, alternative }) => (
                      <div key={category.id} className="flex justify-between gap-3">
                        <span style={{ color: textSecondary }}>{category.name}</span>
                        <span className="font-medium text-right">{alternative.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between"><span style={{ color: textSecondary }}><LocalizedText id="vdP-FeH1xfCE" /></span><span className="font-medium">{totalDuration} <LocalizedText id="H2-m9p0YXmCG" /></span></div>

                <div className="flex justify-between items-center">
                  <span style={{ color: textSecondary }}><LocalizedText id="ybPDgkf3ROF9" /></span>
                  <span className="font-medium">
                    {bookingDiscount || rewardDiscount || promotionResult?.quote ? (
                      <span className="flex items-center gap-2">
                        <span className="line-through opacity-40">{formatPrice(rawTotalPrice, business.currencyCode)}</span>
                        <span style={{ color: pc }}>{totalPrice === 0 ? "GRATIS" : formatPrice(totalPrice, business.currencyCode)}</span>
                      </span>
                    ) : formatPrice(rawTotalPrice, business.currencyCode)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)", color: textSecondary }}>
                <span>{portalAccountActive ? "Tus datos se completaron desde Mi agenda." : "¿Ya tienes cuenta? Evita volver a escribir tus datos."}</span>
                {!portalAccountActive && <button type="button" onClick={continueWithSavedProfile} className="font-semibold underline underline-offset-4" style={{ color: pc }}>{isEmbedded ? "Abrir reserva segura" : "Iniciar sesión"}</button>}
              </div>
              <form onSubmit={handleConfirm} className="space-y-4">
                {accountReadyForCurrentFlow ? (
                  <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: `${pc}55`, background: `${pc}0D` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={{ color: textColor }}>{form.name}</p>
                        <p className="mt-1" style={{ color: textSecondary }}>{form.email} · {form.phone}</p>
                        {requiresHomeAddress && <p className="mt-1" style={{ color: textSecondary }}>{form.address}</p>}
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: pc }} />
                    </div>
                    <a href="/mi-agenda#perfil" className="mt-3 inline-flex text-xs font-semibold underline underline-offset-4" style={{ color: pc }}>Editar mis datos</a>
                  </div>
                ) : (
                  <>
                    {([["name", t("fullName"), "Alex Morgan", UserRound, "text"] as const, ["email", t("email"), "name@example.com", Mail, "email"] as const, ["phone", t("phone"), "+1 555 123 4567", Phone, "tel"] as const]).map(([field, label, placeholder, Icon, type]) => (
                      <div key={field} className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm opacity-70" style={{ color: textColor }}><Icon className="h-3.5 w-3.5" />{label}</label>
                        <input type={type} value={form[field]} onBlur={() => setTouched((p) => ({ ...p, [field]: true }))} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} placeholder={placeholder} required
                          className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 focus:shadow-md"
                          style={!touched[field] ? { borderColor: "var(--wborder)", background: "var(--wsubtle)" } : validation[field] ? { borderColor: `${pc}50`, background: `${pc}08` } : { borderColor: "rgba(220,38,38,0.5)", background: "rgba(220,38,38,0.05)" }} />
                        {touched[field] && !validation[field] && <p className="text-xs text-red-400"><LocalizedText id="eXjDwrn0NytH" /></p>}
                      </div>
                    ))}
                    {requiresHomeAddress && (
                      <div className="space-y-1.5 rounded-2xl border p-4" style={{ borderColor: `${pc}45`, background: `${pc}08` }}>
                        <label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: textColor }}><MapPin className="h-4 w-4" style={{ color: pc }} /><LocalizedText id="nOiX8ucGiUHj" /></label>
                        <p className="text-xs" style={{ color: textSecondary }}><LocalizedText id="vtqhcq6qyAQe" /></p>
                        <textarea value={form.address} onBlur={() => setTouched((p) => ({ ...p, address: true }))} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder={legacy("tKtYNVxfx1pJ")} required maxLength={300} rows={3}
                          className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 focus:shadow-md"
                          style={!touched.address ? { borderColor: "var(--wborder)", background: "var(--wbg)" } : validation.address ? { borderColor: `${pc}50`, background: `${pc}08` } : { borderColor: "rgba(220,38,38,0.5)", background: "rgba(220,38,38,0.05)" }} />
                        {touched.address && !validation.address && <p className="text-xs text-red-400"><LocalizedText id="M7B_XWM583rX" /></p>}
                      </div>
                    )}
                  </>
                )}
                {/* ── Reward Code Input ── */}
                <div className="space-y-2 rounded-2xl border p-4 transition-all" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                  <label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: textColor }}>
                    <Gift className="h-3.5 w-3.5" /><LocalizedText id="0VFjaPoqf1-e" />
                  </label>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={rewardCode}
                      onChange={(e) => { setRewardCode(e.target.value.toUpperCase()); if (rewardStatus !== "idle") { setRewardStatus("idle"); setRewardError(""); setRewardDiscount(null); } }}
                      placeholder={legacy("UQ0gvtgwgmVg")}
                      className="min-w-0 flex-1 rounded-xl border px-4 py-2.5 text-sm font-mono tracking-wider uppercase outline-none transition-colors"
                      style={rewardStatus === "valid" ? { borderColor: "#22c55e60", background: "#22c55e0A" } : rewardStatus === "invalid" ? { borderColor: "rgba(220,38,38,0.5)", background: "rgba(220,38,38,0.05)" } : { borderColor: "var(--wborder)", background: "var(--wbg)" }}
                    />
                    <button
                      type="button"
                      disabled={!rewardCode.trim() || !form.email || rewardStatus === "loading" || rewardStatus === "valid"}
                      onClick={handleValidateReward}
                      className="min-h-[44px] shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-30 hover:opacity-90 active:scale-95"
                      style={{ background: `${pc}20`, color: pc }}
                    >
                      {rewardStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : rewardStatus === "valid" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : "Aplicar"}
                    </button>
                  </div>
                  {rewardStatus === "valid" && rewardDiscount && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <LocalizedText id="OyhD8Jiy2VJ8" /> {rewardDiscount.type === "PERCENTAGE" ? `${rewardDiscount.value}%` : formatPrice(rewardDiscount.value, business.currencyCode)}
                    </p>
                  )}
                  {rewardStatus === "invalid" && rewardError && (
                    <p className="text-xs text-red-400">{rewardError}</p>
                  )}
                  {!form.email && rewardCode.trim() && (
                    <p className="text-xs text-amber-400/70">{t("emailFirst")}</p>
                  )}
                  {promotionResult?.quote && activePromotion && (
                    <p className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <LocalizedText id="ujfMVwJSOaUT" />{activePromotion.title}<LocalizedText id="MCRJozhXkvfB" /> {formatPrice(promotionResult.quote.discountAmount, business.currencyCode)}.
                    </p>
                  )}
                </div>
                <div className="space-y-2 rounded-2xl border p-4 transition-all" style={{ borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>
                  <label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: textColor }}>
                    <Percent className="h-3.5 w-3.5" /> Código de descuento
                  </label>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); if (discountCodeStatus !== "idle") { setDiscountCodeStatus("idle"); setDiscountCodeError(""); setBookingDiscount(null); } }}
                      placeholder="VERANO10"
                      className="min-w-0 flex-1 rounded-xl border px-4 py-2.5 text-sm font-mono tracking-wider uppercase outline-none"
                      style={discountCodeStatus === "valid" ? { borderColor: "#22c55e60", background: "#22c55e0A" } : discountCodeStatus === "invalid" ? { borderColor: "rgba(220,38,38,0.5)", background: "rgba(220,38,38,0.05)" } : { borderColor: "var(--wborder)", background: "var(--wbg)" }}
                    />
                    <button
                      type="button"
                      disabled={!discountCode.trim() || discountCodeStatus === "loading" || discountCodeStatus === "valid"}
                      onClick={handleValidateDiscountCode}
                      className="min-h-[44px] shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-30 hover:opacity-90 active:scale-95"
                      style={{ background: `${pc}20`, color: pc }}
                    >
                      {discountCodeStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : discountCodeStatus === "valid" ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : "Aplicar"}
                    </button>
                  </div>
                  {discountCodeStatus === "valid" && bookingDiscount && <p className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="h-3 w-3" /> Código aplicado: {bookingDiscount.type === "PERCENTAGE" ? `${bookingDiscount.value}%` : formatPrice(bookingDiscount.value, business.currencyCode)}</p>}
                  {discountCodeStatus === "invalid" && discountCodeError && <p className="text-xs text-red-400">{discountCodeError}</p>}
                </div>
                {/* Deposit notice */}
                {showDeposit && !previewMode && (
                  <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: `${pc}30`, background: `${pc}08` }}>
                    <p className="font-medium" style={{ color: pc }}><LocalizedText id="8OlEyuapzFy5" /> {formatPrice(effectiveDepositAmount, business.currencyCode)}</p>
                    <p className="text-xs mt-1" style={{ color: textSecondary }}>{t("depositRedirect")}</p>
                  </div>
                )}
                {apiError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 font-medium">{apiError}</div>}
                <button type="submit" disabled={!isFormValid || submitting} className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 mt-2 text-sm font-bold transition-all hover:opacity-90 hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none" style={{ background: pc, color: getContrastColor(pc) }}>
                  {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />{showDeposit ? t("redirecting") : t("confirming")}</> : <>{previewMode ? previewText.finish : showDeposit ? t("payDeposit") : t("confirmBooking")} <ChevronRight className="h-5 w-5" /></>}
                </button>
              </form>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (recurringSuccess || (selectedService && selectedSlot)) && (
            <div className="animate-scale-in space-y-6 py-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${pc}15` }}>
                {recurringSuccess ? <RefreshCw className="h-10 w-10" style={{ color: pc }} /> : <CheckCircle2 className="h-10 w-10" style={{ color: pc }} />}
              </div>
              {recurringSuccess ? (
                <>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{previewMode ? previewText.completed : recurringSuccess.requiresApproval ? "Solicitud enviada" : "Suscripcion confirmada"}</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: textSecondary }}>
                      {previewMode
                        ? previewText.completedHint
                        : recurringSuccess.requiresApproval
                        ? `Tu solicitud de suscripcion a "${recurringSuccess.serviceName}" fue enviada. Te avisaremos por email cuando sea aprobada.`
                        : `Tu suscripcion a "${recurringSuccess.serviceName}" fue confirmada exitosamente. Te enviamos los detalles por email.`}
                    </p>
                  </div>
                  <div className="mx-auto max-w-md rounded-2xl p-5 text-left text-sm shadow-sm" style={{ background: "var(--wsubtle)", borderColor: "var(--wborder)", borderWidth: "1px" }}>
                    <p className="mb-3 flex items-center gap-1.5 font-semibold text-base" style={{ color: pc }}><Sparkles className="h-4 w-4" /><LocalizedText id="iDlXpQmJMZ0Y" /></p>
                    <div className="space-y-1 opacity-80" style={{ color: textColor }}>
                      <p><span style={{ color: textSecondary }}><LocalizedText id="Xn5rZDSz0P56" /></span> {recurringSuccess.serviceName}</p>
                      {selectedStaff && <p><span style={{ color: textSecondary }}><LocalizedText id="NHxI0zxNEBCQ" /></span> {selectedStaff.name}</p>}
                      <p><span style={{ color: textSecondary }}><LocalizedText id="G2TaVGuz358c" /></span> {recurringSelectedDays.map((d) => WEEK_NAMES[d]).join(", ")}</p>
                      <p><span style={{ color: textSecondary }}><LocalizedText id="O8PFaQ0jxs7I" /></span> {recurringDurationMonths} {recurringDurationMonths === 1 ? "mes" : "meses"}</p>
                      <p><span style={{ color: textSecondary }}><LocalizedText id="o7xULAnP2LCe" /></span> {business.timezone}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div><h2 className="text-2xl font-bold tracking-tight">{previewMode ? previewText.completed : t("bookingConfirmed")}</h2><p className="mx-auto mt-2 max-w-md text-sm" style={{ color: textSecondary }}>{previewMode ? previewText.completedHint : t("bookingSuccess")}</p></div>
                  <div className="mx-auto max-w-md rounded-2xl p-5 text-left text-sm shadow-sm" style={{ background: "var(--wsubtle)", borderColor: "var(--wborder)", borderWidth: "1px" }}>
                    <p className="mb-3 flex items-center gap-1.5 font-semibold text-base" style={{ color: pc }}><Sparkles className="h-4 w-4" />{t("summary")}</p>
                    <div className="space-y-1 opacity-80" style={{ color: textColor }}>
                      <p><span style={{ color: textSecondary }}><LocalizedText id="Xn5rZDSz0P56" /></span> {selectedService?.name}</p>
                      {selectedStaff && <p><span style={{ color: textSecondary }}><LocalizedText id="NHxI0zxNEBCQ" /></span> {selectedStaff.name}</p>}
                      {selectedSlot && <><p>{capitalize(format(selectedSlot.start, "PPPP", { locale: dateLocale }))}</p><p>{format(selectedSlot.start, "p", { locale: dateLocale })}</p><p><span style={{ color: textSecondary }}>{business.timezone}</span></p></>}
                      <p><span style={{ color: textSecondary }}><LocalizedText id="B9xVnD10aTj_" /></span> {form.name}</p>
                    </div>
                  </div>
                </>
              )}
              {!previewMode && !portalAccountActive && (
                <div className="mx-auto max-w-md rounded-2xl border p-5 text-left" style={{ background: `${pc}08`, borderColor: `${pc}35` }}>
                  <h3 className="text-base font-semibold" style={{ color: textColor }}>No vuelvas a completar tus datos</h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: textSecondary }}>Crea una contraseña para activar Mi agenda. Solo recibirás un correo para confirmar tu cuenta.</p>
                  {activationMessage ? (
                    <p className="mt-4 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm font-medium text-green-500"><CheckCircle2 className="h-4 w-4" />{activationMessage}</p>
                  ) : (
                    <form onSubmit={activateClientAccount} className="mt-4 space-y-3">
                      <input type="password" minLength={10} required autoComplete="new-password" value={activationPassword} onChange={(event) => setActivationPassword(event.target.value)} placeholder="Crea una contraseña" className="w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wbg)", color: textColor }} />
                      <input type="password" minLength={10} required autoComplete="new-password" value={activationPasswordConfirmation} onChange={(event) => setActivationPasswordConfirmation(event.target.value)} placeholder="Repite la contraseña" className="w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--wborder)", background: "var(--wbg)", color: textColor }} />
                      <p className="text-xs" style={{ color: textSecondary }}>Mínimo 10 caracteres, una letra y un número.</p>
                      {activationError && <p className="text-xs font-medium text-red-500">{activationError}</p>}
                      <button type="submit" disabled={activationLoading} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50" style={{ background: pc, color: getContrastColor(pc) }}>
                        {activationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activar Mi agenda"}
                      </button>
                    </form>
                  )}
                </div>
              )}
              {!previewMode && <div
                className="mx-auto max-w-md rounded-2xl border p-5"
                style={{ background: `${pc}08`, borderColor: `${pc}25` }}
              >
                <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${pc}15` }}>
                  <Star className="h-4 w-4" style={{ color: pc }} aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold" style={{ color: textColor }}><LocalizedText id="cGBjzON6in3n" /></h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: textSecondary }}><LocalizedText id="Y16ha1zOKL9V" /></p>
                <a
                  href="https://g.page/r/CZcC65S2yDolEAI/review"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 hover:shadow-md active:scale-95"
                  style={{ background: pc, color: getContrastColor(pc) }}
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                  <LocalizedText id="JgR2l6kp04YJ" />
                </a>
                <p className="mt-2 text-xs" style={{ color: textSecondary }}><LocalizedText id="qF4YalV5_OjH" /></p>
              </div>}
              <button type="button" onClick={restart} className="rounded-xl border px-6 py-3 text-sm font-medium transition-all hover:opacity-100 hover:shadow-md active:scale-95" style={{ color: textColor, borderColor: "var(--wborder)", background: "var(--wsubtle)" }}>{previewMode ? previewText.restart : t("bookAnother")}</button>
            </div>
          )}
        </div>

        {renderPromoBlocks("FOOTER")}
        <div className="mt-auto border-t px-5 py-3 flex items-center justify-center gap-1.5 text-xs font-medium" style={{ background: `${bgColor}F2`, color: textSecondary, borderColor: "var(--wborder)" }}>
          <span><LocalizedText id="_cXS6UEMLYjl" /></span>
          <a href="https://www.puragenda.cl" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <span style={{ color: pc, fontWeight: 700, letterSpacing: "-0.02em" }}>Puragenda</span>
            <Sparkles className="h-3 w-3" style={{ color: pc }} />
          </a>
        </div>
      </div>
    </div>
  );
}
