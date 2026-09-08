"use client";

import { useEffect, useId, useState } from "react";
import { Cookie } from "@/components/icons/hover-icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";
import { getTrackingIdentifiers, recordAnalyticsConsent } from "@/lib/analytics/client";

type BannerView = "prompt" | "settings";

const bannerShellClassName =
  "fixed inset-x-3 z-[9998] max-w-[calc(100vw-1.5rem)] animate-slide-up sm:inset-x-auto sm:right-6 sm:max-w-md";
const bannerCardClassName =
  "flex flex-col gap-2 overflow-hidden rounded-xl border-2 border-black bg-[#FFF5BA] p-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-[#111] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] sm:gap-4 sm:border-4 sm:p-5";
const actionButtonClassName =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg border-2 border-black px-2 py-2 text-center text-[11px] font-bold uppercase leading-tight text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 disabled:opacity-60 dark:border-white dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] sm:flex-none sm:px-4 sm:text-sm";

export function CookieBanner() {
  const t = useTranslations("cookies");
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [hasSavedChoice, setHasSavedChoice] = useState(false);
  const [view, setView] = useState<BannerView>("prompt");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function readStoredConsent() {
    const consent = getAnalyticsConsent();
    setHasSavedChoice(Boolean(consent));
    setAnalyticsEnabled(consent === "accepted");
    return consent;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!readStoredConsent()) setVisible(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const openPreferences = () => {
      readStoredConsent();
      setView("settings");
      setError("");
      setVisible(true);
    };
    window.addEventListener("puragenda:open-cookie-settings", openPreferences);
    return () => window.removeEventListener("puragenda:open-cookie-settings", openPreferences);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (view === "settings") {
        setView("prompt");
        if (hasSavedChoice) setVisible(false);
        return;
      }
      if (hasSavedChoice) setVisible(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, view, hasSavedChoice]);

  async function persistDecision(decision: "accepted" | "rejected") {
    setSaving(true);
    setError("");
    try {
      if (decision === "rejected") {
        const identifiers = getTrackingIdentifiers();
        setAnalyticsConsent("rejected");
        setHasSavedChoice(true);
        setAnalyticsEnabled(false);
        try {
          await recordAnalyticsConsent("rejected", identifiers);
          setView("prompt");
          setVisible(false);
        } catch {
          setError("El rechazo ya se aplicó en este navegador, pero no pudimos guardar el comprobante. Intenta nuevamente.");
        }
        return;
      }

      await recordAnalyticsConsent("accepted");
      setAnalyticsConsent("accepted");
      setHasSavedChoice(true);
      setAnalyticsEnabled(true);
      setView("prompt");
      setVisible(false);
    } catch {
      setError("No pudimos guardar tu preferencia. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {visible && (
        <div
          role="region"
          aria-labelledby={titleId}
          className={bannerShellClassName}
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className={bannerCardClassName}>
            <div className="flex items-start gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white dark:border-white dark:bg-black sm:flex">
                <Cookie className="h-5 w-5 text-black dark:text-white" />
              </div>
              <div className="min-w-0 space-y-1">
                <p id={titleId} className="text-xs font-bold uppercase text-black dark:text-white sm:text-base">
                  {t("title")}
                </p>
                {view === "prompt" ? (
                  <p className="text-[11px] font-medium leading-snug text-black/80 dark:text-white/80 sm:text-sm sm:leading-normal">
                    {t("description")}{" "}
                    <Link href="/politica-de-privacidad" className="font-bold underline underline-offset-2 hover:text-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]">
                      {t("privacy")}
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-black/15 bg-white/70 px-2.5 py-2 dark:border-white/20 dark:bg-black/40">
                      <p className="min-w-0 text-[11px] font-bold uppercase text-black dark:text-white sm:text-sm">{t("essential")}</p>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-black/60 dark:text-white/60 sm:text-xs">{t("essentialAlways")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-black/15 bg-white/70 px-2.5 py-2 dark:border-white/20 dark:bg-black/40">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase text-black dark:text-white sm:text-sm">{t("analytics")}</p>
                        <p className="text-[10px] font-medium text-black/70 dark:text-white/70 sm:text-xs">{t("analyticsOptional")}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={analyticsEnabled}
                        aria-label={t("analytics")}
                        disabled={saving}
                        onClick={() => setAnalyticsEnabled((current) => !current)}
                        className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 dark:border-white ${analyticsEnabled ? "bg-[#BFFCC6]" : "bg-white dark:bg-black"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-black bg-white transition-transform dark:border-white dark:bg-[#111] ${analyticsEnabled ? "left-5" : "left-0.5"}`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {error ? <p role="alert" className="text-[11px] font-bold text-red-700 sm:text-xs">{error}</p> : null}
            {view === "prompt" ? (
              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:justify-end sm:gap-2">
                <button
                  type="button"
                  onClick={() => void persistDecision("rejected")}
                  disabled={saving}
                  className={`${actionButtonClassName} bg-white dark:bg-black`}
                >
                  {t("reject")}
                </button>
                <button
                  type="button"
                  onClick={() => setView("settings")}
                  disabled={saving}
                  className={`${actionButtonClassName} bg-white dark:bg-black`}
                >
                  {t("configure")}
                </button>
                <button
                  type="button"
                  onClick={() => void persistDecision("accepted")}
                  disabled={saving}
                  className={`${actionButtonClassName} bg-[#BFFCC6] dark:text-black`}
                >
                  {t("accept")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:justify-end sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("prompt");
                    if (hasSavedChoice) setVisible(false);
                  }}
                  disabled={saving}
                  className={`${actionButtonClassName} bg-white dark:bg-black`}
                >
                  {t("back")}
                </button>
                <button
                  type="button"
                  onClick={() => void persistDecision(analyticsEnabled ? "accepted" : "rejected")}
                  disabled={saving}
                  className={`${actionButtonClassName} bg-[#BFFCC6] dark:text-black`}
                >
                  {t("save")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {hasSavedChoice && !visible && (
        <button
          type="button"
          aria-label={t("configure")}
          title={t("configure")}
          onClick={() => window.dispatchEvent(new Event("puragenda:open-cookie-settings"))}
          className="fixed right-4 z-[9997] flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 dark:border-white dark:bg-black dark:text-white dark:shadow-[2px_2px_0_#fff]"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <Cookie className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
