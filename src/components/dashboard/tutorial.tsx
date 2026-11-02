"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { driver } from "driver.js";
import { useDashboardOverlay } from "@/components/dashboard/dashboard-overlay-context";
import { GUIDED_HELP_KEYS } from "@/i18n/guided-help-keys";
import "driver.js/dist/driver.css";
import { helpOverlayBlocked, readHelpSeen, markHelpSeen, startDashboardTour, visibleHelpSteps } from "./guided-help-runtime";

export function DashboardTutorial() {
  const legacy = useTranslations("legacy");
  const initialized = useRef(false);
  const { isChangelogOpen } = useDashboardOverlay();

  useEffect(() => {
    const translate = (source: string) => {
      const key = GUIDED_HELP_KEYS[source];
      return key ? legacy(key) : source;
    };
    if (initialized.current) return;
    if (isChangelogOpen) return;
    initialized.current = true;
    let startTimeout: ReturnType<typeof setTimeout> | null = null;

    const hasSeen = readHelpSeen("hasSeenTutorial_general");

    if (hasSeen) {
      return;
    }

    const driverObj = driver({
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      allowClose: true,
      smoothScroll: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      showProgress: true,
      nextBtnText: translate("Siguiente"),
      prevBtnText: translate("Atrás"),
      doneBtnText: translate("Finalizar"),
      progressText: translate("GUÍA PASO {{current}} DE {{total}}"),
      popoverClass: "neo-brutalism-driver",
      steps: visibleHelpSteps([
        {
          popover: {
            title: translate("¡BIENVENIDO!"),
            description: translate("Te haremos un breve recorrido por tu nuevo dashboard para que sepas dónde está cada cosa. Puedes cerrar esto si prefieres explorar por tu cuenta."),
          }
        },
        {
          element: "#tutorial-nav",
          popover: {
            title: translate("MENÚ DE NAVEGACIÓN"),
            description: translate("Aquí puedes cambiar de sección. Encontrarás tu calendario de citas, configuración de profesionales, servicios, clientes, apariencia y más."),
            side: "right",
            align: "start"
          }
        },
        {
          element: "#tutorial-main",
          popover: {
            title: translate("ÁREA DE TRABAJO"),
            description: translate("Aquí visualizarás y gestionarás toda la información detallada según la sección del menú que hayas seleccionado."),
            side: "left",
            align: "start"
          }
        },
        {
          element: "#tutorial-widget",
          popover: {
            title: translate("VER WIDGET"),
            description: translate("Haz clic aquí para abrir una nueva pestaña y probar cómo ven tus clientes el widget de reservas con tus servicios y el diseño que hayas configurado."),
            side: "right",
            align: "end"
          }
        }
      ]),
      onDestroyStarted: () => {
        markHelpSeen("hasSeenTutorial_general");
        driverObj.destroy();
      }
    });

    // Timeout to ensure the DOM is fully rendered
    startTimeout = setTimeout(() => {
      if (!helpOverlayBlocked()) startDashboardTour(driverObj);
    }, 500);

    return () => {
      if (startTimeout) clearTimeout(startTimeout);
      driverObj.destroy();
    };
  }, [isChangelogOpen, legacy]);

  return null;
}
