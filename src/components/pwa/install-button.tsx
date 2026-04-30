"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAButton({ variant = "default" }: { variant?: "default" | "sidebar" | "nav" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }

  // Don't show if already installed or prompt not available
  if (installed || !deferredPrompt) return null;

  if (variant === "sidebar") {
    return (
      <button
        onClick={handleInstall}
        className="flex w-full items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2.5 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10"
      >
        <Download className="h-4 w-4" />
        Instalar App
      </button>
    );
  }

  if (variant === "nav") {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10"
      >
        <Download className="h-3.5 w-3.5" />
        Instalar
      </button>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-4 py-2.5 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10"
    >
      <Download className="h-4 w-4" />
      Instalar App
    </button>
  );
}
