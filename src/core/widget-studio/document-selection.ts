import type { WidgetDesignDocument, WidgetSection } from "@/core/widget-studio/schema";

export type WidgetRemovalResult = {
  removedBlocks: number;
  removedSections: number;
};

function documentSectionLists(document: WidgetDesignDocument): WidgetSection[][] {
  return [
    ...Object.values(document.globalSlots),
    ...Object.values(document.stepSlots).flatMap((slots) => Object.values(slots)),
  ];
}

export function canRemoveWidgetNodes(
  document: WidgetDesignDocument,
  ids: Iterable<string>,
) {
  const targets = new Set(ids);
  return documentSectionLists(document).some((sections) => sections.some((section) => {
    if (targets.has(section.id) && !section.locked) return true;
    if (section.locked) return false;
    return section.children.some((block) => targets.has(block.id) && !block.locked);
  }));
}

/** Removes every removable target, even if stale selection IDs span sections. */
export function removeWidgetNodes(
  document: WidgetDesignDocument,
  ids: Iterable<string>,
): WidgetRemovalResult {
  const targets = new Set(ids);
  const result: WidgetRemovalResult = { removedBlocks: 0, removedSections: 0 };

  for (const sections of documentSectionLists(document)) {
    for (let index = sections.length - 1; index >= 0; index -= 1) {
      const section = sections[index];
      if (targets.has(section.id) && !section.locked) {
        sections.splice(index, 1);
        result.removedSections += 1;
        result.removedBlocks += section.children.length;
        continue;
      }
      if (section.locked) continue;
      const previousCount = section.children.length;
      section.children = section.children.filter(
        (block) => !targets.has(block.id) || block.locked,
      );
      const removed = previousCount - section.children.length;
      result.removedBlocks += removed;
      if (removed > 0 && section.children.length === 0) {
        sections.splice(index, 1);
        result.removedSections += 1;
      }
    }
  }

  return result;
}
