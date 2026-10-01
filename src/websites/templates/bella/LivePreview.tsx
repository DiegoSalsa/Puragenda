"use client";
import { useEffect, useRef, useState } from "react";
import type { WebsiteView } from "../../types";
import { PREVIEW_PROTOCOL, parsePreviewMessage, trustedPreviewSender } from "../../preview-protocol";
export function useLivePreview(initial: WebsiteView) {
  const [config, setConfig] = useState(initial.config);
  const sequence = useRef(-1);
  useEffect(() => {
    if (!initial.preview || window.parent === window) return;
    let highlight: ReturnType<typeof setTimeout> | undefined;
    function receive(event: MessageEvent) {
      if (!trustedPreviewSender(event, window.parent, window.location.origin)) return;
      const parsed = parsePreviewMessage(event.data, window.location.origin);
      if (!parsed.success || parsed.data.sequence < sequence.current) return;
      sequence.current = parsed.data.sequence; setConfig(parsed.data.config);
      if (parsed.data.focus) requestAnimationFrame(() => {
        document.querySelectorAll("[data-website-highlight]").forEach(element => element.removeAttribute("data-website-highlight"));
        const target = document.querySelector<HTMLElement>(`[data-website-field="${parsed.data.focus}"]`);
        if (!target) return;
        target.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        target.setAttribute("data-website-highlight", "true");
        clearTimeout(highlight); highlight = setTimeout(() => target.removeAttribute("data-website-highlight"), 1200);
      });
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ protocol: PREVIEW_PROTOCOL, type: "ready" }, window.location.origin);
    return () => { window.removeEventListener("message", receive); clearTimeout(highlight); };
  }, [initial.preview]);
  return { ...initial, config: initial.preview ? config : initial.config };
}
