"use client";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
const subscribe = (changed: () => void) => {
  const observer = new MutationObserver(changed);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};
// Shared root remains static. Website routes have no dashboard layout, and the
// platform's cookie banner/PWA/analytics effects do not run on tenant websites.
export function RuntimeChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const websiteRoute = /^\/(sites\/|website-demo\/|website-preview(?:\/|$)|dashboard\/website\/preview(?:\/|$))/.test(pathname ?? "");
  const platform = useSyncExternalStore(subscribe, () => !websiteRoute && !document.getElementById("studio-root"), () => false);
  return platform ? children : null;
}
