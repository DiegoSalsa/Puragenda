"use client";
import { useEffect, useRef, useState } from "react";
import { DynaPuff, Caveat } from "next/font/google";
import type { WebsiteView } from "../../types";
import type { PinkConfig } from "./config";
import { PREVIEW_PROTOCOL, trustedPreviewSender } from "../../preview-transport";
import { dateKey } from "../../booking/validation";
import { parsePinkPreview, pinkPreviewTarget } from "./preview";
import PinkY2k from "./PinkY2k";
const display = DynaPuff({ subsets: ["latin"], variable: "--pink-display", display: "swap", preload: false });
const hand = Caveat({ subsets: ["latin"], variable: "--pink-hand", display: "swap", preload: false });
export default function Y2k({ view: initial }: { view: WebsiteView<PinkConfig> }) {
  const [draft, setDraft] = useState(initial.config), sequence = useRef(-1);
  useEffect(() => {
    if (!initial.preview || window.parent === window) return;
    function receive(event: MessageEvent) {
      if (!trustedPreviewSender(event, window.parent, window.location.origin)) return;
      const parsed = parsePinkPreview(event.data, window.location.origin);
      if (!parsed.success || parsed.data.sequence < sequence.current) return;
      sequence.current = parsed.data.sequence;
      setDraft(parsed.data.config);
      if (parsed.data.focus) requestAnimationFrame(() => document.querySelector(pinkPreviewTarget(parsed.data.focus!))?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" }));
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ protocol: PREVIEW_PROTOCOL, type: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [initial.preview]);
  const view = { ...initial, config: initial.preview ? draft : initial.config };
  return <div className={`${display.variable} ${hand.variable}`}><PinkY2k view={view} today={dateKey(new Date(), view.catalog.business.timezone)} /></div>;
}
