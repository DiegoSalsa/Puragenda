"use client";

import { useEffect, useRef } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface PageTutorialProps {
  tutorialKey: string;
  userEmail?: string | null;
  steps: DriveStep[];
}

export function PageTutorial({ tutorialKey, userEmail, steps }: PageTutorialProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const hasSeen = localStorage.getItem(`hasSeenTutorial_${tutorialKey}`);
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
      steps,
      onDestroyStarted: () => {
        if (!isDemo) {
          localStorage.setItem(`hasSeenTutorial_${tutorialKey}`, "true");
        }
        driverObj.destroy();
      }
    });

    // Timeout to ensure the DOM is fully rendered
    setTimeout(() => {
      driverObj.drive();
    }, 800);

  }, [tutorialKey, userEmail, steps]);

  return null;
}
