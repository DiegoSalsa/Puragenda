"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import Link from "next/link";

const CONSENT_KEY = "puragenda_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function handleReject() {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[9998] animate-slide-up sm:left-6 sm:right-auto sm:max-w-md"
    >
      <div className="flex flex-col gap-4 rounded-xl border-4 border-black bg-[#FFF5BA] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-[#111] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white dark:border-white dark:bg-black">
            <Cookie className="h-5 w-5 text-black dark:text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold uppercase text-black dark:text-white">Usamos cookies</p>
            <p className="text-sm font-medium text-black/80 dark:text-white/80">
              Utilizamos cookies esenciales y analíticas para mejorar tu experiencia.
              <br />
              <Link href="/politica-de-privacidad" className="font-bold underline underline-offset-2 hover:text-[#7C3AED]">
                Política de Privacidad
              </Link>.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-2 sm:justify-end">
          <button
            onClick={handleReject}
            className="flex-1 rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-bold uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none dark:border-white dark:bg-black dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] sm:flex-none"
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 rounded-lg border-2 border-black bg-[#BFFCC6] px-4 py-2 text-sm font-bold uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none sm:flex-none"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
