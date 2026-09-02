"use client";

import { useState, useEffect } from "react";

const defaultPhrases = [
  "Puragenda.",
  "Marca Blanca.",
  "Automático.",
  "24/7 Online.",
];

interface WordCarouselProps {
  words?: string[];
  className?: string;
}

export function WordCarousel({ words = defaultPhrases, className = "" }: WordCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const startTimer = setTimeout(() => {
      intervalId = setInterval(() => {
        setIndex((prevIndex) => (prevIndex + 1) % words.length);
      }, 3000);
    }, 8000);

    return () => {
      clearTimeout(startTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [words.length]);

  return (
    <span className={`inline-grid ${className}`}>
      {words.map((phrase, i) => (
        <span
          key={i}
          className={`col-start-1 row-start-1 whitespace-nowrap transition-all duration-700 ease-in-out ${
            i === index
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          aria-hidden={i !== index}
        >
          {phrase}
        </span>
      ))}
    </span>
  );
}
