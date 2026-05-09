"use client";

import { useState, useEffect } from "react";

const phrases = [
  "Puragenda.",
  "Marca Blanca.",
  "Automático.",
  "24/7 Online.",
];

export function WordCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <span className="inline-grid">
      {phrases.map((phrase, i) => (
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
