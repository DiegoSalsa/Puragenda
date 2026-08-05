"use client";

import type {
  CSSProperties,
  ElementType,
  FocusEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  clampOverlayTransform,
  moveOverlayTransform,
  resizeOverlayTransform,
  resizeOverlayTransformFromHandle,
  snapMovedOverlayTransform,
  snapResizedOverlayTransform,
  type WidgetOverlayGeometry,
  type WidgetOverlayResizeHandle,
  type WidgetOverlaySnapGuides,
  type WidgetOverlaySnapTarget,
  type WidgetOverlayTransform,
} from "@/core/widget-studio/canvas-transform";
import {
  getWidgetCanvasPlacement,
  getWidgetCanvasPlacementForDevice,
  isWidgetCanvasBlock,
} from "@/core/widget-studio/canvas-block";
import type {
  WidgetCanvasDevice,
  WidgetContentBlock,
  WidgetDesignDocument,
  WidgetSection,
  WidgetSlotName,
  WidgetStepSlotName,
} from "@/core/widget-studio/schema";
import { getWidgetBannerPromotionId } from "@/core/widget-studio/schema";

export type WidgetResolvedAsset = {
  id?: string;
  url: string;
  width: number;
  height: number;
  altDefault: string | null;
};

type WidgetAssetMap = Record<string, WidgetResolvedAsset>;

export type WidgetSelectionIntent = {
  additive?: boolean;
};

export type WidgetPromotionRuntime = {
  id: string;
  hasDiscount: boolean;
  discountLabel: string | null;
  isActive: boolean;
  error?: string | null;
};

type WidgetDesignRuntime = {
  promotions: Record<string, WidgetPromotionRuntime>;
  onTogglePromotion?: (promotionId: string) => void;
  onNext?: () => void;
  selectedId?: string | null;
  selectedIds?: string[];
  canvasTransformsEnabled?: boolean;
  canvasGridEnabled?: boolean;
  canvasGridStep?: number;
  canvasDevice?: WidgetCanvasDevice;
  onSelect?: (blockId: string, intent?: WidgetSelectionIntent) => void;
  onOverlayTransform?: (
    blockId: string,
    transform: WidgetOverlayTransform,
  ) => void;
};

const WidgetDesignRuntimeContext = createContext<WidgetDesignRuntime>({
  promotions: {},
});

export function WidgetDesignRuntimeProvider({
  promotions,
  onTogglePromotion,
  onNext,
  selectedId,
  selectedIds,
  canvasTransformsEnabled,
  canvasGridEnabled,
  canvasGridStep,
  canvasDevice,
  onSelect,
  onOverlayTransform,
  children,
}: WidgetDesignRuntime & { children: ReactNode }) {
  return (
    <WidgetDesignRuntimeContext.Provider
      value={{
        promotions,
        onTogglePromotion,
        onNext,
        selectedId,
        selectedIds,
        canvasTransformsEnabled,
        canvasGridEnabled,
        canvasGridStep,
        canvasDevice,
        onSelect,
        onOverlayTransform,
      }}
    >
      {children}
    </WidgetDesignRuntimeContext.Provider>
  );
}

function InlineEditableText({
  as: Component,
  blockId,
  field,
  editable,
  multiline = false,
  maxLength,
  className,
  style,
  children,
}: {
  as: ElementType;
  blockId: string;
  field: string;
  editable?: boolean;
  multiline?: boolean;
  maxLength: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const commit = (event: FocusEvent<HTMLElement>) => {
    if (!editable) return;
    const value = event.currentTarget.innerText.slice(0, maxLength);
    window.parent.postMessage({
      source: "puragenda-widget-preview",
      type: "INLINE_TEXT_COMMIT",
      blockId,
      field,
      value,
    }, window.location.origin);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!editable) return;
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.textContent = typeof children === "string" ? children : "";
      event.currentTarget.blur();
    }
  };

  return (
    <Component
      className={className}
      style={style}
      contentEditable={editable || undefined}
      suppressContentEditableWarning={editable || undefined}
      data-widget-inline-edit={editable ? `${blockId}:${field}` : undefined}
      spellCheck={editable || undefined}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Component>
  );
}

function visibilityClass(visibility: { mobile: boolean; tablet: boolean; desktop: boolean }) {
  const classes: string[] = [];
  if (!visibility.mobile) classes.push("max-sm:hidden");
  if (!visibility.tablet) classes.push("sm:max-lg:hidden");
  if (!visibility.desktop) classes.push("lg:hidden");
  return classes.join(" ");
}

function aspectRatioValue(value: string) {
  if (value === "auto") return "auto";
  const [width, height] = value.split(":").map(Number);
  return `${width} / ${height}`;
}

const OVERLAY_RESIZE_HANDLES: Array<{
  id: WidgetOverlayResizeHandle;
  label: string;
  className: string;
}> = [
  {
    id: "north-west",
    label: "Redimensionar desde la esquina superior izquierda",
    className: "-left-2 -top-2 cursor-nwse-resize",
  },
  {
    id: "north",
    label: "Redimensionar desde el borde superior",
    className: "-top-2 left-1/2 -translate-x-1/2 cursor-ns-resize",
  },
  {
    id: "north-east",
    label: "Redimensionar desde la esquina superior derecha",
    className: "-right-2 -top-2 cursor-nesw-resize",
  },
  {
    id: "east",
    label: "Redimensionar desde el borde derecho",
    className: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
  },
  {
    id: "south-east",
    label: "Redimensionar desde la esquina inferior derecha",
    className: "-bottom-2 -right-2 cursor-nwse-resize",
  },
  {
    id: "south",
    label: "Redimensionar desde el borde inferior",
    className: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize",
  },
  {
    id: "south-west",
    label: "Redimensionar desde la esquina inferior izquierda",
    className: "-bottom-2 -left-2 cursor-nesw-resize",
  },
  {
    id: "west",
    label: "Redimensionar desde el borde izquierdo",
    className: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
  },
];

const OVERLAY_SNAP_DISTANCE_PX = 8;
const EMPTY_SNAP_GUIDES: WidgetOverlaySnapGuides = {
  vertical: null,
  horizontal: null,
};

function TransformableCanvasBlock({
  block,
  assets,
  editable,
}: {
  block: WidgetContentBlock;
  assets: WidgetAssetMap;
  editable?: boolean;
}) {
  const runtime = useContext(WidgetDesignRuntimeContext);
  const transformable = editable && runtime.canvasTransformsEnabled;
  const selected = transformable && (
    runtime.selectedIds?.includes(block.id) || runtime.selectedId === block.id
  );
  const primarySelected = selected && runtime.selectedId === block.id;
  const basePlacement = getWidgetCanvasPlacement(block);
  const mobilePlacement = getWidgetCanvasPlacementForDevice(block, "mobile");
  const tabletPlacement = getWidgetCanvasPlacementForDevice(block, "tablet");
  const desktopPlacement = getWidgetCanvasPlacementForDevice(block, "desktop");
  const placement = runtime.canvasDevice
    ? getWidgetCanvasPlacementForDevice(block, runtime.canvasDevice)
    : basePlacement;
  const transform = clampOverlayTransform(placement);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const verticalGuideRef = useRef<HTMLSpanElement | null>(null);
  const horizontalGuideRef = useRef<HTMLSpanElement | null>(null);
  const lastTransformRef = useRef<WidgetOverlayTransform>(transform);
  const gestureRef = useRef<{
    mode: "move" | "resize";
    handle?: WidgetOverlayResizeHandle;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    parentWidth: number;
    parentHeight: number;
    geometry: WidgetOverlayGeometry;
    snapTargets: WidgetOverlaySnapTarget[];
    gridStep: number | null;
    start: WidgetOverlayTransform;
  } | null>(null);

  const geometryFromCanvas = () => {
    const wrapper = wrapperRef.current;
    const parent = wrapper?.closest<HTMLElement>("[data-widget-section-id]");
    if (!wrapper || !parent) return null;
    const parentBounds = parent.getBoundingClientRect();
    const wrapperBounds = wrapper.getBoundingClientRect();
    if (
      !parentBounds.width ||
      !parentBounds.height ||
      !wrapperBounds.width ||
      !wrapperBounds.height
    ) {
      return null;
    }
    const snapTargets = Array.from(
      wrapper.ownerDocument.querySelectorAll<HTMLElement>(
        '[data-widget-canvas-transform="true"]',
      ),
    )
      .filter((candidate) => candidate !== wrapper && !candidate.hidden)
      .map((candidate) => candidate.getBoundingClientRect())
      .filter((bounds) => bounds.width > 0 && bounds.height > 0)
      .map((bounds) => ({
        x: ((bounds.left - parentBounds.left) / parentBounds.width) * 100,
        y: ((bounds.top - parentBounds.top) / parentBounds.height) * 100,
        width: (bounds.width / parentBounds.width) * 100,
        height: (bounds.height / parentBounds.height) * 100,
      }));
    return {
      parentWidth: parentBounds.width,
      parentHeight: parentBounds.height,
      snapTargets,
      geometry: {
        verticalToWidth:
          (parentBounds.height / parentBounds.width) *
          (wrapperBounds.width / wrapperBounds.height),
      },
    };
  };

  const renderSnapGuides = (guides: WidgetOverlaySnapGuides) => {
    if (verticalGuideRef.current) {
      verticalGuideRef.current.hidden = guides.vertical === null;
      verticalGuideRef.current.style.left = guides.vertical === "start"
        ? "0%"
        : guides.vertical === "center"
          ? "50%"
          : "100%";
      verticalGuideRef.current.dataset.snapGuide = guides.vertical ?? "";
    }
    if (horizontalGuideRef.current) {
      horizontalGuideRef.current.hidden = guides.horizontal === null;
      horizontalGuideRef.current.style.top = guides.horizontal === "start"
        ? "0%"
        : guides.horizontal === "center"
          ? "50%"
          : "100%";
      horizontalGuideRef.current.dataset.snapGuide = guides.horizontal ?? "";
    }
  };

  const renderTransientTransform = (
    next: WidgetOverlayTransform,
    guides: WidgetOverlaySnapGuides = EMPTY_SNAP_GUIDES,
  ) => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.left = `${next.x}%`;
    wrapperRef.current.style.top = `${next.y}%`;
    wrapperRef.current.style.width = `${next.width}%`;
    renderSnapGuides(guides);
    if (readoutRef.current) {
      readoutRef.current.textContent = `X ${next.x} · Y ${next.y} · ${next.width}%`;
    }
  };

  const transformFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return null;
    const deltaX = ((event.clientX - gesture.startClientX) / gesture.parentWidth) * 100;
    const deltaY = ((event.clientY - gesture.startClientY) / gesture.parentHeight) * 100;
    if (gesture.mode === "move") {
      const moved = moveOverlayTransform(
        gesture.start,
        deltaX,
        deltaY,
        gesture.geometry,
      );
      if (event.altKey) {
        return { transform: moved, guides: EMPTY_SNAP_GUIDES };
      }
      return snapMovedOverlayTransform(moved, gesture.geometry, {
        x: (OVERLAY_SNAP_DISTANCE_PX / gesture.parentWidth) * 100,
        y: (OVERLAY_SNAP_DISTANCE_PX / gesture.parentHeight) * 100,
      }, gesture.snapTargets, gesture.gridStep);
    }
    const resized = resizeOverlayTransformFromHandle(
      gesture.start,
      gesture.handle ?? "south-east",
      deltaX,
      deltaY,
      gesture.geometry,
    );
    if (event.altKey) {
      return { transform: resized, guides: EMPTY_SNAP_GUIDES };
    }
    return snapResizedOverlayTransform(
      resized,
      gesture.handle ?? "south-east",
      gesture.geometry,
      {
        x: (OVERLAY_SNAP_DISTANCE_PX / gesture.parentWidth) * 100,
        y: (OVERLAY_SNAP_DISTANCE_PX / gesture.parentHeight) * 100,
      },
      gesture.snapTargets,
      gesture.gridStep,
    );
  };

  const beginGesture = (
    event: ReactPointerEvent<HTMLElement>,
    mode: "move" | "resize",
    handle?: WidgetOverlayResizeHandle,
  ) => {
    if (!transformable || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (
      mode === "move" &&
      !(event.target as HTMLElement).closest("[data-widget-move-handle]") &&
      (event.target as HTMLElement).closest("[contenteditable=true], a, button, input, textarea, select")
    ) return;
    event.preventDefault();
    event.stopPropagation();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (additive) return;
    const canvas = geometryFromCanvas();
    if (!canvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = clampOverlayTransform(transform, canvas.geometry);
    lastTransformRef.current = start;
    gestureRef.current = {
      mode,
      handle,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      parentWidth: canvas.parentWidth,
      parentHeight: canvas.parentHeight,
      geometry: canvas.geometry,
      snapTargets: canvas.snapTargets,
      gridStep: runtime.canvasGridEnabled ? runtime.canvasGridStep ?? 5 : null,
      start,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const result = transformFromPointer(event);
    if (!result) return;
    lastTransformRef.current = result.transform;
    renderTransientTransform(result.transform, result.guides);
  };

  const finishGesture = (event: ReactPointerEvent<HTMLElement>) => {
    const result = transformFromPointer(event);
    if (!result) return;
    gestureRef.current = null;
    renderSnapGuides(EMPTY_SNAP_GUIDES);
    lastTransformRef.current = result.transform;
    runtime.onOverlayTransform?.(block.id, result.transform);
  };

  const finishCapturedGesture = () => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    renderSnapGuides(EMPTY_SNAP_GUIDES);
    runtime.onOverlayTransform?.(block.id, lastTransformRef.current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!primarySelected || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const distance = event.shiftKey ? 10 : 1;
    const geometry = geometryFromCanvas()?.geometry;
    const next = event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)
      ? geometry
        ? resizeOverlayTransformFromHandle(
            transform,
            "east",
            event.key === "ArrowLeft" ? -distance : distance,
            0,
            geometry,
          )
        : resizeOverlayTransform(
            transform,
            event.key === "ArrowLeft" ? -distance : distance,
          )
      : moveOverlayTransform(
          transform,
          event.key === "ArrowLeft" ? -distance : event.key === "ArrowRight" ? distance : 0,
          event.key === "ArrowUp" ? -distance : event.key === "ArrowDown" ? distance : 0,
          geometry ?? undefined,
        );
    runtime.onOverlayTransform?.(block.id, next);
  };

  return (
    <div
      ref={wrapperRef}
      data-widget-block-id={block.id}
      data-widget-group-id={block.groupId || undefined}
      data-widget-canvas-transform={transformable || undefined}
      data-widget-overlay-transform={transformable || undefined}
      data-widget-multi-selected={selected || undefined}
      data-widget-mobile-fallback={placement.mobileFallback}
      data-widget-canvas-responsive="true"
      data-widget-canvas-device={runtime.canvasDevice}
      aria-label={transformable ? `${block.name}. Arrastra para mover. Usa los tiradores para cambiar el tamaño manteniendo la proporción. Mantén Alt para omitir las guías.` : undefined}
      tabIndex={primarySelected ? 0 : undefined}
      className={`absolute touch-none ${
        placement.mobileFallback === "flow"
          ? "max-sm:my-3"
          : placement.mobileFallback === "hidden"
            ? "max-sm:hidden"
            : ""
      } ${visibilityClass(block.visibility)} ${
        editable ? "widget-studio-preview-selectable" : ""
      } ${selected ? "widget-studio-preview-selected" : ""} ${primarySelected ? "widget-studio-preview-transforming" : ""}`}
      style={{
        ["--widget-canvas-x" as string]: `${basePlacement.x}%`,
        ["--widget-canvas-y" as string]: `${basePlacement.y}%`,
        ["--widget-canvas-width" as string]: `${basePlacement.width}%`,
        ["--widget-canvas-mobile-x" as string]: `${mobilePlacement.x}%`,
        ["--widget-canvas-mobile-y" as string]: `${mobilePlacement.y}%`,
        ["--widget-canvas-mobile-width" as string]: `${mobilePlacement.width}%`,
        ["--widget-canvas-tablet-x" as string]: `${tabletPlacement.x}%`,
        ["--widget-canvas-tablet-y" as string]: `${tabletPlacement.y}%`,
        ["--widget-canvas-tablet-width" as string]: `${tabletPlacement.width}%`,
        ["--widget-canvas-desktop-x" as string]: `${desktopPlacement.x}%`,
        ["--widget-canvas-desktop-y" as string]: `${desktopPlacement.y}%`,
        ["--widget-canvas-desktop-width" as string]: `${desktopPlacement.width}%`,
        left: runtime.canvasDevice
          ? `${transform.x}%`
          : "var(--widget-canvas-active-x, var(--widget-canvas-x))",
        top: runtime.canvasDevice
          ? `${transform.y}%`
          : "var(--widget-canvas-active-y, var(--widget-canvas-y))",
        width: runtime.canvasDevice
          ? `${transform.width}%`
          : "var(--widget-canvas-active-width, var(--widget-canvas-width))",
        zIndex: placement.zIndex,
        cursor: transformable ? (primarySelected ? "move" : "pointer") : editable ? "pointer" : undefined,
      }}
      onPointerDown={transformable ? (event) => beginGesture(event, "move") : undefined}
      onPointerMove={transformable ? handlePointerMove : undefined}
      onPointerUp={transformable ? finishGesture : undefined}
      onPointerCancel={transformable ? finishGesture : undefined}
      onLostPointerCapture={transformable ? finishCapturedGesture : undefined}
      onKeyDown={transformable ? handleKeyDown : undefined}
    >
      {renderBlock(block, assets, editable)}
      {primarySelected && (
        <>
          <button
            type="button"
            tabIndex={-1}
            data-widget-move-handle
            aria-label={`Mover ${block.name}`}
            title="Arrastrar elemento"
            className="widget-studio-transform-move-handle absolute -top-3 left-3 z-20 h-5 w-10 touch-none cursor-move rounded-full border-2 border-white bg-[#7C3AED] shadow-md"
            onPointerDown={(event) => beginGesture(event, "move")}
          />
          <span
            ref={verticalGuideRef}
            hidden
            aria-hidden="true"
            data-widget-snap-axis="vertical"
            className="widget-studio-snap-guide widget-studio-snap-guide-vertical"
          />
          <span
            ref={horizontalGuideRef}
            hidden
            aria-hidden="true"
            data-widget-snap-axis="horizontal"
            className="widget-studio-snap-guide widget-studio-snap-guide-horizontal"
          />
          <span
            ref={readoutRef}
            aria-hidden="true"
            className="widget-studio-transform-readout pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#17131f] px-2 py-1 text-[10px] font-bold text-white shadow-lg sm:inline-flex"
          >
            X {transform.x} · Y {transform.y} · {transform.width}%
          </span>
          {OVERLAY_RESIZE_HANDLES.map((handle) => (
            <button
              key={handle.id}
              type="button"
              tabIndex={-1}
              data-widget-resize-handle={handle.id}
              aria-label={handle.label}
              title={`${handle.label}. Mantiene la proporción. Mantén Alt para omitir las guías.`}
              className={`widget-studio-transform-handle absolute h-4 w-4 touch-none rounded-[4px] border-2 border-white bg-[#7C3AED] shadow-md focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 ${handle.className}`}
              onPointerDown={(event) => beginGesture(event, "resize", handle.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function textColor(value: "text" | "muted" | "primary" | "secondary") {
  if (value === "primary") return "var(--wp)";
  if (value === "secondary") return "var(--wborder)";
  if (value === "muted") return "var(--wtext-secondary)";
  return "var(--wtext)";
}

function WidgetImageMedia({
  asset,
  alt,
  decorative,
  showUnavailable,
  className,
  style,
}: {
  asset: WidgetResolvedAsset;
  alt: string;
  decorative: boolean;
  showUnavailable: boolean;
  className: string;
  style: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const verify = () => {
      if (image.complete && image.naturalWidth === 0) setFailed(true);
    };
    verify();
    image.addEventListener("error", verify);
    return () => image.removeEventListener("error", verify);
  }, [asset.url]);
  if (failed) {
    if (!showUnavailable) return null;
    return (
      <div
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : `${alt || "Imagen"} no disponible`}
        aria-hidden={decorative || undefined}
        className={`${className} min-h-20 items-center justify-center border border-dashed border-[var(--wborder)] bg-[var(--wsubtle)] px-4 text-center text-xs font-semibold text-[var(--wtext-secondary)]`}
        style={{ ...style, display: "flex", aspectRatio: "auto", height: "auto", maxHeight: "8rem" }}
      >
        Imagen no disponible
      </div>
    );
  }
  return (
    <img
      ref={imageRef}
      src={asset.url}
      alt={decorative ? "" : alt}
      width={asset.width}
      height={asset.height}
      loading="lazy"
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

function renderImage(
  block: Extract<WidgetContentBlock, { type: "image" }>,
  assets: WidgetAssetMap,
  editable?: boolean,
) {
  const asset = block.assetId ? assets[block.assetId] : null;
  if (!asset) {
    if (!editable) return null;
    return (
      <div
        role="img"
        aria-label={`${block.alt || "Imagen"} no disponible`}
        className="flex min-h-20 items-center justify-center border border-dashed border-[var(--wborder)] bg-[var(--wsubtle)] px-4 text-center text-xs font-semibold text-[var(--wtext-secondary)]"
        style={{ width: `${block.presentation.width}%`, borderRadius: `${block.presentation.radius}px` }}
      >
        Imagen no disponible · elige otra desde la biblioteca
      </div>
    );
  }
  const image = (
    <figure
      className="overflow-hidden"
      style={{
        width: `${block.presentation.width}%`,
        borderRadius: `${block.presentation.radius}px`,
        opacity: block.presentation.opacity,
      }}
    >
      <WidgetImageMedia
        asset={asset}
        alt={block.alt || asset.altDefault || ""}
        decorative={block.decorative}
        showUnavailable={Boolean(editable)}
        className="block h-full w-full"
        style={{
          aspectRatio: aspectRatioValue(block.presentation.aspectRatio),
          objectFit: block.presentation.fit,
          objectPosition: `${block.presentation.focalPoint.x}% ${block.presentation.focalPoint.y}%`,
        }}
      />
      {block.caption && (
        <figcaption className="mt-1.5 text-xs" style={{ color: "var(--wtext-secondary)" }}>
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
  if (!block.linkUrl || editable) return image;
  return (
    <a href={block.linkUrl} target="_blank" rel="noopener noreferrer">
      {image}
    </a>
  );
}

function BannerBlock({
  block,
  assets,
  editable,
}: {
  block: Extract<WidgetContentBlock, { type: "banner" }>;
  assets: WidgetAssetMap;
  editable?: boolean;
}) {
  const runtime = useContext(WidgetDesignRuntimeContext);
  const promotionId = getWidgetBannerPromotionId(block);
  const promotion = promotionId ? runtime.promotions[promotionId] : null;
  const asset = block.assetId ? assets[block.assetId] : null;
  const imageUrl = asset?.url || block.legacyImageUrl;
  const ctaLabel = promotion?.hasDiscount
    ? promotion.isActive
      ? "Descuento aplicado"
      : `Aplicar ${promotion.discountLabel}`
    : block.ctaLabel;
  const content = (
    <div
      className={`group relative isolate overflow-hidden border ${
        block.variant === "side" ? "grid min-h-36 sm:grid-cols-2" : "min-h-36"
      }`}
      style={{
        width: `${block.presentation.width}%`,
        borderColor: "var(--wborder)",
        borderRadius: `${block.presentation.radius}px`,
        background: block.variant === "color" ? "color-mix(in srgb, var(--wp) 16%, var(--wbg))" : "var(--wsubtle)",
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          width={asset?.width}
          height={asset?.height}
          className={
            block.variant === "side"
              ? "h-full min-h-36 w-full object-cover"
              : block.variant === "top"
                ? "h-36 w-full object-cover"
                : "absolute inset-0 -z-20 h-full w-full object-cover"
          }
          style={{
            objectFit: block.presentation.fit,
            objectPosition: `${block.presentation.focalPoint.x}% ${block.presentation.focalPoint.y}%`,
          }}
        />
      )}
      {imageUrl && !["side", "top"].includes(block.variant) && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      )}
      <div
        className={`flex min-h-36 flex-col justify-end p-5 ${
          block.variant === "top" ? "relative" : ""
        }`}
        style={{
          textAlign: block.align,
          color: imageUrl && !["side", "top"].includes(block.variant) ? "#FFFFFF" : "var(--wtext)",
        }}
      >
        {block.badge && (
          <InlineEditableText
            as="span"
            blockId={block.id}
            field="badge"
            editable={editable}
            maxLength={32}
            className="mb-2 inline-flex w-fit rounded-full bg-[var(--wp)] px-2.5 py-1 text-[10px] font-bold text-white"
          >
            {block.badge}
          </InlineEditableText>
        )}
        <InlineEditableText
          as="p"
          blockId={block.id}
          field="title"
          editable={editable}
          maxLength={90}
          className="text-lg font-bold"
        >
          {block.title}
        </InlineEditableText>
        {block.subtitle && (
          <InlineEditableText
            as="p"
            blockId={block.id}
            field="subtitle"
            editable={editable}
            multiline
            maxLength={240}
            className="mt-1 text-sm opacity-80"
          >
            {block.subtitle}
          </InlineEditableText>
        )}
        {ctaLabel && (
          <InlineEditableText
            as="span"
            blockId={block.id}
            field="ctaLabel"
            editable={editable && !promotion?.hasDiscount}
            maxLength={40}
            className="mt-3 inline-flex w-fit rounded-lg bg-[var(--wp)] px-3 py-2 text-xs font-bold text-white"
          >
            {ctaLabel}
          </InlineEditableText>
        )}
      </div>
    </div>
  );
  if (editable) return content;
  if (promotion?.hasDiscount && promotionId) {
    if (!runtime.onTogglePromotion) return content;
    return (
      <div>
        <button
          type="button"
          className="w-full text-left"
          aria-pressed={promotion.isActive}
          onClick={() => runtime.onTogglePromotion?.(promotionId)}
        >
          {content}
        </button>
        {promotion.isActive && promotion.error && (
          <p className="mt-2 text-xs text-amber-500">{promotion.error}</p>
        )}
      </div>
    );
  }
  if (!block.ctaUrl) return content;
  return (
    <a href={block.ctaUrl} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
}

function renderText(block: Extract<WidgetContentBlock, { type: "text" }>, editable?: boolean) {
  const size = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
  }[block.size];
  const className = `${size} whitespace-pre-wrap ${
    block.semantic === "heading" || block.semantic === "subheading" ? "font-bold" : ""
  }`;
  const style = { textAlign: block.align, color: textColor(block.color) } as const;
  const tag = block.semantic === "heading"
    ? "h2"
    : block.semantic === "subheading"
      ? "h3"
      : block.semantic === "label"
        ? "span"
        : "p";
  return (
    <InlineEditableText
      as={tag}
      blockId={block.id}
      field="content"
      editable={editable}
      multiline
      maxLength={1200}
      className={className}
      style={style}
    >
      {block.content}
    </InlineEditableText>
  );
}

function ButtonBlock({
  block,
  editable,
}: {
  block: Extract<WidgetContentBlock, { type: "button" }>;
  editable?: boolean;
}) {
  const runtime = useContext(WidgetDesignRuntimeContext);
  const variantStyles = {
    primary: { background: "var(--wp)", color: "#FFFFFF", borderColor: "var(--wp)" },
    secondary: { background: "var(--wborder)", color: "var(--wtext)", borderColor: "var(--wborder)" },
    outline: { background: "transparent", color: "var(--wtext)", borderColor: "var(--wborder)" },
    ghost: { background: "var(--wsubtle)", color: "var(--wtext)", borderColor: "transparent" },
  }[block.variant];
  const alignment = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
    stretch: "stretch",
  }[block.align];
  const button = (
    <InlineEditableText
      as="span"
      blockId={block.id}
      field="label"
      editable={editable}
      maxLength={60}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-bold"
      style={{ ...variantStyles, width: block.align === "stretch" ? "100%" : undefined }}
    >
      {block.label}
    </InlineEditableText>
  );
  if (editable) {
    return <div className="flex" style={{ justifyContent: alignment }}>{button}</div>;
  }
  if (block.action === "external") {
    return (
      <div className="flex" style={{ justifyContent: alignment }}>
        <a href={block.url} target={block.newTab ? "_blank" : undefined} rel={block.newTab ? "noopener noreferrer" : undefined}>
          {button}
        </a>
      </div>
    );
  }
  const handleClick = block.action === "next"
    ? runtime.onNext
    : () => document.querySelector("[data-widget-services]")?.scrollIntoView({ behavior: "smooth" });
  return (
    <button
      type="button"
      className="flex w-full"
      style={{ justifyContent: alignment }}
      onClick={handleClick}
      disabled={block.action === "next" && !runtime.onNext}
    >
      {button}
    </button>
  );
}

function renderBlock(block: WidgetContentBlock, assets: WidgetAssetMap, editable?: boolean) {
  if (block.hidden) return null;
  if (block.type === "image") return renderImage(block, assets, editable);
  if (block.type === "banner") {
    return <BannerBlock block={block} assets={assets} editable={editable} />;
  }
  if (block.type === "text") return renderText(block, editable);
  if (block.type === "button") return <ButtonBlock block={block} editable={editable} />;
  if (block.type === "divider") {
    return (
      <hr
        style={{
          width: `${block.width}%`,
          border: 0,
          borderTop: `${block.thickness}px ${block.style} var(--wborder)`,
        }}
      />
    );
  }
  const heights = { xs: 8, sm: 16, md: 32, lg: 56, xl: 80, custom: block.customPx };
  return <div aria-hidden="true" style={{ height: heights[block.size] }} />;
}

function sectionGrid(section: WidgetSection) {
  if (section.layout === "row") return "flex flex-wrap";
  if (section.layout === "columns") {
    const columns = {
      "1": "lg:grid-cols-1",
      "1-1": "lg:grid-cols-2",
      "1-2": "lg:grid-cols-[1fr_2fr]",
      "2-1": "lg:grid-cols-[2fr_1fr]",
      "1-1-1": "lg:grid-cols-3",
    }[section.columns];
    return `grid grid-cols-1 ${columns}`;
  }
  return "flex flex-col";
}

function WidgetDesignSection({
  section,
  assets,
  previewMode,
  editable,
}: {
  section: WidgetSection;
  assets: WidgetAssetMap;
  previewMode?: boolean;
  editable?: boolean;
}) {
  const runtime = useContext(WidgetDesignRuntimeContext);
  if (section.hidden) return null;
  const gridStep = Math.max(2.5, Math.min(10, runtime.canvasGridStep ?? 5));
  const background = section.backgroundAssetId ? assets[section.backgroundAssetId] : null;
  const imageIsAvailable = (block: WidgetContentBlock) => (
    block.type !== "image" || Boolean(block.assetId && assets[block.assetId]) || Boolean(editable)
  );
  const flowBlocks = section.children.filter((block) =>
    imageIsAvailable(block) &&
    !isWidgetCanvasBlock(block) &&
    (block.type !== "image" || !block.assetId || block.assetId !== section.backgroundAssetId)
  );
  const canvasBlocks = section.children.filter((block) => (
    imageIsAvailable(block) && isWidgetCanvasBlock(block)
  ));

  return (
    <section
      data-widget-section-id={section.id}
      data-widget-canvas-grid={editable && runtime.canvasGridEnabled || undefined}
      className={`relative isolate overflow-hidden ${editable && runtime.canvasGridEnabled ? "widget-studio-canvas-grid" : ""} ${canvasBlocks.length > 0 ? "widget-design-section-with-overlay" : ""} ${sectionGrid(section)} ${visibilityClass(section.visibility)}`}
      style={{
        gap: `${section.gap}px`,
        padding: `${section.padding}px`,
        minHeight: section.minHeight ? `${section.minHeight}px` : undefined,
        ...(editable && runtime.canvasGridEnabled ? {
          "--widget-studio-grid-size": `${gridStep}%`,
          "--widget-studio-major-grid-size": `${Math.min(100, gridStep * 4)}%`,
        } as CSSProperties : {}),
        borderRadius: `${section.radius}px`,
        backgroundColor: section.backgroundColor,
        alignItems: section.align,
      }}
    >
      {background && (
        <img
          src={background.url}
          alt=""
          width={background.width}
          height={background.height}
          className="absolute inset-0 -z-20 h-full w-full"
          style={{
            objectFit: section.backgroundFit,
            objectPosition: `${section.backgroundFocalPoint.x}% ${section.backgroundFocalPoint.y}%`,
          }}
        />
      )}
      {section.overlayOpacity > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: section.overlayColor, opacity: section.overlayOpacity }}
        />
      )}
      {flowBlocks.map((block) => (
        <div
          key={block.id}
          data-widget-block-id={block.id}
          className={`relative z-[1] ${visibilityClass(block.visibility)} ${previewMode && editable ? "widget-studio-preview-selectable rounded" : ""}`}
          onClick={previewMode && editable ? () => window.parent.postMessage({
            source: "puragenda-widget-preview",
            type: "BLOCK_SELECTED",
            blockId: block.id,
          }, window.location.origin) : undefined}
        >
          {renderBlock(block, assets, editable)}
        </div>
      ))}
      {canvasBlocks.map((block) => (
        <TransformableCanvasBlock
          key={block.id}
          block={block}
          assets={assets}
          editable={previewMode && editable}
        />
      ))}
    </section>
  );
}

export function WidgetDesignSlot({
  document,
  assets,
  slot,
  step,
  previewMode,
  editable,
}: {
  document: WidgetDesignDocument;
  assets: WidgetAssetMap;
  slot: WidgetSlotName | WidgetStepSlotName;
  step?: string;
  previewMode?: boolean;
  editable?: boolean;
}) {
  const sections = step
    ? document.stepSlots[step]?.[slot as WidgetStepSlotName] || []
    : document.globalSlots[slot as WidgetSlotName] || [];
  const visibleSections = sections.filter((section) => {
    if (editable) return true;
    if (section.hidden) return false;
    const hasRenderableBlock = section.children.some((block) => (
      !block.hidden && (block.type !== "image" || Boolean(block.assetId && assets[block.assetId]))
    ));
    const hasVisualSurface = Boolean(
      (section.backgroundAssetId && assets[section.backgroundAssetId])
      || section.backgroundColor !== "transparent"
      || section.overlayOpacity > 0
      || section.minHeight > 0
    );
    return hasRenderableBlock || hasVisualSurface;
  });
  if (!visibleSections.length) return null;
  return (
    <div className="space-y-3 p-4 sm:p-5" data-widget-slot={`${step || "global"}.${slot}`}>
      {visibleSections.map((section) => (
        <WidgetDesignSection
          key={section.id}
          section={section}
          assets={assets}
          previewMode={previewMode}
          editable={editable}
        />
      ))}
    </div>
  );
}
