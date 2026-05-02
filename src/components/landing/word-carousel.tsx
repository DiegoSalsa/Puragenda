"use client";

import { useState, useEffect } from "react";

const phrases = [
  "automático.",
  "marca blanca.",
  "24/7 online.",
  "fácil de usar.",
];

export function WordCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    }, 3000); // 3.0s is the sweet spot

    return () => clearInterval(intervalId);
  }, []);

  return (
    <span className="inline-grid">
      {phrases.map((phrase, i) => (
        <span
          key={i}
          className={`col-start-1 row-start-1 whitespace-nowrap bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] bg-clip-text text-transparent transition-all duration-700 ease-in-out pb-2 pr-1 ${
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
