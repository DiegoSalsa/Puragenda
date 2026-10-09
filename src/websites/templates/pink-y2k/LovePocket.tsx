"use client";
import { useState } from "react";
import type { PinkConfig } from "./config";
import s from "./pink.module.css";
import m from "./motion.module.css";

export default function LovePocket({
  config,
  reserve,
}: {
  config: PinkConfig["pocket"];
  reserve: () => void;
}) {
  const [page, setPage] = useState(0);
  const [interaction, setInteraction] = useState(0);
  const changeMessage = (direction: number) => {
    setPage((p) => (p + direction + config.messages.length) % config.messages.length);
    setInteraction((count) => count + 1);
  };
  const message = config.messages[page % config.messages.length];
  return (
    <div className={`${s.pocketGroup} ${m.pocketArrival} ${m.loop}`} data-pink-loop="pocket">
      <span className={s.pocketHint}>psst… ¡toca mis botones!</span>
      <div
        className={`${s.pocket} ${m.pocketFloat}`}
        aria-label={`${config.name}, dispositivo interactivo`}
      >
        <svg className={s.pocketShell} viewBox="0 0 280 350" aria-hidden="true">
          <defs>
            <linearGradient id="pink-shell" x1="0" y1="0" x2=".85" y2="1">
              <stop stopColor="#fff8fc" />
              <stop offset=".18" stopColor="#ffbfdf" />
              <stop offset=".48" stopColor="#ff83bd" />
              <stop offset=".8" stopColor="#eb509b" />
              <stop offset="1" stopColor="#a72363" />
            </linearGradient>
            <linearGradient id="pink-gloss" x1="0" x2=".8" y2="1">
              <stop stopColor="white" stopOpacity=".9" />
              <stop offset=".6" stopColor="white" stopOpacity=".04" />
            </linearGradient>
            <linearGradient id="pink-metal">
              <stop stopColor="#9d768b" />
              <stop offset=".25" stopColor="white" />
              <stop offset=".5" stopColor="#bfa8bc" />
              <stop offset=".75" stopColor="white" />
              <stop offset="1" stopColor="#8e7186" />
            </linearGradient>
            <linearGradient id="pink-bezel" x2=".7" y2="1">
              <stop stopColor="#a3316e" />
              <stop offset="1" stopColor="#ffd8ed" />
            </linearGradient>
          </defs>
          <ellipse
            cx="140"
            cy="34"
            rx="20"
            ry="25"
            fill="none"
            stroke="url(#pink-metal)"
            strokeWidth="9"
          />
          <path
            d="M140 37C221 37 263 98 266 180c4 93-40 151-126 151S10 273 14 180C17 98 59 37 140 37Z"
            fill="#9d235d"
          />
          <path
            d="M140 32C219 32 260 92 263 175c4 91-39 149-123 149S13 266 17 175C20 92 61 32 140 32Z"
            fill="url(#pink-shell)"
            stroke="#ffcae3"
            strokeWidth="3"
          />
          <path
            d="M37 130c4-49 43-83 99-86 62-3 93 34 105 67-80-18-152-5-204 19Z"
            fill="url(#pink-gloss)"
          />
          <rect
            x="49"
            y="101"
            width="182"
            height="139"
            rx="20"
            fill="url(#pink-bezel)"
          />
          <rect
            x="55"
            y="108"
            width="170"
            height="125"
            rx="15"
            fill="#fce5ed"
          />
          <path
            d="M28 189c-5 64 36 116 102 122"
            fill="none"
            stroke="#ffbadd"
            strokeWidth="4"
            opacity=".75"
          />
          <circle cx="42" cy="177" r="3" fill="#b44e7f" />
          <circle cx="238" cy="177" r="3" fill="#b44e7f" />
          <path d="m227 68 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="white" />
          <path
            d="M65 74c-8-10-18 0 0 12 18-12 8-22 0-12Z"
            fill="#cf397d"
            opacity=".6"
          />
          <path
            d="M120 305h40"
            stroke="#b2457b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1 6"
          />
        </svg>
        <span className={m.pocketSheen} aria-hidden="true" />
        {interaction > 0 ? <span key={interaction} className={m.pocketLove} aria-hidden="true">♡</span> : null}
        <span className={s.pocketName}>{config.name}</span>
        <div className={s.pocketScreen} aria-live="polite" aria-atomic="true">
          <div className={s.screenBar}>
            <span>♡ 100%</span>
            <span>✦ ✦ ✦</span>
          </div>
          <svg key={`heart-${interaction}`} className={s.pixelHeart} viewBox="0 0 11 9" aria-hidden="true">
            <path
              d="M1 1h1V0h2v1h1v1h1V1h1V0h2v1h1v1h1v3h-1v1H9v1H8v1H7v1H4V8H3V7H2V6H1V5H0V2h1Z"
              fill="currentColor"
            />
            <path d="M2 2h2v1H2Z" fill="#fce9f1" />
          </svg>
          <strong key={`title-${page}`} className={m.screenMessage}>{message.title}</strong>
          <span key={`body-${page}`} className={m.screenMessage}>{message.body}</span>
          <span className={s.screenDots} aria-hidden="true">
            {config.messages.map((_, i) => (
              <i key={i} data-active={i === page % config.messages.length} />
            ))}
          </span>
        </div>
        <div className={s.pocketButtons}>
          <button
            type="button"
            aria-label="Mensaje anterior del Love Pocket"
            onClick={() => changeMessage(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Reservar desde Love Pocket"
            onClick={() => {
              setInteraction((count) => count + 1);
              reserve();
            }}
          >
            ♡
          </button>
          <button
            type="button"
            aria-label="Mensaje siguiente del Love Pocket"
            onClick={() => changeMessage(1)}
          >
            ›
          </button>
        </div>
        <span className={s.pocketButtonNote}>EXPLORA · RESERVA · EXPLORA</span>
      </div>
    </div>
  );
}
