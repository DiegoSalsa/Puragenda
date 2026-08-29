"use client";

import { useState, useEffect } from "react";
import { Cookie } from "@/components/icons/hover-icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";

export function CookieBanner() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);
  const [hasSavedChoice, setHasSavedChoice] = useState(false);

  useEffect(() => {
    const consent = getAnalyticsConsent();
    setHasSavedChoice(Boolean(consent));
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const openPreferences = () => setVisible(true);
    window.addEventListener("puragenda:open-cookie-settings", openPreferences);
    return () => window.removeEventListener("puragenda:open-cookie-settings", openPreferences);
  }, []);

  function handleAccept() {
    setAnalyticsConsent("accepted");
    setHasSavedChoice(true);
    setVisible(false);
  }

  function handleReject() {
    setAnalyticsConsent("rejected");
    setHasSavedChoice(true);
    setVisible(false);
  }

  return (
    <>
      {visible && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[9998] animate-slide-up sm:left-6 sm:right-auto sm:max-w-md"
        >
          <div className="flex flex-col gap-4 rounded-xl border-4 border-black bg-[#FFF5BA] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-[#111] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white dark:border-white dark:bg-black">
                <Cookie className="h-5 w-5 text-black dark:text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold uppercase text-black dark:text-white">{t("title")}</p>
                <p className="text-sm font-medium text-black/80 dark:text-white/80">
                  {t("description")}
                  <br />
                  <Link href="/politica-de-privacidad" className="font-bold underline underline-offset-2 hover:text-[#7C3AED]">
                    {t("privacy")}
                  </Link>.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-2 sm:justify-end">
              <button
                onClick={handleReject}
                className="flex-1 rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-bold uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none dark:border-white dark:bg-black dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] sm:flex-none"
              >
                {t("reject")}
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 rounded-lg border-2 border-black bg-[#BFFCC6] px-4 py-2 text-sm font-bold uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none sm:flex-none"
              >
                {t("accept")}
              </button>
            </div>
          </div>
        </div>
      )}
      {hasSavedChoice && (
        <button
          type="button"
          aria-label={t("title")}
          title={t("title")}
          onClick={() => window.dispatchEvent(new Event("puragenda:open-cookie-settings"))}
          className="fixed bottom-4 right-4 z-[9997] flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 dark:border-white dark:bg-black dark:text-white dark:shadow-[2px_2px_0_#fff]"
        >
          <Cookie className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
