"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAButton({ variant = "default" }: { variant?: "default" | "sidebar" | "nav" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Register service worker (required for beforeinstallprompt)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already running as installed PWA — hide button
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Listen for the install prompt (Chrome/Edge/Samsung/Android)
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Mark ready after a short delay to allow beforeinstallprompt to fire
    const timeout = setTimeout(() => setReady(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timeout);
    };
  }, []);

  // Already installed as PWA → don't render
  if (isStandalone) return null;

  // Not ready yet (waiting for beforeinstallprompt to potentially fire)
  if (!ready && !deferredPrompt && !isIOS) return null;

  async function handleClick() {
    // CASE 1: Native install prompt available (Android Chrome, Edge, etc.)
    // This triggers the actual "Add to Home Screen" prompt from the browser
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsStandalone(true);
      setDeferredPrompt(null);
      return;
    }

    // CASE 2: iOS → show instructions (only way on iOS/Safari)
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // CASE 3: Browser doesn't support install (Firefox, etc.)
    // Show generic instructions
    setShowIOSModal(true);
  }

  // ── Styles per variant ──
  const cls =
    variant === "sidebar"
      ? "flex w-full items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2.5 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10"
      : variant === "nav"
        ? "flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10"
        : "flex items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-4 py-2.5 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10";

  return (
    <>
      <button onClick={handleClick} className={cls}>
        <Download className="h-4 w-4" />
        {variant === "nav" ? "Instalar" : "Instalar App"}
      </button>

      {/* Instructions modal (iOS or unsupported browsers) */}
      {showIOSModal && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center"
          style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="mx-4 mb-4 w-full max-w-sm rounded-2xl border border-border p-6 shadow-2xl"
            style={{ backgroundColor: "var(--background, #ffffff)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/10">
                  <Download className="h-4 w-4 text-[#7C3AED]" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Instalar Puragenda</h3>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {isIOS ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Para instalar la app en tu iPhone o iPad:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">1</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">Toca el ícono de Compartir</p>
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          Es el cuadrado con la flecha hacia arriba
                          <svg className="h-4 w-4 text-[#007AFF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">2</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">Busca la opción</p>
                        <p className="text-muted-foreground mt-0.5">&quot;Agregar a la pantalla de inicio&quot;</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">3</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">Confirma tocando &quot;Agregar&quot;</p>
                        <p className="text-muted-foreground mt-0.5">¡Listo! La app aparecerá en tu pantalla.</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Tu navegador no soporta la instalación automática. Para instalar Puragenda:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">1</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">Abre en Google Chrome</p>
                        <p className="text-muted-foreground mt-0.5">La instalación automática funciona en Chrome y Edge.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">2</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">Presiona &quot;Instalar&quot; de nuevo</p>
                        <p className="text-muted-foreground mt-0.5">Se descargará automáticamente.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowIOSModal(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
