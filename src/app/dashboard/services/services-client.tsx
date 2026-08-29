"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Wrench, Settings2, Banknote, RefreshCw, ChevronDown, ChevronUp, Info, Upload, ImageIcon, CalendarRange, Clock3 } from "@/components/icons/hover-icons";
import { formatPrice } from "@/lib/utils";
import { updateMaxServicesAction, updateServiceCategoryGroupingAction, uploadServiceImageAssetAction } from "@/server/actions/dashboard.actions";
import { createRecurringPlanAction, deleteRecurringPlanAction } from "@/server/actions/recurring.actions";
import { track } from "@/lib/analytics/client";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

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

interface ServiceOptionAlternative {
  id: string;
  name: string;
  priceDelta: number;
  durationDelta: number;
  isHomeService: boolean;
}

interface ServiceOptionCategory {
  id: string;
  name: string;
  isRequired: boolean;
  maxSelections: number;
  alternatives: ServiceOptionAlternative[];
}

interface ServiceCategorySummary {
  id: string;
  name: string;
  position: number;
  _count: { services: number };
}

interface OptionAlternativeForm {
  id?: string;
  name: string;
  priceDelta: string;
  durationDelta: string;
  isHomeService: boolean;
}

interface OptionCategoryForm {
  id?: string;
  name: string;
  isRequired: boolean;
  maxSelections: number;
  alternatives: OptionAlternativeForm[];
}

interface CustomProductionWindow {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  capacity: number;
  isActive: boolean;
}

interface CustomProductionWindowForm extends Omit<CustomProductionWindow, "capacity"> {
  capacity: string;
}

interface Service {
  id: string;
  name: string;
  position: number;
  description: string | null;
  imageUrl: string | null;
  duration: number;
  price: number;
  depositAmount: number;
  depositPaymentUrl: string | null;
  bookingMode: "APPOINTMENT" | "PRODUCTION";
  productionScheduleMode: "WEEKLY" | "CUSTOM";
  weeklyProductionCapacity: number;
  productionWeeksAhead: number;
  productionLeadTimeWeeks: number;
  customProductionWindows: unknown;
  productionDepositPercent: number;
  requiresReferenceImages: boolean;
  categoryId: string | null;
  category: { id: string; name: string; position: number } | null;
  availabilityType: "NORMAL" | "SPECIAL";
  specialWeekDays: number[];
  specialStartDate: string | Date | null;
  specialEndDate: string | Date | null;
  specialStartTime: string | null;
  specialEndTime: string | null;
  optionCategories: ServiceOptionCategory[];
  recurringPlan: RecurringPlan | null;
  _count: { recurringBookings: number };
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const WEEK_DAYS = [
  { value: 1, label: "Lu" },
  { value: 2, label: "Ma" },
  { value: 3, label: "Mi" },
  { value: 4, label: "Ju" },
  { value: 5, label: "Vi" },
  { value: 6, label: "Sa" },
  { value: 0, label: "Do" },
];

const DEFAULT_RECURRING: {
  mode: "FIXED_DAYS" | "DAYS_WITH_REST" | "FREE_MINIMUM";
  fixedDays: number[];
  daysPerWeek: number;
  minRestDays: number;
  durationOptions: number[];
  startDateRangeDays: number;
  requiresApproval: boolean;
  requiresHealthForm: boolean;
  healthQuestions: string[];
  requiresRut: boolean;
  renewalMessage: string;
  expirationWarningDays: number;
} = {
  mode: "FIXED_DAYS",
  fixedDays: [],
  daysPerWeek: 3,
  minRestDays: 1,
  durationOptions: [1],
  startDateRangeDays: 14,
  requiresApproval: false,
  requiresHealthForm: false,
  healthQuestions: [],
  requiresRut: false,
  renewalMessage: "",
  expirationWarningDays: 7,
};

const DEFAULT_OPTION_CATEGORY: OptionCategoryForm = {
  name: "",
  isRequired: true,
  maxSelections: 1,
  alternatives: [{ name: "", priceDelta: "0", durationDelta: "0", isHomeService: false }],
};

function getCustomProductionWindows(value: unknown): CustomProductionWindow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((window): window is CustomProductionWindow => (
    typeof window === "object" &&
    window !== null &&
    typeof window.key === "string" &&
    typeof window.label === "string" &&
    typeof window.startDate === "string" &&
    typeof window.endDate === "string" &&
    typeof window.capacity === "number" &&
    typeof window.isActive === "boolean"
  ));
}

function dateInputValue(value: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? value : value.toISOString();
  return date.slice(0, 10);
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function ServicesClient({
  initialServices,
  initialCategories,
  groupServicesByCategory = false,
  maxServicesPerBooking = 1,
  depositEnabled = false,
  depositPaymentMode = "MERCADOPAGO",
  productionOrdersEnabled = false,
  currencyCode = "CLP",
  taxIdLabel = "RUT",
  businessPolicies = { requiresClientRut: false, allowRescheduling: false },
}: {
  initialServices: Service[];
  initialCategories: ServiceCategorySummary[];
  groupServicesByCategory?: boolean;
  maxServicesPerBooking?: number;
  depositEnabled?: boolean;
  depositPaymentMode?: "MERCADOPAGO" | "MANUAL_LINK";
  productionOrdersEnabled?: boolean;
  currencyCode?: string;
  taxIdLabel?: string;
  businessPolicies?: { requiresClientRut: boolean; allowRescheduling: boolean };
}) {
  const legacy = useTranslations("legacy");
  const servicesT = useTranslations("dashboard.services");
  const [services, setServices] = useState<Service[]>(initialServices);
  const [categories, setCategories] = useState<ServiceCategorySummary[]>(initialCategories);
  const [groupingEnabled, setGroupingEnabled] = useState(groupServicesByCategory);
  const [savingGrouping, setSavingGrouping] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<"categories" | "services" | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [maxServices, setMaxServices] = useState(maxServicesPerBooking);
  const [savingMax, setSavingMax] = useState(false);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
  const [serviceImageError, setServiceImageError] = useState("");

  // Base service form
  const [form, setForm] = useState<{
    name: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    duration: string;
    price: string;
    depositAmount: string;
    depositPaymentUrl: string;
    bookingMode: "APPOINTMENT" | "PRODUCTION";
    availabilityType: "NORMAL" | "SPECIAL";
    specialWeekDays: number[];
    specialStartDate: string;
    specialEndDate: string;
    specialStartTime: string;
    specialEndTime: string;
    productionScheduleMode: "WEEKLY" | "CUSTOM";
    weeklyProductionCapacity: string;
    productionWeeksAhead: string;
    productionLeadTimeWeeks: string;
    customProductionWindows: CustomProductionWindowForm[];
    productionDepositPercent: string;
    requiresReferenceImages: boolean;
  }>({
    name: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    duration: "",
    price: "",
    depositAmount: "",
    depositPaymentUrl: "",
    bookingMode: "APPOINTMENT" as "APPOINTMENT" | "PRODUCTION",
    availabilityType: "NORMAL",
    specialWeekDays: [],
    specialStartDate: "",
    specialEndDate: "",
    specialStartTime: "",
    specialEndTime: "",
    productionScheduleMode: "WEEKLY",
    weeklyProductionCapacity: "5",
    productionWeeksAhead: "24",
    productionLeadTimeWeeks: "1",
    customProductionWindows: [],
    productionDepositPercent: "50",
    requiresReferenceImages: false,
  });

  // Recurring plan form
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ ...DEFAULT_RECURRING });
  const [newQuestion, setNewQuestion] = useState("");
  const [optionCategories, setOptionCategories] = useState<OptionCategoryForm[]>([]);

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────

  async function handleSaveMaxServices(val: number) {
    setMaxServices(val);
    setSavingMax(true);
    await updateMaxServicesAction(val);
    setSavingMax(false);
  }

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/services");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    const res = await fetch("/api/dashboard/service-categories");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudieron cargar las categorías.");
    setCategories(data);
  }

  async function handleGroupingChange(enabled: boolean) {
    setGroupingEnabled(enabled);
    setSavingGrouping(true);
    const result = await updateServiceCategoryGroupingAction(enabled);
    if (result?.error) {
      setGroupingEnabled(!enabled);
      alert(result.error);
    }
    setSavingGrouping(false);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setAddingCategory(true);
    try {
      const res = await fetch("/api/dashboard/service-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la categoría.");
      setNewCategoryName("");
      await fetchCategories();
    } catch (error) {
      alert(error instanceof Error ? error.message : legacy("ciR0QT0bsmBm"));
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleRenameCategory(categoryId: string) {
    const name = editingCategoryName.trim();
    if (!name) return;

    setSavingCategoryId(categoryId);
    try {
      const res = await fetch(`/api/dashboard/service-categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo renombrar la categoría.");
      setEditingCategoryId(null);
      setEditingCategoryName("");
      await Promise.all([fetchCategories(), fetchServices()]);
    } catch (error) {
      alert(error instanceof Error ? error.message : legacy("O5TI8sMj6Bf0"));
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function handleDeleteCategory(category: ServiceCategorySummary) {
    const serviceMessage =
      category._count.services > 0
        ? ` Los ${category._count.services} servicio(s) asignados quedarán sin categoría.`
        : "";
    if (!confirm(`¿Eliminar la categoría "${category.name}"?${serviceMessage}`)) return;

    setSavingCategoryId(category.id);
    try {
      const res = await fetch(`/api/dashboard/service-categories/${category.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar la categoría.");
      await Promise.all([fetchCategories(), fetchServices()]);
    } catch (error) {
      alert(error instanceof Error ? error.message : legacy("fGfhFsbJ3Dib"));
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length || savingOrder) return;
    const previous = categories;
    const next = [...categories];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const positioned = next.map((category, position) => ({ ...category, position }));
    setCategories(positioned);
    setSavingOrder("categories");
    try {
      const response = await fetch("/api/dashboard/service-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: positioned.map((category) => category.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron ordenar las categorías.");
    } catch (error) {
      setCategories(previous);
      alert(error instanceof Error ? error.message : legacy("iwGPFhAUwc9d"));
    } finally {
      setSavingOrder(null);
    }
  }

  async function moveService(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= services.length || savingOrder) return;
    const previous = services;
    const next = [...services];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const positioned = next.map((service, position) => ({ ...service, position }));
    setServices(positioned);
    setSavingOrder("services");
    try {
      const response = await fetch("/api/dashboard/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: positioned.map((service) => service.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron ordenar los servicios.");
    } catch (error) {
      setServices(previous);
      alert(error instanceof Error ? error.message : legacy("ZfyICZvK9Bp7"));
    } finally {
      setSavingOrder(null);
    }
  }

  function openCreate() {
    setEditingService(null);
    setForm({
      name: "",
      description: "",
      imageUrl: "",
      categoryId: "",
      duration: "60",
      price: "",
      depositAmount: "",
      depositPaymentUrl: "",
      bookingMode: "APPOINTMENT",
      availabilityType: "NORMAL",
      specialWeekDays: [],
      specialStartDate: "",
      specialEndDate: "",
      specialStartTime: "",
      specialEndTime: "",
      productionScheduleMode: "WEEKLY",
      weeklyProductionCapacity: "5",
      productionWeeksAhead: "24",
      productionLeadTimeWeeks: "1",
      customProductionWindows: [],
      productionDepositPercent: "50",
      requiresReferenceImages: false,
    });
    setServiceImageError("");
    setRecurringEnabled(false);
    setRecurringOpen(false);
    setRecurringForm({ ...DEFAULT_RECURRING });
    setNewQuestion("");
    setOptionCategories([]);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || "",
      imageUrl: service.imageUrl || "",
      categoryId: service.categoryId || "",
      duration: String(service.duration),
      price: String(service.price),
      depositAmount: String(service.depositAmount || 0),
      depositPaymentUrl: service.depositPaymentUrl || "",
      bookingMode: service.bookingMode,
      availabilityType: service.availabilityType,
      specialWeekDays: service.specialWeekDays,
      specialStartDate: dateInputValue(service.specialStartDate),
      specialEndDate: dateInputValue(service.specialEndDate),
      specialStartTime: service.specialStartTime || "",
      specialEndTime: service.specialEndTime || "",
      productionScheduleMode: service.productionScheduleMode,
      weeklyProductionCapacity: String(service.weeklyProductionCapacity),
      productionWeeksAhead: String(service.productionWeeksAhead),
      productionLeadTimeWeeks: String(service.productionLeadTimeWeeks),
      customProductionWindows: getCustomProductionWindows(service.customProductionWindows).map((window) => ({
        ...window,
        capacity: String(window.capacity),
      })),
      productionDepositPercent: String(service.productionDepositPercent),
      requiresReferenceImages: service.requiresReferenceImages,
    });
    setServiceImageError("");
    setOptionCategories(
      (service.optionCategories || []).map((category) => ({
        id: category.id,
        name: category.name,
        isRequired: category.isRequired,
        maxSelections: category.maxSelections,
        alternatives: category.alternatives.map((alternative) => ({
          id: alternative.id,
          name: alternative.name,
          priceDelta: String(alternative.priceDelta),
          durationDelta: String(alternative.durationDelta),
          isHomeService: alternative.isHomeService,
        })),
      }))
    );
    if (service.recurringPlan) {
      setRecurringEnabled(true);
      setRecurringOpen(true);
      setRecurringForm({
        mode: service.recurringPlan.mode,
        fixedDays: service.recurringPlan.fixedDays,
        daysPerWeek: service.recurringPlan.daysPerWeek ?? 3,
        minRestDays: service.recurringPlan.minRestDays ?? 1,
        durationOptions: service.recurringPlan.durationOptions,
        startDateRangeDays: service.recurringPlan.startDateRangeDays,
        requiresApproval: service.recurringPlan.requiresApproval,
        requiresHealthForm: service.recurringPlan.requiresHealthForm,
        healthQuestions: service.recurringPlan.healthQuestions,
        requiresRut: service.recurringPlan.requiresRut,
        renewalMessage: service.recurringPlan.renewalMessage ?? "",
        expirationWarningDays: service.recurringPlan.expirationWarningDays,
      });
    } else {
      setRecurringEnabled(false);
      setRecurringOpen(false);
      setRecurringForm({ ...DEFAULT_RECURRING });
    }
    setNewQuestion("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let serviceId: string;
      const { imageUrl: _imageUrl, ...formWithoutImage } = form;
      void _imageUrl;
      const payload = {
        ...(editingService ? formWithoutImage : form),
        optionCategories: optionCategories
          .map((category) => ({
            name: category.name.trim(),
            isRequired: category.isRequired,
            maxSelections: category.maxSelections,
            alternatives: category.alternatives.map((alternative) => ({
              name: alternative.name.trim(),
              priceDelta: alternative.priceDelta,
              durationDelta: alternative.durationDelta,
              isHomeService: alternative.isHomeService,
            })),
          }))
          .filter((category) => category.name || category.alternatives.some((alternative) => alternative.name)),
      };

      if (editingService) {
        const res = await fetch(`/api/dashboard/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.details?.join("\n") || data.error || "No se pudo guardar el servicio.");
        }
        serviceId = editingService.id;
      } else {
        const res = await fetch("/api/dashboard/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        if (!res.ok) {
          throw new Error(created.details?.join("\n") || created.error || "No se pudo crear el servicio.");
        }
        serviceId = created.id;
        track("dashboard_service_created", {
          booking_mode: form.bookingMode.toLowerCase(),
          has_deposit: Number(form.depositAmount || "0") > 0,
          has_options: optionCategories.length > 0,
        });
      }

      // Handle recurring plan
      if (form.bookingMode === "APPOINTMENT" && recurringEnabled && recurringForm.durationOptions.length > 0) {
        const result = await createRecurringPlanAction(serviceId, {
          mode: recurringForm.mode,
          fixedDays: recurringForm.mode === "FIXED_DAYS" ? recurringForm.fixedDays : [],
          daysPerWeek: recurringForm.mode !== "FIXED_DAYS" ? recurringForm.daysPerWeek : undefined,
          minRestDays: recurringForm.mode === "DAYS_WITH_REST" ? recurringForm.minRestDays : undefined,
          durationOptions: recurringForm.durationOptions,
          startDateRangeDays: recurringForm.startDateRangeDays,
          requiresApproval: recurringForm.requiresApproval,
          requiresHealthForm: recurringForm.requiresHealthForm,
          healthQuestions: recurringForm.healthQuestions,
          requiresRut: recurringForm.requiresRut || businessPolicies.requiresClientRut,
          renewalMessage: recurringForm.renewalMessage || undefined,
          expirationWarningDays: recurringForm.expirationWarningDays,
        });
        if (result?.error) {
          alert(result.error);
          setSaving(false);
          return;
        }
      } else if ((form.bookingMode === "PRODUCTION" || !recurringEnabled) && editingService?.recurringPlan) {
        const result = await deleteRecurringPlanAction(serviceId);
        if (result?.error) {
          alert(result.error);
          setSaving(false);
          return;
        }
      }

      setDialogOpen(false);
      await Promise.all([fetchServices(), fetchCategories()]);
    } catch (error) {
      console.error("Error saving service:", error);
      alert(error instanceof Error ? error.message : legacy("ByucUzMIeXd0"));
    } finally {
      setSaving(false);
    }
  }

  async function handleServiceImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setServiceImageError("Formato no soportado. Usa PNG, JPG o WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setServiceImageError(legacy("-Kd4LlLSofNc"));
      return;
    }

    setUploadingServiceImage(true);
    setServiceImageError("");
    const formData = new FormData();
    formData.append("image", file);
    const result = await uploadServiceImageAssetAction(formData);
    if (result.error) {
      setServiceImageError(result.error);
    } else if ("url" in result && result.url) {
      setForm((prev) => ({ ...prev, imageUrl: result.url || "" }));
      if (editingService) {
        const res = await fetch(`/api/dashboard/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: result.url }),
        });
        if (!res.ok) {
          const data = await res.json();
          setServiceImageError(data.error || legacy("KnmeOt8wRh6f"));
        } else {
          await fetchServices();
        }
      }
    }
    setUploadingServiceImage(false);
    if (serviceImageInputRef.current) serviceImageInputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    if (!confirm(legacy("qXDI8YuwJX_1"))) return;

    try {
      await fetch(`/api/dashboard/services/${id}`, { method: "DELETE" });
      await Promise.all([fetchServices(), fetchCategories()]);
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  }

  function toggleFixedDay(day: number) {
    setRecurringForm((prev) => ({
      ...prev,
      fixedDays: prev.fixedDays.includes(day)
        ? prev.fixedDays.filter((d) => d !== day)
        : [...prev.fixedDays, day],
    }));
  }

  function toggleDurationOption(months: number) {
    setRecurringForm((prev) => ({
      ...prev,
      durationOptions: prev.durationOptions.includes(months)
        ? prev.durationOptions.filter((m) => m !== months)
        : [...prev.durationOptions, months].sort((a, b) => a - b),
    }));
  }

  function addQuestion() {
    const q = newQuestion.trim();
    if (!q) return;
    setRecurringForm((prev) => ({ ...prev, healthQuestions: [...prev.healthQuestions, q] }));
    setNewQuestion("");
  }

  function removeQuestion(index: number) {
    setRecurringForm((prev) => ({
      ...prev,
      healthQuestions: prev.healthQuestions.filter((_, i) => i !== index),
    }));
  }

  function addOptionCategory() {
    setOptionCategories((prev) => [
      ...prev,
      {
        ...DEFAULT_OPTION_CATEGORY,
        alternatives: DEFAULT_OPTION_CATEGORY.alternatives.map((alternative) => ({ ...alternative })),
      },
    ]);
  }

  function updateOptionCategory(index: number, patch: Partial<OptionCategoryForm>) {
    setOptionCategories((prev) =>
      prev.map((category, i) => (i === index ? { ...category, ...patch } : category))
    );
  }

  function removeOptionCategory(index: number) {
    setOptionCategories((prev) => prev.filter((_, i) => i !== index));
  }

  function addOptionAlternative(categoryIndex: number) {
    setOptionCategories((prev) =>
      prev.map((category, i) =>
        i === categoryIndex
          ? {
              ...category,
              alternatives: [
                ...category.alternatives,
                { name: "", priceDelta: "0", durationDelta: "0", isHomeService: false },
              ],
            }
          : category
      )
    );
  }

  function updateOptionAlternative(
    categoryIndex: number,
    alternativeIndex: number,
    patch: Partial<OptionAlternativeForm>
  ) {
    setOptionCategories((prev) =>
      prev.map((category, i) =>
        i === categoryIndex
          ? {
              ...category,
              alternatives: category.alternatives.map((alternative, j) =>
                j === alternativeIndex ? { ...alternative, ...patch } : alternative
              ),
            }
          : category
      )
    );
  }

  function removeOptionAlternative(categoryIndex: number, alternativeIndex: number) {
    setOptionCategories((prev) =>
      prev.map((category, i) =>
        i === categoryIndex
          ? {
              ...category,
              alternatives: category.alternatives.filter((_, j) => j !== alternativeIndex),
              maxSelections: Math.max(1, Math.min(category.maxSelections, category.alternatives.length - 1)),
            }
          : category
      )
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><LocalizedText id="UnRPpCLeNiGc" /></h1>
          <p className="mt-1 text-muted-foreground">
            <LocalizedText id="g0qjLN911BR_" />
          </p>
        </div>

        <button
          id="btn-nuevo-servicio"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5B21B6]"
        >
          <Plus className="h-4 w-4" /> <LocalizedText id="c0AibySZ7Bzk" />
        </button>
      </div>

      {/* Multi-service config */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Settings2 className="h-4 w-4 text-brand-foreground" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium"><LocalizedText id="AutUYEBAZQW-" /></p>
              <p className="text-xs text-muted-foreground"><LocalizedText id="RpsFO7OKqXhS" /></p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                value={maxServices}
                onChange={(e) => handleSaveMaxServices(parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 appearance-none rounded-full bg-black/10 dark:bg-white/10 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7C3AED] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="rounded-lg border border-border bg-muted px-3 py-1 font-mono text-xs min-w-[3rem] text-center">
                {savingMax ? "..." : maxServices}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/70">{maxServices === 1 ? legacy("DFAMuYiKxw8d") : servicesT("appointmentLimit", { count: maxServices })}</p>
          </div>
        </div>
      </div>

      {/* Optional widget categories */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
                <ChevronDown className="h-4 w-4 text-brand-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium"><LocalizedText id="4becVXhXiUlv" /></p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <LocalizedText id="DEsIhrtwfWhc" />
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span
                className={`min-w-[5.5rem] text-right text-xs font-medium ${
                  groupingEnabled ? "text-brand-foreground" : "text-muted-foreground"
                }`}
              >
                {savingGrouping ? servicesT("saving") : groupingEnabled ? servicesT("enabled") : servicesT("disabled")}
              </span>
            <button
              type="button"
              role="switch"
              aria-checked={groupingEnabled}
              aria-label={legacy("M2LKlFHwLqeW")}
              disabled={savingGrouping}
              onClick={() => handleGroupingChange(!groupingEnabled)}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
                groupingEnabled
                  ? "border-[#7C3AED] bg-[#7C3AED]"
                  : "border-slate-400/40 bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  groupingEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <form onSubmit={handleAddCategory} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={legacy("GrPuO86U3rZZ")}
                maxLength={80}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#7C3AED]/40"
              />
              <button
                type="submit"
                disabled={addingCategory || !newCategoryName.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {addingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <LocalizedText id="JN4lhtXVhJEc" />
              </button>
            </form>

            {categories.length === 0 ? (
              <p className="pt-3 text-xs text-muted-foreground">
                <LocalizedText id="hH2lHJ677Y_1" />
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {categories.map((category, categoryIndex) => (
                  <div
                    key={category.id}
                    className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    {editingCategoryId === category.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleRenameCategory(category.id);
                            }
                            if (e.key === "Escape") setEditingCategoryId(null);
                          }}
                          maxLength={80}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-2 py-1 text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameCategory(category.id)}
                          disabled={savingCategoryId === category.id || !editingCategoryName.trim()}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-brand-foreground disabled:opacity-40"
                        >
                          <LocalizedText id="E-UaIQ9F7RsJ" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex shrink-0 flex-col">
                          <button
                            type="button"
                            onClick={() => moveCategory(categoryIndex, -1)}
                            disabled={categoryIndex === 0 || savingOrder !== null}
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                            aria-label={servicesT("moveUp", { name: category.name })}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCategory(categoryIndex, 1)}
                            disabled={categoryIndex === categories.length - 1 || savingOrder !== null}
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                            aria-label={servicesT("moveDown", { name: category.name })}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {servicesT("servicesCount", { count: category._count.services })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setEditingCategoryName(category.name);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={servicesT("rename", { name: category.name })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(category)}
                          disabled={savingCategoryId === category.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
                          aria-label={servicesT("delete", { name: category.name })}
                        >
                          {savingCategoryId === category.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog/Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border shrink-0">
              <h3 className="text-lg font-semibold">
                {editingService ? legacy("eR9Ma1yyRL8x") : legacy("c0AibySZ7Bzk")}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 p-6 space-y-4">

                {/* ── Base fields ── */}
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground"><LocalizedText id="ViuxV1eotZPW" /></label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={legacy("JlT8wJtHHSkO")}
                    required
                    className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground"><LocalizedText id="2HOUnzPlsTVu" /></label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      <LocalizedText id="XUT5g_nnTSiY" />
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground"><LocalizedText id="xAYlrZz8MTts" /></label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={legacy("c9HBi_6jNlD5")}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                  />
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt={legacy("CqHH8PP-yk6k")} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                      {uploadingServiceImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-medium"><LocalizedText id="UQsM00Gkm0Fj" /></p>
                        <p className="text-xs text-muted-foreground"><LocalizedText id="4emrhcPw0lA3" /></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => serviceImageInputRef.current?.click()}
                          disabled={uploadingServiceImage}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {uploadingServiceImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          <LocalizedText id="HFGOSCnl8cRA" />
                        </button>
                        {form.imageUrl && (
                          <button
                            type="button"
                            onClick={async () => {
                              setForm((prev) => ({ ...prev, imageUrl: "" }));
                              if (editingService) {
                                const res = await fetch(`/api/dashboard/services/${editingService.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ imageUrl: null }),
                                });
                                if (!res.ok) {
                                  const data = await res.json();
                                  setServiceImageError(data.error || legacy("RsdesAzd2SvA"));
                                } else {
                                  await fetchServices();
                                }
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <LocalizedText id="yYlM8AL5C9C-" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/60"><LocalizedText id="Z6cHjVDKnN5z" /></p>
                      {serviceImageError && <p className="text-xs text-red-400">{serviceImageError}</p>}
                    </div>
                  </div>
                  <input
                    ref={serviceImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleServiceImageChange}
                    className="hidden"
                  />
                </div>
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium"><LocalizedText id="Ma1BlObOGpS8" /></p>
                    <p className="text-xs text-muted-foreground"><LocalizedText id="o3OYfjPq6F_i" /></p>
                  </div>
                  <div className={`grid gap-3 ${productionOrdersEnabled ? "sm:grid-cols-2" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, bookingMode: "APPOINTMENT" }))}
                      className={`rounded-xl border p-3 text-left transition-colors ${form.bookingMode === "APPOINTMENT" ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-border bg-muted/30"}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4 text-brand-foreground" /><LocalizedText id="SaO6UqxqBow9" /></span>
                      <span className="mt-1 block text-xs text-muted-foreground"><LocalizedText id="HAZDGkrnnGHM" /></span>
                    </button>
                    {productionOrdersEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((current) => ({ ...current, bookingMode: "PRODUCTION", duration: current.duration || "60" }));
                        setRecurringEnabled(false);
                      }}
                      className={`rounded-xl border p-3 text-left transition-colors ${form.bookingMode === "PRODUCTION" ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-border bg-muted/30"}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium"><CalendarRange className="h-4 w-4 text-brand-foreground" /><LocalizedText id="GDhCuWrf-Qul" /></span>
                      <span className="mt-1 block text-xs text-muted-foreground"><LocalizedText id="P8wh8A0PWMMP" /></span>
                    </button>
                    )}
                  </div>
                  {!productionOrdersEnabled && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <LocalizedText id="-vkxWYdU6boR" />
                    </p>
                  )}
                </div>

                {form.bookingMode === "APPOINTMENT" && (
                  <div className="rounded-xl border border-border p-4 space-y-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <CalendarRange className="h-4 w-4 text-brand-foreground" /> Tipo de disponibilidad
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Los servicios normales siguen el horario del negocio. Usa uno especial solo para promociones o eventos en días determinados.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, availabilityType: "NORMAL" }))}
                        className={`rounded-xl border p-3 text-left ${form.availabilityType === "NORMAL" ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-border bg-muted/30"}`}
                      >
                        <span className="text-sm font-medium">Servicio normal</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Disponible según la agenda habitual.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, availabilityType: "SPECIAL" }));
                          setRecurringEnabled(false);
                          setRecurringOpen(false);
                        }}
                        className={`rounded-xl border p-3 text-left ${form.availabilityType === "SPECIAL" ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-border bg-muted/30"}`}
                      >
                        <span className="text-sm font-medium">Servicio especial</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Solo aparece los días y horas configurados.</span>
                      </button>
                    </div>

                    {form.availabilityType === "SPECIAL" && (
                      <div className="space-y-4 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Días disponibles</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {WEEK_DAYS.map((day) => {
                              const selected = form.specialWeekDays.includes(day.value);
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => setForm((current) => ({
                                    ...current,
                                    specialWeekDays: selected
                                      ? current.specialWeekDays.filter((value) => value !== day.value)
                                      : [...current.specialWeekDays, day.value],
                                  }))}
                                  className={`h-10 min-w-10 rounded-lg border px-3 text-xs font-semibold ${selected ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border bg-background"}`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-xs text-muted-foreground">Disponible desde (opcional)</span>
                            <input type="date" value={form.specialStartDate} onChange={(event) => setForm({ ...form, specialStartDate: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-xs text-muted-foreground">Disponible hasta (opcional)</span>
                            <input type="date" value={form.specialEndDate} onChange={(event) => setForm({ ...form, specialEndDate: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-xs text-muted-foreground">Hora inicial (opcional)</span>
                            <input type="time" value={form.specialStartTime} onChange={(event) => setForm({ ...form, specialStartTime: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-xs text-muted-foreground">Hora final (opcional)</span>
                            <input type="time" value={form.specialEndTime} onChange={(event) => setForm({ ...form, specialEndTime: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className={`space-y-1.5 ${form.bookingMode === "PRODUCTION" ? "hidden" : ""}`}>
                    <label className="text-sm text-muted-foreground"><LocalizedText id="JuE5r_W3IL-U" /></label>
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="60"
                      required
                      min="1"
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground"><LocalizedText id="tcmTwDZHzXWR" />{currencyCode})</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="50000"
                      required
                      min="0"
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                    />
                  </div>
                </div>

                {form.bookingMode === "PRODUCTION" && productionOrdersEnabled && (
                  <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4 space-y-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium"><CalendarRange className="h-4 w-4 text-brand-foreground" /><LocalizedText id="1VeOtcmEPjbp" /></p>
                      <p className="mt-1 text-xs text-muted-foreground"><LocalizedText id="4HBBlkL8aVfQ" /></p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button"
                        onClick={() => setForm((current) => ({ ...current, productionScheduleMode: "WEEKLY" }))}
                        className={`rounded-xl border p-3 text-left ${form.productionScheduleMode === "WEEKLY" ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-border bg-background"}`}>
                        <span className="text-sm font-medium"><LocalizedText id="U2zWqGKFW3wk" /></span>
                        <span className="mt-1 block text-xs text-muted-foreground"><LocalizedText id="zRpuMfPqMbc_" /></span>
                      </button>
                      <button type="button"
                        onClick={() => setForm((current) => ({ ...current, productionScheduleMode: "CUSTOM" }))}
                        className={`rounded-xl border p-3 text-left ${form.productionScheduleMode === "CUSTOM" ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-border bg-background"}`}>
                        <span className="text-sm font-medium"><LocalizedText id="-fRgCAzaToui" /></span>
                        <span className="mt-1 block text-xs text-muted-foreground"><LocalizedText id="LfWaZwa6YPKx" /></span>
                      </button>
                    </div>

                    {form.productionScheduleMode === "WEEKLY" ? (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="space-y-1.5">
                          <span className="text-xs text-muted-foreground"><LocalizedText id="lUzFZAZA18Lj" /></span>
                          <input type="number" min={1} max={100} required value={form.weeklyProductionCapacity}
                            onChange={(e) => setForm({ ...form, weeklyProductionCapacity: e.target.value })}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs text-muted-foreground"><LocalizedText id="j5Jez7salzJq" /></span>
                          <input type="number" min={1} max={104} required value={form.productionWeeksAhead}
                            onChange={(e) => setForm({ ...form, productionWeeksAhead: e.target.value })}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs text-muted-foreground"><LocalizedText id="GGPcQdasNTfo" /></span>
                          <input type="number" min={0} max={104} required value={form.productionLeadTimeWeeks}
                            onChange={(e) => setForm({ ...form, productionLeadTimeWeeks: e.target.value })}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {form.customProductionWindows.map((window, index) => (
                          <div key={window.key} className="rounded-xl border border-border bg-background p-3">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                              <label className="space-y-1.5 sm:col-span-2">
                                <span className="text-xs text-muted-foreground"><LocalizedText id="Rbfr462LyiZQ" /></span>
                                <input required value={window.label} placeholder={legacy("jdYcRpV1rRxD")}
                                  onChange={(e) => setForm((current) => ({
                                    ...current,
                                    customProductionWindows: current.customProductionWindows.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, label: e.target.value } : item),
                                  }))}
                                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none" />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs text-muted-foreground"><LocalizedText id="i06T6Sjf1spy" /></span>
                                <input type="date" required value={window.startDate}
                                  onChange={(e) => setForm((current) => ({
                                    ...current,
                                    customProductionWindows: current.customProductionWindows.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, startDate: e.target.value } : item),
                                  }))}
                                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none" />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs text-muted-foreground"><LocalizedText id="PIPjVYEHgYOb" /></span>
                                <input type="date" required value={window.endDate}
                                  onChange={(e) => setForm((current) => ({
                                    ...current,
                                    customProductionWindows: current.customProductionWindows.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, endDate: e.target.value } : item),
                                  }))}
                                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none" />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs text-muted-foreground"><LocalizedText id="UkASCEVzZwTA" /></span>
                                <input type="number" min={1} max={10000} required value={window.capacity}
                                  onChange={(e) => setForm((current) => ({
                                    ...current,
                                    customProductionWindows: current.customProductionWindows.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, capacity: e.target.value } : item),
                                  }))}
                                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none" />
                              </label>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input type="checkbox" checked={window.isActive}
                                  onChange={(e) => setForm((current) => ({
                                    ...current,
                                    customProductionWindows: current.customProductionWindows.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, isActive: e.target.checked } : item),
                                  }))}
                                  className="accent-[#7C3AED]" />
                                <LocalizedText id="shTd_sfrzbR2" />
                              </label>
                              <button type="button"
                                onClick={() => setForm((current) => ({
                                  ...current,
                                  customProductionWindows: current.customProductionWindows.filter((_, itemIndex) => itemIndex !== index),
                                }))}
                                className="inline-flex items-center gap-1 text-xs text-red-400">
                                <Trash2 className="h-3.5 w-3.5" /><LocalizedText id="yYlM8AL5C9C-" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button type="button"
                          onClick={() => setForm((current) => ({
                            ...current,
                            customProductionWindows: [
                              ...current.customProductionWindows,
                              {
                                key: `period-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                label: "",
                                startDate: "",
                                endDate: "",
                                capacity: "10",
                                isActive: true,
                              },
                            ],
                          }))}
                          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#7C3AED]/40 px-3 py-2 text-xs font-medium text-brand-foreground">
                          <Plus className="h-4 w-4" /><LocalizedText id="XTE_zIidauTv" />
                        </button>
                      </div>
                    )}

                    <label className="block max-w-xs space-y-1.5">
                      <span className="text-xs text-muted-foreground"><LocalizedText id="Gb52pmLH6hTq" /></span>
                      <input type="number" min={0} max={100} required value={form.productionDepositPercent}
                        onChange={(e) => setForm({ ...form, productionDepositPercent: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                      <input type="checkbox" checked={form.requiresReferenceImages}
                        onChange={(e) => setForm({ ...form, requiresReferenceImages: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-[#7C3AED]" />
                      <span>
                        <span className="block text-sm font-medium"><LocalizedText id="G4EN5iLVd315" /></span>
                        <span className="block text-xs text-muted-foreground"><LocalizedText id="3KLNJSy9PlWQ" /></span>
                      </span>
                    </label>
                  </div>
                )}

                {depositEnabled && form.bookingMode === "APPOINTMENT" && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Banknote className="h-3.5 w-3.5 text-brand-foreground" />
                      <LocalizedText id="VvjICQfMU1lM" />{currencyCode})
                    </label>
                    <input
                      type="number"
                      value={form.depositAmount}
                      onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                      placeholder={legacy("vIgS7jnm1TbV")}
                      min="0"
                      step="500"
                      className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                    />
                    <p className="text-[11px] text-muted-foreground/70">
                      <LocalizedText id="lf7yWjCtiUsq" />
                    </p>
                    {depositPaymentMode === "MANUAL_LINK" && (
                      <label className="block space-y-1.5">
                        <span className="text-sm text-muted-foreground">Link de pago para este abono</span>
                        <input
                          type="url"
                          value={form.depositPaymentUrl}
                          onChange={(e) => setForm({ ...form, depositPaymentUrl: e.target.value })}
                          placeholder="https://link.mercadopago.com.ar/..."
                          className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED]/30"
                        />
                        <span className="block text-[11px] text-muted-foreground/70">
                          Crea el link en la cuenta del negocio por el mismo monto indicado arriba. Debe comenzar con https://.
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* ── RESERVAS RECURRENTES ── */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium"><LocalizedText id="1o3RWqFfSOWU" /></p>
                      <p className="text-xs text-muted-foreground"><LocalizedText id="-eeToV6QRPi4" /></p>
                    </div>
                    <button
                      type="button"
                      onClick={addOptionCategory}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-3 py-1.5 text-xs font-medium text-brand-foreground transition-colors hover:bg-[#7C3AED]/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <LocalizedText id="VCdqoDB_g8sH" />
                    </button>
                  </div>

                  {optionCategories.length > 0 && (
                    <div className="space-y-3 border-t border-border bg-muted/20 p-4">
                      {optionCategories.map((category, categoryIndex) => (
                        <div key={category.id ?? categoryIndex} className="rounded-xl border border-border bg-background p-3 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-1.5">
                              <label className="text-xs text-muted-foreground"><LocalizedText id="VCdqoDB_g8sH" /></label>
                              <input
                                value={category.name}
                                onChange={(e) => updateOptionCategory(categoryIndex, { name: e.target.value })}
                                placeholder={legacy("hjynqvk7EpZ7")}
                                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
                              />
                            </div>
                            <div className="mt-5 flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={category.isRequired}
                                  onChange={(e) => updateOptionCategory(categoryIndex, { isRequired: e.target.checked })}
                                  className="h-3.5 w-3.5 rounded accent-[#7C3AED]"
                                />
                                <LocalizedText id="6tqRIX8DKScB" />
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <LocalizedText id="fwgEb6ZELYuZ" />
                                <input
                                  type="number"
                                  min={1}
                                  max={category.alternatives.length}
                                  value={category.maxSelections}
                                  onChange={(e) => updateOptionCategory(categoryIndex, { maxSelections: Math.max(1, Math.min(category.alternatives.length, Number(e.target.value) || 1)) })}
                                  className="w-14 rounded-lg border border-border bg-muted px-2 py-1.5 text-center text-xs outline-none"
                                  aria-label={`Maximo de selecciones para ${category.name || legacy("5ycwv4Lv919z")}`}
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOptionCategory(categoryIndex)}
                              className="mt-5 rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div className="hidden sm:grid sm:grid-cols-[1fr_96px_96px_110px_32px] gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <span><LocalizedText id="_Q332iLdhLAO" /></span>
                              <span><LocalizedText id="OhsGAOY1DneS" /></span>
                              <span><LocalizedText id="H8bDPiVkQyTA" /></span>
                              <span><LocalizedText id="DnNWw_Yxw0eq" /></span>
                              <span />
                            </div>
                            {category.alternatives.map((alternative, alternativeIndex) => (
                              <div key={alternative.id ?? alternativeIndex} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_96px_96px_110px_32px]">
                                <input
                                  value={alternative.name}
                                  onChange={(e) => updateOptionAlternative(categoryIndex, alternativeIndex, { name: e.target.value })}
                                  placeholder={legacy("5Z2ljrBFWxkJ")}
                                  className="min-w-0 rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  value={alternative.priceDelta}
                                  onChange={(e) => updateOptionAlternative(categoryIndex, alternativeIndex, { priceDelta: e.target.value })}
                                  aria-label={legacy("MchJ8rZP5Ro-")}
                                  className="min-w-0 rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  value={alternative.durationDelta}
                                  onChange={(e) => updateOptionAlternative(categoryIndex, alternativeIndex, { durationDelta: e.target.value })}
                                  aria-label={legacy("dNJBwVVFUWWq")}
                                  className="min-w-0 rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
                                />
                                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2 py-2 text-xs text-muted-foreground">
                                  <input
                                    type="checkbox"
                                    checked={alternative.isHomeService}
                                    onChange={(e) => updateOptionAlternative(categoryIndex, alternativeIndex, { isHomeService: e.target.checked })}
                                    className="h-3.5 w-3.5 accent-[#7C3AED]"
                                  />
                                  <LocalizedText id="Wzupy32cyQJ0" />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeOptionAlternative(categoryIndex, alternativeIndex)}
                                  disabled={category.alternatives.length <= 1}
                                  className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOptionAlternative(categoryIndex)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-foreground hover:bg-[#7C3AED]/10"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <LocalizedText id="_Q332iLdhLAO" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {form.bookingMode === "APPOINTMENT" && form.availabilityType === "NORMAL" && <div className="rounded-xl border border-border overflow-hidden">
                  {/* Header — click to expand/collapse, toggle to activate/deactivate */}
                  <div className="flex w-full items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setRecurringOpen((o) => !o)}
                      className="flex flex-1 items-center gap-2 text-sm font-medium transition-colors hover:text-brand-foreground"
                    >
                      <RefreshCw className="h-4 w-4 text-brand-foreground" />
                      <span><LocalizedText id="uOE9qFXDDD_P" /></span>
                      {recurringEnabled && (
                        <span className="rounded-full bg-[#7C3AED] px-2 py-0.5 text-[10px] font-semibold text-white">
                          <LocalizedText id="cjhYFEvVSC1K" />
                        </span>
                      )}
                      {editingService && (editingService._count?.recurringBookings ?? 0) > 0 && (
                        <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
                          {editingService._count.recurringBookings} <LocalizedText id="5vXk8psEJpDE" />
                        </span>
                      )}
                      {recurringOpen
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>

                    {/* Toggle switch — this is the only way to activate/deactivate */}
                    <button
                      type="button"
                      onClick={() => {
                        if (recurringEnabled) {
                          // Deactivating
                          setRecurringEnabled(false);
                          setRecurringForm({ ...DEFAULT_RECURRING });
                        } else {
                          // Activating
                          setRecurringEnabled(true);
                          setRecurringOpen(true);
                        }
                      }}
                      className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ml-3 ${
                        recurringEnabled ? "bg-[#7C3AED]" : "bg-border"
                      }`}
                      title={recurringEnabled ? "Desactivar modo recurrente" : "Activar modo recurrente"}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        recurringEnabled ? "translate-x-4" : ""
                      }`} />
                    </button>
                  </div>

                  {recurringEnabled && recurringOpen && (
                    <div className="border-t border-border p-4 space-y-4 bg-muted/20">


                      {/* Mode */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide"><LocalizedText id="oofolWIoLZ3R" /></label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["FIXED_DAYS", "DAYS_WITH_REST", "FREE_MINIMUM"] as const).map((m) => {
                            const labels = {
                              FIXED_DAYS: "Dias fijos",
                              DAYS_WITH_REST: "N dias + descanso",
                              FREE_MINIMUM: legacy("RtK3WB_jv_Zn"),
                            };
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setRecurringForm((p) => ({ ...p, mode: m }))}
                                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors text-center ${
                                  recurringForm.mode === m
                                    ? "border-[#7C3AED] bg-[#7C3AED]/10 text-brand-foreground"
                                    : "border-border text-muted-foreground hover:border-[#7C3AED]/40"
                                }`}
                              >
                                {labels[m]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mode-specific fields */}
                      {recurringForm.mode === "FIXED_DAYS" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide"><LocalizedText id="RaTOAEQ-RthS" /></label>
                          <div className="flex flex-wrap gap-2">
                            {WEEK_DAYS.map((d) => (
                              <button
                                key={d.value}
                                type="button"
                                onClick={() => toggleFixedDay(d.value)}
                                className={`h-9 w-9 rounded-lg border text-xs font-bold transition-colors ${
                                  recurringForm.fixedDays.includes(d.value)
                                    ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                                    : "border-border text-muted-foreground hover:border-[#7C3AED]/40"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {recurringForm.mode === "DAYS_WITH_REST" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground"><LocalizedText id="zfZdE0vS---Y" /></label>
                            <input
                              type="number"
                              min={1}
                              max={6}
                              value={recurringForm.daysPerWeek}
                              onChange={(e) => setRecurringForm((p) => ({ ...p, daysPerWeek: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground"><LocalizedText id="85mQFvCR0Azf" /></label>
                            <input
                              type="number"
                              min={1}
                              value={recurringForm.minRestDays}
                              onChange={(e) => setRecurringForm((p) => ({ ...p, minRestDays: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {recurringForm.mode === "FREE_MINIMUM" && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground"><LocalizedText id="VRMLQc3MMsfC" /></label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={recurringForm.daysPerWeek}
                            onChange={(e) => setRecurringForm((p) => ({ ...p, daysPerWeek: Number(e.target.value) }))}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                          />
                        </div>
                      )}

                      {/* Duration options */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide"><LocalizedText id="mT07wkmGEccx" /></label>
                        <div className="flex gap-4">
                          {[1, 2, 3].map((m) => (
                            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={recurringForm.durationOptions.includes(m)}
                                onChange={() => toggleDurationOption(m)}
                                className="h-3.5 w-3.5 rounded accent-[#7C3AED]"
                              />
                              <span className="text-sm">{m} {m === 1 ? "mes" : "meses"}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Start date range */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground"><LocalizedText id="q8bW-REihetm" /></label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={recurringForm.startDateRangeDays}
                          onChange={(e) => setRecurringForm((p) => ({ ...p, startDateRangeDays: Number(e.target.value) }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                        />
                      </div>

                      {/* Toggles */}
                      <div className="space-y-3">
                        {([
                          { key: "requiresApproval", label: legacy("TNerLkS9tXR-") },
                          { key: "requiresHealthForm", label: legacy("LyTjbgn_C_Eu") },
                          { key: "requiresRut", label: `Pedir ${taxIdLabel} al cliente` },
                        ] as const).map(({ key, label }) => {
                          // Check if this toggle is affected by a business-level policy
                          const isRutToggle = key === "requiresRut";
                          const rutForcedByPolicy = isRutToggle && businessPolicies.requiresClientRut;

                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${rutForcedByPolicy ? "text-muted-foreground" : ""}`}>{label}</span>
                                  {rutForcedByPolicy && (
                                    <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-medium">
                                      <LocalizedText id="Oedv1M8zY3jF" />
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={rutForcedByPolicy}
                                  onClick={() => setRecurringForm((p) => ({ ...p, [key]: !p[key] }))}
                                  className={`relative h-5 w-9 rounded-full transition-colors ${
                                    recurringForm[key] || rutForcedByPolicy ? "bg-[#7C3AED]" : "bg-border"
                                  } ${rutForcedByPolicy ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                    recurringForm[key] || rutForcedByPolicy ? "translate-x-4" : ""
                                  }`} />
                                </button>
                              </div>
                              {rutForcedByPolicy && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Info className="h-3 w-3" />
                                  <LocalizedText id="BaXlkl1eVUO8" />
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Health questions */}
                      {recurringForm.requiresHealthForm && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide"><LocalizedText id="uk5oMYPA9lPe" /></label>
                          {recurringForm.healthQuestions.map((q, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs">{q}</span>
                              <button
                                type="button"
                                onClick={() => removeQuestion(i)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }}
                              placeholder={legacy("xrZqVBL3yYKT")}
                              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={addQuestion}
                              className="rounded-xl bg-[#7C3AED]/10 px-3 py-2 text-brand-foreground hover:bg-[#7C3AED]/20"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Renewal message */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground"><LocalizedText id="XotKs0dZTu6O" /></label>
                        <textarea
                          value={recurringForm.renewalMessage}
                          onChange={(e) => setRecurringForm((p) => ({ ...p, renewalMessage: e.target.value }))}
                          placeholder={legacy("azm7DJwuxSHi")}
                          rows={2}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none"
                        />
                      </div>

                      {/* Expiration warning */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground"><LocalizedText id="MC3IRABJe2QH" /></label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={recurringForm.expirationWarningDays}
                          onChange={(e) => setRecurringForm((p) => ({ ...p, expirationWarningDays: Number(e.target.value) }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                        />
                      </div>

                      {/* Active subscriptions warning */}
                      {editingService && (editingService._count?.recurringBookings ?? 0) > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                          <p className="text-xs text-amber-800 dark:text-amber-400">
                            <LocalizedText id="rvSfvG55vPLt" /> {editingService._count.recurringBookings} <LocalizedText id="jHyKkJsDcEkr" />
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>}

              </div>

              {/* Footer */}
              <div className="shrink-0 flex justify-end gap-3 p-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LocalizedText id="u527QG3L1SSL" />
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5B21B6] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingService ? (
                    legacy("4sJwCqAtyNLm")
                  ) : (
                    legacy("UoRwpFJOHChS")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-lg font-semibold"><LocalizedText id="yOCZCoqkmrWP" /></h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/30" />
            </div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Wrench className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p><LocalizedText id="qjAFqBBb6d6V" /></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4"><LocalizedText id="SU4IQ9lYuYgV" /></th>
                    <th className="pb-3 pr-4"><LocalizedText id="ViuxV1eotZPW" /></th>
                    <th className="pb-3 pr-4"><LocalizedText id="VYuyCoLt5abR" /></th>
                    <th className="pb-3 pr-4"><LocalizedText id="7gC5b_8mb-JW" /></th>
                    <th className="pb-3 pr-4"><LocalizedText id="1agERVszksqI" /></th>
                    <th className="pb-3 pr-4"><LocalizedText id="LkOFtgV_bX-b" /></th>
                    {depositEnabled && <th className="pb-3 pr-4"><LocalizedText id="qq8PaMYa8YRG" /></th>}
                    <th className="pb-3 pr-4"><LocalizedText id="gds7VwnQupX9" /></th>
                    <th className="pb-3 pr-4"><LocalizedText id="Q2Wy0nrpErM-" /></th>
                    <th className="pb-3 text-right"><LocalizedText id="-4mjC6f2TRhu" /></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, serviceIndex) => (
                    <tr
                      key={service.id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                          {service.imageUrl ? (
                            <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 font-medium">
                        <div className="flex flex-col items-start gap-1">
                          <span>{service.name}</span>
                          {service.bookingMode === "PRODUCTION" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                              <CalendarRange className="h-3 w-3" /><LocalizedText id="1-L2HAv9XQki" />
                            </span>
                          )}
                          {service.availabilityType === "SPECIAL" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <CalendarRange className="h-3 w-3" /> Servicio especial · {service.specialWeekDays.map((value) => WEEK_DAYS.find((day) => day.value === value)?.label).filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        {service.category ? (
                          <span className="inline-flex rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-brand-foreground">
                            {service.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground"><LocalizedText id="AggpTqSauu6f" /></span>
                        )}
                      </td>
                      <td className="max-w-xs truncate py-3.5 pr-4 text-muted-foreground">
                        {service.description || "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="inline-flex items-center rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-brand-foreground">
                          {service.bookingMode === "PRODUCTION"
                            ? service.productionScheduleMode === "CUSTOM"
                              ? servicesT("periods", { count: getCustomProductionWindows(service.customProductionWindows).filter((window) => window.isActive).length })
                              : `${service.weeklyProductionCapacity} cupos/sem`
                            : `${service.duration} min`}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-sm">
                        {formatPrice(service.price, currencyCode)}
                      </td>
                      {depositEnabled && (
                        <td className="py-3.5 pr-4">
                          {service.bookingMode === "PRODUCTION" ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-0.5 text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400">
                              <Banknote className="h-3 w-3" />
                              {service.productionDepositPercent}%
                            </span>
                          ) : service.depositAmount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[#009EE3]/20 bg-[#009EE3]/10 px-2 py-0.5 text-xs font-medium text-[#009EE3]">
                              <Banknote className="h-3 w-3" />
                              {formatPrice(service.depositAmount, currencyCode)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground"><LocalizedText id="2invgoh3oDZD" /></span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5 pr-4">
                        {(service.optionCategories?.length ?? 0) > 0 ? (
                          <span className="inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {servicesT("categoriesCount", { count: service.optionCategories.length })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {service.recurringPlan ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-brand-foreground">
                            <RefreshCw className="h-3 w-3" />
                            {servicesT("activeCount", { count: service._count?.recurringBookings ?? 0 })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => moveService(serviceIndex, -1)}
                            disabled={serviceIndex === 0 || savingOrder !== null}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
                            aria-label={servicesT("moveUp", { name: service.name })}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveService(serviceIndex, 1)}
                            disabled={serviceIndex === services.length - 1 || savingOrder !== null}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
                            aria-label={servicesT("moveDown", { name: service.name })}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(service)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(service.id)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
