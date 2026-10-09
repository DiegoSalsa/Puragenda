"use client";

import { useEffect, type CSSProperties, type RefObject } from "react";
import type { PinkConfig } from "./config";
import m from "./motion.module.css";

// Text stays in normal document flow. Only the visual copy is split; the
// containing heading supplies its complete accessible name.
export function JellyLetters({ text, line }: { text: string; line: number }) {
  let index = 0;
  return (
    <span className={m.letterLine} aria-hidden="true">
      {text.split(/(\s+)/).map((word, wordIndex) =>
        /^\s+$/.test(word) ? word : (
          <span className={m.word} key={wordIndex}>
            {Array.from(word).map((letter, letterIndex) => (
              <span
                data-pink-glyph=""
                key={letterIndex}
                style={{
                  "--pink-delay": `${Math.min(index++, 24) * 25 + line * 130}ms`,
                } as CSSProperties}
              >
                {letter}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}

export function MotionWords({ text }: { text: string }) {
  return (
    <span aria-hidden="true">
      {text.split(/(\s+)/).map((word, index) =>
        /^\s+$/.test(word) ? word : (
          <span
            className={m.word}
            data-pink-word=""
            key={index}
            style={{ "--pink-delay": `${Math.min(index / 2, 6) * 65}ms` } as CSSProperties}
          >
            {word}
          </span>
        ),
      )}
    </span>
  );
}

export function usePinkMotion(
  root: RefObject<HTMLDivElement | null>,
  config: PinkConfig,
  filter: string,
) {
  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const reveals = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.pinkSeen = "true";
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    element.querySelectorAll<HTMLElement>("[data-pink-reveal]").forEach((item) => {
      if (!item.dataset.pinkSeen) reveals.observe(item);
    });

    const visible = new Map<HTMLElement, boolean>();
    const updateLoop = (item: HTMLElement, inView: boolean) => {
      visible.set(item, inView);
      item.dataset.pinkRunning = String(inView && !document.hidden);
    };
    const loops = new IntersectionObserver((entries) => {
      for (const entry of entries)
        updateLoop(entry.target as HTMLElement, entry.isIntersecting);
    });
    element.querySelectorAll<HTMLElement>("[data-pink-loop]").forEach((item) => loops.observe(item));
    const onVisibility = () => {
      for (const [item, inView] of visible) updateLoop(item, inView);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      reveals.disconnect();
      loops.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [root, config, filter]);
}
