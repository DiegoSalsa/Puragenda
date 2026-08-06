"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useRef, useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════
// ROULETTE SEGMENTS — 9 slices, casino-style
// ═══════════════════════════════════════════

const SEGMENTS = [
  { id: "nada",           name: "Más Suerte",     label: "---",       color: "#4B5563", textColor: "#D1D5DB" }, // Gray
  { id: "una_ficha",      name: "1 Ficha",        label: "+1 Ficha",  color: "#3B82F6", textColor: "#fff" },    // Blue
  { id: "fix_rapido",     name: "Bronce",     label: "10% OFF",   color: "#10B981", textColor: "#fff" },    // Emerald
  { id: "boost_diseno",   name: "Plata",   label: "15% OFF",   color: "#0EA5E9", textColor: "#fff" },    // Sky
  { id: "impacto_visual", name: "Oro", label: "20% OFF",   color: "#8B5CF6", textColor: "#fff" },    // Violet
  { id: "neo_brutalismo", name: "Platino", label: "30% OFF",   color: "#D946EF", textColor: "#fff" },    // Fuchsia
  { id: "modo_dios",      name: "Diamante",      label: "50% OFF",   color: "#F43F5E", textColor: "#fff" },    // Rose
  { id: "jackpot",        name: "Mes Regalo",        label: "1 Mes",     color: "#F59E0B", textColor: "#1a1a2e" }, // Amber
  { id: "santo_grial",    name: "Trimestre",    label: "3 Meses",   color: "#EF4444", textColor: "#fff" },    // Red
];

const NUM_SEGMENTS = SEGMENTS.length;
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS; // 45°

// ═══════════════════════════════════════════
// WEB AUDIO — Sound effects
// ═══════════════════════════════════════════

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

/** Short tick sound — like a casino wheel clicker */
function playTick(pitch = 800) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = pitch;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch { /* silent fail */ }
}

/** Victory fanfare — grand chord + falling coins */
function playVictorySound() {
  try {
    const ctx = getAudioContext();
    
    // Grand C major chord
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.0);
    });

    // Rapid "coin" dings
    for (let i = 0; i < 15; i++) {
        const time = ctx.currentTime + i * 0.08 + 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        // High pitch, slight random variation like coins hitting each other
        osc.frequency.value = 1567.98 + (Math.random() * 200 - 100); 
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
    }
  } catch { /* silent fail */ }
}

/** Sad trombone for "no prize" */
function playLoseSound() {
  try {
    const ctx = getAudioContext();
    const notes = [392, 370, 349, 330]; // G4 descending
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.2 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.5);
    });
  } catch { /* silent fail */ }
}

// ═══════════════════════════════════════════
// CONFETTI — Canvas-based celebration
// ═══════════════════════════════════════════

interface ConfettiParticle {
  x: number; y: number; w: number; h: number;
  color: string; vx: number; vy: number;
  rot: number; rotSpeed: number; opacity: number;
}

function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width = canvas.offsetWidth * 2;
  const H = canvas.height = canvas.offsetHeight * 2;

  const colors = ["#7C3AED", "#A855F7", "#D946EF", "#F59E0B", "#EF4444", "#22C55E", "#3B82F6", "#C084FC"];
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: W / 2 + (Math.random() - 0.5) * 300,
      y: H / 2,
      w: Math.random() * 14 + 4,
      h: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * -22 - 6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 140;

  function animate() {
    if (frame >= maxFrames) { ctx!.clearRect(0, 0, W, H); return; }
    ctx!.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.4;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      p.opacity = Math.max(0, 1 - frame / maxFrames);

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = p.opacity;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx!.restore();
    }

    frame++;
    requestAnimationFrame(animate);
  }
  animate();
}

// ═══════════════════════════════════════════
// TICK SCHEDULER — plays ticks during spin
// ═══════════════════════════════════════════

function startTickScheduler(durationMs: number): () => void {
  let cancelled = false;
  const start = Date.now();

  function schedule() {
    if (cancelled) return;
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / durationMs, 1);

    // Tick interval: starts fast (40ms), slows down to 300ms
    const interval = 40 + progress * progress * 260;
    // Pitch: starts high, drops as it slows
    const pitch = 1200 - progress * 600;

    playTick(pitch);

    if (progress < 0.98) {
      setTimeout(schedule, interval);
    }
  }

  schedule();
  return () => { cancelled = true; };
}

// ═══════════════════════════════════════════
// BACKGROUND MUSIC — Fast arpeggio while spinning
// ═══════════════════════════════════════════

function startSpinMusic(durationMs: number): () => void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const sequence = [440, 523.25, 659.25, 880, 659.25, 523.25];
    const speed = 0.08;
    const startTime = ctx.currentTime + 0.05;
    const endTime = startTime + durationMs / 1000;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Schedule all notes upfront — no rAF loop needed
    let t = startTime;
    let noteIndex = 0;
    while (t < endTime) {
      osc.frequency.setValueAtTime(sequence[noteIndex % sequence.length], t);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + speed - 0.01);
      t += speed;
      noteIndex++;
    }
    osc.start(startTime);
    osc.stop(endTime);
    return () => {
      try {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.1);
      } catch {}
    };
  } catch {
    return () => {};
  }
}

// ═══════════════════════════════════════════
// ROULETTE COMPONENT
// ═══════════════════════════════════════════

interface RouletteMinigameProps {
  onSpin: () => Promise<{
    success: boolean;
    prize?: {
      index: number; name: string; type: string;
      percentage: number | null; freeMonths: number | null; color: string;
    };
    error?: string;
  }>;
  disabled: boolean;
  tokenBalance: number;
}

export function RouletteMinigame({ onSpin, disabled, tokenBalance }: RouletteMinigameProps) {
  const legacy = useTranslations("legacy");
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<{
    name: string; type: string;
    percentage: number | null; freeMonths: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultType, setResultType] = useState<"win" | "lose" | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const totalRotationRef = useRef(0);
  const tickCancelRef = useRef<(() => void) | null>(null);
  const musicCancelRef = useRef<(() => void) | null>(null);

  const SPIN_DURATION = 4500;

  const handleSpin = useCallback(async () => {
    if (isSpinning || isFetching || disabled || tokenBalance < 1) return;

    setIsFetching(true);
    setWonPrize(null);
    setError(null);
    setShowResult(false);
    setResultType(null);

    try {
      getAudioContext();
      const result = await onSpin();

      if (!result.success || !result.prize) {
        setError(result.error || legacy("veFfCKO2PjE4"));
        return;
      }

      // Calculate target rotation.
      // absoluteTarget = the wheel rotation (mod 360) that places prizeIndex under the pointer.
      // We compute delta = how many degrees forward to rotate from the current position
      // to reach absoluteTarget, so that accumulated mod-360 offsets don't stack up.
      const prizeIndex = result.prize.index;
      const segmentCenter = prizeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const randomOffset = (Math.random() - 0.5) * SEGMENT_ANGLE * 0.5;
      const absoluteTarget = ((360 - segmentCenter + randomOffset) % 360 + 360) % 360;
      const currentPos = ((totalRotationRef.current % 360) + 360) % 360;
      const delta = ((absoluteTarget - currentPos) % 360 + 360) % 360;
      const extraSpins = (Math.floor(Math.random() * 3) + 6) * 360;
      const newRotation = totalRotationRef.current + (delta === 0 ? 360 : delta) + extraSpins;
      totalRotationRef.current = newRotation;

      // Start audio
      tickCancelRef.current = startTickScheduler(SPIN_DURATION);
      musicCancelRef.current = startSpinMusic(SPIN_DURATION);

      setIsFetching(false);
      setIsSpinning(true);
      setRotation(newRotation);

      setTimeout(() => {
        if (tickCancelRef.current) tickCancelRef.current();
        if (musicCancelRef.current) musicCancelRef.current();

        const isLoss = result.prize!.type === "NONE";
        setResultType(isLoss ? "lose" : "win");

        if (isLoss) {
          playLoseSound();
        } else {
          playVictorySound();
          if (confettiRef.current) launchConfetti(confettiRef.current);
        }

        setWonPrize({
          name: result.prize!.name,
          type: result.prize!.type,
          percentage: result.prize!.percentage,
          freeMonths: result.prize!.freeMonths,
        });
        setShowResult(true);
        const finalNorm = newRotation % 360;
        totalRotationRef.current = finalNorm;
        setIsSpinning(false);
        setRotation(finalNorm);
      }, SPIN_DURATION);
    } catch {
      setError(legacy("LMn4610GEcXq"));
    } finally {
      setIsFetching(false);
    }
  }, [isSpinning, isFetching, disabled, tokenBalance, onSpin, legacy]);

  // Auto-hide result
  useEffect(() => {
    if (showResult) {
      const timer = setTimeout(() => setShowResult(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { 
        if (tickCancelRef.current) tickCancelRef.current(); 
        if (musicCancelRef.current) musicCancelRef.current();
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Confetti overlay */}
      <canvas
        ref={confettiRef}
        className="pointer-events-none absolute inset-0 z-30"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Pointer arrow */}
      <div className="relative z-20 mb-[-18px]">
        <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
          <path d="M14 24L0 0H28L14 24Z" fill="#fff" stroke="#1a1a2e" strokeWidth="2"/>
        </svg>
      </div>

      {/* Wheel */}
      <div className="relative w-full max-w-[450px] aspect-square">
        {/* Glow ring */}
        <div
          className="absolute -inset-1 rounded-full"
          style={{
            background: isSpinning
              ? "conic-gradient(from 0deg, #7C3AED, #D946EF, #F59E0B, #EF4444, #7C3AED)"
              : "transparent",
            opacity: isSpinning ? 0.6 : 0,
            filter: "blur(6px)",
            transition: "opacity 0.5s",
          }}
        />

        {/* Border ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "4px solid rgba(124, 58, 237, 0.7)",
            boxShadow: "0 0 24px rgba(124, 58, 237, 0.3), inset 0 0 24px rgba(124, 58, 237, 0.08)",
          }}
        />

        {/* Spinning wheel SVG */}
        <div
          className="absolute inset-[4px] rounded-full overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.60, 0.10, 1.00)`
              : "none",
            willChange: "transform",
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {SEGMENTS.map((seg, i) => {
              const startAngleDeg = i * SEGMENT_ANGLE - 90;
              const endAngleDeg = (i + 1) * SEGMENT_ANGLE - 90;
              const startAngle = startAngleDeg * (Math.PI / 180);
              const endAngle = endAngleDeg * (Math.PI / 180);

              // Arc path
              const x1 = 100 + 100 * Math.cos(startAngle);
              const y1 = 100 + 100 * Math.sin(startAngle);
              const x2 = 100 + 100 * Math.cos(endAngle);
              const y2 = 100 + 100 * Math.sin(endAngle);
              const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

              // Text position: along the radial center of the segment
              const midAngleDeg = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
              const midAngleRad = (midAngleDeg - 90) * (Math.PI / 180);

              // Position labels closer to center to fit in the 40° wedge
              const labelR = 52;
              const nameR = 76;
              const labelX = 100 + labelR * Math.cos(midAngleRad);
              const labelY = 100 + labelR * Math.sin(midAngleRad);
              const nameX = 100 + nameR * Math.cos(midAngleRad);
              const nameY = 100 + nameR * Math.sin(midAngleRad);

              // Rotate text to read outward from center
              const textRotation = midAngleDeg;

              return (
                <g key={seg.id}>
                  {/* Segment slice */}
                  <path
                    d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                    fill={seg.color}
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth="0.8"
                  />
                  {/* Segment divider accent */}
                  <line
                    x1={100} y1={100}
                    x2={x1} y2={y1}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.5"
                  />

                  {/* Label (discount %) — closer to center */}
                  <text
                    x={labelX} y={labelY}
                    fill={seg.textColor}
                    fontSize="8.5"
                    fontWeight="900"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${textRotation}, ${labelX}, ${labelY})`}
                    style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "-0.03em" }}
                  >
                    {seg.label}
                  </text>

                  {/* Name — closer to edge */}
                  <text
                    x={nameX} y={nameY}
                    fill={seg.textColor}
                    fontSize="4"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="central"
                    opacity={0.9}
                    transform={`rotate(${textRotation}, ${nameX}, ${nameY})`}
                    style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.01em" }}
                  >
                    {seg.name}
                  </text>
                </g>
              );
            })}

            {/* Center hub */}
            <circle cx="100" cy="100" r="20" fill="#1a1a2e" stroke="#7C3AED" strokeWidth="2.5" />
            <circle cx="100" cy="100" r="15" fill="url(#hubGrad)" />
            <g clipPath="url(#hubClip)">
              <image
                href="/icon-512x512.png"
                x="85"
                y="85"
                width="30"
                height="30"
              />
            </g>

            {/* Gradient definition for hub */}
            <defs>
              <clipPath id="hubClip">
                <circle cx="100" cy="100" r="15" />
              </clipPath>
              <radialGradient id="hubGrad" cx="50%" cy="40%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#7C3AED" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Result display */}
      {showResult && wonPrize && (
        <div
          className={`rounded-2xl border-2 px-6 py-4 text-center transition-all duration-300 ${
            resultType === "win"
              ? "border-[#7C3AED] bg-[#7C3AED]/10 animate-in fade-in zoom-in"
              : "border-border bg-muted/50 animate-in fade-in"
          }`}
        >
          {resultType === "win" ? (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                <LocalizedText id="Joio5p7bKlZI" />
              </p>
              <p className="text-lg font-black text-[#7C3AED]">{wonPrize.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {wonPrize.type === "PERCENTAGE"
                  ? `${wonPrize.percentage}% de descuento`
                  : `${wonPrize.freeMonths} mes${wonPrize.freeMonths! > 1 ? "es" : ""} gratis`}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                <LocalizedText id="QzwZ4TDO9NwK" />
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-muted-foreground">{wonPrize.name}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                <LocalizedText id="eho8mdg21Ty6" />
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning || isFetching || disabled || tokenBalance < 1}
        className="group relative w-full overflow-hidden rounded-xl px-6 py-3 text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: (isSpinning || isFetching)
            ? "linear-gradient(135deg, #4B5563, #374151)"
            : "linear-gradient(135deg, #7C3AED, #D946EF)",
          boxShadow: (isSpinning || isFetching) ? "none" : "0 4px 20px rgba(124, 58, 237, 0.4)",
        }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isSpinning ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
              </svg>
              <LocalizedText id="SL-8HdJDTwKI" />
            </>
          ) : isFetching ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
              </svg>
              <LocalizedText id="eBZObIj2z2vo" />
            </>
          ) : (
            "Girar Ruleta · 1 ficha"
          )}
        </span>
        {!isSpinning && !isFetching && !disabled && tokenBalance >= 1 && (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg, #6D28D9, #C026D3)" }}
          />
        )}
      </button>
    </div>
  );
}
