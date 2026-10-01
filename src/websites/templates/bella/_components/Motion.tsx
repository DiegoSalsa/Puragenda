"use client";
import { useEffect } from "react";
export default function Motion() {
  useEffect(() => {
    const root = document.getElementById("studio-root");
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || preference.matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        (entry.target as HTMLElement).dataset.revealed = "true";
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    root.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    const stop = () => { if (preference.matches) observer.disconnect(); };
    preference.addEventListener("change", stop);
    return () => { observer.disconnect(); preference.removeEventListener("change", stop); };
  }, []);
  return null;
}
