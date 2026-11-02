import type { DriveStep, driver } from "driver.js";

let active: ReturnType<typeof driver> | null = null;
export function visibleHelpTarget(element: Element) {
  if (!(element instanceof HTMLElement) || element.closest('[hidden], [inert], [aria-hidden="true"]') || element.matches(':disabled')) return false;
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && element.getClientRects().length > 0;
}
export function findHelpTarget(selectors: string[]) {
  for (const selector of selectors) {
    const target = Array.from(document.querySelectorAll(selector)).find(visibleHelpTarget);
    if (target) return target;
  }
  return undefined;
}
export function helpOverlayBlocked() {
  return Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"], dialog[open], [role="menu"], [data-dashboard-overlay="open"]')).some(visibleHelpTarget);
}
export function visibleHelpSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter(step => {
    if (!step.element || typeof step.element === "function") return true;
    return typeof step.element === "string" ? !!findHelpTarget([step.element]) : visibleHelpTarget(step.element);
  });
}
export function stopDashboardTour() { active?.destroy(); active = null; }
export function startDashboardTour(instance: ReturnType<typeof driver>) {
  stopDashboardTour(); active = instance;
  window.addEventListener("puri:ask", stopDashboardTour);
  window.addEventListener("dashboard:overlay-open", stopDashboardTour);
  window.addEventListener("resize", stopDashboardTour);
  instance.drive();
}
export function readHelpSeen(key: string) { try { return !!window.localStorage.getItem(key); } catch { return false; } }
export function markHelpSeen(key: string) { try { window.localStorage.setItem(key, "true"); } catch { /* Help remains usable when persistence is unavailable. */ } }
