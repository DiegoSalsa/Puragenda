"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Columns3,
  Copy,
  Eye,
  EyeOff,
  Grid3x3,
  History,
  Image as ImageIcon,
  Layers3,
  LayoutPanelLeft,
  Loader2,
  Lock,
  ListTree,
  Maximize2,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  PanelLeft,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Rocket,
  Save,
  SeparatorHorizontal,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SquareMousePointer,
  Tablet,
  Trash2,
  TriangleAlert,
  Type,
  Undo2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  clampOverlayTransform,
  type WidgetOverlayTransform,
} from "@/core/widget-studio/canvas-transform";
import {
  applyCanvasLayoutCommand,
  type CanvasLayoutCommand,
  type CanvasLayoutItem,
} from "@/core/widget-studio/canvas-layout";
import {
  detectWidgetCanvasLayoutHealth,
  type WidgetCanvasLayoutHealth,
  type WidgetCanvasRect,
} from "@/core/widget-studio/canvas-collision";
import {
  assignCanvasGroup,
  canvasSelectionUnitIds,
  clearCanvasGroup,
  remapCanvasGroupIds,
  sharedCanvasGroupId,
  transformCanvasSelection,
} from "@/core/widget-studio/canvas-group";
import {
  getWidgetCanvasPlacement,
  getWidgetCanvasPlacementForDevice,
  hasWidgetCanvasBreakpointOverride,
  isWidgetCanvasBlock,
  setWidgetCanvasBreakpointOverride,
  setWidgetCanvasMode,
  supportsFreeCanvas,
  updateWidgetCanvasPlacement,
  updateWidgetCanvasPlacementForDevice,
} from "@/core/widget-studio/canvas-block";
import {
  createWidgetNodeId,
  type WidgetCanvasDevice,
  type WidgetContentBlock,
  type WidgetDesignDocument,
  type WidgetSection,
  type WidgetStepSlotName,
} from "@/core/widget-studio/schema";
import {
  canRemoveWidgetNodes,
  removeWidgetNodes,
} from "@/core/widget-studio/document-selection";
import {
  archiveWidgetStudioAssetAction,
  publishWidgetStudioAction,
  saveWidgetStudioDraftAction,
  uploadWidgetStudioAssetAction,
} from "@/server/actions/widget-studio.actions";

type StudioAsset = {
  id: string;
  url: string;
  publicId: string;
  provider: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  altDefault: string | null;
  status: string;
  createdAt: string;
};

type StudioVersion = {
  id: string;
  versionNumber: number;
  checksum: string;
  changeSummary: string | null;
  createdAt: string;
  publishedBy: { name: string; email: string };
};

function hasLimitedPromotionalResolution(asset: StudioAsset) {
  return asset.width < 1200 || asset.height < 675;
}

export type WidgetStudioInitialState = {
  designId: string;
  draftDocument: WidgetDesignDocument;
  draftRevision: number;
  rendererEnabled: boolean;
  publishedVersion: {
    id: string;
    versionNumber: number;
    checksum: string;
    changeSummary: string | null;
    createdAt: string;
  } | null;
  fallbackVersion: {
    id: string;
    versionNumber: number;
    createdAt: string;
  } | null;
  versions: StudioVersion[];
  assets: StudioAsset[];
  assetRepairCount: number;
  repairedImageBlockIds: string[];
};

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict" | "offline";
type EditorMode = "basic" | "advanced";
type Device = WidgetCanvasDevice;
type PanelTab = "pages" | "blocks" | "layers" | "properties" | "preview";
type PreviewInteraction = "design" | "test";
type StudioStep = "service" | "staff" | "datetime" | "details";
type CanvasGridStep = 2.5 | 5 | 10;

const CANVAS_GRID_STEPS: CanvasGridStep[] = [2.5, 5, 10];

function storedCanvasGridStep(): CanvasGridStep {
  if (typeof window === "undefined") return 5;
  const value = Number(window.localStorage.getItem("puragenda_widget_studio_grid_step"));
  return CANVAS_GRID_STEPS.includes(value as CanvasGridStep)
    ? value as CanvasGridStep
    : 5;
}

const DEVICE_WIDTH: Record<Device, number> = {
  mobile: 360,
  tablet: 768,
  desktop: 1200,
};

const DEVICE_HEIGHT: Record<Device, number> = {
  mobile: 780,
  tablet: 820,
  desktop: 820,
};

const SLOT_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "global.afterHeader", label: "Global · después del encabezado", description: "Hero, bienvenida o promoción visible durante toda la reserva." },
  { value: "service.beforeMain", label: "Servicios · antes de la lista", description: "Contenido previo al catálogo de servicios." },
  { value: "service.afterMain", label: "Servicios · después de la lista", description: "Información complementaria tras los servicios." },
  { value: "staff.beforeMain", label: "Profesionales · antes del equipo", description: "Contenido previo a la selección del profesional." },
  { value: "staff.afterMain", label: "Profesionales · después del equipo", description: "Contenido posterior a la selección del profesional." },
  { value: "datetime.beforeMain", label: "Fecha y hora · antes del calendario", description: "Contenido previo a fechas y horarios." },
  { value: "datetime.afterMain", label: "Fecha y hora · después de los horarios", description: "Contenido posterior a la disponibilidad." },
  { value: "details.beforeMain", label: "Datos · antes del formulario", description: "Contenido previo a los datos del cliente." },
  { value: "details.afterMain", label: "Datos · después del formulario", description: "Contenido posterior al formulario." },
  { value: "global.beforeFooter", label: "Global · antes del pie", description: "Contacto, promoción o cierre visible en todos los pasos." },
];

function defaultSlotForSystem(id: string) {
  if (id === "system.footer") return "global.beforeFooter";
  if (id === "system.service") return "service.beforeMain";
  if (id === "system.staff") return "staff.beforeMain";
  if (id === "system.datetime") return "datetime.beforeMain";
  if (id === "system.details") return "details.beforeMain";
  return "global.afterHeader";
}

const BLOCK_META: Array<{
  type: WidgetContentBlock["type"];
  label: string;
  description: string;
  icon: typeof ImageIcon;
}> = [
  { type: "image", label: "Imagen", description: "Foto, gráfico o pieza promocional.", icon: ImageIcon },
  { type: "banner", label: "Banner", description: "Imagen, título, texto y llamada a la acción.", icon: LayoutPanelLeft },
  { type: "text", label: "Texto", description: "Título, subtítulo o párrafo.", icon: Type },
  { type: "button", label: "Botón", description: "CTA con acción o enlace seguro.", icon: SquareMousePointer },
  { type: "divider", label: "Divisor", description: "Separa visualmente el contenido.", icon: SeparatorHorizontal },
  { type: "spacer", label: "Espaciador", description: "Controla el aire entre elementos.", icon: MoreHorizontal },
];

function cloneDocument(document: WidgetDesignDocument) {
  return structuredClone(document);
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDraftValue(base: unknown, local: unknown, remote: unknown): unknown {
  if (valuesEqual(local, base)) return structuredClone(remote);
  if (valuesEqual(remote, base) || valuesEqual(local, remote)) return structuredClone(local);

  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const identifiable = [...base, ...local, ...remote].every(
      (item) => isPlainRecord(item) && typeof item.id === "string",
    );
    if (!identifiable) return structuredClone(local);

    const byId = (items: unknown[]) => new Map(
      items.map((item) => [(item as Record<string, unknown>).id as string, item]),
    );
    const baseItems = byId(base);
    const localItems = byId(local);
    const remoteItems = byId(remote);
    const order = [
      ...local.map((item) => (item as Record<string, unknown>).id as string),
      ...remote
        .map((item) => (item as Record<string, unknown>).id as string)
        .filter((id) => !localItems.has(id)),
    ];

    return order.flatMap((id) => {
      const baseItem = baseItems.get(id);
      const localItem = localItems.get(id);
      const remoteItem = remoteItems.get(id);
      if (localItem === undefined) return [];
      if (remoteItem === undefined && baseItem !== undefined && valuesEqual(localItem, baseItem)) return [];
      if (remoteItem === undefined) return [structuredClone(localItem)];
      if (baseItem === undefined) return [structuredClone(localItem)];
      return [mergeDraftValue(baseItem, localItem, remoteItem)];
    });
  }

  if (isPlainRecord(base) && isPlainRecord(local) && isPlainRecord(remote)) {
    const merged: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    for (const key of keys) {
      const baseValue = base[key];
      const localHasKey = Object.prototype.hasOwnProperty.call(local, key);
      const remoteHasKey = Object.prototype.hasOwnProperty.call(remote, key);
      if (!localHasKey && remoteHasKey && valuesEqual(remote[key], baseValue)) continue;
      if (!remoteHasKey && localHasKey && valuesEqual(local[key], baseValue)) continue;
      if (!localHasKey) {
        merged[key] = structuredClone(remote[key]);
        continue;
      }
      if (!remoteHasKey) {
        merged[key] = structuredClone(local[key]);
        continue;
      }
      merged[key] = mergeDraftValue(baseValue, local[key], remote[key]);
    }
    return merged;
  }

  return structuredClone(local);
}

function mergeWidgetDrafts(
  base: WidgetDesignDocument,
  local: WidgetDesignDocument,
  remote: WidgetDesignDocument,
) {
  return mergeDraftValue(base, local, remote) as WidgetDesignDocument;
}

function allSections(document: WidgetDesignDocument) {
  const result: Array<{ section: WidgetSection; path: string; index: number }> = [];
  for (const [slot, sections] of Object.entries(document.globalSlots)) {
    sections.forEach((section, index) => result.push({ section, path: `global.${slot}`, index }));
  }
  for (const [step, slots] of Object.entries(document.stepSlots)) {
    for (const [slot, sections] of Object.entries(slots)) {
      sections.forEach((section, index) => result.push({ section, path: `${step}.${slot}`, index }));
    }
  }
  return result;
}

function sectionsAtPath(document: WidgetDesignDocument, path: string): WidgetSection[] {
  const [scope, slot] = path.split(".");
  if (scope === "global") {
    return document.globalSlots[slot as keyof WidgetDesignDocument["globalSlots"]];
  }
  if (!document.stepSlots[scope]) {
    document.stepSlots[scope] = {
      beforeIntro: [],
      afterIntro: [],
      beforeMain: [],
      afterMain: [],
      beforeActions: [],
      afterActions: [],
    };
  }
  return document.stepSlots[scope][slot as WidgetStepSlotName];
}

function findSection(document: WidgetDesignDocument, sectionId: string) {
  return allSections(document).find(({ section }) => section.id === sectionId) || null;
}

function findBlock(document: WidgetDesignDocument, blockId: string) {
  for (const entry of allSections(document)) {
    const index = entry.section.children.findIndex((block) => block.id === blockId);
    if (index >= 0) return { ...entry, block: entry.section.children[index], blockIndex: index };
  }
  return null;
}

function createSection(name: string, child?: WidgetContentBlock): WidgetSection {
  return {
    id: createWidgetNodeId("section"),
    type: "section",
    name,
    hidden: false,
    locked: false,
    layout: "stack",
    columns: "1",
    align: "stretch",
    gap: 16,
    padding: 16,
    minHeight: 0,
    backgroundColor: "transparent",
    backgroundFit: "cover",
    backgroundFocalPoint: { x: 50, y: 50 },
    overlayColor: "#000000",
    overlayOpacity: 0,
    radius: 0,
    visibility: { mobile: true, tablet: true, desktop: true },
    children: child ? [child] : [],
  };
}

function createBlock(type: WidgetContentBlock["type"], asset?: StudioAsset): WidgetContentBlock {
  const visibility = { mobile: true, tablet: true, desktop: true };
  if (type === "image") {
    if (!asset) throw new Error("Selecciona una imagen.");
    return {
      id: createWidgetNodeId("image"),
      type,
      name: asset.altDefault || "Imagen",
      hidden: false,
      locked: false,
      visibility,
      assetId: asset.id,
      alt: asset.altDefault || "",
      decorative: !asset.altDefault,
      caption: "",
      linkUrl: "",
      mode: "flow",
      presentation: {
        fit: "cover",
        aspectRatio: "16:9",
        focalPoint: { x: 50, y: 50 },
        width: 100,
        radius: 16,
        opacity: 1,
      },
      overlay: { x: 10, y: 10, width: 36, zIndex: 2, mobileFallback: "flow" },
    };
  }
  if (type === "banner") {
    return {
      id: createWidgetNodeId("banner"),
      type,
      name: "Nuevo banner",
      hidden: false,
      locked: false,
      visibility,
      assetId: asset?.id,
      title: "Tu próxima promoción",
      subtitle: "Cuenta aquí qué hace especial esta oferta.",
      badge: "Destacado",
      ctaLabel: "",
      ctaUrl: "",
      variant: "overlay",
      align: "left",
      presentation: {
        fit: "cover",
        aspectRatio: "16:9",
        focalPoint: { x: 50, y: 50 },
        width: 100,
        radius: 16,
        opacity: 1,
      },
    };
  }
  if (type === "text") {
    return {
      id: createWidgetNodeId("text"),
      type,
      name: "Texto",
      hidden: false,
      locked: false,
      visibility,
      semantic: "heading",
      content: "Un título que represente tu negocio",
      align: "left",
      size: "xl",
      color: "text",
    };
  }
  if (type === "button") {
    return {
      id: createWidgetNodeId("button"),
      type,
      name: "Botón",
      hidden: false,
      locked: false,
      visibility,
      label: "Ver servicios",
      action: "scroll-services",
      url: "",
      newTab: false,
      variant: "primary",
      align: "left",
    };
  }
  if (type === "divider") {
    return {
      id: createWidgetNodeId("divider"),
      type,
      name: "Divisor",
      hidden: false,
      locked: false,
      visibility,
      style: "solid",
      thickness: 1,
      width: 100,
    };
  }
  return {
    id: createWidgetNodeId("spacer"),
    type: "spacer",
    name: "Espaciador",
    hidden: false,
    locked: false,
    visibility,
    size: "md",
    customPx: 32,
  };
}

function Button({
  children,
  onClick,
  disabled,
  variant = "secondary",
  title,
  ariaLabel,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  title?: string;
  ariaLabel?: string;
  className?: string;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]",
    secondary: "border-border bg-background text-foreground hover:bg-muted",
    ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold">{label}</span>
      {help && <span className="block text-[11px] leading-relaxed text-muted-foreground">{help}</span>}
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15";

function SaveBadge({ state }: { state: SaveState }) {
  const content = {
    saved: { icon: Check, label: "Guardado", style: "text-emerald-600" },
    dirty: { icon: Save, label: "Cambios pendientes", style: "text-amber-600" },
    saving: { icon: Loader2, label: "Guardando…", style: "text-[#7C3AED]" },
    error: { icon: X, label: "No se pudo guardar", style: "text-red-600" },
    conflict: { icon: Loader2, label: "Sincronizando cambios", style: "text-amber-600" },
    offline: { icon: Save, label: "Sin conexión", style: "text-amber-600" },
  }[state];
  const Icon = content.icon;
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-xs font-semibold ${content.style}`}>
      <Icon className={`h-3.5 w-3.5 ${state === "saving" ? "animate-spin" : ""}`} />
      {content.label}
    </span>
  );
}

export function WidgetStudioEditor({
  initialState,
  widgetSlug,
}: {
  initialState: WidgetStudioInitialState;
  widgetSlug: string;
}) {
  const [document, setDocument] = useState(() => cloneDocument(initialState.draftDocument));
  const [revision, setRevision] = useState(initialState.draftRevision);
  const [assets, setAssets] = useState(initialState.assets);
  const [mode, setMode] = useState<EditorMode>("basic");
  const [device, setDevice] = useState<Device>("desktop");
  const [zoom, setZoom] = useState(55);
  const [panelTab, setPanelTab] = useState<PanelTab>("pages");
  const [slotPath, setSlotPath] = useState("global.afterHeader");
  const [addTargetSectionId, setAddTargetSectionId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    allSections(initialState.draftDocument)[0]?.section.children[0]?.id || null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const initialId = allSections(initialState.draftDocument)[0]?.section.children[0]?.id;
    return initialId ? [initialId] : [];
  });
  const [saveState, setSaveState] = useState<SaveState>(
    initialState.assetRepairCount > 0 ? "dirty" : "saved",
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [showAssetRecovery, setShowAssetRecovery] = useState(
    initialState.assetRepairCount > 0,
  );
  const [previewInteraction, setPreviewInteraction] = useState<PreviewInteraction>("design");
  const [previewReadyInteraction, setPreviewReadyInteraction] = useState<PreviewInteraction | null>(null);
  const [activeStep, setActiveStep] = useState<StudioStep>("service");
  const [history, setHistory] = useState<WidgetDesignDocument[]>([]);
  const [future, setFuture] = useState<WidgetDesignDocument[]>([]);
  const [assetModal, setAssetModal] = useState<{ open: boolean; blockType: "image" | "banner" | "logo" | null }>({ open: false, blockType: null });
  const [canvasUploading, setCanvasUploading] = useState(false);
  const [canvasDropError, setCanvasDropError] = useState("");
  const [canvasGridEnabled, setCanvasGridEnabled] = useState(
    () => typeof window !== "undefined" &&
      window.localStorage.getItem("puragenda_widget_studio_grid") === "enabled",
  );
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [canvasClipboardCount, setCanvasClipboardCount] = useState(0);
  const [canvasGridStep, setCanvasGridStep] = useState<CanvasGridStep>(storedCanvasGridStep);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSummary, setPublishSummary] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState(initialState.publishedVersion);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [canvasViewportHeight, setCanvasViewportHeight] = useState(0);
  const [canvasLayoutHealth, setCanvasLayoutHealth] = useState<WidgetCanvasLayoutHealth>({
    overflowIds: [],
    collisions: [],
  });
  const documentRef = useRef(document);
  const lastSavedDocumentRef = useRef(cloneDocument(initialState.draftDocument));
  const revisionRef = useRef(revision);
  const saveInFlightRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressAutosaveRef = useRef(initialState.assetRepairCount === 0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasClipboardRef = useRef<WidgetContentBlock[]>([]);

  useEffect(() => { documentRef.current = document; }, [document]);
  useEffect(() => { revisionRef.current = revision; }, [revision]);

  const toggleCanvasGrid = useCallback(() => {
    setCanvasGridEnabled((enabled) => {
      const next = !enabled;
      window.localStorage.setItem(
        "puragenda_widget_studio_grid",
        next ? "enabled" : "disabled",
      );
      return next;
    });
  }, []);

  const changeCanvasGridStep = useCallback((step: CanvasGridStep) => {
    setCanvasGridStep(step);
    window.localStorage.setItem("puragenda_widget_studio_grid_step", String(step));
  }, []);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return findBlock(document, selectedId) || findSection(document, selectedId);
  }, [document, selectedId]);

  const changeDocument = useCallback((producer: (draft: WidgetDesignDocument) => void) => {
    setDocument((current) => {
      const next = cloneDocument(current);
      producer(next);
      setHistory((items) => [...items.slice(-49), current]);
      setFuture([]);
      setSaveMessage("");
      setSaveState("dirty");
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((items) => {
      if (!items.length) return items;
      const previous = items[items.length - 1];
      setFuture((nextItems) => [documentRef.current, ...nextItems].slice(0, 50));
      setDocument(previous);
      setSaveState("dirty");
      return items.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((items) => {
      if (!items.length) return items;
      const next = items[0];
      setHistory((previous) => [...previous.slice(-49), documentRef.current]);
      setDocument(next);
      setSaveState("dirty");
      return items.slice(1);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable=true]");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        redo();
      }
      if (event.key === "Escape" && inspectorOpen) {
        event.preventDefault();
        setInspectorOpen(false);
        return;
      }
      if (!typing && event.key === "Escape") {
        setSelectedId(null);
        setSelectedIds([]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inspectorOpen, redo, undo]);

  const resolvedAssets = useMemo(
    () => Object.fromEntries(assets.map((asset) => [asset.id, {
      id: asset.id,
      url: asset.url,
      width: asset.width,
      height: asset.height,
      altDefault: asset.altDefault,
    }])),
    [assets],
  );

  const postToPreview = useCallback((payload: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage({
      source: "puragenda-widget-studio",
      ...payload,
    }, window.location.origin);
  }, []);

  const resetPreviewScroll = useCallback(() => {
    const reset = () => {
      const frame = iframeRef.current;
      try {
        frame?.contentWindow?.scrollTo({ top: 0, left: 0, behavior: "auto" });
        if (frame?.contentDocument?.documentElement) frame.contentDocument.documentElement.scrollTop = 0;
        if (frame?.contentDocument?.body) frame.contentDocument.body.scrollTop = 0;
      } catch {
        // Keep the editor usable if the iframe is navigating between same-origin states.
      }
    };
    reset();
    window.requestAnimationFrame(reset);
  }, []);

  const changePreviewDevice = useCallback((nextDevice: Device) => {
    setDevice(nextDevice);
    resetPreviewScroll();
  }, [resetPreviewScroll]);

  const resetPreviewSimulation = useCallback(() => {
    setActiveStep("service");
    postToPreview({ type: "RESET_SIMULATION" });
    resetPreviewScroll();
  }, [postToPreview, resetPreviewScroll]);

  const selectStudioElement = useCallback((id: string, intent?: { additive?: boolean }) => {
    const entry = findBlock(documentRef.current, id);
    const selectionUnit = entry && isWidgetCanvasBlock(entry.block)
      ? canvasSelectionUnitIds(entry.section, entry.block)
      : [id];
    const additiveOverlay = Boolean(
      intent?.additive === true &&
      entry &&
      isWidgetCanvasBlock(entry.block) &&
      !entry.block.locked &&
      !entry.section.locked,
    );

    if (additiveOverlay && entry) {
      setInspectorOpen(false);
      setSelectedIds((current) => {
        const sameCanvas = current.filter((selectedId) => {
          const selectedEntry = findBlock(documentRef.current, selectedId);
          return selectedEntry?.path === entry.path &&
            selectedEntry.section.id === entry.section.id &&
            isWidgetCanvasBlock(selectedEntry.block);
        });
        const next = new Set(sameCanvas);
        const removeUnit = selectionUnit.every((unitId) => next.has(unitId));
        for (const unitId of selectionUnit) {
          if (removeUnit) next.delete(unitId);
          else next.add(unitId);
        }
        const nextIds = [...next];
        setSelectedId(nextIds.includes(id) ? id : nextIds.at(-1) ?? null);
        return nextIds;
      });
      setSlotPath(entry.path);
      return;
    }

    setSelectedId(id);
    setSelectedIds(selectionUnit);
    if (id.startsWith("system.")) {
      setSlotPath(defaultSlotForSystem(id));
      const stepBySystem: Partial<Record<string, StudioStep>> = {
        "system.service": "service",
        "system.staff": "staff",
        "system.datetime": "datetime",
        "system.details": "details",
      };
      const nextStep = stepBySystem[id];
      if (nextStep) setActiveStep(nextStep);
      return;
    }
    const selectedEntry = findBlock(documentRef.current, id) || findSection(documentRef.current, id);
    if (selectedEntry) setSlotPath(selectedEntry.path);
  }, []);

  const applyInlineTextEdit = useCallback((id: string, field: string, rawValue: string) => {
    const value = rawValue.replace(/\r/g, "");
    setSelectedId(id);
    setSelectedIds([id]);
    changeDocument((draft) => {
      if (id.startsWith("system.")) {
        if (id === "system.header" && field === "eyebrow") {
          draft.system.header.eyebrow = value.slice(0, 48);
        }
        if (id === "system.service" && (field === "title" || field === "description")) {
          draft.system.service[field] = value.slice(0, field === "title" ? 90 : 240);
        }
        if (id === "system.staff" && (field === "title" || field === "description")) {
          draft.system.staff[field] = value.slice(0, field === "title" ? 90 : 240);
        }
        if (id === "system.datetime" && (field === "title" || field === "description")) {
          draft.system.datetime[field] = value.slice(0, field === "title" ? 90 : 240);
        }
        if (id === "system.details" && (field === "title" || field === "description")) {
          draft.system.details[field] = value.slice(0, field === "title" ? 90 : 240);
        }
        return;
      }

      const found = findBlock(draft, id);
      if (!found) return;
      if (found.block.type === "text" && field === "content") {
        found.block.content = value.slice(0, 1200);
      }
      if (found.block.type === "button" && field === "label") {
        found.block.label = value.slice(0, 60);
      }
      if (found.block.type === "banner" && ["title", "subtitle", "badge", "ctaLabel"].includes(field)) {
        const limits = { title: 90, subtitle: 240, badge: 32, ctaLabel: 40 } as const;
        const bannerField = field as keyof typeof limits;
        found.block[bannerField] = value.slice(0, limits[bannerField]);
      }
    });
  }, [changeDocument]);

  const fitPreview = useCallback((targetDevice: Device) => {
    const availableWidth = Math.max(240, (canvasViewportRef.current?.clientWidth || 720) - 32);
    const exactZoom = (availableWidth / DEVICE_WIDTH[targetDevice]) * 100;
    setZoom(Math.max(20, Math.min(100, Math.floor(exactZoom / 5) * 5)));
  }, []);

  useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    let measuredWidth = 0;
    const measure = () => {
      if (mode === "advanced") {
        setCanvasViewportHeight(viewport.clientHeight);
      }
      if (Math.abs(viewport.clientWidth - measuredWidth) > 1) {
        measuredWidth = viewport.clientWidth;
        fitPreview(device);
      }
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [device, fitPreview, leftPanelOpen, mode]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 799px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      setDevice((currentDevice) => currentDevice === "desktop" ? "mobile" : currentDevice);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      postToPreview({
        type: "UPDATE_DOCUMENT",
        document,
        assets: resolvedAssets,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [document, postToPreview, resolvedAssets]);

  useEffect(() => {
    postToPreview({ type: "SET_INTERACTION_MODE", mode: previewInteraction });
  }, [postToPreview, previewInteraction]);

  useEffect(() => {
    postToPreview({
      type: "SET_CANVAS_TRANSFORMS",
      enabled: mode === "advanced" && previewInteraction === "design",
    });
  }, [mode, postToPreview, previewInteraction]);

  useEffect(() => {
    postToPreview({
      type: "SET_CANVAS_GRID",
      enabled:
        mode === "advanced" &&
        previewInteraction === "design" &&
        canvasGridEnabled,
      step: canvasGridStep,
    });
  }, [canvasGridEnabled, canvasGridStep, mode, postToPreview, previewInteraction]);

  useEffect(() => {
    postToPreview({ type: "SET_CANVAS_DEVICE", device });
  }, [device, postToPreview]);

  const measureCanvasLayoutHealth = useCallback(() => {
    const frameDocument = iframeRef.current?.contentDocument;
    if (!frameDocument) return { overflowIds: [], collisions: [] };
    const rectangles: WidgetCanvasRect[] = [];
    for (const section of frameDocument.querySelectorAll<HTMLElement>("[data-widget-section-id]")) {
      const sectionBounds = section.getBoundingClientRect();
      if (!sectionBounds.width || !sectionBounds.height) continue;
      for (const block of section.querySelectorAll<HTMLElement>("[data-widget-canvas-responsive='true']")) {
        const blockBounds = block.getBoundingClientRect();
        const id = block.dataset.widgetBlockId;
        if (!id || !blockBounds.width || !blockBounds.height) continue;
        rectangles.push({
          id,
          sectionId: section.dataset.widgetSectionId || "section",
          x: ((blockBounds.left - sectionBounds.left) / sectionBounds.width) * 100,
          y: ((blockBounds.top - sectionBounds.top) / sectionBounds.height) * 100,
          width: (blockBounds.width / sectionBounds.width) * 100,
          height: (blockBounds.height / sectionBounds.height) * 100,
        });
      }
    }
    return detectWidgetCanvasLayoutHealth(rectangles);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanvasLayoutHealth(
        mode === "advanced" && previewInteraction === "design"
          ? measureCanvasLayoutHealth()
          : { overflowIds: [], collisions: [] },
      );
    }, mode === "advanced" && previewInteraction === "design" ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [activeStep, device, document, measureCanvasLayoutHealth, mode, previewInteraction, zoom]);

  const changePreviewInteraction = useCallback((nextMode: PreviewInteraction) => {
    setPreviewInteraction(nextMode);
    setPreviewReadyInteraction(null);
    setInspectorOpen(false);
    postToPreview({ type: "SET_INTERACTION_MODE", mode: nextMode });
    if (nextMode === "test") {
      resetPreviewSimulation();
    } else {
      resetPreviewScroll();
    }
  }, [postToPreview, resetPreviewScroll, resetPreviewSimulation]);

  useEffect(() => {
    postToPreview({ type: "SET_SELECTED", id: selectedId, ids: selectedIds });
  }, [postToPreview, selectedId, selectedIds]);

  useEffect(() => {
    postToPreview({
      type: "SET_MULTI_SELECT_MODE",
      enabled:
        mode === "advanced" &&
        previewInteraction === "design" &&
        multiSelectMode,
    });
  }, [mode, multiSelectMode, postToPreview, previewInteraction]);

  useEffect(() => {
    if (previewInteraction !== "design") return;
    postToPreview({ type: "SET_STEP", step: activeStep });
  }, [activeStep, postToPreview, previewInteraction]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "puragenda-widget-preview") return;
      if (event.data.type === "PREVIEW_READY") {
        setPreviewReadyInteraction(null);
        postToPreview({
          type: "UPDATE_DOCUMENT",
          document: documentRef.current,
          assets: resolvedAssets,
        });
        postToPreview({ type: "SET_INTERACTION_MODE", mode: previewInteraction });
        postToPreview({
          type: "SET_CANVAS_TRANSFORMS",
          enabled: mode === "advanced" && previewInteraction === "design",
        });
        postToPreview({
          type: "SET_CANVAS_GRID",
          enabled:
            mode === "advanced" &&
            previewInteraction === "design" &&
            canvasGridEnabled,
          step: canvasGridStep,
        });
        postToPreview({ type: "SET_CANVAS_DEVICE", device });
        postToPreview({ type: "SET_SELECTED", id: selectedId, ids: selectedIds });
        postToPreview({
          type: "SET_MULTI_SELECT_MODE",
          enabled:
            mode === "advanced" &&
            previewInteraction === "design" &&
            multiSelectMode,
        });
        if (previewInteraction === "design") {
          postToPreview({ type: "SET_STEP", step: activeStep });
        }
      }
      if (
        event.data.type === "INTERACTION_MODE_CHANGED" &&
        (event.data.mode === "design" || event.data.mode === "test")
      ) {
        setPreviewReadyInteraction(event.data.mode);
      }
      if (
        previewInteraction === "test" &&
        event.data.type === "STEP_CHANGED" &&
        ["service", "staff", "datetime", "details"].includes(event.data.step)
      ) {
        setActiveStep(event.data.step as StudioStep);
      }
      if (event.data.type === "BLOCK_SELECTED" && typeof event.data.blockId === "string") {
        selectStudioElement(event.data.blockId, {
          additive: event.data.additive === true,
        });
      }
      if (
        event.data.type === "INLINE_TEXT_COMMIT" &&
        typeof event.data.blockId === "string" &&
        typeof event.data.field === "string" &&
        typeof event.data.value === "string"
      ) {
        applyInlineTextEdit(event.data.blockId, event.data.field, event.data.value);
      }
      if (
        event.data.type === "OVERLAY_TRANSFORM_COMMIT" &&
        typeof event.data.blockId === "string" &&
        event.data.transform &&
        typeof event.data.transform === "object"
      ) {
        const rawTransform = event.data.transform as Partial<WidgetOverlayTransform>;
        if (
          typeof rawTransform.x !== "number" ||
          typeof rawTransform.y !== "number" ||
          typeof rawTransform.width !== "number"
        ) {
          return;
        }
        const transform = clampOverlayTransform({
          x: rawTransform.x,
          y: rawTransform.y,
          width: rawTransform.width,
        });
        setSelectedId(event.data.blockId);
        changeDocument((draft) => {
          const found = findBlock(draft, event.data.blockId);
          if (!found || !isWidgetCanvasBlock(found.block)) return;
          const selectionIds = selectedIds.includes(found.block.id)
            ? selectedIds
            : canvasSelectionUnitIds(found.section, found.block);
          const blocks = selectionIds.flatMap((id) => {
            const entry = findBlock(draft, id);
            return entry &&
              entry.section.id === found.section.id &&
              isWidgetCanvasBlock(entry.block) &&
              !entry.block.locked
              ? [entry.block]
              : [];
          });
          const updates = transformCanvasSelection(blocks, found.block.id, transform, device);
          for (const [id, next] of Object.entries(updates)) {
            const entry = findBlock(draft, id);
            if (entry) updateWidgetCanvasPlacementForDevice(entry.block, device, next);
          }
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [activeStep, applyInlineTextEdit, canvasGridEnabled, canvasGridStep, changeDocument, device, mode, multiSelectMode, postToPreview, previewInteraction, resolvedAssets, selectStudioElement, selectedId, selectedIds]);

  useEffect(() => {
    if (suppressAutosaveRef.current) {
      suppressAutosaveRef.current = false;
      return;
    }
    if (saveState !== "dirty") return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!navigator.onLine) {
        setSaveState("offline");
        localStorage.setItem(`puragenda_widget_draft_${initialState.designId}`, JSON.stringify(documentRef.current));
        return;
      }
      if (saveInFlightRef.current) {
        setSaveTrigger((value) => value + 1);
        return;
      }
      saveInFlightRef.current = true;
      const documentToSave = cloneDocument(documentRef.current);
      const expectedRevision = revisionRef.current;
      setSaveState("saving");
      const result = await saveWidgetStudioDraftAction({
        document: documentToSave,
        expectedRevision,
      });
      try {
        if (!("error" in result)) {
          setRevision(result.revision);
          revisionRef.current = result.revision;
          lastSavedDocumentRef.current = documentToSave;
          localStorage.removeItem(`puragenda_widget_draft_${initialState.designId}`);
          if (valuesEqual(documentRef.current, documentToSave)) {
            setSaveState("saved");
            setSaveMessage("");
          } else {
            setSaveState("dirty");
            setSaveTrigger((value) => value + 1);
          }
        } else if (result.code === "CONFLICT" && "currentDocument" in result) {
          const remoteDocument = cloneDocument(result.currentDocument);
          const mergedDocument = mergeWidgetDrafts(
            lastSavedDocumentRef.current,
            documentRef.current,
            remoteDocument,
          );
          lastSavedDocumentRef.current = remoteDocument;
          revisionRef.current = result.currentRevision;
          setRevision(result.currentRevision);
          documentRef.current = mergedDocument;
          setDocument(mergedDocument);
          setSaveMessage("Se detectaron cambios de otra pestaña y se combinaron automáticamente.");
          setSaveState("dirty");
          setSaveTrigger((value) => value + 1);
        } else {
          setSaveState("error");
          setSaveMessage(result.error || "No se pudo guardar el borrador.");
        }
      } finally {
        saveInFlightRef.current = false;
      }
    }, 550);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [document, initialState.designId, saveState, saveTrigger]);

  useEffect(() => {
    const reconnect = () => {
      if (saveState === "offline") setSaveState("dirty");
    };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [saveState]);

  function addBlock(type: WidgetContentBlock["type"], asset?: StudioAsset) {
    if ((type === "image" || type === "banner") && !asset && type === "image") {
      setAssetModal({ open: true, blockType: type });
      return;
    }
    const block = createBlock(type, asset);
    changeDocument((draft) => {
      const targetSection = addTargetSectionId
        ? findSection(draft, addTargetSectionId)?.section
        : null;
      if (targetSection && !targetSection.locked) {
        targetSection.children.push(block);
      } else {
        sectionsAtPath(draft, slotPath).push(createSection(block.name, block));
      }
    });
    setAddTargetSectionId(null);
    setSelectedId(block.id);
    setSelectedIds([block.id]);
    setPanelTab(window.innerWidth < 800 ? "properties" : "layers");
  }

  async function handleCanvasDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    if (mode !== "advanced" || previewInteraction !== "design") return;
    const file = Array.from(event.dataTransfer.files).find((item) => ["image/png", "image/jpeg", "image/webp"].includes(item.type));
    if (!file) {
      setCanvasDropError("Arrastra una imagen PNG, JPEG o WebP.");
      return;
    }
    setCanvasUploading(true);
    setCanvasDropError("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("alt", file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]/g, " "));
    const result = await uploadWidgetStudioAssetAction(formData);
    setCanvasUploading(false);
    if ("error" in result) {
      setCanvasDropError(result.error);
      return;
    }
    setAssets((items) => [result.asset, ...items]);
    addBlock("image", result.asset);
  }

  const selectedCanvasEntries = useMemo(() => selectedIds.flatMap((id) => {
    const entry = findBlock(document, id);
    if (!entry || !isWidgetCanvasBlock(entry.block)) return [];
    return [entry];
  }), [document, selectedIds]);

  const canvasSelectionIsValid = selectedCanvasEntries.length === selectedIds.length &&
    selectedCanvasEntries.length > 0 &&
    selectedCanvasEntries.every((entry) =>
      entry.section.id === selectedCanvasEntries[0].section.id &&
      !entry.section.locked &&
      !entry.block.locked,
    );
  const selectedCanvasGroupId = canvasSelectionIsValid
    ? sharedCanvasGroupId(selectedCanvasEntries.map((entry) => entry.block))
    : null;

  function measureCanvasSelection(): CanvasLayoutItem[] {
    if (!canvasSelectionIsValid) return [];
    const frameDocument = iframeRef.current?.contentDocument;
    if (!frameDocument) return [];
    const sectionId = selectedCanvasEntries[0].section.id;
    const sectionElement = frameDocument.querySelector<HTMLElement>(
      `[data-widget-section-id="${CSS.escape(sectionId)}"]`,
    );
    const sectionBounds = sectionElement?.getBoundingClientRect();
    if (!sectionBounds?.height) return [];

    return selectedCanvasEntries.flatMap((entry) => {
      if (!isWidgetCanvasBlock(entry.block)) return [];
      const placement = getWidgetCanvasPlacementForDevice(entry.block, device);
      const element = frameDocument.querySelector<HTMLElement>(
        `[data-widget-block-id="${CSS.escape(entry.block.id)}"]`,
      );
      const bounds = element?.getBoundingClientRect();
      if (!bounds?.height) return [];
      return [{
        id: entry.block.id,
        transform: {
          x: placement.x,
          y: placement.y,
          width: placement.width,
        },
        height: (bounds.height / sectionBounds.height) * 100,
      }];
    });
  }

  function runCanvasLayoutCommand(command: CanvasLayoutCommand) {
    const measured = measureCanvasSelection();
    if (measured.length !== selectedCanvasEntries.length) {
      setCanvasDropError("La vista previa todavía está midiendo los elementos. Intenta nuevamente en un instante.");
      return;
    }
    if ((command === "distribute-x" || command === "distribute-y") && measured.length < 3) return;
    const updates = applyCanvasLayoutCommand(measured, command);
    setCanvasDropError("");
    changeDocument((draft) => {
      for (const [id, transform] of Object.entries(updates)) {
        const found = findBlock(draft, id);
        if (!found || !isWidgetCanvasBlock(found.block)) continue;
        updateWidgetCanvasPlacementForDevice(found.block, device, transform);
      }
    });
  }

  function adjustSelectedLayers(direction: -1 | 1) {
    if (!canvasSelectionIsValid) return;
    changeDocument((draft) => {
      for (const id of selectedIds) {
        const found = findBlock(draft, id);
        if (!found || !isWidgetCanvasBlock(found.block)) continue;
        const placement = getWidgetCanvasPlacement(found.block);
        updateWidgetCanvasPlacement(found.block, { zIndex: Math.max(
          1,
          Math.min(5, placement.zIndex + direction),
        ) });
      }
    });
  }

  function toggleSelectedCanvasGroup() {
    if (!canvasSelectionIsValid || selectedCanvasEntries.length < 2) return;
    changeDocument((draft) => {
      const blocks = selectedIds.flatMap((id) => {
        const found = findBlock(draft, id);
        return found && isWidgetCanvasBlock(found.block) ? [found.block] : [];
      });
      if (selectedCanvasGroupId) clearCanvasGroup(blocks);
      else assignCanvasGroup(blocks, createWidgetNodeId("group"));
    });
  }

  function duplicateCanvasSelection() {
    if (!canvasSelectionIsValid) return;
    const copies = selectedCanvasEntries.flatMap((entry) => {
      if (!isWidgetCanvasBlock(entry.block)) return [];
      const copy = structuredClone(entry.block);
      copy.id = createWidgetNodeId(copy.type);
      copy.name = `${copy.name} copia`;
      copy.locked = false;
      const placement = getWidgetCanvasPlacement(copy);
      updateWidgetCanvasPlacement(copy, {
        x: Math.min(100 - placement.width, placement.x + 6),
        y: Math.min(90, placement.y + 6),
        zIndex: Math.min(5, placement.zIndex + 1),
      });
      return [copy];
    });
    remapCanvasGroupIds(copies, () => createWidgetNodeId("group"));
    const nextIds = copies.map((copy) => copy.id);
    changeDocument((draft) => {
      const targetSection = findSection(draft, selectedCanvasEntries[0].section.id)?.section;
      if (!targetSection) return;
      targetSection.children.push(...copies);
    });
    if (nextIds.length) {
      setSelectedIds(nextIds);
      setSelectedId(nextIds.at(-1) ?? null);
    }
  }

  const copyCanvasSelection = useCallback(() => {
    const entries = selectedIds.flatMap((id) => {
      const entry = findBlock(documentRef.current, id);
      return entry && isWidgetCanvasBlock(entry.block) && !entry.block.locked
        ? [entry]
        : [];
    });
    if (!entries.length || entries.length !== selectedIds.length) return;
    canvasClipboardRef.current = entries.map((entry) => structuredClone(entry.block));
    setCanvasClipboardCount(entries.length);
  }, [selectedIds]);

  const pasteCanvasSelection = useCallback(() => {
    if (!canvasClipboardRef.current.length) return;
    const selectedEntry = selectedId ? findBlock(documentRef.current, selectedId) : null;
    const selectedSection = selectedId ? findSection(documentRef.current, selectedId) : null;
    const targetSectionId = selectedEntry?.section.id || selectedSection?.section.id;
    if (!targetSectionId) return;

    const copies = canvasClipboardRef.current.map((source) => {
      const copy = structuredClone(source);
      copy.id = createWidgetNodeId(copy.type);
      copy.name = `${copy.name} copia`;
      copy.locked = false;
      const placement = getWidgetCanvasPlacement(copy);
      setWidgetCanvasMode(copy, "free");
      updateWidgetCanvasPlacement(copy, {
        x: Math.min(100 - placement.width, placement.x + 6),
        y: Math.min(90, placement.y + 6),
        zIndex: Math.min(5, placement.zIndex + 1),
      });
      return copy;
    });
    remapCanvasGroupIds(copies, () => createWidgetNodeId("group"));
    changeDocument((draft) => {
      const target = findSection(draft, targetSectionId)?.section;
      if (!target || target.locked) return;
      target.children.push(...copies);
    });
    const nextIds = copies.map((copy) => copy.id);
    setSelectedIds(nextIds);
    setSelectedId(nextIds.at(-1) ?? null);
  }, [changeDocument, selectedId]);

  useEffect(() => {
    const onClipboardShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable=true]");
      if (typing || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyCanvasSelection();
      }
      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteCanvasSelection();
      }
    };
    window.addEventListener("keydown", onClipboardShortcut);
    return () => window.removeEventListener("keydown", onClipboardShortcut);
  }, [copyCanvasSelection, pasteCanvasSelection]);

  function updateSelectedBlock(updater: (block: WidgetContentBlock) => void) {
    if (!selectedId) return;
    changeDocument((draft) => {
      const found = findBlock(draft, selectedId);
      if (found) updater(found.block);
    });
  }

  function updateSelectedSection(updater: (section: WidgetSection) => void) {
    if (!selectedId) return;
    changeDocument((draft) => {
      const block = findBlock(draft, selectedId);
      const section = block?.section || findSection(draft, selectedId)?.section;
      if (section) updater(section);
    });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    changeDocument((draft) => {
      const found = findSection(draft, sectionId);
      if (!found) return;
      const list = sectionsAtPath(draft, found.path);
      const nextIndex = found.index + direction;
      if (nextIndex < 0 || nextIndex >= list.length) return;
      [list[found.index], list[nextIndex]] = [list[nextIndex], list[found.index]];
    });
  }

  function moveSectionTo(sectionId: string, targetId: string) {
    if (sectionId === targetId) return;
    changeDocument((draft) => {
      const source = findSection(draft, sectionId);
      const target = findSection(draft, targetId);
      if (!source || !target || source.path !== target.path) return;
      const list = sectionsAtPath(draft, source.path);
      const [moved] = list.splice(source.index, 1);
      const targetIndex = list.findIndex((section) => section.id === targetId);
      list.splice(targetIndex, 0, moved);
    });
  }

  function duplicateSection(sectionId: string) {
    changeDocument((draft) => {
      const found = findSection(draft, sectionId);
      if (!found) return;
      const copy = structuredClone(found.section);
      copy.id = createWidgetNodeId("section");
      copy.name = `${copy.name} copia`;
      copy.children = copy.children.map((block) => ({
        ...block,
        id: createWidgetNodeId(block.type),
        name: `${block.name} copia`,
      })) as WidgetContentBlock[];
      remapCanvasGroupIds(copy.children, () => createWidgetNodeId("group"));
      sectionsAtPath(draft, found.path).splice(found.index + 1, 0, copy);
      const nextId = copy.children[0]?.id || copy.id;
      setSelectedId(nextId);
      setSelectedIds([nextId]);
    });
  }

  function removeSelected() {
    if (!selectedId) return;
    const targets = selectedIds.length > 0 ? selectedIds : [selectedId];
    if (!canRemoveWidgetNodes(documentRef.current, targets)) return;
    changeDocument((draft) => {
      removeWidgetNodes(draft, targets);
    });
    setSelectedId(null);
    setSelectedIds([]);
  }

  function changeSelectedSlot(nextPath: string) {
    if (!selectedId) {
      setSlotPath(nextPath);
      return;
    }
    changeDocument((draft) => {
      const foundBlock = findBlock(draft, selectedId);
      const foundSection = foundBlock || findSection(draft, selectedId);
      if (!foundSection || foundSection.path === nextPath) return;
      const source = sectionsAtPath(draft, foundSection.path);
      const [section] = source.splice(foundSection.index, 1);
      sectionsAtPath(draft, nextPath).push(section);
    });
    setSlotPath(nextPath);
  }

  async function publish() {
    setPublishing(true);
    const result = await publishWidgetStudioAction({
      expectedRevision: revisionRef.current,
      summary: publishSummary,
    });
    setPublishing(false);
    if (!("error" in result)) {
      setPublishedVersion({
        id: result.versionId,
        versionNumber: result.versionNumber,
        checksum: result.checksum,
        changeSummary: publishSummary || null,
        createdAt: new Date().toISOString(),
      });
      setPublishOpen(false);
      setPublishSummary("");
      postToPreview({
        type: "UPDATE_DOCUMENT",
        document: documentRef.current,
        assets: resolvedAssets,
      });
    } else {
      if (result.code === "CONFLICT") {
        setPublishOpen(false);
        setSaveMessage("Hay cambios más recientes. Los estamos combinando antes de publicar.");
        setSaveState("dirty");
        setSaveTrigger((value) => value + 1);
      } else {
        setSaveMessage(result.error);
        setSaveState("error");
      }
    }
  }

  const currentSection = selectedId
    ? (findBlock(document, selectedId)?.section || findSection(document, selectedId)?.section || null)
    : null;
  const selectedBlock = selectedId ? findBlock(document, selectedId)?.block || null : null;
  const selectedSystemId = selectedId?.startsWith("system.") ? selectedId : null;
  const visibleLeftPanelTab = panelTab === "properties" || panelTab === "preview" ? "pages" : panelTab;
  const previewViewportHeight = mode === "advanced" && canvasViewportHeight > 0
    ? Math.min(
      DEVICE_HEIGHT[device],
      Math.max(180, Math.floor((canvasViewportHeight - 36) / (zoom / 100))),
    )
    : DEVICE_HEIGHT[device];

  return (
    <div
      className={mode === "advanced"
        ? "fixed inset-0 z-[60] flex min-h-0 flex-col bg-background"
        : "-mx-3 -mt-2 sm:-mx-5 xl:-mx-7"}
      data-tour="widget-studio"
    >
      <header className={`studio-main-header relative sticky z-30 shrink-0 border-y border-border bg-background/95 px-3 py-3 shadow-sm backdrop-blur sm:px-5 ${mode === "advanced" ? "top-0" : "top-[52px] md:top-0"}`}>
        <div className="studio-header-row flex flex-wrap items-center justify-between gap-3">
          <div className="studio-header-title min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-3">
              {mode === "advanced" && (
                <button
                  type="button"
                  onClick={() => setMode("basic")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted"
                  aria-label="Volver al modo básico"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7C3AED]">{mode === "advanced" ? "Puragenda Studio" : "Editor del widget"}</p>
              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="min-w-0 truncate text-lg font-bold" title={document.meta.name}>{document.meta.name}</h2>
                <SaveBadge state={saveState} />
              </div>
              </div>
            </div>
          </div>
          <div className="studio-header-tools flex flex-wrap items-center gap-2">
            {mode === "advanced" && (
              <Button
                className="studio-desktop-secondary-action"
                variant={leftPanelOpen ? "secondary" : "ghost"}
                onClick={() => setLeftPanelOpen((open) => !open)}
                title={leftPanelOpen ? "Ocultar estructura" : "Mostrar estructura"}
              >
                <PanelLeft className="h-4 w-4" />
                <span className="hidden xl:inline">Estructura</span>
              </Button>
            )}
            {mode === "advanced" && (
              <div className="studio-interaction-toggle flex rounded-xl border border-border bg-muted p-1" role="group" aria-label="Comportamiento de la vista previa" data-tour="studio-interaction">
                <button
                  type="button"
                  onClick={() => changePreviewInteraction("design")}
                  aria-pressed={previewInteraction === "design"}
                  aria-busy={previewInteraction === "design" && previewReadyInteraction !== "design"}
                  className={`flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${previewInteraction === "design" ? "bg-background text-[#7C3AED] shadow-sm" : "text-muted-foreground"}`}
                >
                  {previewInteraction === "design" && previewReadyInteraction !== "design"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <MousePointer2 className="h-3.5 w-3.5" />} Diseñar
                </button>
                <button
                  type="button"
                  onClick={() => changePreviewInteraction("test")}
                  aria-pressed={previewInteraction === "test"}
                  aria-busy={previewInteraction === "test" && previewReadyInteraction !== "test"}
                  className={`flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${previewInteraction === "test" ? "bg-background text-[#7C3AED] shadow-sm" : "text-muted-foreground"}`}
                >
                  {previewInteraction === "test" && previewReadyInteraction !== "test"
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Play className="h-3.5 w-3.5" />} Probar
                </button>
              </div>
            )}
            <div className="studio-mode-toggle flex rounded-xl border border-border bg-muted p-1" role="tablist" aria-label="Modo de edición">
              {(["basic", "advanced"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => {
                    setMode(value);
                    setInspectorOpen(false);
                    if (value === "advanced" && window.innerWidth < 800) {
                      if (device === "desktop") setDevice("mobile");
                      setPanelTab("preview");
                      setLeftPanelOpen(false);
                      setInspectorOpen(false);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {value === "basic" ? "Básico" : "Avanzado"}
                </button>
              ))}
            </div>
            <Button className="studio-desktop-secondary-action" variant="ghost" onClick={undo} disabled={!history.length} title="Deshacer (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
            <Button className="studio-desktop-secondary-action" variant="ghost" onClick={redo} disabled={!future.length} title="Rehacer (Ctrl+Y)"><Redo2 className="h-4 w-4" /></Button>
            {mode === "advanced" && previewInteraction === "test" && (
              <Button className="studio-desktop-secondary-action" variant="ghost" onClick={resetPreviewSimulation} title="Reiniciar simulación">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {mode === "advanced" && (
              <Button
                className="studio-desktop-secondary-action"
                variant="ghost"
                onClick={() => window.document.dispatchEvent(new CustomEvent("puragenda:start-contextual-help"))}
                title="Ayuda del Studio"
                data-tour="studio-help"
              >
                <CircleHelp className="h-4 w-4" />
                <span className="hidden xl:inline">Ayuda</span>
              </Button>
            )}
            <Link href="/dashboard/appearance/historial" className="studio-desktop-secondary-action hidden min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted sm:inline-flex">
              <History className="h-4 w-4" /> Historial
            </Link>
          </div>
          <div className="studio-header-primary-actions flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setPublishOpen(true)}
              disabled={saveState !== "saved"}
              title={saveState !== "saved" ? "Espera a que el borrador termine de guardarse" : "Publicar borrador"}
            >
              <Rocket className="h-4 w-4" /> Publicar
            </Button>
            <details className="studio-mobile-actions relative hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-background"
                aria-label="Más acciones del Studio"
              >
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 top-12 z-[80] grid w-56 gap-1 rounded-2xl border border-border bg-background p-2 shadow-2xl">
                <button type="button" onClick={undo} disabled={!history.length} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold hover:bg-muted disabled:opacity-40"><Undo2 className="h-4 w-4" /> Deshacer</button>
                <button type="button" onClick={redo} disabled={!future.length} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold hover:bg-muted disabled:opacity-40"><Redo2 className="h-4 w-4" /> Rehacer</button>
                {previewInteraction === "test" && <button type="button" onClick={resetPreviewSimulation} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold hover:bg-muted"><RotateCcw className="h-4 w-4" /> Reiniciar prueba</button>}
                <button type="button" onClick={() => window.document.dispatchEvent(new CustomEvent("puragenda:start-contextual-help"))} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold hover:bg-muted"><CircleHelp className="h-4 w-4" /> Ayuda del Studio</button>
                <Link href="/dashboard/appearance/historial" className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-muted"><History className="h-4 w-4" /> Historial</Link>
              </div>
            </details>
          </div>
        </div>
        {(showAssetRecovery || saveMessage) && (
          <div className="studio-editor-feedback border-t border-border/70 bg-background px-3 py-2 sm:px-5">
            {showAssetRecovery && (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
              >
                <TriangleAlert className="h-4 w-4 shrink-0" />
                <span className="min-w-48 flex-1 leading-relaxed">
                  Recuperamos el borrador sin borrar su composiciÃ³n: {initialState.assetRepairCount === 1 ? "una referencia de imagen ya no estaba disponible" : `${initialState.assetRepairCount} referencias de imagen ya no estaban disponibles`}. Los bloques conservan su posiciÃ³n y estilos para que puedas reemplazarlos.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const firstRecoveredId = initialState.repairedImageBlockIds.find((id) => findBlock(documentRef.current, id));
                    if (firstRecoveredId) {
                      selectStudioElement(firstRecoveredId);
                      setInspectorOpen(true);
                    }
                  }}
                  disabled={!initialState.repairedImageBlockIds.length}
                  className="min-h-8 rounded-lg border border-amber-700/25 bg-white/70 px-2.5 font-bold transition hover:bg-white disabled:hidden dark:bg-black/20 dark:hover:bg-black/30"
                >
                  Revisar bloque
                </button>
                <button type="button" onClick={() => setShowAssetRecovery(false)} aria-label="Cerrar aviso de recuperaciÃ³n" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
            )}
            {saveMessage && (
              <div
                role={saveState === "error" ? "alert" : "status"}
                aria-live={saveState === "error" ? "assertive" : "polite"}
                className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs ${showAssetRecovery ? "mt-2" : ""} ${saveState === "error" ? "border-red-500/25 bg-red-50 text-red-800 dark:bg-red-950/45 dark:text-red-100" : "border-amber-500/25 bg-amber-50 text-amber-900 dark:bg-amber-950/45 dark:text-amber-100"}`}
              >
                {saveState === "saving" || saveState === "dirty" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <TriangleAlert className="h-4 w-4 shrink-0" />}
                <span className="min-w-48 flex-1 leading-relaxed">{saveMessage}</span>
                {saveState === "error" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSaveMessage("");
                      setSaveState("dirty");
                      setSaveTrigger((value) => value + 1);
                    }}
                    className="min-h-8 rounded-lg border border-red-700/25 bg-white/70 px-2.5 font-bold transition hover:bg-white dark:bg-black/20 dark:hover:bg-black/30"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <div className={mode === "advanced" ? `studio-advanced-grid ${leftPanelOpen ? "" : "studio-left-closed"}` : "studio-basic-grid"}>
        {mode === "advanced" && leftPanelOpen && (
          <aside className={`studio-left-panel border-r border-border bg-card ${panelTab === "properties" || panelTab === "preview" ? "studio-panel-hidden" : ""}`} data-tour="studio-layers">
            <PanelTabs value={visibleLeftPanelTab} onChange={(tab) => {
              if (tab === "blocks") setAddTargetSectionId(null);
              setPanelTab(tab);
            }} />
            <div className="studio-left-panel-scroll min-h-0 flex-1 overflow-y-auto p-3">
              {visibleLeftPanelTab === "pages" && (
                <StudioPagesPanel
                  activeStep={activeStep}
                  selectedId={selectedId}
                  onStepChange={(step) => {
                    setActiveStep(step);
                    setSlotPath(`${step}.beforeMain`);
                    selectStudioElement(`system.${step}`);
                  }}
                  onSelect={selectStudioElement}
                />
              )}
              {visibleLeftPanelTab === "blocks" && (
                <BlockLibrary
                  slotPath={slotPath}
                  onSlotChange={(path) => {
                    setAddTargetSectionId(null);
                    setSlotPath(path);
                  }}
                  onAdd={addBlock}
                  onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
                  targetSectionName={addTargetSectionId ? findSection(document, addTargetSectionId)?.section.name : undefined}
                  onCancelTarget={() => setAddTargetSectionId(null)}
                />
              )}
              {visibleLeftPanelTab === "layers" && (
                <StudioLayersPanel
                  document={document}
                  activeStep={activeStep}
                  selectedId={selectedId}
                  selectedIds={selectedIds}
                  multiSelectMode={multiSelectMode}
                  onSelect={selectStudioElement}
                  onMove={moveSection}
                  onDuplicate={duplicateSection}
                  onDragStart={setDraggedSectionId}
                  onDrop={(targetId) => {
                    if (draggedSectionId) moveSectionTo(draggedSectionId, targetId);
                    setDraggedSectionId(null);
                  }}
                />
              )}
            </div>
          </aside>
        )}

        <main
          className={`studio-canvas min-w-0 bg-[#F2EEE4] p-3 dark:bg-[#111111] sm:p-5 ${mode === "advanced" ? "flex min-h-0 flex-col overflow-hidden" : ""}`}
          data-tour="studio-preview"
          onDragOver={(event) => {
            if (mode === "advanced" && previewInteraction === "design") event.preventDefault();
          }}
          onDrop={(event) => void handleCanvasDrop(event)}
        >
          <PreviewToolbar
            device={device}
            zoom={zoom}
            showPrecisionTools={mode === "advanced" && previewInteraction === "design"}
            gridEnabled={canvasGridEnabled}
            gridStep={canvasGridStep}
            multiSelectMode={multiSelectMode}
            canvasHealth={canvasLayoutHealth}
            onDeviceChange={changePreviewDevice}
            onZoomChange={setZoom}
            onFit={() => fitPreview(device)}
            onToggleGrid={toggleCanvasGrid}
            onGridStepChange={changeCanvasGridStep}
            onToggleMultiSelect={() => setMultiSelectMode((current) => !current)}
          />
          {mode === "advanced" && previewInteraction === "design" && (
            <StudioContextToolbar
              document={document}
              device={device}
              systemId={selectedSystemId}
              block={selectedBlock}
              section={currentSection}
              selectedOverlayCount={canvasSelectionIsValid ? selectedCanvasEntries.length : 0}
              selectionGrouped={Boolean(selectedCanvasGroupId)}
              onDocumentChange={changeDocument}
              onBlockChange={updateSelectedBlock}
              onSectionChange={updateSelectedSection}
              onCanvasCommand={runCanvasLayoutCommand}
              onAdjustLayers={adjustSelectedLayers}
              onToggleGroup={toggleSelectedCanvasGroup}
              onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
              onAddHere={() => {
                if (selectedSystemId) setSlotPath(defaultSlotForSystem(selectedSystemId));
                setAddTargetSectionId(currentSection?.locked ? null : currentSection?.id ?? null);
                setPanelTab("blocks");
                setLeftPanelOpen(true);
              }}
              onOpenInspector={() => setInspectorOpen(true)}
              onDuplicate={() => {
                if (selectedCanvasEntries.length > 0) duplicateCanvasSelection();
                else if (currentSection) duplicateSection(currentSection.id);
              }}
              onCopy={copyCanvasSelection}
              onPaste={pasteCanvasSelection}
              canPaste={canvasClipboardCount > 0 && Boolean(currentSection && !currentSection.locked)}
              onDelete={removeSelected}
            />
          )}
          {mode === "advanced" && canvasUploading && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo imagen…</span>}
          {canvasDropError && <p role="alert" className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700">{canvasDropError}</p>}
          <div
            ref={canvasViewportRef}
            className={`studio-canvas-viewport mt-3 flex justify-center rounded-2xl border border-black/10 bg-[#DDD8CC] p-4 dark:border-white/10 dark:bg-black/40 ${mode === "advanced" ? "min-h-0 flex-1 overflow-x-auto overflow-y-hidden" : "min-h-[620px] overflow-auto"}`}
          >
            <div
              className="relative shrink-0"
              style={{
                width: `${DEVICE_WIDTH[device] * (zoom / 100)}px`,
                height: `${previewViewportHeight * (zoom / 100)}px`,
              }}
            >
              <iframe
                ref={iframeRef}
                title="Vista previa privada del widget"
                src={`/widget/${widgetSlug}/preview`}
                onLoad={() => {
                  setPreviewReadyInteraction(null);
                  postToPreview({
                    type: "UPDATE_DOCUMENT",
                    document: documentRef.current,
                    assets: resolvedAssets,
                  });
                  postToPreview({ type: "SET_INTERACTION_MODE", mode: previewInteraction });
                  postToPreview({
                    type: "SET_CANVAS_TRANSFORMS",
                    enabled: mode === "advanced" && previewInteraction === "design",
                  });
                  postToPreview({
                    type: "SET_CANVAS_GRID",
                    enabled:
                      mode === "advanced" &&
                      previewInteraction === "design" &&
                      canvasGridEnabled,
                    step: canvasGridStep,
                  });
                  postToPreview({ type: "SET_CANVAS_DEVICE", device });
                  postToPreview({ type: "SET_SELECTED", id: selectedId, ids: selectedIds });
                  postToPreview({
                    type: "SET_MULTI_SELECT_MODE",
                    enabled:
                      mode === "advanced" &&
                      previewInteraction === "design" &&
                      multiSelectMode,
                  });
                  if (previewInteraction === "design") {
                    postToPreview({ type: "SET_STEP", step: activeStep });
                  }
                  resetPreviewScroll();
                }}
                className="absolute left-0 top-0 origin-top-left rounded-2xl border border-black/20 bg-white shadow-2xl"
                style={{
                  width: `${DEVICE_WIDTH[device]}px`,
                  height: `${previewViewportHeight}px`,
                  zoom: zoom / 100,
                }}
              />
            </div>
          </div>
          <div className="studio-canvas-notes mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {previewInteraction === "test" ? (
              <span>Simulación privada · puedes recorrer la reserva sin crear citas ni cambiar datos reales.</span>
            ) : (
              <>
                <span>Vista segura · escribe directamente sobre los textos o selecciona un elemento para darle formato.</span>
                {mode === "advanced" && (
                  <span>Imán de alineación activo · mantén Alt al mover o redimensionar para omitirlo.</span>
                )}
                <span>Los cambios llegan al widget público únicamente al presionar Publicar.</span>
              </>
            )}
          </div>
        </main>

        {mode === "basic" && (
          <aside className="studio-right-panel basic-panel border-l border-border bg-card" data-tour="studio-inspector">
            <div className="space-y-5 p-4">
              <BasicIdentity document={document} onChange={changeDocument} />
              <BlockLibrary
                slotPath={slotPath}
                onSlotChange={setSlotPath}
                onAdd={addBlock}
                onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
                compact
              />
              <LayersPanel
                document={document}
                selectedId={selectedId}
                selectedIds={selectedIds}
                onSelect={selectStudioElement}
                onMove={moveSection}
                onDuplicate={duplicateSection}
                onDragStart={setDraggedSectionId}
                onDrop={(targetId) => {
                  if (draggedSectionId) moveSectionTo(draggedSectionId, targetId);
                  setDraggedSectionId(null);
                }}
                compact
              />
              {selected && (
                <Inspector
                  document={document}
                  device={device}
                  section={currentSection}
                  block={selectedBlock}
                  assets={assets}
                  slotPath={currentSection ? findSection(document, currentSection.id)?.path || slotPath : slotPath}
                  onSlotChange={changeSelectedSlot}
                  onDocumentChange={changeDocument}
                  onBlockChange={updateSelectedBlock}
                  onSectionChange={updateSelectedSection}
                  onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
                  onDelete={removeSelected}
                  compact
                />
              )}
              {selectedSystemId && (
                <SystemInspector
                  systemId={selectedSystemId}
                  document={document}
                  onDocumentChange={changeDocument}
                  onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
                  compact
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {mode === "advanced" && <div className="studio-mobile-tabs fixed inset-x-0 bottom-0 z-[70] grid-cols-5 border-t border-border bg-background p-2">
        {([
          ["pages", ListTree, "Pasos"],
          ["blocks", Plus, "Bloques"],
          ["layers", Layers3, "Capas"],
          ["properties", MousePointer2, "Editar"],
          ["preview", Eye, "Lienzo"],
        ] as const).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
               setPanelTab(value);
               setMode("advanced");
               if (window.innerWidth < 800 && device === "desktop") setDevice("mobile");
              if (value === "properties") {
                setInspectorOpen(true);
                setLeftPanelOpen(false);
              } else if (value === "preview") {
                setInspectorOpen(false);
                setLeftPanelOpen(false);
              } else {
                setInspectorOpen(false);
                setLeftPanelOpen(true);
              }
            }}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-bold ${panelTab === value ? "text-[#7C3AED]" : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>}

      {mode === "advanced" && inspectorOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/35 backdrop-blur-[2px]" onMouseDown={() => setInspectorOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            className="h-full w-full max-w-[440px] overflow-y-auto border-l border-border bg-background p-5 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="Ajustes detallados"
          >
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7C3AED]">Ajustes detallados</p>
                <p className="mt-1 text-sm text-muted-foreground">Los controles frecuentes están sobre el widget.</p>
              </div>
              <Button variant="ghost" onClick={() => setInspectorOpen(false)} title="Cerrar ajustes"><X className="h-4 w-4" /></Button>
            </div>
            {selectedSystemId ? (
              <SystemInspector
                systemId={selectedSystemId}
                document={document}
                onDocumentChange={changeDocument}
                onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
              />
            ) : (
              <Inspector
                document={document}
                device={device}
                section={currentSection}
                block={selectedBlock}
                assets={assets}
                slotPath={currentSection ? findSection(document, currentSection.id)?.path || slotPath : slotPath}
                onSlotChange={changeSelectedSlot}
                onDocumentChange={changeDocument}
                onBlockChange={updateSelectedBlock}
                onSectionChange={updateSelectedSection}
                onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
                onDelete={removeSelected}
              />
            )}
          </aside>
        </div>
      )}

      {assetModal.open && (
        <AssetLibraryModal
          assets={assets}
          onClose={() => setAssetModal({ open: false, blockType: null })}
          onAssetsChange={setAssets}
          onSelect={(asset) => {
            if (assetModal.blockType === "logo") {
              changeDocument((draft) => {
                draft.shell.logoAssetId = asset.id;
                draft.system.header.showLogo = true;
              });
            } else if (selectedBlock?.type === "image" || selectedBlock?.type === "banner") {
              updateSelectedBlock((block) => {
                if (block.type === "image") {
                  block.assetId = asset.id;
                  if (!block.alt && asset.altDefault) {
                    block.alt = asset.altDefault;
                    block.decorative = false;
                  }
                }
                if (block.type === "banner") block.assetId = asset.id;
              });
            } else if (assetModal.blockType === "image" || assetModal.blockType === "banner") {
              addBlock(assetModal.blockType, asset);
            }
            setAssetModal({ open: false, blockType: null });
          }}
        />
      )}

      {publishOpen && (
        <PublishModal
          revision={revision}
          publishedVersion={publishedVersion?.versionNumber || null}
          summary={publishSummary}
          onSummaryChange={setPublishSummary}
          onClose={() => setPublishOpen(false)}
          onPublish={publish}
          publishing={publishing}
          document={document}
        />
      )}
    </div>
  );
}

function PanelTabs({ value, onChange }: { value: PanelTab; onChange: (value: PanelTab) => void }) {
  return (
    <div className="grid grid-cols-3 border-b border-border p-2">
      {([
        ["pages", ListTree, "Pasos"],
        ["layers", Layers3, "Capas"],
        ["blocks", Plus, "Añadir"],
      ] as const).map(([tab, Icon, label]) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`flex min-h-10 items-center justify-center gap-1 rounded-lg text-[11px] font-bold ${value === tab ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Icon className="h-3.5 w-3.5" /> <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

const STUDIO_STEPS: Array<{ id: StudioStep; label: string; description: string }> = [
  { id: "service", label: "Servicios", description: "Inicio de la reserva" },
  { id: "staff", label: "Profesionales", description: "Selección del equipo" },
  { id: "datetime", label: "Fecha y hora", description: "Calendario y disponibilidad" },
  { id: "details", label: "Datos del cliente", description: "Formulario y confirmación" },
];

function StudioPagesPanel({
  activeStep,
  selectedId,
  onStepChange,
  onSelect,
}: {
  activeStep: StudioStep;
  selectedId: string | null;
  onStepChange: (step: StudioStep) => void;
  onSelect: (id: string) => void;
}) {
  const systemItem = (id: string, label: string, description: string) => (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        selectedId === id ? "border-[#7C3AED]/40 bg-[#7C3AED]/10" : "border-transparent hover:bg-muted"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Lock className="h-3.5 w-3.5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{label}</span><span className="block truncate text-[10px] text-muted-foreground">{description}</span></span>
    </button>
  );
  return (
    <div className="space-y-5">
      <section>
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Estructura global</p>
        <div className="mt-2 space-y-1">
          {systemItem("system.shell", "Contenedor del widget", "Ancho, forma y espaciado")}
          {systemItem("system.header", "Encabezado", "Logo, nombre y presentación")}
          {systemItem("system.progress", "Progreso", "Pasos de la reserva")}
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Pasos de reserva</p>
          <span className="rounded-full bg-[#7C3AED]/10 px-2 py-1 text-[9px] font-bold text-[#7C3AED]">Vista segura</span>
        </div>
        <div className="mt-2 space-y-1">
          {STUDIO_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange(step.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                activeStep === step.id ? "border-[#7C3AED]/40 bg-[#7C3AED]/10" : "border-border bg-background hover:border-[#7C3AED]/25"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${activeStep === step.id ? "bg-[#7C3AED] text-white" : "bg-muted text-muted-foreground"}`}>{index + 1}</span>
              <span className="min-w-0"><span className="block text-xs font-bold">{step.label}</span><span className="block truncate text-[10px] text-muted-foreground">{step.description}</span></span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Cierre</p>
        <div className="mt-2">{systemItem("system.footer", "Pie del widget", "Marca y enlaces finales")}</div>
      </section>
    </div>
  );
}

function StudioLayersPanel({
  document,
  activeStep,
  selectedId,
  selectedIds,
  multiSelectMode,
  onSelect,
  onMove,
  onDuplicate,
  onDragStart,
  onDrop,
}: {
  document: WidgetDesignDocument;
  activeStep: StudioStep;
  selectedId: string | null;
  selectedIds: string[];
  multiSelectMode: boolean;
  onSelect: (id: string, intent?: { additive?: boolean }) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
}) {
  const systemByStep: Record<StudioStep, { id: string; label: string }> = {
    service: { id: "system.service", label: "Selector de servicios" },
    staff: { id: "system.staff", label: "Selector de profesionales" },
    datetime: { id: "system.datetime", label: "Fecha y hora" },
    details: { id: "system.details", label: "Formulario del cliente" },
  };
  const system = systemByStep[activeStep];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Jerarquía visible</p>
        <p className="mt-1 text-xs text-muted-foreground">Selecciona una pieza para editarla. Los bloques con candado conservan la lógica de reservas.</p>
      </div>
      <div className="space-y-1 rounded-2xl border border-border bg-background p-2">
        {[
          { id: "system.header", label: "Encabezado" },
          { id: "system.progress", label: "Progreso" },
          system,
          { id: "system.footer", label: "Pie del widget" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
              selectedId === item.id ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "hover:bg-muted"
            }`}
          >
            <Lock className="h-3.5 w-3.5" /><span className="flex-1">{item.label}</span><span className="text-[9px] font-bold uppercase opacity-55">Sistema</span>
          </button>
        ))}
      </div>
      <LayersPanel
        document={document}
        selectedId={selectedId}
        selectedIds={selectedIds}
        multiSelectMode={multiSelectMode}
        onSelect={onSelect}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onDragStart={onDragStart}
        onDrop={onDrop}
        compact
      />
    </div>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background p-3">
      <span><span className="block text-xs font-bold">{label}</span>{description && <span className="mt-0.5 block text-[10px] text-muted-foreground">{description}</span>}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#7C3AED]" />
    </label>
  );
}

function SystemInspector({
  systemId,
  document,
  onDocumentChange,
  onOpenAssets,
  compact = false,
}: {
  systemId: string;
  document: WidgetDesignDocument;
  onDocumentChange: (producer: (draft: WidgetDesignDocument) => void) => void;
  onOpenAssets: (type: "image" | "banner" | "logo") => void;
  compact?: boolean;
}) {
  const names: Record<string, { title: string; description: string }> = {
    "system.shell": { title: "Contenedor del widget", description: "Controla el espacio general sin alterar la reserva." },
    "system.header": { title: "Encabezado", description: "Identidad visible en todos los pasos." },
    "system.progress": { title: "Indicador de progreso", description: "Ayuda al cliente a entender en qué paso está." },
    "system.service": { title: "Selector de servicios", description: "Los datos vienen de Servicios; aquí controlas su presentación." },
    "system.staff": { title: "Selector de profesionales", description: "Los profesionales y asignaciones continúan protegidos." },
    "system.datetime": { title: "Fecha y hora", description: "Disponibilidad real protegida; presentación modificable." },
    "system.details": { title: "Formulario del cliente", description: "Los campos obligatorios y validaciones no se pueden eliminar." },
    "system.footer": { title: "Pie del widget", description: "Cierre y marca de la experiencia." },
  };
  const meta = names[systemId] || names["system.shell"];
  return (
    <div className={compact ? "space-y-4 rounded-2xl border border-border p-4" : "space-y-5"}>
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7C3AED]"><Lock className="h-3 w-3" /> Componente protegido</div>
        <h3 className="mt-2 text-lg font-bold">{meta.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
      </div>

      {systemId === "system.shell" && (
        <div className="space-y-4">
          <Field label="Ancho máximo" help="El contenido se adapta automáticamente en pantallas pequeñas.">
            <input type="range" min={320} max={1200} step={8} value={document.shell.maxWidth} onChange={(event) => onDocumentChange((draft) => { draft.shell.maxWidth = Number(event.target.value); })} className="w-full accent-[#7C3AED]" />
            <span className="mt-1 block text-right text-xs font-bold">{document.shell.maxWidth}px</span>
          </Field>
          <Field label="Alineación del encabezado">
            <select value={document.shell.headerAlign} onChange={(event) => onDocumentChange((draft) => { draft.shell.headerAlign = event.target.value as typeof draft.shell.headerAlign; })} className={inputClass}>
              <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
            </select>
          </Field>
          <BasicIdentity document={document} onChange={onDocumentChange} />
        </div>
      )}

      {systemId === "system.header" && (
        <div className="space-y-3">
          <Field label="Texto superior"><input value={document.system.header.eyebrow} onChange={(event) => onDocumentChange((draft) => { draft.system.header.eyebrow = event.target.value; })} className={inputClass} /></Field>
          <Field label="Composición">
            <select value={document.system.header.layout} onChange={(event) => onDocumentChange((draft) => { draft.system.header.layout = event.target.value as typeof draft.system.header.layout; })} className={inputClass}>
              <option value="compact">Compacta</option><option value="standard">Estándar</option><option value="centered">Centrada</option>
            </select>
          </Field>
          <ToggleControl label="Mostrar texto superior" checked={document.system.header.showEyebrow} onChange={(checked) => onDocumentChange((draft) => { draft.system.header.showEyebrow = checked; })} />
          <ToggleControl label="Mostrar logo" checked={document.system.header.showLogo} onChange={(checked) => onDocumentChange((draft) => { draft.system.header.showLogo = checked; })} />
          <Button variant="secondary" onClick={() => onOpenAssets("logo")} className="w-full"><ImageIcon className="h-4 w-4" /> Elegir imagen del logo</Button>
          {document.shell.logoAssetId && <Button variant="secondary" onClick={() => onDocumentChange((draft) => { delete draft.shell.logoAssetId; })} className="w-full">Usar logo del negocio</Button>}
        </div>
      )}

      {systemId === "system.progress" && (
        <div className="space-y-3">
          <Field label="Estilo">
            <select value={document.system.progress.variant} onChange={(event) => onDocumentChange((draft) => { draft.system.progress.variant = event.target.value as typeof draft.system.progress.variant; })} className={inputClass}>
              <option value="tabs">Pestañas</option><option value="steps">Pasos</option><option value="minimal">Barra mínima</option>
            </select>
          </Field>
          <ToggleControl label="Mostrar nombres de pasos" checked={document.system.progress.showLabels} onChange={(checked) => onDocumentChange((draft) => { draft.system.progress.showLabels = checked; })} />
        </div>
      )}

      {systemId === "system.service" && (
        <div className="space-y-4">
          <Field label="Título"><input value={document.system.service.title} onChange={(event) => onDocumentChange((draft) => { draft.system.service.title = event.target.value; })} className={inputClass} /></Field>
          <Field label="Descripción"><textarea value={document.system.service.description} onChange={(event) => onDocumentChange((draft) => { draft.system.service.description = event.target.value; })} rows={3} className={`${inputClass} resize-none`} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Distribución"><select value={document.system.service.layout} onChange={(event) => onDocumentChange((draft) => { draft.system.service.layout = event.target.value as typeof draft.system.service.layout; })} className={inputClass}><option value="list">Lista</option><option value="grid">Cuadrícula</option></select></Field>
            <Field label="Columnas"><select value={document.system.service.columns} disabled={document.system.service.layout !== "grid"} onChange={(event) => onDocumentChange((draft) => { draft.system.service.columns = Number(event.target.value); })} className={inputClass}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></Field>
            <Field label="Densidad"><select value={document.system.service.density} onChange={(event) => onDocumentChange((draft) => { draft.system.service.density = event.target.value as typeof draft.system.service.density; })} className={inputClass}><option value="compact">Compacta</option><option value="comfortable">Cómoda</option><option value="spacious">Amplia</option></select></Field>
            <Field label="Tarjeta"><select value={document.system.service.cardStyle} onChange={(event) => onDocumentChange((draft) => { draft.system.service.cardStyle = event.target.value as typeof draft.system.service.cardStyle; })} className={inputClass}><option value="outlined">Contorno</option><option value="soft">Suave</option><option value="elevated">Elevada</option></select></Field>
          </div>
          <div className="space-y-2">
            <ToggleControl label="Mostrar imágenes" checked={document.system.service.showImages} onChange={(checked) => onDocumentChange((draft) => { draft.system.service.showImages = checked; })} />
            <ToggleControl label="Mostrar descripción" checked={document.system.service.showDescription} onChange={(checked) => onDocumentChange((draft) => { draft.system.service.showDescription = checked; })} />
            <ToggleControl label="Mostrar duración" checked={document.system.service.showDuration} onChange={(checked) => onDocumentChange((draft) => { draft.system.service.showDuration = checked; })} />
            <ToggleControl label="Mostrar precio" checked={document.system.service.showPrice} onChange={(checked) => onDocumentChange((draft) => { draft.system.service.showPrice = checked; })} />
          </div>
          <p className="rounded-xl bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">Los nombres, precios, duración y disponibilidad se administran desde Servicios. El Studio nunca modifica esos datos.</p>
        </div>
      )}

      {systemId === "system.staff" && (
        <div className="space-y-4">
          <Field label="Título"><input value={document.system.staff.title} onChange={(event) => onDocumentChange((draft) => { draft.system.staff.title = event.target.value; })} className={inputClass} /></Field>
          <Field label="Descripción"><textarea value={document.system.staff.description} onChange={(event) => onDocumentChange((draft) => { draft.system.staff.description = event.target.value; })} rows={3} className={`${inputClass} resize-none`} /></Field>
          <Field label="Distribución"><select value={document.system.staff.layout} onChange={(event) => onDocumentChange((draft) => { draft.system.staff.layout = event.target.value as typeof draft.system.staff.layout; })} className={inputClass}><option value="list">Lista</option><option value="grid">Cuadrícula</option></select></Field>
          <ToggleControl label="Mostrar fotografías" checked={document.system.staff.showImages} onChange={(checked) => onDocumentChange((draft) => { draft.system.staff.showImages = checked; })} />
        </div>
      )}

      {systemId === "system.datetime" && (
        <div className="space-y-4">
          <Field label="Título"><input value={document.system.datetime.title} onChange={(event) => onDocumentChange((draft) => { draft.system.datetime.title = event.target.value; })} className={inputClass} /></Field>
          <Field label="Descripción"><textarea value={document.system.datetime.description} onChange={(event) => onDocumentChange((draft) => { draft.system.datetime.description = event.target.value; })} rows={3} className={`${inputClass} resize-none`} /></Field>
          <Field label="Densidad"><select value={document.system.datetime.density} onChange={(event) => onDocumentChange((draft) => { draft.system.datetime.density = event.target.value as typeof draft.system.datetime.density; })} className={inputClass}><option value="compact">Compacta</option><option value="comfortable">Cómoda</option></select></Field>
        </div>
      )}

      {systemId === "system.details" && (
        <div className="space-y-4">
          <Field label="Título"><input value={document.system.details.title} onChange={(event) => onDocumentChange((draft) => { draft.system.details.title = event.target.value; })} className={inputClass} /></Field>
          <Field label="Descripción"><textarea value={document.system.details.description} onChange={(event) => onDocumentChange((draft) => { draft.system.details.description = event.target.value; })} rows={3} className={`${inputClass} resize-none`} /></Field>
          <Field label="Estilo de etiquetas"><select value={document.system.details.labelStyle} onChange={(event) => onDocumentChange((draft) => { draft.system.details.labelStyle = event.target.value as typeof draft.system.details.labelStyle; })} className={inputClass}><option value="above">Sobre el campo</option><option value="floating">Flotante</option></select></Field>
        </div>
      )}

      {systemId === "system.footer" && (
        <ToggleControl label="Mostrar marca Puragenda" description="Mantiene la firma visible al final del widget." checked={document.shell.showPoweredBy} onChange={(checked) => onDocumentChange((draft) => { draft.shell.showPoweredBy = checked; })} />
      )}
    </div>
  );
}

function PreviewToolbar({
  device,
  zoom,
  showPrecisionTools,
  gridEnabled,
  gridStep,
  multiSelectMode,
  canvasHealth,
  onDeviceChange,
  onZoomChange,
  onFit,
  onToggleGrid,
  onGridStepChange,
  onToggleMultiSelect,
}: {
  device: Device;
  zoom: number;
  showPrecisionTools: boolean;
  gridEnabled: boolean;
  gridStep: CanvasGridStep;
  multiSelectMode: boolean;
  canvasHealth: WidgetCanvasLayoutHealth;
  onDeviceChange: (device: Device) => void;
  onZoomChange: (zoom: number) => void;
  onFit: () => void;
  onToggleGrid: () => void;
  onGridStepChange: (step: CanvasGridStep) => void;
  onToggleMultiSelect: () => void;
}) {
  return (
    <div className="studio-preview-toolbar flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-background p-2 shadow-sm dark:border-white/10">
      <div className="studio-device-switcher flex rounded-xl bg-muted p-1">
        {([
          ["mobile", Smartphone, "Móvil", "Móvil 360"],
          ["tablet", Tablet, "Tablet", "Tablet 768"],
          ["desktop", Monitor, "PC", "Escritorio 1200"],
        ] as const).map(([value, Icon, shortLabel, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onDeviceChange(value)}
            title={label}
            className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold ${device === value ? "bg-background text-[#7C3AED] shadow-sm" : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" />
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      {showPrecisionTools && (
        <span
          role="status"
          data-responsive-health={canvasHealth.overflowIds.length || canvasHealth.collisions.length ? "warning" : "ok"}
          title={canvasHealth.overflowIds.length || canvasHealth.collisions.length
            ? `${canvasHealth.collisions.length} solapamientos y ${canvasHealth.overflowIds.length} elementos fuera de límites en esta vista.`
            : "No se detectaron solapamientos ni elementos fuera del canvas en esta vista."}
          className={`studio-responsive-health inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[10px] font-bold ${canvasHealth.overflowIds.length || canvasHealth.collisions.length ? "bg-amber-500/10 text-amber-800 dark:text-amber-200" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
        >
          {canvasHealth.overflowIds.length || canvasHealth.collisions.length ? <TriangleAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {canvasHealth.overflowIds.length || canvasHealth.collisions.length
            ? `Revisar ${canvasHealth.collisions.length + canvasHealth.overflowIds.length}`
            : "Sin conflictos"}
        </span>
      )}
      <div className="studio-zoom-controls flex min-w-0 items-center gap-2">
        {showPrecisionTools && (
          <div className="flex min-w-0 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              aria-pressed={multiSelectMode}
              onClick={onToggleMultiSelect}
              title={multiSelectMode ? "Salir de selección múltiple" : "Seleccionar varios elementos sin teclado"}
              className={`flex min-h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-bold transition ${multiSelectMode ? "bg-[#7C3AED] text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
            >
              <SquareMousePointer className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Selección múltiple</span>
              <span className="xl:hidden">Múltiple</span>
            </button>
            <button
              type="button"
              aria-pressed={gridEnabled}
              onClick={onToggleGrid}
              title={gridEnabled ? "Ocultar cuadrícula y ajuste magnético" : "Mostrar cuadrícula y activar ajuste magnético"}
              className={`flex min-h-7 items-center gap-1.5 rounded-md px-2 text-[10px] font-bold transition ${gridEnabled ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Cuadrícula</span>
            </button>
            {gridEnabled && (
              <select
                aria-label="Tamaño de cuadrícula"
                value={gridStep}
                onChange={(event) => onGridStepChange(Number(event.target.value) as CanvasGridStep)}
                title="Separación y ajuste de la cuadrícula"
                className="h-7 min-w-0 rounded-md border-0 bg-transparent px-1 text-[10px] font-bold text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
              >
                <option value={2.5}>Fina · 2,5%</option>
                <option value={5}>Media · 5%</option>
                <option value={10}>Amplia · 10%</option>
              </select>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onFit}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] font-bold hover:bg-muted"
        >
          Ajustar
        </button>
        <Maximize2 className="h-4 w-4 text-muted-foreground" />
        <input
          type="range"
          min={20}
          max={150}
          step={5}
          value={zoom}
          onChange={(event) => onZoomChange(Number(event.target.value))}
          aria-label="Zoom del canvas"
          className="w-28 accent-[#7C3AED]"
        />
        <span className="w-10 text-right text-xs font-bold">{zoom}%</span>
      </div>
    </div>
  );
}

function StudioContextToolbar({
  document,
  device,
  systemId,
  block,
  section,
  selectedOverlayCount,
  selectionGrouped,
  onDocumentChange,
  onBlockChange,
  onSectionChange,
  onCanvasCommand,
  onAdjustLayers,
  onToggleGroup,
  onOpenAssets,
  onAddHere,
  onOpenInspector,
  onDuplicate,
  onCopy,
  onPaste,
  canPaste,
  onDelete,
}: {
  document: WidgetDesignDocument;
  device: Device;
  systemId: string | null;
  block: WidgetContentBlock | null;
  section: WidgetSection | null;
  selectedOverlayCount: number;
  selectionGrouped: boolean;
  onDocumentChange: (producer: (draft: WidgetDesignDocument) => void) => void;
  onBlockChange: (updater: (block: WidgetContentBlock) => void) => void;
  onSectionChange: (updater: (section: WidgetSection) => void) => void;
  onCanvasCommand: (command: CanvasLayoutCommand) => void;
  onAdjustLayers: (direction: -1 | 1) => void;
  onToggleGroup: () => void;
  onOpenAssets: (type: "image" | "banner" | "logo") => void;
  onAddHere: () => void;
  onOpenInspector: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onDelete: () => void;
}) {
  const systemNames: Record<string, string> = {
    "system.shell": "Widget",
    "system.header": "Encabezado",
    "system.progress": "Progreso",
    "system.service": "Servicios",
    "system.staff": "Profesionales",
    "system.datetime": "Fecha y hora",
    "system.details": "Datos del cliente",
    "system.footer": "Pie del widget",
  };
  const selectClass = "h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-[#7C3AED]";
  const label = systemId ? systemNames[systemId] || "Componente" : block?.name || "Ninguna selección";
  const canvasPlacement = block && supportsFreeCanvas(block)
    ? getWidgetCanvasPlacementForDevice(block, device)
    : null;

  if (selectedOverlayCount > 1) {
    const alignmentButtons: Array<{ command: CanvasLayoutCommand; label: string; short: string }> = [
      { command: "align-left", label: "Alinear a la izquierda", short: "Izq" },
      { command: "align-center-x", label: "Centrar horizontalmente", short: "Centro" },
      { command: "align-right", label: "Alinear a la derecha", short: "Der" },
      { command: "align-top", label: "Alinear arriba", short: "Arriba" },
      { command: "align-center-y", label: "Centrar verticalmente", short: "Medio" },
      { command: "align-bottom", label: "Alinear abajo", short: "Abajo" },
    ];
    return (
      <div className="studio-command-bar studio-multi-command-bar sticky top-0 z-20 mt-3 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-[#7C3AED]/30 bg-background/95 px-3 py-2 shadow-lg backdrop-blur dark:border-[#A78BFA]/35">
        <div className="studio-context-summary mr-1 flex min-w-44 items-center gap-2 border-r border-border pr-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED] text-xs font-black text-white">
            {selectedOverlayCount}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold">{selectionGrouped ? "Grupo seleccionado" : "Selección múltiple"}</span>
            <span className="block text-[10px] text-muted-foreground">
              {selectionGrouped ? "Se mueve y redimensiona como una unidad" : "Toca otra capa para añadir o quitar"}
            </span>
          </span>
        </div>

        <div className="studio-multi-controls flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="studio-command-group flex flex-wrap rounded-xl border border-border bg-muted p-1" role="group" aria-label="Alinear elementos al canvas">
            {alignmentButtons.map((item) => (
              <button
                key={item.command}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => onCanvasCommand(item.command)}
                className="min-h-8 rounded-lg px-2.5 text-[11px] font-bold text-muted-foreground transition hover:bg-background hover:text-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/40"
              >
                {item.short}
              </button>
            ))}
          </div>
          <div className="studio-command-group flex rounded-xl border border-border bg-muted p-1" role="group" aria-label="Distribuir elementos">
            <button type="button" disabled={selectedOverlayCount < 3} onClick={() => onCanvasCommand("distribute-x")} className="min-h-8 rounded-lg px-2.5 text-[11px] font-bold text-muted-foreground transition hover:bg-background hover:text-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-35">Distribuir ↔</button>
            <button type="button" disabled={selectedOverlayCount < 3} onClick={() => onCanvasCommand("distribute-y")} className="min-h-8 rounded-lg px-2.5 text-[11px] font-bold text-muted-foreground transition hover:bg-background hover:text-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-35">Distribuir ↕</button>
          </div>
          <div className="studio-command-group flex rounded-xl border border-border bg-muted p-1" role="group" aria-label="Orden de capas">
            <button type="button" onClick={() => onAdjustLayers(-1)} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold text-muted-foreground transition hover:bg-background hover:text-foreground"><ArrowDown className="h-3.5 w-3.5" /> Atrás</button>
            <button type="button" onClick={() => onAdjustLayers(1)} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold text-muted-foreground transition hover:bg-background hover:text-foreground"><ArrowUp className="h-3.5 w-3.5" /> Adelante</button>
          </div>
        </div>

        <div className="studio-context-actions ml-auto flex items-center gap-1 border-l border-border pl-2">
          <Button variant="ghost" onClick={onToggleGroup} ariaLabel={selectionGrouped ? "Desagrupar selección" : "Agrupar selección"}>
            <Layers3 className="h-4 w-4" />
            <span className="hidden xl:inline">{selectionGrouped ? "Desagrupar" : "Agrupar"}</span>
          </Button>
          <Button variant="ghost" onClick={onCopy} ariaLabel="Copiar selección"><Copy className="h-4 w-4" /><span className="hidden xl:inline">Copiar</span></Button>
          <Button variant="ghost" disabled={!canPaste} onClick={onPaste} ariaLabel="Pegar selección"><Plus className="h-4 w-4" /><span className="hidden xl:inline">Pegar</span></Button>
          <Button variant="ghost" onClick={onDuplicate} ariaLabel="Duplicar selección"><Copy className="h-4 w-4" /><span className="hidden xl:inline">Duplicar</span></Button>
          <Button variant="danger" onClick={onDelete} title="Eliminar selección"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-command-bar sticky top-0 z-20 mt-3 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-background/95 px-3 py-2 shadow-lg backdrop-blur dark:border-white/10">
      <div className="studio-context-summary mr-1 flex min-w-36 items-center gap-2 border-r border-border pr-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
          {systemId ? <Lock className="h-4 w-4" /> : block?.type === "text" ? <Type className="h-4 w-4" /> : block?.type === "image" ? <ImageIcon className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-bold">{label}</span>
          <span className="block text-[10px] text-muted-foreground">
            {block?.type === "text" || ["system.header", "system.service", "system.staff", "system.datetime", "system.details"].includes(systemId || "")
              ? "Haz clic en el texto para escribir"
              : systemId ? "Componente protegido" : block?.type || "Selecciona en el widget"}
          </span>
        </span>
      </div>

      <div className="studio-context-controls flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {systemId === "system.shell" && (
        <>
          <label className="flex items-center gap-2 text-[10px] font-bold">
            Ancho
            <input type="range" min={320} max={1200} step={8} value={document.shell.maxWidth} onChange={(event) => onDocumentChange((draft) => { draft.shell.maxWidth = Number(event.target.value); })} className="w-24 accent-[#7C3AED]" />
            <span>{document.shell.maxWidth}px</span>
          </label>
          <select aria-label="Alineación del encabezado" value={document.shell.headerAlign} onChange={(event) => onDocumentChange((draft) => { draft.shell.headerAlign = event.target.value as typeof draft.shell.headerAlign; })} className={selectClass}>
            <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
          </select>
        </>
      )}

      {systemId === "system.header" && (
        <>
          <select aria-label="Composición del encabezado" value={document.system.header.layout} onChange={(event) => onDocumentChange((draft) => { draft.system.header.layout = event.target.value as typeof draft.system.header.layout; })} className={selectClass}>
            <option value="compact">Compacto</option><option value="standard">Estándar</option><option value="centered">Centrado</option>
          </select>
          <Button variant={document.system.header.showLogo ? "primary" : "secondary"} onClick={() => onDocumentChange((draft) => { draft.system.header.showLogo = !draft.system.header.showLogo; })}>Logo</Button>
          <Button variant="secondary" onClick={() => onOpenAssets("logo")}><ImageIcon className="h-4 w-4" /> Cambiar logo</Button>
          <Button variant={document.system.header.showEyebrow ? "primary" : "secondary"} onClick={() => onDocumentChange((draft) => { draft.system.header.showEyebrow = !draft.system.header.showEyebrow; })}>Texto superior</Button>
        </>
      )}

      {systemId === "system.progress" && (
        <>
          <select aria-label="Estilo del progreso" value={document.system.progress.variant} onChange={(event) => onDocumentChange((draft) => { draft.system.progress.variant = event.target.value as typeof draft.system.progress.variant; })} className={selectClass}>
            <option value="tabs">Pestañas</option><option value="steps">Pasos</option><option value="minimal">Barra mínima</option>
          </select>
          <Button variant={document.system.progress.showLabels ? "primary" : "secondary"} onClick={() => onDocumentChange((draft) => { draft.system.progress.showLabels = !draft.system.progress.showLabels; })}>Nombres</Button>
        </>
      )}

      {systemId === "system.service" && (
        <>
          <select aria-label="Distribución de servicios" value={document.system.service.layout} onChange={(event) => onDocumentChange((draft) => { draft.system.service.layout = event.target.value as typeof draft.system.service.layout; })} className={selectClass}><option value="list">Lista</option><option value="grid">Cuadrícula</option></select>
          {document.system.service.layout === "grid" && <select aria-label="Columnas de servicios" value={document.system.service.columns} onChange={(event) => onDocumentChange((draft) => { draft.system.service.columns = Number(event.target.value); })} className={selectClass}><option value={1}>1 columna</option><option value={2}>2 columnas</option><option value={3}>3 columnas</option></select>}
          <select aria-label="Densidad de servicios" value={document.system.service.density} onChange={(event) => onDocumentChange((draft) => { draft.system.service.density = event.target.value as typeof draft.system.service.density; })} className={selectClass}><option value="compact">Compacto</option><option value="comfortable">Cómodo</option><option value="spacious">Amplio</option></select>
          <select aria-label="Estilo de tarjetas" value={document.system.service.cardStyle} onChange={(event) => onDocumentChange((draft) => { draft.system.service.cardStyle = event.target.value as typeof draft.system.service.cardStyle; })} className={selectClass}><option value="outlined">Contorno</option><option value="soft">Suave</option><option value="elevated">Elevado</option></select>
        </>
      )}

      {systemId === "system.staff" && (
        <>
          <select aria-label="Distribución de profesionales" value={document.system.staff.layout} onChange={(event) => onDocumentChange((draft) => { draft.system.staff.layout = event.target.value as typeof draft.system.staff.layout; })} className={selectClass}><option value="list">Lista</option><option value="grid">Cuadrícula</option></select>
          <Button variant={document.system.staff.showImages ? "primary" : "secondary"} onClick={() => onDocumentChange((draft) => { draft.system.staff.showImages = !draft.system.staff.showImages; })}>Fotografías</Button>
        </>
      )}

      {systemId === "system.datetime" && (
        <select aria-label="Densidad de fecha y hora" value={document.system.datetime.density} onChange={(event) => onDocumentChange((draft) => { draft.system.datetime.density = event.target.value as typeof draft.system.datetime.density; })} className={selectClass}><option value="compact">Compacto</option><option value="comfortable">Cómodo</option></select>
      )}

      {systemId === "system.details" && (
        <select aria-label="Estilo de etiquetas" value={document.system.details.labelStyle} onChange={(event) => onDocumentChange((draft) => { draft.system.details.labelStyle = event.target.value as typeof draft.system.details.labelStyle; })} className={selectClass}><option value="above">Etiqueta superior</option><option value="floating">Etiqueta flotante</option></select>
      )}

      {systemId === "system.footer" && (
        <Button variant={document.shell.showPoweredBy ? "primary" : "secondary"} onClick={() => onDocumentChange((draft) => { draft.shell.showPoweredBy = !draft.shell.showPoweredBy; })}>Marca Puragenda</Button>
      )}

      {block && canvasPlacement && block.type !== "image" && (
        <>
          <select
            aria-label="Ubicación del elemento"
            value={isWidgetCanvasBlock(block) ? "free" : "flow"}
            onChange={(event) => onBlockChange((current) => {
              setWidgetCanvasMode(current, event.target.value as "flow" | "free");
            })}
            className={selectClass}
          >
            <option value="flow">En el flujo</option>
            <option value="free">Posición libre</option>
          </select>
          {isWidgetCanvasBlock(block) && (
            <>
              <label className="flex items-center gap-2 text-[10px] font-bold">
                Ancho
                <input
                  aria-label="Ancho del elemento libre"
                  type="range"
                  min={10}
                  max={80}
                  step={0.1}
                  value={canvasPlacement.width}
                  onChange={(event) => onBlockChange((current) => {
                    const width = Number(event.target.value);
                    const currentPlacement = getWidgetCanvasPlacementForDevice(current, device);
                    updateWidgetCanvasPlacementForDevice(current, device, {
                      width,
                      x: Math.min(currentPlacement.x, 100 - width),
                    });
                  })}
                  className="w-20 accent-[#7C3AED]"
                />
                <span>{canvasPlacement.width}%</span>
              </label>
              <select aria-label="Nivel de la capa" value={canvasPlacement.zIndex} onChange={(event) => onBlockChange((current) => updateWidgetCanvasPlacement(current, { zIndex: Number(event.target.value) }))} className={selectClass}>
                <option value={1}>Capa 1</option><option value={2}>Capa 2</option><option value={3}>Capa 3</option><option value={4}>Capa 4</option><option value={5}>Capa 5</option>
              </select>
              {device === "mobile" && <select aria-label="Comportamiento en celular" value={canvasPlacement.mobileFallback} onChange={(event) => onBlockChange((current) => updateWidgetCanvasPlacement(current, { mobileFallback: event.target.value as typeof canvasPlacement.mobileFallback }))} className={selectClass}>
                <option value="flow">Celular: volver al flujo</option><option value="scaled">Celular: mantener posición</option><option value="hidden">Celular: ocultar</option>
              </select>}
            </>
          )}
        </>
      )}

      {block?.type === "text" && (
        <>
          <select aria-label="Tipo de texto" value={block.semantic} onChange={(event) => onBlockChange((current) => { if (current.type === "text") current.semantic = event.target.value as typeof current.semantic; })} className={selectClass}><option value="heading">Título</option><option value="subheading">Subtítulo</option><option value="paragraph">Párrafo</option><option value="label">Etiqueta</option></select>
          <select aria-label="Tamaño de texto" value={block.size} onChange={(event) => onBlockChange((current) => { if (current.type === "text") current.size = event.target.value as typeof current.size; })} className={selectClass}><option value="xs">XS</option><option value="sm">S</option><option value="base">Base</option><option value="lg">L</option><option value="xl">XL</option><option value="2xl">2XL</option></select>
          <div className="flex rounded-lg border border-border bg-muted p-0.5">
            {(["left", "center", "right"] as const).map((align) => {
              const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
              return <button key={align} type="button" aria-label={`Alinear ${align}`} onClick={() => onBlockChange((current) => { if (current.type === "text") current.align = align; })} className={`flex h-8 w-9 items-center justify-center rounded-md ${block.align === align ? "bg-background text-[#7C3AED] shadow-sm" : "text-muted-foreground"}`}><Icon className="h-4 w-4" /></button>;
            })}
          </div>
          <select aria-label="Color del texto" value={block.color} onChange={(event) => onBlockChange((current) => { if (current.type === "text") current.color = event.target.value as typeof current.color; })} className={selectClass}><option value="text">Principal</option><option value="muted">Secundario</option><option value="primary">Acento</option><option value="secondary">Borde</option></select>
        </>
      )}

      {block?.type === "image" && section && (
        <>
          <Button variant="secondary" onClick={() => onOpenAssets("image")}><ImageIcon className="h-4 w-4" />Cambiar</Button>
          <select aria-label="Uso de la imagen" disabled={!block.assetId} value={block.assetId && section.backgroundAssetId === block.assetId ? "background" : block.mode} onChange={(event) => {
            const value = event.target.value;
            if (value === "background" && block.assetId) onSectionChange((current) => { current.backgroundAssetId = block.assetId; });
            else {
              onSectionChange((current) => { if (current.backgroundAssetId === block.assetId) delete current.backgroundAssetId; });
              onBlockChange((current) => { if (current.type === "image") current.mode = value as "flow" | "overlay"; });
            }
          }} className={selectClass}><option value="flow">En el flujo</option><option value="background">Como fondo</option><option value="overlay">Superpuesta</option></select>
          <select aria-label="Ajuste de la imagen" value={block.presentation.fit} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.presentation.fit = event.target.value as "cover" | "contain"; })} className={selectClass}><option value="cover">Cubrir</option><option value="contain">Contener</option></select>
          {block.mode === "overlay" && (
            <>
              <div className="flex rounded-lg border border-border bg-muted p-0.5" role="group" aria-label="Alinear imagen horizontalmente">
                {(["left", "center", "right"] as const).map((align) => {
                  const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                  const command: CanvasLayoutCommand = align === "left" ? "align-left" : align === "center" ? "align-center-x" : "align-right";
                  return <button key={align} type="button" aria-label={`Alinear imagen ${align === "left" ? "a la izquierda" : align === "center" ? "al centro" : "a la derecha"}`} onClick={() => onCanvasCommand(command)} className="flex h-8 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/40"><Icon className="h-4 w-4" /></button>;
                })}
              </div>
              <div className="flex rounded-lg border border-border bg-muted p-0.5" role="group" aria-label="Alinear imagen verticalmente">
                <button type="button" aria-label="Alinear imagen arriba" onClick={() => onCanvasCommand("align-top")} className="flex h-8 min-w-9 items-center justify-center rounded-md px-2 text-[10px] font-bold text-muted-foreground hover:bg-background hover:text-[#7C3AED]">Arriba</button>
                <button type="button" aria-label="Centrar imagen verticalmente" onClick={() => onCanvasCommand("align-center-y")} className="flex h-8 min-w-9 items-center justify-center rounded-md px-2 text-[10px] font-bold text-muted-foreground hover:bg-background hover:text-[#7C3AED]">Medio</button>
                <button type="button" aria-label="Alinear imagen abajo" onClick={() => onCanvasCommand("align-bottom")} className="flex h-8 min-w-9 items-center justify-center rounded-md px-2 text-[10px] font-bold text-muted-foreground hover:bg-background hover:text-[#7C3AED]">Abajo</button>
              </div>
              <select aria-label="Nivel de la capa" value={block.overlay.zIndex} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.overlay.zIndex = Number(event.target.value); })} className={selectClass}>
                <option value={1}>Capa 1</option><option value={2}>Capa 2</option><option value={3}>Capa 3</option><option value={4}>Capa 4</option><option value={5}>Capa 5</option>
              </select>
              {device === "mobile" && <select aria-label="Comportamiento de la imagen en celular" value={block.overlay.mobileFallback} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.overlay.mobileFallback = event.target.value as typeof current.overlay.mobileFallback; })} className={selectClass}>
                <option value="flow">Celular: volver al flujo</option><option value="scaled">Celular: mantener posición</option><option value="hidden">Celular: ocultar</option>
              </select>}
            </>
          )}
          <label className="flex items-center gap-2 text-[10px] font-bold">
            Ancho
            <input
              type="range"
              min={block.mode === "overlay" ? 10 : 20}
              max={block.mode === "overlay" ? 80 : 100}
              step={block.mode === "overlay" ? 0.1 : 1}
              value={block.mode === "overlay" ? canvasPlacement?.width ?? block.overlay.width : block.presentation.width}
              onChange={(event) => onBlockChange((current) => {
                if (current.type !== "image") return;
                const width = Number(event.target.value);
                if (current.mode === "overlay") {
                  const currentPlacement = getWidgetCanvasPlacementForDevice(current, device);
                  updateWidgetCanvasPlacementForDevice(current, device, {
                    width,
                    x: Math.min(currentPlacement.x, 100 - width),
                  });
                } else {
                  current.presentation.width = width;
                }
              })}
              className="w-20 accent-[#7C3AED]"
            />
            <span>{block.mode === "overlay" ? canvasPlacement?.width ?? block.overlay.width : block.presentation.width}%</span>
          </label>
        </>
      )}

      {block?.type === "banner" && (
        <>
          <Button variant="secondary" onClick={() => onOpenAssets("banner")}><ImageIcon className="h-4 w-4" />Imagen</Button>
          <select aria-label="Variante del banner" value={block.variant} onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.variant = event.target.value as typeof current.variant; })} className={selectClass}><option value="overlay">Sobre imagen</option><option value="side">Imagen lateral</option><option value="top">Imagen superior</option><option value="color">Solo color</option><option value="compact">Compacto</option></select>
          <select aria-label="Alineación del banner" value={block.align} onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.align = event.target.value as typeof current.align; })} className={selectClass}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select>
        </>
      )}

      {block?.type === "button" && (
        <>
          <select aria-label="Estilo del botón" value={block.variant} onChange={(event) => onBlockChange((current) => { if (current.type === "button") current.variant = event.target.value as typeof current.variant; })} className={selectClass}><option value="primary">Principal</option><option value="secondary">Secundario</option><option value="outline">Contorno</option><option value="ghost">Suave</option></select>
          <select aria-label="Alineación del botón" value={block.align} onChange={(event) => onBlockChange((current) => { if (current.type === "button") current.align = event.target.value as typeof current.align; })} className={selectClass}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option><option value="stretch">Ancho completo</option></select>
        </>
      )}

      {block?.type === "divider" && (
        <>
          <select aria-label="Estilo del divisor" value={block.style} onChange={(event) => onBlockChange((current) => { if (current.type === "divider") current.style = event.target.value as typeof current.style; })} className={selectClass}><option value="solid">Sólido</option><option value="dashed">Guiones</option><option value="dotted">Puntos</option></select>
          <label className="flex items-center gap-2 text-[10px] font-bold">Grosor <input type="range" min={1} max={4} value={block.thickness} onChange={(event) => onBlockChange((current) => { if (current.type === "divider") current.thickness = Number(event.target.value); })} className="w-16 accent-[#7C3AED]" /></label>
        </>
      )}

      {block?.type === "spacer" && (
        <select aria-label="Tamaño del espacio" value={block.size} onChange={(event) => onBlockChange((current) => { if (current.type === "spacer") current.size = event.target.value as typeof current.size; })} className={selectClass}><option value="xs">XS</option><option value="sm">S</option><option value="md">M</option><option value="lg">L</option><option value="xl">XL</option><option value="custom">Personalizado</option></select>
      )}
      </div>

      <div className="studio-context-actions ml-auto flex items-center gap-1 border-l border-border pl-2">
        <Button variant="ghost" onClick={onAddHere} ariaLabel="Añadir contenido aquí"><Plus className="h-4 w-4" /><span className="hidden xl:inline">Añadir aquí</span></Button>
        {block && isWidgetCanvasBlock(block) && <Button variant="ghost" onClick={onCopy} ariaLabel="Copiar elemento"><Copy className="h-4 w-4" /><span className="hidden xl:inline">Copiar</span></Button>}
        {block && isWidgetCanvasBlock(block) && <Button variant="ghost" disabled={!canPaste} onClick={onPaste} ariaLabel="Pegar elemento"><Plus className="h-4 w-4" /><span className="hidden xl:inline">Pegar</span></Button>}
        {block && <Button className="studio-context-secondary-action" variant="ghost" onClick={() => onBlockChange((current) => { current.hidden = !current.hidden; })} title={block.hidden ? "Mostrar" : "Ocultar"}>{block.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>}
        {block && <Button className="studio-context-secondary-action" variant="ghost" onClick={onDuplicate} title="Duplicar"><Copy className="h-4 w-4" /></Button>}
        <Button variant="secondary" onClick={onOpenInspector} ariaLabel="Abrir ajustes detallados"><SlidersHorizontal className="h-4 w-4" /><span className="studio-inspector-label hidden xl:inline">Más ajustes</span></Button>
        {block && <Button variant="danger" onClick={onDelete} disabled={block.locked || section?.locked} title="Eliminar"><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

function BasicIdentity({
  document,
  onChange,
}: {
  document: WidgetDesignDocument;
  onChange: (producer: (draft: WidgetDesignDocument) => void) => void;
}) {
  return (
    <details open className="rounded-2xl border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-bold">
        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#7C3AED]" /> Identidad visual</span>
        <ChevronDown className="h-4 w-4" />
      </summary>
      <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
        {([
          ["primary", "Color principal"],
          ["secondary", "Bordes"],
          ["background", "Fondo"],
          ["text", "Texto"],
          ["textMuted", "Texto secundario"],
        ] as const).map(([key, label]) => (
          <Field key={key} label={label}>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label={`${label}: selector de color`}
                value={document.tokens.colors[key].slice(0, 7)}
                onChange={(event) => onChange((draft) => { draft.tokens.colors[key] = event.target.value; })}
                className="h-10 w-11 rounded-lg border border-border bg-transparent p-1"
              />
              <input
                aria-label={`${label}: código hexadecimal`}
                value={document.tokens.colors[key]}
                onChange={(event) => onChange((draft) => { draft.tokens.colors[key] = event.target.value.toUpperCase(); })}
                className={`${inputClass} font-mono`}
              />
            </div>
          </Field>
        ))}
        <Field label={`Tamaño base · ${document.tokens.typography.baseSize}px`}>
          <input
            type="range"
            aria-label="Tamaño base de la tipografía"
            min={12}
            max={20}
            value={document.tokens.typography.baseSize}
            onChange={(event) => onChange((draft) => { draft.tokens.typography.baseSize = Number(event.target.value); })}
            className="w-full accent-[#7C3AED]"
          />
        </Field>
        <Field label={`Radio de bordes · ${document.tokens.shape.radius}px`}>
          <input
            type="range"
            aria-label="Radio general de los bordes"
            min={0}
            max={40}
            value={document.tokens.shape.radius}
            onChange={(event) => onChange((draft) => { draft.tokens.shape.radius = Number(event.target.value); })}
            className="w-full accent-[#7C3AED]"
          />
        </Field>
      </div>
    </details>
  );
}

function BlockLibrary({
  slotPath,
  onSlotChange,
  onAdd,
  onOpenAssets,
  targetSectionName,
  onCancelTarget,
  compact,
}: {
  slotPath: string;
  onSlotChange: (value: string) => void;
  onAdd: (type: WidgetContentBlock["type"]) => void;
  onOpenAssets: (type: "image" | "banner" | "logo") => void;
  targetSectionName?: string;
  onCancelTarget?: () => void;
  compact?: boolean;
}) {
  const activeLocation = SLOT_OPTIONS.find((slot) => slot.value === slotPath);
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold">Agregar contenido</h3>
        <p className="mt-1 text-xs text-muted-foreground">Elige qué añadir y dónde aparecerá.</p>
      </div>
      {targetSectionName ? (
        <div className="rounded-xl border border-[#7C3AED]/25 bg-[#7C3AED]/8 p-3">
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C3AED]">Añadir dentro del canvas</span>
              <span className="mt-1 block text-xs font-semibold">{targetSectionName}</span>
              <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">El nuevo elemento compartirá el mismo lienzo y podrá alinearse con los demás.</span>
            </span>
            <button type="button" onClick={onCancelTarget} aria-label="Cancelar destino dentro del canvas" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ) : (
        <Field label="Ubicación">
          <select value={slotPath} onChange={(event) => onSlotChange(event.target.value)} className={inputClass}>
            {SLOT_OPTIONS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
          </select>
          {activeLocation && <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{activeLocation.description}</p>}
        </Field>
      )}
      <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-2"}>
        {BLOCK_META.map(({ type, label, description, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => type === "image" ? onOpenAssets("image") : onAdd(type)}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block text-xs font-bold">{label}</span>{!compact && <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">{description}</span>}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function LayersPanel({
  document,
  selectedId,
  selectedIds = selectedId ? [selectedId] : [],
  multiSelectMode = false,
  onSelect,
  onMove,
  onDuplicate,
  onDragStart,
  onDrop,
  compact,
}: {
  document: WidgetDesignDocument;
  selectedId: string | null;
  selectedIds?: string[];
  multiSelectMode?: boolean;
  onSelect: (id: string, intent?: { additive?: boolean }) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
  compact?: boolean;
}) {
  const entries = allSections(document);
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-bold">Contenido y capas</h3>{!compact && <p className="mt-1 text-xs text-muted-foreground">Arrastra o usa las flechas para ordenar.</p>}</div>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{entries.length}</span>
      </div>
      {!entries.length && <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">Todavía no hay bloques personalizados.</p>}
      {entries.map(({ section, path, index }) => (
        <div
          key={section.id}
          data-layer-section-id={section.id}
          draggable={!section.locked}
          onDragStart={() => onDragStart(section.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => onDrop(section.id)}
          className={`rounded-xl border bg-background p-2 ${section.children.some((block) => selectedIds.includes(block.id)) || section.id === selectedId ? "border-[#7C3AED] ring-2 ring-[#7C3AED]/10" : "border-border"}`}
        >
          <button type="button" onClick={() => onSelect(section.id)} className="flex w-full items-center gap-2 text-left">
            <Layers3 className="h-4 w-4 shrink-0 text-[#7C3AED]" />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{section.name}</span><span className="block truncate text-[9px] uppercase tracking-wide text-muted-foreground">{SLOT_OPTIONS.find((slot) => slot.value === path)?.label || path}</span></span>
            {section.locked ? <Lock className="h-3 w-3" /> : section.hidden ? <EyeOff className="h-3 w-3" /> : null}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {section.children.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              {section.children.map((block) => {
                const meta = BLOCK_META.find((item) => item.type === block.type);
                const Icon = meta?.icon || SquareMousePointer;
                const canAdd =
                  multiSelectMode &&
                  isWidgetCanvasBlock(block) &&
                  !block.locked &&
                  !section.locked;
                const isSelected = selectedIds.includes(block.id);
                return (
                  <button
                    key={block.id}
                    type="button"
                    data-layer-block-id={block.id}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(block.id, { additive: canAdd })}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${isSelected ? "bg-[#7C3AED] text-white shadow-sm" : "bg-muted/45 text-foreground hover:bg-muted"}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{block.name}</span>
                    {block.type === "image" && block.mode === "overlay" && (
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${isSelected ? "bg-white/18" : "bg-[#7C3AED]/10 text-[#7C3AED]"}`}>Canvas</span>
                    )}
                    {block.groupId && (
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${isSelected ? "bg-white/18" : "bg-black/5 text-muted-foreground dark:bg-white/10"}`}>Grupo</span>
                    )}
                    {block.locked ? <Lock className="h-3 w-3 shrink-0" /> : block.hidden ? <EyeOff className="h-3 w-3 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          )}
          {!compact && (
            <div className="mt-2 flex gap-1 border-t border-border pt-2">
              <button type="button" onClick={() => onMove(section.id, -1)} disabled={index === 0} title="Mover arriba" className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onMove(section.id, 1)} title="Mover abajo" className="rounded-lg p-1.5 hover:bg-muted"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onDuplicate(section.id)} title="Duplicar" className="rounded-lg p-1.5 hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function Inspector({
  document,
  device,
  section,
  block,
  assets,
  slotPath,
  onSlotChange,
  onDocumentChange,
  onBlockChange,
  onSectionChange,
  onOpenAssets,
  onDelete,
  compact,
}: {
  document: WidgetDesignDocument;
  device: Device;
  section: WidgetSection | null;
  block: WidgetContentBlock | null;
  assets: StudioAsset[];
  slotPath: string;
  onSlotChange: (value: string) => void;
  onDocumentChange: (producer: (draft: WidgetDesignDocument) => void) => void;
  onBlockChange: (updater: (block: WidgetContentBlock) => void) => void;
  onSectionChange: (updater: (section: WidgetSection) => void) => void;
  onOpenAssets: (type: "image" | "banner" | "logo") => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  if (!section || !block) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
        <MousePointer2 className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold">Selecciona un bloque</p>
        <p className="mt-1 text-xs text-muted-foreground">Haz clic en una capa o directamente en la vista previa.</p>
      </div>
    );
  }
  const asset = (block.type === "image" || block.type === "banner") && block.assetId
    ? assets.find((item) => item.id === block.assetId)
    : null;
  const imageNeedsReplacement = block.type === "image" && !block.assetId;
  const canvasPlacement = supportsFreeCanvas(block)
    ? getWidgetCanvasPlacementForDevice(block, device)
    : null;
  const hasDeviceOverride = supportsFreeCanvas(block) &&
    hasWidgetCanvasBreakpointOverride(block, device);
  const setBlock = <K extends keyof WidgetContentBlock>(key: K, value: WidgetContentBlock[K]) => {
    onBlockChange((current) => { (current as WidgetContentBlock)[key] = value; });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7C3AED]">Propiedades</p><h3 className="mt-1 text-base font-bold">{block.name}</h3><p className="text-xs text-muted-foreground">{block.type}</p></div>
        <Button variant="danger" onClick={onDelete} disabled={block.locked || section.locked} title="Eliminar bloque"><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant={block.hidden ? "secondary" : "ghost"} onClick={() => setBlock("hidden", !block.hidden)}><EyeOff className="h-3.5 w-3.5" />{block.hidden ? "Mostrar" : "Ocultar"}</Button>
        <Button variant="ghost" onClick={() => setBlock("locked", !block.locked)}>{block.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{block.locked ? "Desbloq." : "Bloquear"}</Button>
        <Button variant="ghost" onClick={() => onSectionChange((current) => { current.hidden = !current.hidden; })}><PanelLeft className="h-3.5 w-3.5" />Sección</Button>
      </div>

      <Field label="Nombre interno">
        <input value={block.name} maxLength={60} onChange={(event) => setBlock("name", event.target.value)} className={inputClass} />
      </Field>
      <Field label="Ubicación" help="Puedes mover la sección sin conocer nombres técnicos.">
        <select value={slotPath} onChange={(event) => onSlotChange(event.target.value)} className={inputClass}>
          {SLOT_OPTIONS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
        </select>
      </Field>

      {canvasPlacement && (block.type !== "image" || isWidgetCanvasBlock(block)) && (
        <div className="space-y-3 rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold">Posición responsive</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">El diseño general funciona en todos los dispositivos. Personaliza solo cuando este tamaño necesite una composición distinta.</p>
            </div>
            {isWidgetCanvasBlock(block) && (
              <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${hasDeviceOverride ? "bg-[#7C3AED] text-white" : "bg-background text-muted-foreground"}`}>
                {device === "mobile" ? "Móvil" : device === "tablet" ? "Tablet" : "PC"}
              </span>
            )}
          </div>
          {block.type !== "image" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant={!isWidgetCanvasBlock(block) ? "primary" : "secondary"} onClick={() => onBlockChange((current) => setWidgetCanvasMode(current, "flow"))}>En el flujo</Button>
              <Button variant={isWidgetCanvasBlock(block) ? "primary" : "secondary"} onClick={() => onBlockChange((current) => setWidgetCanvasMode(current, "free"))}>Posición libre</Button>
            </div>
          )}
          {isWidgetCanvasBlock(block) && (
            <div className="space-y-3 border-t border-[#7C3AED]/15 pt-3">
              <button
                type="button"
                aria-pressed={hasDeviceOverride}
                onClick={() => onBlockChange((current) => {
                  setWidgetCanvasBreakpointOverride(current, device, !hasDeviceOverride);
                })}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-xs font-bold transition ${hasDeviceOverride ? "border-[#7C3AED]/35 bg-background text-[#7C3AED] shadow-sm" : "border-border bg-background/70 text-foreground hover:border-[#7C3AED]/35"}`}
              >
                <span>{hasDeviceOverride ? `Ajuste ${device === "mobile" ? "móvil" : device === "tablet" ? "tablet" : "de escritorio"} activo` : "Diseño general activo"}</span>
                <span className="text-[10px] font-semibold text-muted-foreground">{hasDeviceOverride ? "Restablecer" : "Personalizar"}</span>
              </button>
              <div className="grid grid-cols-3 gap-2">
                {(["left", "center", "right"] as const).map((align) => {
                  const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                  const targetX = align === "left" ? 0 : align === "center" ? (100 - canvasPlacement.width) / 2 : 100 - canvasPlacement.width;
                  const active = Math.abs(canvasPlacement.x - targetX) < 0.11;
                  return (
                    <button
                      key={align}
                      type="button"
                      aria-label={`Alinear ${align === "left" ? "a la izquierda" : align === "center" ? "al centro" : "a la derecha"} en ${device === "mobile" ? "móvil" : device === "tablet" ? "tablet" : "escritorio"}`}
                      onClick={() => onBlockChange((current) => updateWidgetCanvasPlacementForDevice(current, device, { x: Math.round(targetX * 10) / 10 }))}
                      className={`flex min-h-10 items-center justify-center rounded-xl border transition ${active ? "border-[#7C3AED]/40 bg-background text-[#7C3AED] shadow-sm" : "border-border bg-background/70 text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Horizontal · ${canvasPlacement.x}%`}><input aria-label={`Posición horizontal en ${device}`} type="range" min={0} max={90} step={0.1} value={canvasPlacement.x} onChange={(event) => onBlockChange((current) => updateWidgetCanvasPlacementForDevice(current, device, { x: Number(event.target.value) }))} className="w-full accent-[#7C3AED]" /></Field>
                <Field label={`Vertical · ${canvasPlacement.y}%`}><input aria-label={`Posición vertical en ${device}`} type="range" min={0} max={90} step={0.1} value={canvasPlacement.y} onChange={(event) => onBlockChange((current) => updateWidgetCanvasPlacementForDevice(current, device, { y: Number(event.target.value) }))} className="w-full accent-[#7C3AED]" /></Field>
                <Field label={`Ancho · ${canvasPlacement.width}%`}><input aria-label={`Ancho en ${device}`} type="range" min={10} max={80} step={0.1} value={canvasPlacement.width} onChange={(event) => onBlockChange((current) => updateWidgetCanvasPlacementForDevice(current, device, { width: Number(event.target.value) }))} className="w-full accent-[#7C3AED]" /></Field>
                <Field label="Capa"><select value={canvasPlacement.zIndex} onChange={(event) => onBlockChange((current) => updateWidgetCanvasPlacement(current, { zIndex: Number(event.target.value) }))} className={inputClass}><option value={1}>1 · fondo</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5 · frente</option></select></Field>
              </div>
              {device === "mobile" && (
                <Field label="Comportamiento móvil">
                  <select value={canvasPlacement.mobileFallback} onChange={(event) => onBlockChange((current) => updateWidgetCanvasPlacement(current, { mobileFallback: event.target.value as typeof canvasPlacement.mobileFallback }))} className={inputClass}><option value="flow">Volver al flujo</option><option value="scaled">Mantener composición libre</option><option value="hidden">Ocultar en celular</option></select>
                </Field>
              )}
              {device === "mobile" && canvasPlacement.mobileFallback === "flow" && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200">En móvil este elemento vuelve al flujo para evitar solapamientos. Elige “Mantener composición libre” si quieres posicionarlo de forma independiente.</p>}
            </div>
          )}
        </div>
      )}

      {(block.type === "image" || block.type === "banner") && (
        <div className={`rounded-2xl border p-3 ${imageNeedsReplacement ? "border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25" : "border-border"}`}>
          <div className="flex items-center gap-3">
            {asset ? <img src={asset.url} alt="" className="h-16 w-20 rounded-xl object-cover" /> : <div className={`flex h-16 w-20 shrink-0 items-center justify-center rounded-xl ${imageNeedsReplacement ? "border border-dashed border-amber-500/40 bg-white/70 text-amber-700 dark:bg-black/20 dark:text-amber-200" : "bg-muted"}`}><ImageIcon className="h-5 w-5" /></div>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{asset?.altDefault || (imageNeedsReplacement ? "Imagen pendiente de reemplazo" : "Sin imagen seleccionada")}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{asset ? `${asset.width}×${asset.height}` : imageNeedsReplacement ? "El archivo original ya no está disponible. La posición, el tamaño y los estilos del bloque siguen intactos." : "Elige una imagen de la biblioteca"}</p>
            </div>
            <Button variant={imageNeedsReplacement ? "primary" : "secondary"} onClick={() => onOpenAssets(block.type)}>{imageNeedsReplacement ? "Elegir reemplazo" : "Cambiar"}</Button>
          </div>
          {asset && hasLimitedPromotionalResolution(asset) && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[10px] leading-relaxed text-amber-800 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Puede verse pixelada como banner o fondo. Para una imagen promocional nítida recomendamos al menos 1200×675 px.
            </p>
          )}
        </div>
      )}

      {block.type === "image" && (
        <>
          <Field label="Texto alternativo" help="Describe la imagen para personas que usan lector de pantalla.">
            <input value={block.alt} disabled={block.decorative} maxLength={240} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.alt = event.target.value; })} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={block.decorative} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.decorative = event.target.checked; })} className="accent-[#7C3AED]" /> Es decorativa</label>
          <Field label="Uso de la imagen">
            <div className="grid grid-cols-3 gap-2">
              <Button variant={block.mode === "flow" && (!block.assetId || section.backgroundAssetId !== block.assetId) ? "primary" : "secondary"} onClick={() => onBlockChange((current) => { if (current.type === "image") current.mode = "flow"; })}>Flujo</Button>
              <Button variant={block.assetId && section.backgroundAssetId === block.assetId ? "primary" : "secondary"} disabled={!block.assetId} title={!block.assetId ? "Elige una imagen antes de usarla como fondo" : undefined} onClick={() => {
                if (!block.assetId) return;
                onSectionChange((current) => { current.backgroundAssetId = block.assetId; });
              }}>Fondo</Button>
              <Button variant={block.mode === "overlay" ? "primary" : "secondary"} onClick={() => onBlockChange((current) => { if (current.type === "image") current.mode = "overlay"; })}>Overlay</Button>
            </div>
          </Field>
          <Field label="Ajuste">
            <select value={block.presentation.fit} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.presentation.fit = event.target.value as "cover" | "contain"; })} className={inputClass}><option value="cover">Cubrir</option><option value="contain">Contener</option></select>
          </Field>
          <Field label={`Punto focal X · ${block.presentation.focalPoint.x}%`}>
            <input type="range" min={0} max={100} value={block.presentation.focalPoint.x} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.presentation.focalPoint.x = Number(event.target.value); })} className="w-full accent-[#7C3AED]" />
          </Field>
          <Field label={`Punto focal Y · ${block.presentation.focalPoint.y}%`}>
            <input type="range" min={0} max={100} value={block.presentation.focalPoint.y} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.presentation.focalPoint.y = Number(event.target.value); })} className="w-full accent-[#7C3AED]" />
          </Field>
        </>
      )}

      {block.type === "banner" && (
        <>
          <Field label="Título"><input value={block.title} maxLength={90} onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.title = event.target.value; })} className={inputClass} /></Field>
          <Field label="Descripción"><textarea value={block.subtitle} maxLength={240} rows={3} onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.subtitle = event.target.value; })} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Badge"><input value={block.badge} maxLength={32} onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.badge = event.target.value; })} className={inputClass} /></Field><Field label="CTA"><input value={block.ctaLabel} maxLength={40} onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.ctaLabel = event.target.value; })} className={inputClass} /></Field></div>
          <Field label="URL HTTPS"><input value={block.ctaUrl} placeholder="https://…" onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.ctaUrl = event.target.value; })} className={inputClass} /></Field>
          <Field label="Variante"><select value={block.variant} onChange={(event) => onBlockChange((current) => { if (current.type === "banner") current.variant = event.target.value as typeof current.variant; })} className={inputClass}><option value="overlay">Texto sobre imagen</option><option value="side">Imagen lateral</option><option value="top">Imagen superior</option><option value="color">Solo color</option><option value="compact">Compacto</option></select></Field>
        </>
      )}

      {block.type === "text" && (
        <>
          <Field label="Contenido"><textarea value={block.content} maxLength={1200} rows={5} onChange={(event) => onBlockChange((current) => { if (current.type === "text") current.content = event.target.value; })} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo"><select value={block.semantic} onChange={(event) => onBlockChange((current) => { if (current.type === "text") current.semantic = event.target.value as typeof current.semantic; })} className={inputClass}><option value="heading">Título</option><option value="subheading">Subtítulo</option><option value="paragraph">Párrafo</option><option value="label">Etiqueta</option></select></Field>
            <Field label="Tamaño"><select value={block.size} onChange={(event) => onBlockChange((current) => { if (current.type === "text") current.size = event.target.value as typeof current.size; })} className={inputClass}><option value="sm">Pequeño</option><option value="base">Base</option><option value="lg">Grande</option><option value="xl">XL</option><option value="2xl">2XL</option></select></Field>
          </div>
          <Field label="Alineación"><div className="grid grid-cols-3 gap-2">{(["left", "center", "right"] as const).map((align) => { const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight; const label = align === "left" ? "Alinear texto a la izquierda" : align === "center" ? "Centrar texto" : "Alinear texto a la derecha"; return <Button key={align} ariaLabel={label} variant={block.align === align ? "primary" : "secondary"} onClick={() => onBlockChange((current) => { if (current.type === "text") current.align = align; })}><Icon className="h-4 w-4" /></Button>; })}</div></Field>
        </>
      )}

      {block.type === "button" && (
        <>
          <Field label="Etiqueta"><input value={block.label} maxLength={60} onChange={(event) => onBlockChange((current) => { if (current.type === "button") current.label = event.target.value; })} className={inputClass} /></Field>
          <Field label="Acción"><select value={block.action} onChange={(event) => onBlockChange((current) => { if (current.type === "button") current.action = event.target.value as typeof current.action; })} className={inputClass}><option value="scroll-services">Ir a servicios</option><option value="external">Abrir enlace</option><option value="next">Continuar</option></select></Field>
          {block.action === "external" && <Field label="URL HTTPS"><input value={block.url} placeholder="https://…" onChange={(event) => onBlockChange((current) => { if (current.type === "button") current.url = event.target.value; })} className={inputClass} /></Field>}
          <Field label="Estilo"><select value={block.variant} onChange={(event) => onBlockChange((current) => { if (current.type === "button") current.variant = event.target.value as typeof current.variant; })} className={inputClass}><option value="primary">Principal</option><option value="secondary">Secundario</option><option value="outline">Contorno</option><option value="ghost">Suave</option></select></Field>
        </>
      )}

      {block.type === "divider" && (
        <div className="grid grid-cols-2 gap-3"><Field label="Grosor"><input type="number" min={1} max={4} value={block.thickness} onChange={(event) => onBlockChange((current) => { if (current.type === "divider") current.thickness = Number(event.target.value); })} className={inputClass} /></Field><Field label="Estilo"><select value={block.style} onChange={(event) => onBlockChange((current) => { if (current.type === "divider") current.style = event.target.value as typeof current.style; })} className={inputClass}><option value="solid">Sólido</option><option value="dashed">Guiones</option><option value="dotted">Puntos</option></select></Field></div>
      )}

      {block.type === "spacer" && (
        <Field label="Espacio"><select value={block.size} onChange={(event) => onBlockChange((current) => { if (current.type === "spacer") current.size = event.target.value as typeof current.size; })} className={inputClass}><option value="xs">XS</option><option value="sm">S</option><option value="md">M</option><option value="lg">L</option><option value="xl">XL</option><option value="custom">Personalizado</option></select></Field>
      )}

      {!compact && (
        <details open className="rounded-2xl border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-xs font-bold"><span className="flex items-center gap-2"><Columns3 className="h-4 w-4 text-[#7C3AED]" /> Sección y responsive</span><ChevronDown className="h-4 w-4" /></summary>
          <div className="space-y-3 border-t border-border p-3">
            <div className="grid grid-cols-2 gap-3"><Field label="Layout"><select value={section.layout} onChange={(event) => onSectionChange((current) => { current.layout = event.target.value as typeof current.layout; })} className={inputClass}><option value="stack">Vertical</option><option value="row">Fila</option><option value="columns">Columnas</option></select></Field><Field label="Columnas"><select value={section.columns} onChange={(event) => onSectionChange((current) => { current.columns = event.target.value as typeof current.columns; })} className={inputClass}><option value="1">1</option><option value="1-1">1 / 1</option><option value="1-2">1 / 2</option><option value="2-1">2 / 1</option><option value="1-1-1">1 / 1 / 1</option></select></Field></div>
            <Field label={`Padding · ${section.padding}px`}><input type="range" min={0} max={80} value={section.padding} onChange={(event) => onSectionChange((current) => { current.padding = Number(event.target.value); })} className="w-full accent-[#7C3AED]" /></Field>
            <Field label={`Separación · ${section.gap}px`}><input type="range" min={0} max={64} value={section.gap} onChange={(event) => onSectionChange((current) => { current.gap = Number(event.target.value); })} className="w-full accent-[#7C3AED]" /></Field>
            <Field label="Visibilidad por dispositivo"><div className="grid grid-cols-3 gap-2">{(["mobile", "tablet", "desktop"] as const).map((breakpoint) => <Button key={breakpoint} variant={block.visibility[breakpoint] ? "primary" : "secondary"} onClick={() => onBlockChange((current) => { current.visibility[breakpoint] = !current.visibility[breakpoint]; })}>{breakpoint === "mobile" ? "Móvil" : breakpoint === "tablet" ? "Tablet" : "PC"}</Button>)}</div></Field>
            {section.backgroundAssetId && <Button variant="secondary" onClick={() => onSectionChange((current) => { delete current.backgroundAssetId; })} className="w-full">Quitar imagen de fondo</Button>}
          </div>
        </details>
      )}

      <details className="rounded-2xl border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-xs font-bold"><span>Documento y shell</span><ChevronDown className="h-4 w-4" /></summary>
        <div className="space-y-3 border-t border-border p-3">
          <Field label="Nombre del diseño"><input value={document.meta.name} onChange={(event) => onDocumentChange((draft) => { draft.meta.name = event.target.value; })} className={inputClass} /></Field>
          <Field label="Ancho máximo"><input type="number" min={320} max={1200} value={document.shell.maxWidth} onChange={(event) => onDocumentChange((draft) => { draft.shell.maxWidth = Number(event.target.value); })} className={inputClass} /></Field>
        </div>
      </details>
    </section>
  );
}

function AssetLibraryModal({
  assets,
  onClose,
  onAssetsChange,
  onSelect,
}: {
  assets: StudioAsset[];
  onClose: () => void;
  onAssetsChange: (assets: StudioAsset[]) => void;
  onSelect: (asset: StudioAsset) => void;
}) {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const filtered = assets.filter((asset) => (asset.altDefault || asset.publicId).toLowerCase().includes(search.toLowerCase()));

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("alt", file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]/g, " "));
    const result = await uploadWidgetStudioAssetAction(formData);
    setUploading(false);
    if (!("error" in result)) {
      const next = [result.asset, ...assets];
      onAssetsChange(next);
      onSelect(result.asset);
    } else {
      setError(result.error);
    }
  }

  async function archive(asset: StudioAsset) {
    const result = await archiveWidgetStudioAssetAction(asset.id);
    if (!("error" in result)) onAssetsChange(assets.filter((item) => item.id !== asset.id));
    else setError(result.error);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="asset-title" className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <div><h2 id="asset-title" className="text-xl font-bold">Biblioteca de imágenes</h2><p className="text-sm text-muted-foreground">Reutiliza activos seguros del negocio.</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-bold text-white">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Optimizando y subiendo…" : "Subir nueva"}
            <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} className="sr-only" />
          </label>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre…" className={`${inputClass} min-w-52 flex-1`} />
        </div>
        {error && <p role="alert" className="mx-4 mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((asset) => (
            <div key={asset.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
              {hasLimitedPromotionalResolution(asset) && (
                <span title="Puede verse pixelada como banner o fondo" className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-100/95 px-2 py-1 text-[9px] font-black text-amber-900 shadow-sm">
                  <TriangleAlert className="h-3 w-3" /> Resolución baja
                </span>
              )}
              <button type="button" onClick={() => onSelect(asset)} className="block w-full text-left">
                <img src={asset.url} alt={asset.altDefault || ""} className="aspect-[4/3] w-full object-cover" />
                <div className="p-3"><p className="truncate text-xs font-bold">{asset.altDefault || "Imagen sin nombre"}</p><p className="mt-1 text-[10px] text-muted-foreground">{asset.width}×{asset.height} · {(asset.byteSize / 1024).toFixed(0)} KB</p></div>
              </button>
              <button type="button" onClick={() => void archive(asset)} className="mx-3 mb-3 text-[10px] font-bold text-red-600 opacity-0 transition group-hover:opacity-100 focus:opacity-100">Archivar si no está en uso</button>
            </div>
          ))}
          {!filtered.length && <div className="col-span-full py-16 text-center text-sm text-muted-foreground">No hay imágenes. Sube la primera en PNG, JPG o WebP.</div>}
        </div>
      </div>
    </div>
  );
}

function PublishModal({
  revision,
  publishedVersion,
  summary,
  onSummaryChange,
  onClose,
  onPublish,
  publishing,
  document,
}: {
  revision: number;
  publishedVersion: number | null;
  summary: string;
  onSummaryChange: (value: string) => void;
  onClose: () => void;
  onPublish: () => void;
  publishing: boolean;
  document: WidgetDesignDocument;
}) {
  const sections = allSections(document);
  const blocks = sections.reduce((total, entry) => total + entry.section.children.length, 0);
  const nextVersion = (publishedVersion || 0) + 1;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="publish-title" className="w-full max-w-xl rounded-3xl border border-border bg-background p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7C3AED]">Publicación segura</p><h2 id="publish-title" className="mt-1 text-2xl font-bold">Publicar versión v{nextVersion}</h2><p className="mt-1 text-sm text-muted-foreground">El borrador pasará a producción como snapshot inmutable.</p></div><button onClick={onClose} className="rounded-xl p-2 hover:bg-muted"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-muted p-3"><p className="text-xl font-bold">{sections.length}</p><p className="text-xs text-muted-foreground">Secciones</p></div>
          <div className="rounded-2xl bg-muted p-3"><p className="text-xl font-bold">{blocks}</p><p className="text-xs text-muted-foreground">Bloques</p></div>
          <div className="rounded-2xl bg-muted p-3"><p className="text-xl font-bold">r{revision}</p><p className="text-xs text-muted-foreground">Revisión</p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800">
          <p className="font-bold">Lista para publicar</p>
          <p className="mt-1 text-xs">Móvil, tablet y escritorio usan el mismo documento. {publishedVersion ? `La v${publishedVersion} quedará como respaldo.` : "El diseño legacy seguirá disponible como respaldo técnico."}</p>
        </div>
        <Field label="Resumen de cambios (opcional)">
          <textarea value={summary} onChange={(event) => onSummaryChange(event.target.value)} maxLength={240} rows={3} placeholder="Ej: Nueva imagen principal y promoción de julio" className={inputClass} />
        </Field>
        <div className="mt-6 flex justify-end gap-2"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={onPublish} disabled={publishing}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}{publishing ? "Validando y publicando…" : `Publicar v${nextVersion}`}</Button></div>
      </div>
    </div>
  );
}
