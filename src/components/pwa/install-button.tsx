"use client";

import { useState, useEffect, useRef } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAButton({ variant = "default" }: { variant?: "default" | "sidebar" | "nav" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setInstalled(true);
      return;
    }

    // Detect iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // On iOS, always show the button (no beforeinstallprompt support)
    if (isiOS) {
      setCanShow(true);
      return;
    }

    // On Android/desktop, wait for beforeinstallprompt
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanShow(true);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      setCanShow(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleClick() {
    // iOS flow: show instructions modal
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    // Android/desktop flow: trigger install prompt
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setCanShow(false);
    }
    setDeferredPrompt(null);
  }

  // Don't render if already installed or can't show
  if (installed || !canShow) return null;

  const buttonContent = (
    <>
      <Download className="h-4 w-4" />
      {variant === "nav" ? "Instalar" : "Instalar App"}
    </>
  );

  const sidebarClasses = "flex w-full items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2.5 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10";
  const navClasses = "flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10";
  const defaultClasses = "flex items-center gap-2 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-4 py-2.5 text-sm font-medium text-[#7C3AED] transition-all hover:bg-[#7C3AED]/10";

  const className = variant === "sidebar" ? sidebarClasses : variant === "nav" ? navClasses : defaultClasses;

  return (
    <>
      <button onClick={handleClick} className={className}>
        {buttonContent}
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowIOSModal(false)}>
          <div
            className="mx-4 mb-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/10">
                  <Download className="h-4 w-4 text-[#7C3AED]" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Instalar Puragenda</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para instalar la app en tu iPhone o iPad:
              </p>

              <div className="space-y-3">
                {/* Step 1 */}
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

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">2</div>
                  <div className="text-sm">
                    <p className="text-foreground font-medium">Desplázate y toca</p>
                    <p className="text-muted-foreground mt-0.5">&quot;Agregar a la pantalla de inicio&quot;</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">3</div>
                  <div className="text-sm">
                    <p className="text-foreground font-medium">Confirma tocando &quot;Agregar&quot;</p>
                    <p className="text-muted-foreground mt-0.5">¡Listo! La app aparecerá en tu pantalla de inicio.</p>
                  </div>
                </div>
              </div>

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
