"use client";

import type {
  CSSProperties,
  ElementType,
  FocusEvent,
  KeyboardEvent,
  ReactNode,
} from "react";
import type {
  WidgetContentBlock,
  WidgetDesignDocument,
  WidgetSection,
  WidgetSlotName,
  WidgetStepSlotName,
} from "@/core/widget-studio/schema";

export type WidgetResolvedAsset = {
  id?: string;
  url: string;
  width: number;
  height: number;
  altDefault: string | null;
};

type WidgetAssetMap = Record<string, WidgetResolvedAsset>;

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

function textColor(value: "text" | "muted" | "primary" | "secondary") {
  if (value === "primary") return "var(--wp)";
  if (value === "secondary") return "var(--wborder)";
  if (value === "muted") return "var(--wtext-secondary)";
  return "var(--wtext)";
}

function renderImage(
  block: Extract<WidgetContentBlock, { type: "image" }>,
  assets: WidgetAssetMap,
) {
  const asset = assets[block.assetId];
  if (!asset) return null;
  const image = (
    <figure
      className="overflow-hidden"
      style={{
        width: `${block.presentation.width}%`,
        borderRadius: `${block.presentation.radius}px`,
        opacity: block.presentation.opacity,
      }}
    >
      <img
        src={asset.url}
        alt={block.decorative ? "" : block.alt || asset.altDefault || ""}
        width={asset.width}
        height={asset.height}
        loading="lazy"
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
  if (!block.linkUrl) return image;
  return (
    <a href={block.linkUrl} target="_blank" rel="noopener noreferrer">
      {image}
    </a>
  );
}

function renderBanner(
  block: Extract<WidgetContentBlock, { type: "banner" }>,
  assets: WidgetAssetMap,
  editable?: boolean,
) {
  const asset = block.assetId ? assets[block.assetId] : null;
  const imageUrl = asset?.url || block.legacyImageUrl;
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
        {block.ctaLabel && (
          <InlineEditableText
            as="span"
            blockId={block.id}
            field="ctaLabel"
            editable={editable}
            maxLength={40}
            className="mt-3 inline-flex w-fit rounded-lg bg-[var(--wp)] px-3 py-2 text-xs font-bold text-white"
          >
            {block.ctaLabel}
          </InlineEditableText>
        )}
      </div>
    </div>
  );
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

function renderButton(block: Extract<WidgetContentBlock, { type: "button" }>, editable?: boolean) {
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
  if (block.action === "external") {
    return (
      <div className="flex" style={{ justifyContent: alignment }}>
        <a href={block.url} target={block.newTab ? "_blank" : undefined} rel={block.newTab ? "noopener noreferrer" : undefined}>
          {button}
        </a>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="flex w-full"
      style={{ justifyContent: alignment }}
      onClick={() => document.querySelector("[data-widget-services]")?.scrollIntoView({ behavior: "smooth" })}
    >
      {button}
    </button>
  );
}

function renderBlock(block: WidgetContentBlock, assets: WidgetAssetMap, editable?: boolean) {
  if (block.hidden) return null;
  if (block.type === "image") return renderImage(block, assets);
  if (block.type === "banner") return renderBanner(block, assets, editable);
  if (block.type === "text") return renderText(block, editable);
  if (block.type === "button") return renderButton(block, editable);
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
  if (section.hidden) return null;
  const background = section.backgroundAssetId ? assets[section.backgroundAssetId] : null;
  const flowBlocks = section.children.filter(
    (block) => block.type !== "image" || block.mode !== "overlay",
  );
  const overlays = section.children.filter(
    (block): block is Extract<WidgetContentBlock, { type: "image" }> =>
      block.type === "image" && block.mode === "overlay",
  );

  return (
    <section
      data-widget-section-id={section.id}
      className={`relative isolate overflow-hidden ${sectionGrid(section)} ${visibilityClass(section.visibility)}`}
      style={{
        gap: `${section.gap}px`,
        padding: `${section.padding}px`,
        minHeight: section.minHeight ? `${section.minHeight}px` : undefined,
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
          className={`${visibilityClass(block.visibility)} ${previewMode ? "widget-studio-preview-selectable rounded" : ""}`}
          onClick={previewMode ? () => window.parent.postMessage({
            source: "puragenda-widget-preview",
            type: "BLOCK_SELECTED",
            blockId: block.id,
          }, window.location.origin) : undefined}
        >
          {renderBlock(block, assets, editable)}
        </div>
      ))}
      {overlays.map((block) => (
        <div
          key={block.id}
          data-widget-block-id={block.id}
          className={`absolute max-sm:static max-sm:my-3 ${visibilityClass(block.visibility)} ${previewMode ? "widget-studio-preview-selectable" : ""}`}
          style={{
            left: `${block.overlay.x}%`,
            top: `${block.overlay.y}%`,
            width: `${block.overlay.width}%`,
            zIndex: block.overlay.zIndex,
          }}
        >
          {renderBlock(block, assets, editable)}
        </div>
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
  if (!sections.length) return null;
  return (
    <div className="space-y-3 p-4 sm:p-5" data-widget-slot={`${step || "global"}.${slot}`}>
      {sections.map((section) => (
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
