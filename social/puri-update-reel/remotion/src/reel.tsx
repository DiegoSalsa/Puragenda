import type { CSSProperties, ReactNode } from "react";
import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";

const C = { ink: "#171717", cream: "#FFF9EC", purple: "#7837EF", darkPurple: "#5020AB", lavender: "#E9D8FF", yellow: "#FFE277", pink: "#F78DBE", white: "#FFFFFF", soft: "#F7F1FF" };
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const FONT = "Arial, Helvetica, sans-serif";

const enter = (frame: number, delay = 0, distance = 42) => ({
  opacity: interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
  translate: `0 ${interpolate(frame, [delay, delay + 16], [distance, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })}px`,
});
const sceneOpacity = (frame: number, duration: number) => interpolate(frame, [0, 7, duration - 8, duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const BrandLogo = ({ dark = false }: { dark?: boolean }) => <Img src={staticFile("puragenda-logo.svg")} style={{ width: 310, height: 94, objectFit: "contain", filter: dark ? "brightness(0) invert(1)" : undefined }} />;

const Tag = ({ children, fill = C.yellow, style }: { children: ReactNode; fill?: string; style?: CSSProperties }) => (
  <div style={{ alignSelf: "flex-start", background: fill, border: `4px solid ${C.ink}`, borderRadius: 999, padding: "12px 22px 11px", color: C.ink, fontSize: 24, fontWeight: 900, letterSpacing: 1.8, ...style }}>{children}</div>
);

const BackgroundShape = ({ color, frame }: { color: string; frame: number }) => <div style={{ position: "absolute", width: 900, height: 900, right: -520, top: -220, borderRadius: "50%", background: color, border: `7px solid ${C.ink}`, opacity: 0.88, rotate: `${interpolate(frame, [0, 120], [-5, 4])}deg` }} />;

const Title = ({ children, frame, top = 245, size = 88, color = C.ink }: { children: ReactNode; frame: number; top?: number; size?: number; color?: string }) => <div style={{ position: "absolute", top, left: 80, right: 80, color, fontSize: size, lineHeight: 1.01, letterSpacing: -3.7, fontWeight: 950, ...enter(frame, 5) }}>{children}</div>;

const Puri = ({ variant, frame, style }: { variant: "greeting" | "thinking" | "success"; frame: number; style?: CSSProperties }) => <Img src={staticFile(`puri-${variant}.svg`)} style={{ objectFit: "contain", transformOrigin: "center bottom", scale: interpolate(frame % 48, [0, 24, 47], [1, 1.035, 1], { extrapolateRight: "clamp" }), ...style }} />;

const ProductCrop = ({ src, frame, width, height, top = 630, left = 80, objectPosition = "center top", zoom = 1 }: { src: string; frame: number; width: number; height: number; top?: number; left?: number; objectPosition?: string; zoom?: number }) => (
  <div style={{ position: "absolute", top, left, width, height, overflow: "hidden", border: `6px solid ${C.ink}`, borderRadius: 34, background: C.white, boxShadow: `11px 12px 0 ${C.ink}`, ...enter(frame, 14, 65) }}>
    <Img src={staticFile(src)} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, objectFit: "cover", objectPosition, transform: zoom > 1 ? `translateX(${(1 - zoom) * 30}%)` : undefined }} />
  </div>
);

const DataChip = ({ value, label, fill, frame, delay, style }: { value: string; label: string; fill: string; frame: number; delay: number; style?: CSSProperties }) => <div style={{ background: fill, border: `4px solid ${C.ink}`, borderRadius: 24, padding: "18px 20px 16px", boxShadow: `7px 8px 0 ${C.ink}`, ...enter(frame, delay, 26), ...style }}><div style={{ fontSize: 42, lineHeight: 1, fontWeight: 950, letterSpacing: -1.5 }}>{value}</div><div style={{ marginTop: 8, fontSize: 20, lineHeight: 1.05, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div></div>;

const TodayScene = () => {
  const frame = useCurrentFrame();
  const duration = 120;
  return <AbsoluteFill style={{ background: C.cream, fontFamily: FONT, overflow: "hidden", opacity: sceneOpacity(frame, duration) }}>
    <BackgroundShape color={C.pink} frame={frame} />
    <div style={{ position: "absolute", top: 115, left: 80, ...enter(frame, 1) }}><Tag>PURI EN HOY</Tag></div>
    <Title frame={frame} size={76} top={235}>Empieza tu día<br /><span style={{ color: C.purple }}>sabiendo qué importa.</span></Title>
    <ProductCrop src="today-desktop.jpg" frame={frame} width={920} height={620} top={575} left={80} objectPosition="right top" zoom={1.2} />
    <div style={{ position: "absolute", top: 1115, left: 110, right: 110, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
      <DataChip value="12:00" label="próxima cita" fill={C.white} frame={frame} delay={38} />
      <DataChip value="$30.000" label="pendiente" fill={C.lavender} frame={frame} delay={46} />
      <DataChip value="2" label="espacios libres" fill={C.yellow} frame={frame} delay={54} />
    </div>
    <Puri variant="greeting" frame={frame} style={{ position: "absolute", width: 210, height: 210, right: 82, bottom: 112, ...enter(frame, 65, 32) }} />
    <div style={{ position: "absolute", bottom: 105, left: 80, color: C.darkPurple, fontSize: 30, fontWeight: 800, ...enter(frame, 62) }}>Puri te ayuda a ver lo importante.</div>
  </AbsoluteFill>;
};

const AskScene = () => {
  const frame = useCurrentFrame();
  const duration = 120;
  const responseOpacity = interpolate(frame, [66, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.lavender, fontFamily: FONT, overflow: "hidden", opacity: sceneOpacity(frame, duration) }}>
    <BackgroundShape color={C.purple} frame={frame} />
    <div style={{ position: "absolute", top: 115, left: 80, ...enter(frame, 1) }}><Tag>HABLA CON PURI</Tag></div>
    <Title frame={frame} size={94} top={240}>Pregúntale<br /><span style={{ color: C.purple }}>a Puri.</span></Title>
    <ProductCrop src="puri-panel-mobile.jpg" frame={frame} width={630} height={800} top={570} left={70} objectPosition="center top" zoom={1.15} />
    <Puri variant="thinking" frame={frame} style={{ position: "absolute", width: 245, height: 245, right: 85, top: 630, ...enter(frame, 30, 30) }} />
    <div style={{ position: "absolute", top: 895, right: 60, width: 360, padding: "22px 23px", background: C.white, border: `5px solid ${C.ink}`, borderRadius: 26, boxShadow: `8px 9px 0 ${C.ink}`, fontSize: 35, lineHeight: 1.06, fontWeight: 900, ...enter(frame, 35, 25) }}>¿Qué horarios<br />siguen libres?</div>
    <div style={{ position: "absolute", top: 1235, right: 60, width: 360, minHeight: 145, padding: "20px 23px", background: C.yellow, border: `5px solid ${C.ink}`, borderRadius: 26, boxShadow: `8px 9px 0 ${C.ink}`, fontSize: 29, lineHeight: 1.08, fontWeight: 900, opacity: responseOpacity, translate: `0 ${interpolate(frame, [62, 78], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })}px` }}>Estoy revisando<br />tu agenda…</div>
    <div style={{ position: "absolute", bottom: 110, left: 80, color: C.darkPurple, fontSize: 31, fontWeight: 800, ...enter(frame, 72) }}>Una pregunta. Una respuesta útil.</div>
  </AbsoluteFill>;
};

const ResponseScene = () => {
  const frame = useCurrentFrame();
  const duration = 150;
  return <AbsoluteFill style={{ background: C.yellow, fontFamily: FONT, overflow: "hidden", opacity: sceneOpacity(frame, duration) }}>
    <BackgroundShape color={C.pink} frame={frame} />
    <div style={{ position: "absolute", top: 115, left: 80, ...enter(frame, 1) }}><Tag fill={C.white}>RESPUESTA DE PURI</Tag></div>
    <Title frame={frame} size={73} top={235}>Respuestas con datos<br /><span style={{ color: C.purple }}>reales de tu negocio.</span></Title>
    <div style={{ position: "absolute", left: 80, top: 630, width: 920, padding: "42px 44px 38px", background: C.white, border: `6px solid ${C.ink}`, borderRadius: 34, boxShadow: `12px 13px 0 ${C.ink}`, ...enter(frame, 18, 60) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 26 }}><Puri variant="success" frame={frame} style={{ width: 130, height: 130 }} /><div style={{ fontSize: 26, fontWeight: 900, color: C.darkPurple, letterSpacing: 1 }}>PURI ENTIENDE TU DÍA</div></div>
      <div style={{ fontSize: 49, lineHeight: 1.05, fontWeight: 950, letterSpacing: -1.8, marginBottom: 32 }}>Tienes 3 citas hoy.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 17 }}><DataChip value="$30.000" label="pendientes" fill={C.lavender} frame={frame} delay={40} /><DataChip value="2" label="horarios libres" fill={C.yellow} frame={frame} delay={48} /></div>
    </div>
    <div style={{ position: "absolute", bottom: 110, left: 80, color: C.darkPurple, fontSize: 32, fontWeight: 800, ...enter(frame, 68) }}>Citas · cobros · espacios. Todo conectado.</div>
  </AbsoluteFill>;
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  const duration = 120;
  return <AbsoluteFill style={{ background: C.purple, fontFamily: FONT, color: C.white, overflow: "hidden", opacity: sceneOpacity(frame, duration) }}>
    <div style={{ position: "absolute", top: 110, left: 80, ...enter(frame, 2) }}><BrandLogo dark /></div>
    <div style={{ position: "absolute", width: 850, height: 850, left: 115, top: 320, borderRadius: "50%", background: C.lavender, border: `16px solid ${C.ink}`, scale: interpolate(frame, [0, 25], [0.45, 1], { extrapolateRight: "clamp", easing: ease }) }} />
    <Puri variant="success" frame={frame} style={{ position: "absolute", left: 205, top: 430, width: 670, height: 670, ...enter(frame, 8, 100), rotate: `${interpolate(frame, [0, 110], [-6, 3])}deg` }} />
    <div style={{ position: "absolute", left: 80, right: 80, top: 1210, textAlign: "center", fontSize: 108, lineHeight: 0.99, fontWeight: 950, letterSpacing: -4, ...enter(frame, 26) }}>Puri llegó<br />a Puragenda.</div>
    <div style={{ position: "absolute", left: 120, right: 120, top: 1510, textAlign: "center", fontSize: 42, lineHeight: 1.1, fontWeight: 800, ...enter(frame, 39) }}>Conoce Puri y organiza mejor tu día.</div>
  </AbsoluteFill>;
};

export const PuriUpdateReel = () => <AbsoluteFill style={{ background: C.cream }}>
  <Sequence from={0} durationInFrames={90} name="Presentación de Puri"><Video src={staticFile("intro.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} /></Sequence>
  <Sequence from={90} durationInFrames={120} name="Tu día"><TodayScene /></Sequence>
  <Sequence from={210} durationInFrames={120} name="Pregunta"><AskScene /></Sequence>
  <Sequence from={330} durationInFrames={150} name="Respuesta"><ResponseScene /></Sequence>
  <Sequence from={480} durationInFrames={120} name="Cierre"><OutroScene /></Sequence>
  <Audio src={staticFile("puri-theme.wav")} volume={0.7} />
</AbsoluteFill>;
