"use client";
import { useEffect, useRef, useState } from "react";
import { pinkDisplay, pinkHandwriting, pinkScript } from "./fonts";
import type { WebsiteView } from "../../types";
import type { PinkConfig } from "./config";
import { PREVIEW_PROTOCOL, trustedPreviewSender } from "../../preview-transport";
import { dateKey } from "../../booking/validation";
import { parsePinkPreview, pinkPreviewTarget } from "./preview";
import PinkY2k from "./PinkY2k";
import type { StickerEditorState, StickerEdit } from "./stickers";
export default function Y2k({ view: initial }: { view: WebsiteView<PinkConfig> }) {
  const [draft, setDraft] = useState(initial.config), sequence = useRef(-1);
  const [stickerEditor, setStickerEditor] = useState<StickerEditorState>({ enabled: false, viewport: "desktop" });
  useEffect(() => {
    if (!initial.preview || window.parent === window) return;
    function receive(event: MessageEvent) {
      if (!trustedPreviewSender(event, window.parent, window.location.origin)) return;
      const parsed = parsePinkPreview(event.data, window.location.origin);
      if (!parsed.success || parsed.data.sequence < sequence.current) return;
      sequence.current = parsed.data.sequence;
      setDraft(parsed.data.config);
      setStickerEditor(parsed.data.stickerEditor ?? { enabled: false, viewport: "desktop" });
      if (parsed.data.focus) requestAnimationFrame(() => document.querySelector(pinkPreviewTarget(parsed.data.focus!))?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" }));
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ protocol: PREVIEW_PROTOCOL, type: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [initial.preview]);
  const view = { ...initial, config: initial.preview ? draft : initial.config };
  function editSticker(edit: StickerEdit) {
    if (initial.preview && window.parent !== window) window.parent.postMessage({ protocol: PREVIEW_PROTOCOL, type: "sticker-edit", ...edit }, window.location.origin);
  }
  const editor = initial.preview ? stickerEditor : undefined;
  return <div className={`${pinkDisplay.variable} ${pinkHandwriting.variable} ${pinkScript.variable}`}>
    <PinkY2k view={view} today={dateKey(new Date(), view.catalog.business.timezone)} stickerEditor={editor} onStickerEdit={editor ? editSticker : undefined}/>
  </div>;
}
