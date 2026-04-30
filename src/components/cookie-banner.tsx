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
      className="fixed bottom-0 left-0 right-0 z-[9998] animate-slide-up"
      style={{ backgroundColor: "var(--background, #0A0A0A)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Cookie className="h-4 w-4 text-[#7C3AED]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Usamos cookies</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Utilizamos cookies esenciales para el funcionamiento del sitio y cookies analíticas para mejorar tu experiencia.
              Puedes leer más en nuestra{" "}
              <Link href="/politica-de-privacidad" className="text-[#7C3AED] underline underline-offset-2 hover:text-[#5B21B6]">
                Política de Privacidad
              </Link>.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleReject}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            className="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
