import type { AvailabilityStoryData } from "@/server/services/availability-story.service";

function readableTextColor(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "#ffffff";
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 170 ? "#111827" : "#ffffff";
}

export function AvailabilityStoryImage({ data }: { data: AvailabilityStoryData }) {
  const minimal = data.template === "MINIMAL";
  const foreground = minimal ? "#111827" : readableTextColor(data.primaryColor);
  const muted = minimal ? "#475569" : foreground === "#ffffff" ? "rgba(255,255,255,.78)" : "rgba(17,24,39,.72)";
  const panel = minimal ? "#ffffff" : foreground === "#ffffff" ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.38)";
  const chip = minimal ? `${data.primaryColor}14` : foreground === "#ffffff" ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.5)";
  const shortUrl = new URL(data.bookingUrl).pathname.replace(/^\//, "");

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "150px 82px 135px", color: foreground, backgroundColor: minimal ? "#f8fafc" : data.primaryColor, backgroundImage: minimal ? undefined : `linear-gradient(145deg, ${data.primaryColor} 0%, ${data.secondaryColor} 58%, ${data.backgroundColor} 100%)`, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 112 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} width="104" height="104" alt="" style={{ objectFit: "contain", borderRadius: 26 }} />
          ) : (
            <div style={{ width: 104, height: 104, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 26, background: panel, fontSize: 44, fontWeight: 800 }}>
              {data.businessName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 38, fontWeight: 800 }}>{data.businessName}</span>
            <span style={{ marginTop: 8, fontSize: 24, color: muted }}>{data.locationName}</span>
          </div>
        </div>
        <div style={{ display: "flex", padding: "13px 22px", borderRadius: 999, background: panel, fontSize: 22, fontWeight: 700 }}>{data.staffName}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 76 }}>
        <span style={{ fontSize: 76, lineHeight: 1.04, fontWeight: 900, letterSpacing: -3 }}>{data.headline}</span>
        <span style={{ marginTop: 24, fontSize: 30, color: muted }}>{data.serviceName}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 62, flex: 1 }}>
        {data.days.map((day) => (
          <div key={day.date} style={{ minHeight: data.days.length > 1 ? 128 : 230, display: "flex", flexDirection: data.days.length > 1 ? "row" : "column", alignItems: data.days.length > 1 ? "center" : "flex-start", justifyContent: "space-between", gap: 22, padding: data.days.length > 1 ? "22px 28px" : "34px", borderRadius: 32, background: panel, border: minimal ? "2px solid #e2e8f0" : "2px solid rgba(255,255,255,.12)" }}>
            <span style={{ minWidth: data.days.length > 1 ? 285 : 0, fontSize: data.days.length > 1 ? 27 : 36, fontWeight: 800 }}>{day.label}</span>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: data.days.length > 1 ? "flex-end" : "flex-start", gap: 12 }}>
              {day.times.length ? day.times.map((time) => (
                <span key={time} style={{ display: "flex", padding: "12px 18px", borderRadius: 16, background: chip, fontSize: data.days.length > 1 ? 25 : 32, fontWeight: 800 }}>{time}</span>
              )) : (
                <span style={{ fontSize: 24, color: muted }}>{data.noAvailability}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 54 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 29, fontWeight: 850 }}>{data.callToAction}</span>
          <span style={{ marginTop: 10, fontSize: 21, color: muted }}>{data.disclaimer}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: 21, color: muted }}>{shortUrl}</span>
          <span style={{ marginTop: 10, fontSize: 18, color: muted }}>{data.poweredBy}</span>
        </div>
      </div>
    </div>
  );
}
