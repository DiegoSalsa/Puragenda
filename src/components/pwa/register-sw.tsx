"use client";

import { useEffect } from "react";

/**
 * Registers the service worker globally from the root layout.
 * This ensures Chrome has time to evaluate PWA installability
 * before the user ever sees the install button.
 */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
