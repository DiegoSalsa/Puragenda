"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function DashboardTutorial({ userEmail }: { userEmail: string }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const hasSeen = localStorage.getItem("hasSeenDashboardTutorial");
    const isDemo = userEmail === "vale@esteticabella.cl";

    if (hasSeen && !isDemo) {
      return;
    }

    const driverObj = driver({
      showProgress: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Atrás",
      doneBtnText: "Finalizar",
      progressText: "GUÍA PASO {{current}} DE {{total}}",
      popoverClass: "neo-brutalism-driver",
      steps: [
        {
          popover: {
            title: "¡BIENVENIDO!",
            description: "Te haremos un breve recorrido por tu nuevo dashboard para que sepas dónde está cada cosa. Puedes cerrar esto si prefieres explorar por tu cuenta.",
          }
        },
        {
          element: "#tutorial-nav",
          popover: {
            title: "MENÚ DE NAVEGACIÓN",
            description: "Aquí puedes cambiar de sección. Encontrarás tu calendario de citas, configuración de profesionales, servicios, clientes, apariencia y más.",
            side: "right",
            align: "start"
          }
        },
        {
          element: "#tutorial-main",
          popover: {
            title: "ÁREA DE TRABAJO",
            description: "Aquí visualizarás y gestionarás toda la información detallada según la sección del menú que hayas seleccionado.",
            side: "left",
            align: "start"
          }
        },
        {
          element: "#tutorial-widget",
          popover: {
            title: "VER WIDGET",
            description: "Haz clic aquí para abrir una nueva pestaña y probar cómo ven tus clientes el widget de reservas con tus servicios y el diseño que hayas configurado.",
            side: "right",
            align: "end"
          }
        }
      ],
      onDestroyStarted: () => {
        if (!isDemo) {
          localStorage.setItem("hasSeenDashboardTutorial", "true");
        }
        driverObj.destroy();
      }
    });

    // Timeout to ensure the DOM is fully rendered
    setTimeout(() => {
      driverObj.drive();
    }, 500);

  }, [userEmail]);

  return null;
}
