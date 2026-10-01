import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const FPS = 30;
const INTRO_DURATION = 105;
const GIFT_CARDS_DURATION = 120;
const LOYALTY_DURATION = 120;
const OUTRO_DURATION = 105;
const TOTAL_DURATION = INTRO_DURATION + GIFT_CARDS_DURATION + LOYALTY_DURATION + OUTRO_DURATION;

const palette = {
  ink: "#111111",
  cream: "#FFF9ED",
  purple: "#7C3AED",
  lavender: "#DCCBFF",
  pink: "#FFB5E8",
  yellow: "#FFF1A8",
  green: "#BFFCC6",
  white: "#FFFFFF",
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

const GiftIcon = ({ size = 54 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M9 27h46v29H9zM6 18h52v12H6z" fill="currentColor" stroke="#111" strokeWidth="4" />
    <path d="M32 18v38M20 8c7 0 12 10 12 10S13 18 13 11c0-2 2-3 7-3ZM44 8c-7 0-12 10-12 10s19 0 19-7c0-2-2-3-7-3Z" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
    <circle cx="17" cy="17" r="15" fill={palette.green} stroke={palette.ink} strokeWidth="3" />
    <path d="m10 17 5 5 10-11" stroke={palette.ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Sparkle = ({ size = 38 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 2c1 13 9 21 22 22-13 1-21 9-22 22-1-13-9-21-22-22C15 23 23 15 24 2Z" fill="currentColor" stroke={palette.ink} strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
);

const Logo = ({ inverse = false }: { inverse?: boolean }) => (
  <div style={{ width: 410, height: 132, borderRadius: 24, background: inverse ? palette.white : "transparent", padding: inverse ? "8px 16px" : 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Img src={staticFile("puragenda-reels-logo.svg")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  </div>
);

const Grain = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: -120,
          opacity: 0.16,
          backgroundImage: "radial-gradient(#111 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          translate: `${interpolate(frame % 60, [0, 59], [-10, 10])}px ${interpolate(frame % 60, [0, 59], [6, -6])}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 510,
          height: 510,
          borderRadius: "50%",
          border: `4px solid ${palette.ink}`,
          background: palette.pink,
          top: -270,
          right: -170,
          rotate: `${interpolate(frame, [0, 450], [-6, 14], { extrapolateRight: "clamp" })}deg`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: 80,
          border: `4px solid ${palette.ink}`,
          background: palette.yellow,
          bottom: -210,
          left: -180,
          rotate: `${interpolate(frame, [0, 450], [12, -10], { extrapolateRight: "clamp" })}deg`,
        }}
      />
    </AbsoluteFill>
  );
};

const Scene = ({ children, duration, background = palette.cream }: { children: ReactNode; duration: number; background?: string }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background,
        color: palette.ink,
        fontFamily: "Arial, Helvetica, sans-serif",
        opacity: interpolate(frame, [0, 10, duration - 10, duration - 1], [0, 1, 1, 0], {
          easing: frame < duration / 2 ? easeOut : easeIn,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <Grain />
      <div style={{ position: "relative", height: "100%", padding: "116px 84px 148px", display: "flex", flexDirection: "column" }}>{children}</div>
    </AbsoluteFill>
  );
};

const Eyebrow = ({ children, color = palette.yellow }: { children: ReactNode; color?: string }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        alignSelf: "flex-start",
        border: `4px solid ${palette.ink}`,
        borderRadius: 999,
        background: color,
        padding: "14px 24px",
        boxShadow: `7px 7px 0 ${palette.ink}`,
        fontSize: 28,
        fontWeight: 900,
        letterSpacing: 2.5,
        textTransform: "uppercase",
        opacity: interpolate(frame, [0, 15], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }),
        translate: `0 ${interpolate(frame, [0, 15], [24, 0], { easing: easeOut, extrapolateRight: "clamp" })}px`,
      }}
    >
      {children}
    </div>
  );
};

const Intro = () => {
  const frame = useCurrentFrame();
  return (
    <Scene duration={INTRO_DURATION}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo />
        <div style={{ color: palette.purple, rotate: `${interpolate(frame, [0, 60], [-12, 8], { extrapolateRight: "clamp" })}deg` }}><Sparkle size={58} /></div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 38 }}>
        <Eyebrow>Nueva actualización</Eyebrow>
        <h1
          style={{
            margin: 0,
            maxWidth: 930,
            fontSize: 112,
            lineHeight: 0.92,
            letterSpacing: -6,
            fontWeight: 950,
            opacity: interpolate(frame, [10, 31], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }),
            translate: `${interpolate(frame, [10, 31], [-52, 0], { easing: easeOut, extrapolateRight: "clamp" })}px 0`,
          }}
        >
          Más formas de <span style={{ color: palette.purple }}>crecer.</span>
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: 820,
            fontSize: 45,
            lineHeight: 1.12,
            fontWeight: 800,
            opacity: interpolate(frame, [26, 44], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }),
            translate: `0 ${interpolate(frame, [26, 44], [28, 0], { easing: easeOut, extrapolateRight: "clamp" })}px`,
          }}
        >
          Regala experiencias. Premia la fidelidad. Haz que vuelvan.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30, fontWeight: 900 }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: palette.purple, border: `3px solid ${palette.ink}` }} />
        PURAGENDA 2.0
      </div>
    </Scene>
  );
};

const GiftCardMockup = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 860,
        height: 520,
        border: `6px solid ${palette.ink}`,
        borderRadius: 48,
        background: palette.lavender,
        boxShadow: `18px 18px 0 ${palette.ink}`,
        padding: 54,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        position: "relative",
        rotate: `${interpolate(frame, [0, 28], [-6, -2], { easing: easeOut, extrapolateRight: "clamp" })}deg`,
        scale: interpolate(frame, [0, 28], [0.78, 1], { easing: Easing.bezier(0.34, 1.35, 0.64, 1), extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      <div style={{ position: "absolute", width: 330, height: 330, borderRadius: "50%", background: palette.pink, border: `5px solid ${palette.ink}`, right: -100, bottom: -120 }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 82, height: 82, borderRadius: 22, border: `4px solid ${palette.ink}`, background: palette.white, display: "grid", placeItems: "center", color: palette.purple }}><GiftIcon size={48} /></div>
          <div><div style={{ fontSize: 23, fontWeight: 950, letterSpacing: 3 }}>ESTÉTICA BELLA</div><div style={{ fontSize: 20, fontWeight: 700, opacity: 0.6, marginTop: 6 }}>Gift Card digital</div></div>
        </div>
        <div style={{ color: palette.purple }}><Sparkle /></div>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 56, fontWeight: 950, letterSpacing: -2 }}>Un regalo para ti</div>
        <div style={{ fontSize: 86, fontWeight: 950, letterSpacing: -5, marginTop: 16 }}>$50.000</div>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 21, fontWeight: 900, letterSpacing: 2 }}>
        <span>GC · PURA · 2026</span><span style={{ border: `3px solid ${palette.ink}`, borderRadius: 999, padding: "10px 18px", background: palette.white }}>GIFT CARD</span>
      </div>
    </div>
  );
};

const FeatureLine = ({ children, delay }: { children: ReactNode; delay: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontSize: 31,
        fontWeight: 900,
        opacity: interpolate(frame, [delay, delay + 15], [0, 1], { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: `${interpolate(frame, [delay, delay + 15], [-28, 0], { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px 0`,
      }}
    ><CheckIcon />{children}</div>
  );
};

const GiftCards = () => {
  const frame = useCurrentFrame();
  return (
    <Scene duration={GIFT_CARDS_DURATION} background="#F8F0FF">
      <Eyebrow color={palette.pink}>Nuevo · Gift Cards</Eyebrow>
      <h2 style={{ margin: "36px 0 0", fontSize: 88, lineHeight: 0.95, letterSpacing: -4, fontWeight: 950, opacity: interpolate(frame, [8, 27], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }) }}>Convierte tus servicios<br />en el regalo perfecto.</h2>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 62 }}>
        <GiftCardMockup />
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 24 }}>
          <FeatureLine delay={38}>Por monto o servicios</FeatureLine>
          <FeatureLine delay={50}>Compra online o venta manual</FeatureLine>
        </div>
      </div>
    </Scene>
  );
};

const Stamp = ({ index, filled }: { index: number; filled: boolean }) => {
  const frame = useCurrentFrame();
  const delay = 18 + index * 5;
  return (
    <div
      style={{
        width: 106,
        height: 106,
        borderRadius: "50%",
        border: `5px solid ${palette.ink}`,
        background: filled ? palette.purple : palette.white,
        color: filled ? palette.white : palette.ink,
        display: "grid",
        placeItems: "center",
        fontSize: 36,
        fontWeight: 950,
        scale: interpolate(frame, [delay, delay + 10], [0.4, 1], { easing: Easing.bezier(0.34, 1.5, 0.64, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        opacity: interpolate(frame, [delay, delay + 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      {filled ? "✓" : index + 1}
    </div>
  );
};

const Loyalty = () => {
  const frame = useCurrentFrame();
  return (
    <Scene duration={LOYALTY_DURATION} background="#F2FFF3">
      <Eyebrow color={palette.green}>Fidelización V2</Eyebrow>
      <h2 style={{ margin: "36px 0 0", fontSize: 94, lineHeight: 0.93, letterSpacing: -5, fontWeight: 950, opacity: interpolate(frame, [7, 25], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }) }}>Cada visita cuenta.<br /><span style={{ color: palette.purple }}>Cada cliente vuelve.</span></h2>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 890,
            border: `6px solid ${palette.ink}`,
            borderRadius: 44,
            background: palette.yellow,
            boxShadow: `18px 18px 0 ${palette.ink}`,
            padding: 54,
            opacity: interpolate(frame, [0, 16], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }),
            translate: `0 ${interpolate(frame, [0, 24], [90, 0], { easing: easeOut, extrapolateRight: "clamp" })}px`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 26, fontWeight: 950, letterSpacing: 2 }}>TU TARJETA DE FIDELIDAD</div><div style={{ fontSize: 22, marginTop: 8, fontWeight: 750 }}>7 de 10 visitas</div></div><div style={{ color: palette.purple }}><Sparkle size={52} /></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 28, marginTop: 44 }}>{Array.from({ length: 10 }, (_, index) => <Stamp key={index} index={index} filled={index < 7} />)}</div>
          <div style={{ marginTop: 42, border: `4px solid ${palette.ink}`, borderRadius: 24, background: palette.white, padding: "24px 28px", display: "flex", alignItems: "center", gap: 20 }}><GiftIcon size={44} /><div><div style={{ fontSize: 20, fontWeight: 900, opacity: 0.55 }}>TU PREMIO</div><div style={{ fontSize: 31, fontWeight: 950, marginTop: 4 }}>Un servicio gratis</div></div></div>
        </div>
      </div>
      <p style={{ margin: 0, textAlign: "center", fontSize: 37, fontWeight: 900, opacity: interpolate(frame, [72, 90], [0, 1], { easing: easeOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>Timbres automáticos. Premios configurables.</p>
    </Scene>
  );
};

const Confetti = () => {
  const frame = useCurrentFrame();
  const pieces = Array.from({ length: 22 }, (_, index) => ({
    left: 5 + ((index * 43) % 90),
    color: [palette.pink, palette.green, palette.yellow, palette.lavender][index % 4],
    rotation: (index * 31) % 180,
    delay: index % 8,
  }));
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {pieces.map((piece, index) => <div key={index} style={{ position: "absolute", left: `${piece.left}%`, top: -50, width: index % 2 ? 24 : 38, height: index % 2 ? 54 : 30, border: `3px solid ${palette.ink}`, background: piece.color, borderRadius: 7, translate: `0 ${interpolate(frame, [piece.delay, 90 + piece.delay], [-80, 2020], { easing: Easing.bezier(0.3, 0, 0.8, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px`, rotate: `${piece.rotation + interpolate(frame, [0, 100], [0, 480], { extrapolateRight: "clamp" })}deg`, opacity: interpolate(frame, [0, 8, 86, 100], [0, 1, 1, 0], { extrapolateRight: "clamp" }) }} />)}
    </AbsoluteFill>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  return (
    <Scene duration={OUTRO_DURATION} background={palette.purple}>
      <Confetti />
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}><Logo inverse /></div>
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: palette.white }}>
        <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: 4, textTransform: "uppercase", opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }) }}>Ya disponible</div>
        <h2 style={{ margin: "28px 0 0", fontSize: 124, lineHeight: 0.9, letterSpacing: -7, fontWeight: 950, textShadow: `7px 7px 0 ${palette.ink}`, opacity: interpolate(frame, [8, 28], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }), scale: interpolate(frame, [8, 28], [0.8, 1], { easing: Easing.bezier(0.34, 1.45, 0.64, 1), extrapolateRight: "clamp" }) }}>En tu panel.<br />Desde hoy.</h2>
        <div style={{ marginTop: 70, border: `5px solid ${palette.ink}`, borderRadius: 999, background: palette.yellow, color: palette.ink, boxShadow: `10px 10px 0 ${palette.ink}`, padding: "24px 46px", fontSize: 36, fontWeight: 950, opacity: interpolate(frame, [34, 52], [0, 1], { easing: easeOut, extrapolateRight: "clamp" }), translate: `0 ${interpolate(frame, [34, 52], [30, 0], { easing: easeOut, extrapolateRight: "clamp" })}px` }}>Descubre la actualización →</div>
      </div>
      <div style={{ position: "relative", color: palette.white, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 29, fontWeight: 900 }}><span>puragenda.cl</span><span>Gift Cards · Fidelización V2</span></div>
    </Scene>
  );
};

export const PuragendaUpdateStory = () => (
  <AbsoluteFill style={{ background: palette.cream }}>
    <Sequence durationInFrames={INTRO_DURATION} premountFor={15}><Intro /></Sequence>
    <Sequence from={INTRO_DURATION} durationInFrames={GIFT_CARDS_DURATION} premountFor={15}><GiftCards /></Sequence>
    <Sequence from={INTRO_DURATION + GIFT_CARDS_DURATION} durationInFrames={LOYALTY_DURATION} premountFor={15}><Loyalty /></Sequence>
    <Sequence from={INTRO_DURATION + GIFT_CARDS_DURATION + LOYALTY_DURATION} durationInFrames={OUTRO_DURATION} premountFor={15}><Outro /></Sequence>
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition
    id="PuragendaUpdateInstagramStory"
    component={PuragendaUpdateStory}
    durationInFrames={TOTAL_DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
