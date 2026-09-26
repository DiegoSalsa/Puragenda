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

const BrandLogo = ({ dark = false }: { dark?: boolean }) => <Img src={staticFile("puragenda-logo.svg")} style={{ width: 370, height: 180, objectFit: "contain", filter: dark ? "brightness(0) invert(1)" : undefined }} />;

const Tag = ({ children, fill = C.yellow, style }: { children: ReactNode; fill?: string; style?: CSSProperties }) => (
  <div style={{ alignSelf: "flex-start", background: fill, border: `4px solid ${C.ink}`, borderRadius: 999, padding: "12px 22px 11px", color: C.ink, fontSize: 24, fontWeight: 900, letterSpacing: 1.8, ...style }}>{children}</div>
);

const BackgroundShape = ({ color, frame }: { color: string; frame: number }) => <div style={{ position: "absolute", width: 760, height: 760, right: -460, top: -180, borderRadius: "50%", background: color, border: `7px solid ${C.ink}`, opacity: 0.82, rotate: `${interpolate(frame, [0, 120], [-5, 4])}deg` }} />;

const Title = ({ children, frame, top = 245, size = 88, color = C.ink }: { children: ReactNode; frame: number; top?: number; size?: number; color?: string }) => <div style={{ position: "absolute", top, left: 80, right: 80, color, fontSize: size, lineHeight: 1.01, letterSpacing: -3.7, fontWeight: 950, ...enter(frame, 5) }}>{children}</div>;

const Puri = ({ variant, frame, style }: { variant: "greeting" | "thinking" | "success"; frame: number; style?: CSSProperties }) => <Img src={staticFile(`puri-${variant}.svg`)} style={{ objectFit: "contain", transformOrigin: "center bottom", scale: interpolate(frame % 48, [0, 24, 47], [1, 1.035, 1], { extrapolateRight: "clamp" }), ...style }} />;

const MockupFrame = ({ children, frame, top, left = 80, width = 920, height = 520 }: { children: ReactNode; frame: number; top: number; left?: number; width?: number; height?: number }) => (
  <div style={{ position: "absolute", top, left, width, height, overflow: "hidden", border: `6px solid ${C.ink}`, borderRadius: 34, background: C.white, boxShadow: `11px 12px 0 ${C.ink}`, ...enter(frame, 14, 65) }}>{children}</div>
);

const TinyButton = ({ children, fill = C.white }: { children: ReactNode; fill?: string }) => <div style={{ background: fill, border: `3px solid ${C.ink}`, borderRadius: 10, padding: "9px 13px", fontSize: 16, fontWeight: 900, whiteSpace: "nowrap" }}>{children}</div>;

const TodayMockup = ({ frame }: { frame: number }) => <MockupFrame frame={frame} top={585} height={510}>
  <div style={{ height: 52, borderBottom: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: C.cream }}><div style={{ fontSize: 18, fontWeight: 950, color: C.purple }}>puragenda</div><div style={{ width: 28, height: 11, border: `3px solid ${C.ink}`, borderRadius: 5 }} /></div>
  <div style={{ display: "flex", height: "calc(100% - 52px)" }}><div style={{ width: 142, borderRight: `3px solid ${C.ink}`, padding: "22px 14px", background: C.soft }}><div style={{ color: C.darkPurple, fontSize: 14, fontWeight: 950, letterSpacing: 1.2, marginBottom: 18 }}>AGENDA</div>{["Hoy", "Agenda", "Calendario"].map((item, i) => <div key={item} style={{ background: i === 0 ? C.lavender : "transparent", border: i === 0 ? `2px solid ${C.purple}` : "2px solid transparent", borderRadius: 9, padding: "10px 8px", marginBottom: 8, fontSize: 16, fontWeight: i === 0 ? 900 : 700 }}>{item}</div>)}<div style={{ height: 2, background: "#ded4ed", margin: "20px 0" }} /><div style={{ color: C.darkPurple, fontSize: 14, fontWeight: 950, letterSpacing: 1.2, marginBottom: 12 }}>GESTIÓN</div><div style={{ fontSize: 15, fontWeight: 700, color: "#5e5668" }}>Cobros</div></div>
    <div style={{ flex: 1, padding: 20, background: C.cream }}><div style={{ height: 188, border: `4px solid ${C.ink}`, borderRadius: 22, background: C.lavender, padding: "20px 24px", position: "relative", overflow: "hidden" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div><div style={{ display: "inline-block", background: C.yellow, border: `2px solid ${C.ink}`, borderRadius: 999, padding: "5px 10px", fontSize: 13, fontWeight: 950, letterSpacing: 1 }}>TU DÍA</div><div style={{ fontSize: 43, lineHeight: .98, fontWeight: 950, letterSpacing: -1.8, marginTop: 14 }}>Hola, Valentina</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, color: "#5b4e69" }}>Viernes, 25 de septiembre · 14:41</div></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><TinyButton fill={C.purple}>Nueva cita</TinyButton><TinyButton>Ver agenda</TinyButton></div></div><div style={{ position: "absolute", right: 28, bottom: 16, width: 92, height: 18, borderRadius: "50%", background: "rgba(120,55,239,.2)" }} /></div><div style={{ height: 48, marginTop: 12, border: `3px solid ${C.ink}`, borderRadius: 14, background: C.lavender, display: "flex", alignItems: "center", gap: 12, padding: "0 15px" }}><div style={{ width: 27, height: 27, borderRadius: "50%", background: C.white, border: `2px solid ${C.ink}` }} /><div style={{ fontSize: 16, fontWeight: 900 }}>Puri · Hola, Valentina. ¿Quieres que revise tu jornada?</div></div><div style={{ height: 92, marginTop: 12, border: `3px solid ${C.ink}`, borderRadius: 17, background: C.yellow, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><div style={{ fontSize: 13, fontWeight: 950, letterSpacing: 1 }}>PRÓXIMA CITA</div><div style={{ fontSize: 29, fontWeight: 950, marginTop: 4 }}>12:00 · Matías</div></div><div style={{ display: "flex", gap: 9 }}><TinyButton fill={C.white}>Confirmada</TinyButton><TinyButton>Por cobrar $15.000</TinyButton></div></div></div>
  </div>
</MockupFrame>;

const PuriPanelMockup = ({ frame }: { frame: number }) => <MockupFrame frame={frame} top={585} left={70} width={620} height={760}>
  <div style={{ height: 76, borderBottom: `4px solid ${C.ink}`, background: C.lavender, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 44, height: 44, borderRadius: 13, background: C.white, border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>◡</div><div><div style={{ fontSize: 23, fontWeight: 950 }}>Puri</div><div style={{ fontSize: 14, fontWeight: 700, color: "#635576" }}>Tu asistente</div></div></div><div style={{ width: 40, height: 40, border: `3px solid ${C.ink}`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25 }}>×</div></div>
  <div style={{ margin: 18, height: 388, border: `4px solid ${C.ink}`, borderRadius: 24, background: C.yellow, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}><Puri variant="greeting" frame={frame} style={{ width: 145, height: 145 }} /><div style={{ fontSize: 29, fontWeight: 950, marginTop: 10 }}>Pregúntale a Puri</div><div style={{ fontSize: 19, lineHeight: 1.16, fontWeight: 700, color: "#5d4c69", marginTop: 8 }}>Citas, cobros y horarios libres en una sola conversación.</div></div><div style={{ margin: "0 18px", border: `3px solid ${C.ink}`, borderRadius: 14, height: 64, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 19, fontWeight: 800, background: C.white }}>¿Qué debería revisar hoy?</div><div style={{ margin: "14px 18px 0", height: 60, border: `3px solid ${C.ink}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", fontSize: 18, fontWeight: 800, color: "#6b6077", background: C.soft }}><span>Escribe una pregunta…</span><span style={{ background: C.purple, color: C.white, borderRadius: 9, padding: "6px 10px" }}>↗</span></div>
</MockupFrame>;

const DataChip = ({ value, label, fill, frame, delay, style }: { value: string; label: string; fill: string; frame: number; delay: number; style?: CSSProperties }) => <div style={{ background: fill, border: `4px solid ${C.ink}`, borderRadius: 24, padding: "18px 20px 16px", boxShadow: `7px 8px 0 ${C.ink}`, ...enter(frame, delay, 26), ...style }}><div style={{ fontSize: 42, lineHeight: 1, fontWeight: 950, letterSpacing: -1.5 }}>{value}</div><div style={{ marginTop: 8, fontSize: 20, lineHeight: 1.05, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div></div>;

const TodayScene = () => {
  const frame = useCurrentFrame();
  const duration = 120;
  return <AbsoluteFill style={{ background: C.cream, fontFamily: FONT, overflow: "hidden", opacity: sceneOpacity(frame, duration) }}>
    <BackgroundShape color={C.pink} frame={frame} />
    <div style={{ position: "absolute", top: 115, left: 80, ...enter(frame, 1) }}><Tag>PURI EN HOY</Tag></div>
    <Title frame={frame} size={76} top={235}>Empieza tu día<br /><span style={{ color: C.purple }}>sabiendo qué importa.</span></Title>
    <TodayMockup frame={frame} />
    <div style={{ position: "absolute", top: 1145, left: 80, right: 80, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
      <DataChip value="12:00" label="próxima cita" fill={C.white} frame={frame} delay={38} />
      <DataChip value="$30.000" label="pendiente" fill={C.lavender} frame={frame} delay={46} />
      <DataChip value="2" label="espacios libres" fill={C.yellow} frame={frame} delay={54} />
    </div>
    <Puri variant="greeting" frame={frame} style={{ position: "absolute", width: 190, height: 190, right: 82, bottom: 128, ...enter(frame, 65, 32) }} />
    <div style={{ position: "absolute", bottom: 138, left: 80, color: C.darkPurple, fontSize: 30, fontWeight: 800, ...enter(frame, 62) }}>Puri te ayuda a ver lo importante.</div>
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
    <PuriPanelMockup frame={frame} />
    <Puri variant="thinking" frame={frame} style={{ position: "absolute", width: 220, height: 220, right: 82, top: 635, ...enter(frame, 30, 30) }} />
    <div style={{ position: "absolute", top: 900, right: 45, width: 330, padding: "22px 23px", background: C.white, border: `5px solid ${C.ink}`, borderRadius: 26, boxShadow: `8px 9px 0 ${C.ink}`, fontSize: 34, lineHeight: 1.06, fontWeight: 900, ...enter(frame, 35, 25) }}>¿Qué horarios<br />siguen libres?</div>
    <div style={{ position: "absolute", top: 1225, right: 45, width: 330, minHeight: 130, padding: "20px 23px", background: C.yellow, border: `5px solid ${C.ink}`, borderRadius: 26, boxShadow: `8px 9px 0 ${C.ink}`, fontSize: 28, lineHeight: 1.08, fontWeight: 900, opacity: responseOpacity, translate: `0 ${interpolate(frame, [62, 78], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })}px` }}>Estoy revisando<br />tu agenda…</div>
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
    <div style={{ position: "absolute", left: 80, top: 625, width: 920, padding: "44px 48px 42px", background: C.white, border: `6px solid ${C.ink}`, borderRadius: 34, boxShadow: `12px 13px 0 ${C.ink}`, ...enter(frame, 18, 60) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 28 }}><Puri variant="success" frame={frame} style={{ width: 170, height: 170 }} /><div style={{ fontSize: 31, fontWeight: 900, color: C.darkPurple, letterSpacing: 1.2 }}>PURI ENTIENDE TU DÍA</div></div>
      <div style={{ fontSize: 54, lineHeight: 1.05, fontWeight: 950, letterSpacing: -1.8, marginBottom: 34 }}>Tienes 3 citas hoy.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 17 }}><DataChip value="$30.000" label="pendientes" fill={C.lavender} frame={frame} delay={40} /><DataChip value="2" label="horarios libres" fill={C.yellow} frame={frame} delay={48} /></div>
    </div>
    <div style={{ position: "absolute", bottom: 110, left: 80, color: C.darkPurple, fontSize: 32, fontWeight: 800, ...enter(frame, 68) }}>Citas · cobros · espacios. Todo conectado.</div>
  </AbsoluteFill>;
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  const duration = 120;
  return <AbsoluteFill style={{ background: C.purple, fontFamily: FONT, color: C.white, overflow: "hidden", opacity: sceneOpacity(frame, duration) }}>
    <div style={{ position: "absolute", top: 45, left: 68, ...enter(frame, 2) }}><BrandLogo dark /></div>
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
