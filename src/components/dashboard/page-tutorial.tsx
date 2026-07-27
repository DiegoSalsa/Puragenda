"use client";

import { useEffect, useRef } from "react";
import { driver, DriveStep } from "driver.js";
import { useDashboardOverlay } from "@/components/dashboard/dashboard-overlay-context";
import "driver.js/dist/driver.css";

interface PageTutorialProps {
  tutorialKey: string;
  userEmail?: string | null;
  steps: DriveStep[];
  dependsOnKey?: string;
}

export function PageTutorial({ tutorialKey, steps, dependsOnKey }: PageTutorialProps) {
  const initialized = useRef(false);
  const { isChangelogOpen } = useDashboardOverlay();

  useEffect(() => {
    if (initialized.current) return;
    if (isChangelogOpen) return;
    
    // Check if it's already seen
    const hasSeen = localStorage.getItem(`hasSeenTutorial_${tutorialKey}`);

    if (hasSeen) {
      return;
    }

    const startDriver = () => {
      initialized.current = true;
      const driverObj = driver({
        showProgress: true,
        nextBtnText: "Siguiente",
        prevBtnText: "Atrás",
        doneBtnText: "Finalizar",
        progressText: "GUÍA PASO {{current}} DE {{total}}",
        popoverClass: "neo-brutalism-driver",
        steps,
        onDestroyStarted: () => {
          localStorage.setItem(`hasSeenTutorial_${tutorialKey}`, "true");
          driverObj.destroy();
        }
      });

      setTimeout(() => {
        driverObj.drive();
      }, 800);
    };

    if (dependsOnKey) {
      // Poll for the dependency
      const interval = setInterval(() => {
        const isDone = localStorage.getItem(`hasSeenTutorial_${dependsOnKey}`) === "true";
        if (isDone) {
          clearInterval(interval);
          startDriver();
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      startDriver();
    }

  }, [isChangelogOpen, tutorialKey, steps, dependsOnKey]);

  return null;
}
