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
}

export function WordCarousel({ words = defaultPhrases }: WordCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [words.length]);

  return (
    <span className="inline-grid">
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
