import type { AvailabilityStoryData } from "@/server/services/availability-story.service";

function readableTextColor(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "#ffffff";
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  return luminance > .179 ? "#111111" : "#ffffff";
}

export function AvailabilityStoryImage({ data }: { data: AvailabilityStoryData }) {
  const organic = data.template === "EDITORIAL";
  const graphic = data.template === "BOLD";
  const foreground = data.textColor;
  const muted = foreground.toLowerCase() === "#ffffff" ? "rgba(255,255,255,.72)" : "#625f59";
  const panel = "rgba(255,253,248,.92)";
  const chip = graphic ? data.secondaryColor : data.primaryColor;
  const chipText = readableTextColor(chip);
  const graphicText = readableTextColor(data.primaryColor);
  const footerForeground = graphic ? "#ffffff" : foreground;
  const footerMuted = graphic ? "rgba(255,255,255,.68)" : muted;
  const shortUrl = new URL(data.bookingUrl).pathname.replace(/^\//, "");
  const serviceLabels = data.serviceNames.slice(0, 6);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", padding: "118px 76px 100px", color: foreground, backgroundColor: data.backgroundColor, fontFamily: "Arial, sans-serif" }}>
      {data.backgroundMode === "ART" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.templateBackgroundUrl} width="1080" height="1920" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <div style={{ position: "absolute", left: graphic ? 38 : 76, top: 54, width: graphic ? 250 : 110, height: graphic ? 12 : 8, background: data.primaryColor }} />

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 104 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {data.showLogo && (data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} width="96" height="96" alt="" style={{ objectFit: "contain", borderRadius: organic ? 999 : graphic ? 4 : 24, background: "rgba(255,255,255,.94)" }} />
          ) : (
            <div style={{ width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: organic ? 999 : graphic ? 4 : 24, background: data.primaryColor, color: readableTextColor(data.primaryColor), fontSize: 42, fontWeight: 900 }}>
              {data.businessName.slice(0, 1).toUpperCase()}
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>{data.businessName}</span>
            <span style={{ marginTop: 7, fontSize: 22, color: muted }}>{data.locationName}</span>
          </div>
        </div>
        <div style={{ display: "flex", padding: "13px 21px", borderRadius: organic ? 999 : graphic ? 4 : 10, background: panel, border: "2px solid #ded8cd", fontSize: 20, fontWeight: 800 }}>{data.staffName}</div>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: organic ? "center" : "flex-start", marginTop: 66, padding: graphic ? "34px 36px" : 0, color: graphic ? graphicText : foreground, background: graphic ? data.primaryColor : "transparent", border: graphic ? `4px solid ${foreground}` : "none", textAlign: organic ? "center" : "left" }}>
        <div style={{ width: 92, height: graphic ? 13 : 8, background: data.primaryColor, marginBottom: 26 }} />
        <span style={{ maxWidth: 900, fontSize: graphic ? 82 : 76, lineHeight: .98, fontWeight: 950, letterSpacing: graphic ? -5 : -3 }}>{data.headline}</span>
        {data.serviceNames.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", justifyContent: organic ? "center" : "flex-start", gap: 10, marginTop: 28 }}>
          {serviceLabels.map((service) => (
            <span key={service} style={{ display: "flex", padding: "10px 16px", borderRadius: organic ? 999 : graphic ? 0 : 8, color: foreground, background: panel, border: `2px solid ${graphic ? foreground : data.primaryColor}`, fontSize: 20, fontWeight: 800 }}>{service}</span>
          ))}
          {data.serviceNames.length > serviceLabels.length && (
            <span style={{ display: "flex", padding: "10px 16px", borderRadius: 999, background: panel, fontSize: 20, fontWeight: 800 }}>+{data.serviceNames.length - serviceLabels.length}</span>
          )}
        </div>}
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: data.days.length > 1 ? 14 : 20, marginTop: 48, flex: 1 }}>
        {data.days.map((day) => (
          <div key={day.date} style={{ minHeight: data.days.length > 1 ? 112 : 226, display: "flex", flexDirection: data.days.length > 1 ? "row" : "column", alignItems: data.days.length > 1 ? "center" : "flex-start", justifyContent: "space-between", gap: 20, padding: data.days.length > 1 ? "18px 25px" : "32px", borderRadius: organic ? 30 : graphic ? 0 : 10, background: organic ? "rgba(255,253,248,.78)" : panel, border: graphic ? `3px solid ${foreground}` : organic ? `0 solid ${data.primaryColor}` : "2px solid #ded8cd", ...(organic ? { borderBottom: `3px solid ${data.primaryColor}` } : {}) }}>
            <span style={{ minWidth: data.days.length > 1 ? 285 : 0, fontSize: data.days.length > 1 ? 25 : 34, fontWeight: 900, letterSpacing: -.5 }}>{day.label}</span>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: data.days.length > 1 ? "flex-end" : "flex-start", gap: 12 }}>
              {day.times.length ? day.times.map((time) => (
                <span key={time} style={{ display: "flex", minWidth: data.days.length > 1 ? 92 : 126, justifyContent: "center", padding: data.days.length > 1 ? "10px 14px" : "14px 19px", borderRadius: organic ? 999 : graphic ? 3 : 8, background: chip, color: chipText, fontSize: data.days.length > 1 ? 23 : 32, fontWeight: 950 }}>{time}</span>
              )) : (
                <span style={{ fontSize: 24, color: muted }}>{data.noAvailability}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 42, padding: graphic ? "28px 24px" : "28px 24px 0", color: footerForeground, borderTop: `4px solid ${data.primaryColor}`, background: graphic ? "#171717" : "rgba(255,253,248,.82)" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 27, fontWeight: 900 }}>{data.callToAction}</span>
          <span style={{ maxWidth: 630, marginTop: 10, fontSize: 18, color: footerMuted }}>{data.disclaimer}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "14px 18px", borderRadius: organic ? 18 : graphic ? 3 : 8, background: panel }}>
          <span style={{ fontSize: 19, fontWeight: 800 }}>{shortUrl}</span>
          <span style={{ marginTop: 7, fontSize: 15, color: footerMuted }}>{data.poweredBy}</span>
        </div>
      </div>
    </div>
  );
}
