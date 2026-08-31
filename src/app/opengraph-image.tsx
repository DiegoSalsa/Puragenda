import { ImageResponse } from "next/og";

export const alt = "Puragenda — sistema de reservas online para negocios en Chile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#111111",
          background: "#fff9e8",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              width: 54,
              height: 54,
              border: "4px solid #111111",
              borderRadius: 14,
              background: "#7c3aed",
              boxShadow: "7px 7px 0 #111111",
            }}
          />
          <div style={{ display: "flex", fontSize: 38, fontWeight: 900 }}>PURAGENDA</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div
            style={{
              display: "flex",
              width: "auto",
              alignSelf: "flex-start",
              padding: "8px 18px",
              border: "3px solid #111111",
              background: "#bffcc6",
              boxShadow: "5px 5px 0 #111111",
              fontSize: 23,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            30 días gratis · Sin comisiones
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 68,
              lineHeight: 1.03,
              fontWeight: 900,
              letterSpacing: -3,
              textTransform: "uppercase",
            }}
          >
            Sistema de reservas online para negocios en Chile
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 29, fontWeight: 700 }}>
            Citas, abonos, profesionales y clientes en un solo lugar.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 20, fontWeight: 800 }}>
          <span>RESERVAS 24/7</span>
          <span>•</span>
          <span>GOOGLE CALENDAR</span>
          <span>•</span>
          <span>ABONOS ONLINE</span>
        </div>
      </div>
    ),
    size,
  );
}
