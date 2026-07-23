import type { DriveStep } from "driver.js";

interface PageTutorialProps {
  tutorialKey: string;
  userEmail?: string | null;
  steps: DriveStep[];
  dependsOnKey?: string;
}

/**
 * Compatibilidad para las páginas que todavía declaran su antiguo tutorial
 * automático. Los recorridos por módulo ahora se abren exclusivamente desde
 * el botón de ayuda contextual para evitar tours duplicados o superpuestos.
 */
export function PageTutorial(props: PageTutorialProps) {
  void props;
  return null;
}
