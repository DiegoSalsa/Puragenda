"use client";

import { useEffect, useRef } from "react";

// Only the authenticated private preview opts into a booking demonstration.
// Keep the native template's entry point, including its categories and styling.
export function usePreviewBooking(enabled: boolean, open: () => void) {
  const callback = useRef(open);
  useEffect(() => { callback.current = open; }, [open]);
  useEffect(() => {
    if (!enabled) return;
    const frame = window.requestAnimationFrame(() => callback.current());
    return () => window.cancelAnimationFrame(frame);
  }, [enabled]);
}
