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
  Type,
  Undo2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  createWidgetNodeId,
  type WidgetContentBlock,
  type WidgetDesignDocument,
  type WidgetSection,
  type WidgetStepSlotName,
} from "@/core/widget-studio/schema";
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
};

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict" | "offline";
type EditorMode = "basic" | "advanced";
type Device = "mobile" | "tablet" | "desktop";
type PanelTab = "pages" | "blocks" | "layers" | "properties" | "preview";
type PreviewInteraction = "design" | "test";
type StudioStep = "service" | "staff" | "datetime" | "details";

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
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  title?: string;
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
  const [selectedId, setSelectedId] = useState<string | null>(
    allSections(initialState.draftDocument)[0]?.section.children[0]?.id || null,
  );
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState("");
  const [previewInteraction, setPreviewInteraction] = useState<PreviewInteraction>("design");
  const [activeStep, setActiveStep] = useState<StudioStep>("service");
  const [history, setHistory] = useState<WidgetDesignDocument[]>([]);
  const [future, setFuture] = useState<WidgetDesignDocument[]>([]);
  const [assetModal, setAssetModal] = useState<{ open: boolean; blockType: "image" | "banner" | null }>({ open: false, blockType: null });
  const [canvasUploading, setCanvasUploading] = useState(false);
  const [canvasDropError, setCanvasDropError] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSummary, setPublishSummary] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState(initialState.publishedVersion);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [canvasViewportHeight, setCanvasViewportHeight] = useState(0);
  const documentRef = useRef(document);
  const lastSavedDocumentRef = useRef(cloneDocument(initialState.draftDocument));
  const revisionRef = useRef(revision);
  const saveInFlightRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressAutosaveRef = useRef(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { documentRef.current = document; }, [document]);
  useEffect(() => { revisionRef.current = revision; }, [revision]);

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
      if (!typing && event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

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

  const selectStudioElement = useCallback((id: string) => {
    setSelectedId(id);
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
    const availableWidth = Math.max(320, (canvasViewportRef.current?.clientWidth || 720) - 40);
    const exactZoom = (availableWidth / DEVICE_WIDTH[targetDevice]) * 100;
    setZoom(Math.max(35, Math.min(100, Math.floor(exactZoom / 5) * 5)));
  }, []);

  useEffect(() => {
    if (mode !== "advanced") return;
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    let measuredWidth = 0;
    const measure = () => {
      setCanvasViewportHeight(viewport.clientHeight);
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
    postToPreview({ type: "SET_SELECTED", id: selectedId });
  }, [postToPreview, selectedId]);

  useEffect(() => {
    postToPreview({ type: "SET_STEP", step: activeStep });
  }, [activeStep, postToPreview]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "puragenda-widget-preview") return;
      if (event.data.type === "PREVIEW_READY") {
        postToPreview({
          type: "UPDATE_DOCUMENT",
          document: documentRef.current,
          assets: resolvedAssets,
        });
        postToPreview({ type: "SET_INTERACTION_MODE", mode: previewInteraction });
        postToPreview({ type: "SET_SELECTED", id: selectedId });
        postToPreview({ type: "SET_STEP", step: activeStep });
      }
      if (event.data.type === "BLOCK_SELECTED" && typeof event.data.blockId === "string") {
        selectStudioElement(event.data.blockId);
      }
      if (
        event.data.type === "INLINE_TEXT_COMMIT" &&
        typeof event.data.blockId === "string" &&
        typeof event.data.field === "string" &&
        typeof event.data.value === "string"
      ) {
        applyInlineTextEdit(event.data.blockId, event.data.field, event.data.value);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [activeStep, applyInlineTextEdit, postToPreview, previewInteraction, resolvedAssets, selectStudioElement, selectedId]);

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
      sectionsAtPath(draft, slotPath).push(createSection(block.name, block));
    });
    setSelectedId(block.id);
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
      sectionsAtPath(draft, found.path).splice(found.index + 1, 0, copy);
      setSelectedId(copy.children[0]?.id || copy.id);
    });
  }

  function removeSelected() {
    if (!selectedId) return;
    changeDocument((draft) => {
      const block = findBlock(draft, selectedId);
      if (block) {
        if (block.section.locked || block.block.locked) return;
        if (block.section.children.length === 1) {
          sectionsAtPath(draft, block.path).splice(block.index, 1);
        } else {
          block.section.children.splice(block.blockIndex, 1);
        }
      } else {
        const section = findSection(draft, selectedId);
        if (section && !section.section.locked) sectionsAtPath(draft, section.path).splice(section.index, 1);
      }
    });
    setSelectedId(null);
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
      <header className="sticky top-0 z-30 shrink-0 border-y border-border bg-background/95 px-3 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
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
                <h2 className="min-w-0 truncate text-lg font-bold">{document.meta.name}</h2>
                <SaveBadge state={saveState} />
              </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "advanced" && (
              <Button
                variant={leftPanelOpen ? "secondary" : "ghost"}
                onClick={() => setLeftPanelOpen((open) => !open)}
                title={leftPanelOpen ? "Ocultar estructura" : "Mostrar estructura"}
              >
                <PanelLeft className="h-4 w-4" />
                <span className="hidden xl:inline">Estructura</span>
              </Button>
            )}
            {mode === "advanced" && (
              <div className="flex rounded-xl border border-border bg-muted p-1" role="group" aria-label="Comportamiento de la vista previa" data-tour="studio-interaction">
                <button
                  type="button"
                  onClick={() => setPreviewInteraction("design")}
                  className={`flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${previewInteraction === "design" ? "bg-background text-[#7C3AED] shadow-sm" : "text-muted-foreground"}`}
                >
                  <MousePointer2 className="h-3.5 w-3.5" /> Diseñar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewInteraction("test")}
                  className={`flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${previewInteraction === "test" ? "bg-background text-[#7C3AED] shadow-sm" : "text-muted-foreground"}`}
                >
                  <Play className="h-3.5 w-3.5" /> Probar
                </button>
              </div>
            )}
            <div className="flex rounded-xl border border-border bg-muted p-1" role="tablist" aria-label="Modo de edición">
              {(["basic", "advanced"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => {
                    setMode(value);
                    if (value === "advanced" && window.innerWidth < 800 && device === "desktop") {
                      setDevice("mobile");
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {value === "basic" ? "Básico" : "Avanzado"}
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={undo} disabled={!history.length} title="Deshacer (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" onClick={redo} disabled={!future.length} title="Rehacer (Ctrl+Y)"><Redo2 className="h-4 w-4" /></Button>
            {mode === "advanced" && previewInteraction === "test" && (
              <Button variant="ghost" onClick={() => postToPreview({ type: "RESET_SIMULATION" })} title="Reiniciar simulación">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {mode === "advanced" && (
              <Button
                variant="ghost"
                onClick={() => window.document.dispatchEvent(new CustomEvent("puragenda:start-contextual-help"))}
                title="Ayuda del Studio"
                data-tour="studio-help"
              >
                <CircleHelp className="h-4 w-4" />
                <span className="hidden xl:inline">Ayuda</span>
              </Button>
            )}
            <Link href="/dashboard/appearance/historial" className="hidden min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted sm:inline-flex">
              <History className="h-4 w-4" /> Historial
            </Link>
            <Button
              variant="primary"
              onClick={() => setPublishOpen(true)}
              disabled={saveState !== "saved"}
              title={saveState !== "saved" ? "Espera a que el borrador termine de guardarse" : "Publicar borrador"}
            >
              <Rocket className="h-4 w-4" /> Publicar
            </Button>
          </div>
        </div>
        {saveMessage && (
          <div role="status" className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${saveState === "error" ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-800"}`}>
            {saveState === "saving" || saveState === "dirty" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>{saveMessage}</span>
          </div>
        )}
      </header>

      <div className={mode === "advanced" ? `studio-advanced-grid ${leftPanelOpen ? "" : "studio-left-closed"}` : "studio-basic-grid"}>
        {mode === "advanced" && leftPanelOpen && (
          <aside className={`studio-left-panel border-r border-border bg-card ${panelTab === "properties" || panelTab === "preview" ? "studio-panel-hidden" : ""}`} data-tour="studio-layers">
            <PanelTabs value={visibleLeftPanelTab} onChange={setPanelTab} />
            <div className="studio-left-panel-scroll min-h-0 flex-1 overflow-y-auto p-3">
              {visibleLeftPanelTab === "pages" && (
                <StudioPagesPanel
                  activeStep={activeStep}
                  selectedId={selectedId}
                  onStepChange={(step) => {
                    setActiveStep(step);
                    setSlotPath(`${step}.beforeMain`);
                    setSelectedId(`system.${step}`);
                  }}
                  onSelect={selectStudioElement}
                />
              )}
              {visibleLeftPanelTab === "blocks" && (
                <BlockLibrary
                  slotPath={slotPath}
                  onSlotChange={setSlotPath}
                  onAdd={addBlock}
                  onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
                />
              )}
              {visibleLeftPanelTab === "layers" && (
                <StudioLayersPanel
                  document={document}
                  activeStep={activeStep}
                  selectedId={selectedId}
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
            onDeviceChange={setDevice}
            onZoomChange={setZoom}
            onFit={() => fitPreview(device)}
          />
          {mode === "advanced" && (
            <StudioContextToolbar
              document={document}
              systemId={selectedSystemId}
              block={selectedBlock}
              section={currentSection}
              onDocumentChange={changeDocument}
              onBlockChange={updateSelectedBlock}
              onSectionChange={updateSelectedSection}
              onOpenAssets={(type) => setAssetModal({ open: true, blockType: type })}
              onAddHere={() => {
                if (selectedSystemId) setSlotPath(defaultSlotForSystem(selectedSystemId));
                setPanelTab("blocks");
                setLeftPanelOpen(true);
              }}
              onOpenInspector={() => setInspectorOpen(true)}
              onDuplicate={() => {
                if (currentSection) duplicateSection(currentSection.id);
              }}
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
                  postToPreview({
                    type: "UPDATE_DOCUMENT",
                    document: documentRef.current,
                    assets: resolvedAssets,
                  });
                  postToPreview({ type: "SET_INTERACTION_MODE", mode: previewInteraction });
                  postToPreview({ type: "SET_SELECTED", id: selectedId });
                  postToPreview({ type: "SET_STEP", step: activeStep });
                }}
                className="absolute left-0 top-0 origin-top-left rounded-2xl border border-black/20 bg-white shadow-2xl"
                style={{
                  width: `${DEVICE_WIDTH[device]}px`,
                  height: `${previewViewportHeight}px`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                }}
              />
            </div>
          </div>
          <div className="studio-canvas-notes mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Vista segura · escribe directamente sobre los textos o selecciona un elemento para darle formato.</span>
            <span>Los cambios llegan al widget público únicamente al presionar Publicar.</span>
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
              />
            ) : (
              <Inspector
                document={document}
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
            if (selectedBlock?.type === "image") {
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
            } else if (assetModal.blockType) {
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
  onSelect,
  onMove,
  onDuplicate,
  onDragStart,
  onDrop,
}: {
  document: WidgetDesignDocument;
  activeStep: StudioStep;
  selectedId: string | null;
  onSelect: (id: string) => void;
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
  compact = false,
}: {
  systemId: string;
  document: WidgetDesignDocument;
  onDocumentChange: (producer: (draft: WidgetDesignDocument) => void) => void;
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
  onDeviceChange,
  onZoomChange,
  onFit,
}: {
  device: Device;
  zoom: number;
  onDeviceChange: (device: Device) => void;
  onZoomChange: (zoom: number) => void;
  onFit: () => void;
}) {
  return (
    <div className="studio-preview-toolbar flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-background p-2 shadow-sm dark:border-white/10">
      <div className="flex rounded-xl bg-muted p-1">
        {([
          ["mobile", Smartphone, "Móvil 360"],
          ["tablet", Tablet, "Tablet 768"],
          ["desktop", Monitor, "Escritorio 1200"],
        ] as const).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onDeviceChange(value)}
            title={label}
            className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold ${device === value ? "bg-background text-[#7C3AED] shadow-sm" : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
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
          min={35}
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
  systemId,
  block,
  section,
  onDocumentChange,
  onBlockChange,
  onSectionChange,
  onOpenAssets,
  onAddHere,
  onOpenInspector,
  onDuplicate,
  onDelete,
}: {
  document: WidgetDesignDocument;
  systemId: string | null;
  block: WidgetContentBlock | null;
  section: WidgetSection | null;
  onDocumentChange: (producer: (draft: WidgetDesignDocument) => void) => void;
  onBlockChange: (updater: (block: WidgetContentBlock) => void) => void;
  onSectionChange: (updater: (section: WidgetSection) => void) => void;
  onOpenAssets: (type: "image" | "banner") => void;
  onAddHere: () => void;
  onOpenInspector: () => void;
  onDuplicate: () => void;
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

  return (
    <div className="studio-command-bar sticky top-0 z-20 mt-3 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-background/95 px-3 py-2 shadow-lg backdrop-blur dark:border-white/10">
      <div className="mr-1 flex min-w-36 items-center gap-2 border-r border-border pr-3">
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
          <select aria-label="Uso de la imagen" value={section.backgroundAssetId === block.assetId ? "background" : block.mode} onChange={(event) => {
            const value = event.target.value;
            if (value === "background") onSectionChange((current) => { current.backgroundAssetId = block.assetId; });
            else {
              onSectionChange((current) => { if (current.backgroundAssetId === block.assetId) delete current.backgroundAssetId; });
              onBlockChange((current) => { if (current.type === "image") current.mode = value as "flow" | "overlay"; });
            }
          }} className={selectClass}><option value="flow">En el flujo</option><option value="background">Como fondo</option><option value="overlay">Superpuesta</option></select>
          <select aria-label="Ajuste de la imagen" value={block.presentation.fit} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.presentation.fit = event.target.value as "cover" | "contain"; })} className={selectClass}><option value="cover">Cubrir</option><option value="contain">Contener</option></select>
          <label className="flex items-center gap-2 text-[10px] font-bold">Ancho <input type="range" min={20} max={100} value={block.presentation.width} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.presentation.width = Number(event.target.value); })} className="w-20 accent-[#7C3AED]" /><span>{block.presentation.width}%</span></label>
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

      <div className="ml-auto flex items-center gap-1 border-l border-border pl-2">
        <Button variant="ghost" onClick={onAddHere}><Plus className="h-4 w-4" /><span className="hidden xl:inline">Añadir aquí</span></Button>
        {block && <Button variant="ghost" onClick={() => onBlockChange((current) => { current.hidden = !current.hidden; })} title={block.hidden ? "Mostrar" : "Ocultar"}>{block.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>}
        {block && <Button variant="ghost" onClick={onDuplicate} title="Duplicar"><Copy className="h-4 w-4" /></Button>}
        <Button variant="secondary" onClick={onOpenInspector}><SlidersHorizontal className="h-4 w-4" /><span className="hidden xl:inline">Más ajustes</span></Button>
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
                value={document.tokens.colors[key].slice(0, 7)}
                onChange={(event) => onChange((draft) => { draft.tokens.colors[key] = event.target.value; })}
                className="h-10 w-11 rounded-lg border border-border bg-transparent p-1"
              />
              <input
                value={document.tokens.colors[key]}
                onChange={(event) => onChange((draft) => { draft.tokens.colors[key] = event.target.value.toUpperCase(); })}
                className={`${inputClass} font-mono`}
              />
            </div>
          </Field>
        ))}
        <Field label="Tamaño base">
          <input
            type="range"
            min={12}
            max={20}
            value={document.tokens.typography.baseSize}
            onChange={(event) => onChange((draft) => { draft.tokens.typography.baseSize = Number(event.target.value); })}
            className="w-full accent-[#7C3AED]"
          />
        </Field>
        <Field label="Radio de bordes">
          <input
            type="range"
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
  compact,
}: {
  slotPath: string;
  onSlotChange: (value: string) => void;
  onAdd: (type: WidgetContentBlock["type"]) => void;
  onOpenAssets: (type: "image" | "banner") => void;
  compact?: boolean;
}) {
  const activeLocation = SLOT_OPTIONS.find((slot) => slot.value === slotPath);
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold">Agregar contenido</h3>
        <p className="mt-1 text-xs text-muted-foreground">Elige qué añadir y dónde aparecerá.</p>
      </div>
      <Field label="Ubicación">
        <select value={slotPath} onChange={(event) => onSlotChange(event.target.value)} className={inputClass}>
          {SLOT_OPTIONS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
        </select>
        {activeLocation && <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{activeLocation.description}</p>}
      </Field>
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
  onSelect,
  onMove,
  onDuplicate,
  onDragStart,
  onDrop,
  compact,
}: {
  document: WidgetDesignDocument;
  selectedId: string | null;
  onSelect: (id: string) => void;
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
          draggable={!section.locked}
          onDragStart={() => onDragStart(section.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => onDrop(section.id)}
          className={`rounded-xl border bg-background p-2 ${section.children.some((block) => block.id === selectedId) || section.id === selectedId ? "border-[#7C3AED] ring-2 ring-[#7C3AED]/10" : "border-border"}`}
        >
          <button type="button" onClick={() => onSelect(section.children[0]?.id || section.id)} className="flex w-full items-center gap-2 text-left">
            <Layers3 className="h-4 w-4 shrink-0 text-[#7C3AED]" />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{section.name}</span><span className="block truncate text-[9px] uppercase tracking-wide text-muted-foreground">{SLOT_OPTIONS.find((slot) => slot.value === path)?.label || path}</span></span>
            {section.locked ? <Lock className="h-3 w-3" /> : section.hidden ? <EyeOff className="h-3 w-3" /> : null}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
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
  section: WidgetSection | null;
  block: WidgetContentBlock | null;
  assets: StudioAsset[];
  slotPath: string;
  onSlotChange: (value: string) => void;
  onDocumentChange: (producer: (draft: WidgetDesignDocument) => void) => void;
  onBlockChange: (updater: (block: WidgetContentBlock) => void) => void;
  onSectionChange: (updater: (section: WidgetSection) => void) => void;
  onOpenAssets: (type: "image" | "banner") => void;
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
  const asset = block.type === "image" || block.type === "banner"
    ? assets.find((item) => item.id === block.assetId)
    : null;
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

      {(block.type === "image" || block.type === "banner") && (
        <div className="rounded-2xl border border-border p-3">
          <div className="flex items-center gap-3">
            {asset ? <img src={asset.url} alt="" className="h-16 w-20 rounded-xl object-cover" /> : <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-muted"><ImageIcon className="h-5 w-5" /></div>}
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{asset?.altDefault || "Sin imagen seleccionada"}</p><p className="text-[10px] text-muted-foreground">{asset ? `${asset.width}×${asset.height}` : "Elige una imagen de la biblioteca"}</p></div>
            <Button variant="secondary" onClick={() => onOpenAssets(block.type)}>Cambiar</Button>
          </div>
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
              <Button variant={block.mode === "flow" && section.backgroundAssetId !== block.assetId ? "primary" : "secondary"} onClick={() => onBlockChange((current) => { if (current.type === "image") current.mode = "flow"; })}>Flujo</Button>
              <Button variant={section.backgroundAssetId === block.assetId ? "primary" : "secondary"} onClick={() => onSectionChange((current) => { current.backgroundAssetId = block.assetId; })}>Fondo</Button>
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
          {block.mode === "overlay" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-3">
              <Field label={`Horizontal · ${block.overlay.x}%`}><input type="range" min={0} max={90} value={block.overlay.x} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.overlay.x = Number(event.target.value); })} className="w-full accent-[#7C3AED]" /></Field>
              <Field label={`Vertical · ${block.overlay.y}%`}><input type="range" min={0} max={90} value={block.overlay.y} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.overlay.y = Number(event.target.value); })} className="w-full accent-[#7C3AED]" /></Field>
              <Field label={`Ancho · ${block.overlay.width}%`}><input type="range" min={10} max={80} value={block.overlay.width} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.overlay.width = Number(event.target.value); })} className="w-full accent-[#7C3AED]" /></Field>
              <Field label="Fallback móvil"><select value={block.overlay.mobileFallback} onChange={(event) => onBlockChange((current) => { if (current.type === "image") current.overlay.mobileFallback = event.target.value as "flow" | "hidden" | "scaled"; })} className={inputClass}><option value="flow">Convertir a flujo</option><option value="scaled">Escalar</option><option value="hidden">Ocultar</option></select></Field>
            </div>
          )}
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
          <Field label="Alineación"><div className="grid grid-cols-3 gap-2">{(["left", "center", "right"] as const).map((align) => { const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight; return <Button key={align} variant={block.align === align ? "primary" : "secondary"} onClick={() => onBlockChange((current) => { if (current.type === "text") current.align = align; })}><Icon className="h-4 w-4" /></Button>; })}</div></Field>
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
            {uploading ? "Validando y subiendo…" : "Subir nueva"}
            <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} className="sr-only" />
          </label>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre…" className={`${inputClass} min-w-52 flex-1`} />
        </div>
        {error && <p role="alert" className="mx-4 mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((asset) => (
            <div key={asset.id} className="group overflow-hidden rounded-2xl border border-border bg-card">
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
