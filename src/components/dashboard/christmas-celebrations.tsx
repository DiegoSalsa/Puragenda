"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check, Star } from "lucide-react";
import { useDashboardChristmas } from "./christmas-effects";

export function ChristmasWelcomeEnvelope({ dateKey }: { dateKey: string }) {
  const { active, businessId } = useDashboardChristmas();
  const envelope = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!active || !envelope.current) return;
    const key = `puragenda:christmas-welcome:${businessId}`;
    try {
      if (localStorage.getItem(key) === dateKey) return;
      localStorage.setItem(key, dateKey);
    } catch {
      // The envelope can still open when browser storage is disabled.
    }
    envelope.current.dataset.opening = "";
  }, [active, businessId, dateKey]);

  if (!active) return null;
  return (
    <span ref={envelope} className="christmas-welcome-envelope" aria-hidden="true">
      <span className="christmas-envelope-letter"><Star /></span>
      <span className="christmas-envelope-fold" />
      <span className="christmas-envelope-flap" />
      <span className="christmas-envelope-wax" />
    </span>
  );
}

export function ChristmasSeal({ fallback = null }: { fallback?: ReactNode }) {
  if (!useDashboardChristmas().active) return fallback;
  return <span className="christmas-seal" aria-hidden="true"><Check /></span>;
}

export function ChristmasStars() {
  if (!useDashboardChristmas().active) return null;
  return (
    <span className="christmas-stars" aria-hidden="true">
      <Star />
      <Star />
      <Star />
    </span>
  );
}
