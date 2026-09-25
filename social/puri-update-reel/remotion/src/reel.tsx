import type { CSSProperties, ReactNode } from "react";
import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const C = {
  ink: "#171717",
  cream: "#FFF9EC",
  purple: "#7837EF",
  darkPurple: "#5020AB",
  lavender: "#E9D8FF",
  yellow: "#FFE277",
  pink: "#F78DBE",
  white: "#FFFFFF",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const FONT = "Arial, Helvetica, sans-serif";
const enter = (frame: number, delay = 0, distance = 50) => ({
  opacity: interpolate(frame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  }),
  translate: `0 ${interpolate(frame, [delay, delay + 18], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  })}px`,
});

const sceneFade = (frame: number) =>
  interpolate(frame, [0, 8, 112, 120], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const SmallLogo = ({ inverse = false }: { inverse?: boolean }) => (
  <div
    style={{
      background: C.white,
      border: `4px solid ${C.ink}`,
      borderRadius: 24,
      padding: "10px 18px",
      boxShadow: `8px 8px 0 ${C.ink}`,
      width: 290,
      height: 82,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      filter: inverse ? "brightness(1.02)" : undefined,
    }}
  >
    <Img src={staticFile("puragenda-logo.svg")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  </div>
);

const Pill = ({ children, fill = C.yellow, style }: { children: ReactNode; fill?: string; style?: CSSProperties }) => (
  <div
    style={{
      alignSelf: "flex-start",
      background: fill,
      border: `4px solid ${C.ink}`,
      borderRadius: 999,
      padding: "13px 25px",
      color: C.ink,
      fontSize: 25,
      fontWeight: 900,
      letterSpacing: 2,
      boxShadow: `5px 5px 0 ${C.ink}`,
      ...style,
    }}
  >
    {children}
  </div>
);

const Motif = ({ frame, color = C.purple }: { frame: number; color?: string }) => (
  <>
    <div
      style={{
        position: "absolute",
        width: 560,
        height: 560,
        borderRadius: "50%",
        border: `36px solid ${color}`,
        right: -300,
        top: 155,
        rotate: `${interpolate(frame, [0, 120], [-18, 8])}deg`,
        opacity: 0.7,
      }}
    />
    <div
      style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        border: `24px solid ${C.ink}`,
        opacity: 0.07,
        left: -240,
        bottom: 190,
      }}
    />
  </>
);

const Phone = ({ src, frame, left = 255, top = 550, width = 570, height = width * (844 / 390) }: { src: string; frame: number; left?: number; top?: number; width?: number; height?: number }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      border: `7px solid ${C.ink}`,
      borderRadius: 50,
      overflow: "hidden",
      background: C.cream,
      boxShadow: `20px 22px 0 ${C.ink}`,
      ...enter(frame, 13, 100),
      rotate: `${interpolate(frame, [0, 120], [-4, -1])}deg`,
    }}
  >
    <Img src={staticFile(src)} style={{ display: "block", width: "100%", height: "auto" }} />
  </div>
);

const Header = ({ number, label, frame }: { number: string; label: string; frame: number }) => (
  <div style={{ position: "absolute", top: 130, left: 80, right: 80, display: "flex", alignItems: "center", justifyContent: "space-between", ...enter(frame, 2) }}>
    <Pill>{label}</Pill>
    <div style={{ color: C.ink, fontSize: 33, fontWeight: 900, letterSpacing: 2 }}>{number}</div>
  </div>
);

const Title = ({ children, frame, top = 270, color = C.ink, size = 94 }: { children: ReactNode; frame: number; top?: number; color?: string; size?: number }) => (
  <div
    style={{
      position: "absolute",
      top,
      left: 80,
      right: 80,
      color,
      fontSize: size,
      lineHeight: 0.99,
      letterSpacing: -4.5,
      fontWeight: 950,
      ...enter(frame, 7),
    }}
  >
    {children}
  </div>
);

const TodayScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.cream, fontFamily: FONT, overflow: "hidden", opacity: sceneFade(frame) }}>
      <Motif frame={frame} color={C.pink} />
      <Header number="01 / 03" label="PURI EN HOY" frame={frame} />
      <Title frame={frame}>Tu día,<br /><span style={{ color: C.purple }}>más claro.</span></Title>
      <Phone src="hoy-mobile.jpg" frame={frame} left={260} top={540} width={550} height={1050} />
      <div style={{ position: "absolute", right: 70, top: 1050, width: 325, background: C.yellow, border: `5px solid ${C.ink}`, borderRadius: 30, padding: "26px 22px", boxShadow: `9px 10px 0 ${C.ink}`, ...enter(frame, 35, 40) }}>
        <Img src={staticFile("puri-greeting.svg")} style={{ width: 140, height: 140, float: "right", marginTop: -105, marginRight: -40 }} />
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.08 }}>Puri te<br />saluda aquí.</div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 125, color: C.darkPurple, fontSize: 36, fontWeight: 800, ...enter(frame, 45) }}>Una vista de Hoy hecha para actuar.</div>
    </AbsoluteFill>
  );
};

const AskScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.lavender, fontFamily: FONT, overflow: "hidden", opacity: sceneFade(frame) }}>
      <Motif frame={frame} color={C.purple} />
      <Header number="02 / 03" label="TU ASISTENTE" frame={frame} />
      <Title frame={frame} size={89}>Pregúntale<br />a <span style={{ color: C.purple }}>Puri.</span></Title>
      <Phone src="puri-panel-mobile.jpg" frame={frame} left={75} top={565} width={555} height={1090} />
      <div style={{ position: "absolute", top: 710, right: 58, width: 390, padding: "26px 26px", border: `5px solid ${C.ink}`, borderRadius: 30, background: C.white, boxShadow: `9px 9px 0 ${C.ink}`, fontSize: 36, fontWeight: 800, lineHeight: 1.16, ...enter(frame, 30, 25) }}>¿Qué tengo<br />hoy?</div>
      <div style={{ position: "absolute", top: 1010, right: 42, width: 400, padding: "26px 26px", border: `5px solid ${C.ink}`, borderRadius: 30, background: C.yellow, boxShadow: `9px 9px 0 ${C.ink}`, fontSize: 35, fontWeight: 800, lineHeight: 1.16, ...enter(frame, 44, 25) }}>¿Qué horarios<br />siguen libres?</div>
      <div style={{ position: "absolute", bottom: 116, right: 75, color: C.darkPurple, fontSize: 37, fontWeight: 900, ...enter(frame, 55) }}>Citas · cobros · espacios</div>
    </AbsoluteFill>
  );
};

const Stat = ({ number, label, fill, frame, delay, left, top }: { number: string; label: string; fill: string; frame: number; delay: number; left: number; top: number }) => (
  <div style={{ position: "absolute", left, top, width: 390, height: 255, border: `5px solid ${C.ink}`, borderRadius: 32, background: fill, boxShadow: `11px 12px 0 ${C.ink}`, padding: "30px 34px", ...enter(frame, delay, 40) }}>
    <div style={{ fontSize: 112, lineHeight: 1, fontWeight: 950, letterSpacing: -6 }}>{number}</div>
    <div style={{ fontSize: 27, lineHeight: 1.13, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
  </div>
);

const ContextScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.yellow, fontFamily: FONT, overflow: "hidden", opacity: sceneFade(frame) }}>
      <Motif frame={frame} color={C.pink} />
      <Header number="03 / 03" label="CON CONTEXTO" frame={frame} />
      <Title frame={frame} size={82}>Respuestas<br />que entienden<br /><span style={{ color: C.purple }}>tu negocio.</span></Title>
      <div style={{ position: "absolute", left: 80, top: 700, width: 920, height: 585, background: C.white, border: `6px solid ${C.ink}`, borderRadius: 32, overflow: "hidden", boxShadow: `14px 15px 0 ${C.ink}`, ...enter(frame, 18, 75) }}>
        <Img src={staticFile("puri-panel-data.jpg")} style={{ position: "absolute", right: 0, top: 0, width: "115%", height: "115%", objectFit: "cover", objectPosition: "right top" }} />
      </div>
      <Stat number="15" label="cupos disponibles" fill={C.lavender} frame={frame} delay={36} left={85} top={1370} />
      <Stat number="3" label="horarios destacados" fill={C.white} frame={frame} delay={47} left={570} top={1370} />
      <div style={{ position: "absolute", left: 85, bottom: 105, right: 80, color: C.darkPurple, fontSize: 34, fontWeight: 800, ...enter(frame, 57) }}>Datos de tu agenda, en palabras simples.</div>
    </AbsoluteFill>
  );
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.purple, fontFamily: FONT, color: C.white, overflow: "hidden", opacity: interpolate(frame, [0, 9], [0, 1], { extrapolateRight: "clamp" }) }}>
      <div style={{ position: "absolute", width: 850, height: 850, left: 115, top: 340, borderRadius: "50%", background: C.lavender, border: `18px solid ${C.ink}`, scale: interpolate(frame, [0, 28], [0.4, 1], { extrapolateRight: "clamp", easing: ease }) }} />
      <div style={{ position: "absolute", top: 125, left: 80, ...enter(frame, 5) }}><SmallLogo /></div>
      <Img src={staticFile("puri-success.svg")} style={{ position: "absolute", left: 210, top: 465, width: 660, height: 660, ...enter(frame, 13, 110), rotate: `${interpolate(frame, [0, 110], [-8, 4])}deg` }} />
      <div style={{ position: "absolute", left: 85, right: 85, top: 1230, textAlign: "center", fontSize: 115, fontWeight: 950, lineHeight: 0.99, letterSpacing: -5, ...enter(frame, 24) }}>Puri llegó<br />a Puragenda.</div>
      <div style={{ position: "absolute", left: 125, right: 125, top: 1530, textAlign: "center", fontSize: 43, lineHeight: 1.2, fontWeight: 700, ...enter(frame, 37) }}>Abre Hoy. Pregúntale a Puri.<br />Organiza mejor tu día.</div>
      <div style={{ position: "absolute", left: 235, right: 235, bottom: 118, height: 86, display: "grid", placeItems: "center", color: C.ink, background: C.yellow, border: `5px solid ${C.ink}`, borderRadius: 22, boxShadow: `8px 8px 0 ${C.ink}`, fontSize: 31, fontWeight: 900, ...enter(frame, 50) }}>YA DISPONIBLE</div>
    </AbsoluteFill>
  );
};

const Progress = () => {
  const frame = useCurrentFrame();
  return <div style={{ position: "absolute", bottom: 0, left: 0, height: 12, width: `${(frame / 599) * 100}%`, background: C.ink, zIndex: 20 }} />;
};

export const PuriUpdateReel = () => (
  <AbsoluteFill style={{ background: C.cream }}>
    <Sequence from={0} durationInFrames={120} name="HyperFrames · Presentación de Puri">
      <Video src={staticFile("intro.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
    </Sequence>
    <Sequence from={120} durationInFrames={120} name="Hoy con Puri"><TodayScene /></Sequence>
    <Sequence from={240} durationInFrames={120} name="Pregúntale a Puri"><AskScene /></Sequence>
    <Sequence from={360} durationInFrames={120} name="Respuestas con contexto"><ContextScene /></Sequence>
    <Sequence from={480} durationInFrames={120} name="Cierre"><OutroScene /></Sequence>
    <Audio src={staticFile("puri-theme.wav")} volume={0.7} />
    <Progress />
  </AbsoluteFill>
);
