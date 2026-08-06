"use client";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Global reference so the prompt persists across component mounts
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
let _listenerAdded = false;

if (typeof window !== "undefined" && !_listenerAdded) {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
  });
  _listenerAdded = true;
}

export function InstallPWAButton({ variant = "default" }: { variant?: "default" | "sidebar" | "nav" }) {
  const t = useTranslations("pwa");
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    queueMicrotask(() => {
      setIsStandalone(standalone);
      setIsIOS(ios);
    });

    if (standalone) return;

    // Listen for future beforeinstallprompt events
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      _deferredPrompt = e as BeforeInstallPromptEvent;
    }

    function onInstalled() {
      setIsStandalone(true);
      _deferredPrompt = null;
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already installed → hide
  if (isStandalone) return null;

  async function handleClick() {
    // CASE 1: Native install prompt available → triggers browser install dialog
    if (_deferredPrompt) {
      try {
        await _deferredPrompt.prompt();
        const { outcome } = await _deferredPrompt.userChoice;
        if (outcome === "accepted") setIsStandalone(true);
      } catch {
        // prompt() can only be called once
      }
      _deferredPrompt = null;
      return;
    }

    // CASE 2: iOS → show step-by-step instructions
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // CASE 3: Unsupported browser → tell user to use Chrome
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
        {variant === "nav" ? t("install") : t("installApp")}
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
                <h3 className="text-base font-semibold text-foreground">{t("title")}</h3>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {isIOS ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("iosIntro")}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">1</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">{t("shareTitle")}</p>
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          {t("shareDescription")}
                          <svg className="h-4 w-4 text-[#007AFF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">2</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">{t("findOption")}</p>
                        <p className="text-muted-foreground mt-0.5"><LocalizedText id="SXVYIwAnGSDR" />{t("addHomeScreen")}<LocalizedText id="SXVYIwAnGSDR" /></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">3</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">{t("confirmAdd")}</p>
                        <p className="text-muted-foreground mt-0.5">{t("iosDone")}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("unsupportedIntro")}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">1</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">{t("openChrome")}</p>
                        <p className="text-muted-foreground mt-0.5">{t("chromeRequired")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold">2</div>
                      <div className="text-sm">
                        <p className="text-foreground font-medium">{t("pressInstall")}</p>
                        <p className="text-muted-foreground mt-0.5">{t("automaticInstall")}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowIOSModal(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6]"
              >
                {t("understood")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
