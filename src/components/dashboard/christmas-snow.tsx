"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";

const flakes = [
  [3, 0, 6, 17], [10, 140, 4, -15], [17, 55, 9, 26], [24, 280, 5, -18],
  [31, 155, 4, 14], [38, 0, 7, -22], [45, 310, 4, 15], [52, 70, 9, 19],
  [59, 210, 5, -23], [66, 110, 5, 19], [73, 0, 8, -16], [80, 230, 4, 23],
  [87, 45, 6, 14], [94, 175, 8, -20],
];

export function ChristmasSnow() {
  const pathname = usePathname();

  return (
    <div key={pathname} className="dashboard-christmas-snow" aria-hidden="true">
      {flakes.map(([left, delay, size, drift]) => (
        <span key={left} style={{
          left: `${left}%`,
          width: size,
          height: size,
          animationDelay: `${delay}ms`,
          "--flake-drift": `${drift}px`,
        } as CSSProperties} />
      ))}
    </div>
  );
}
