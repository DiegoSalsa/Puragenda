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
  const editorial = data.template === "EDITORIAL";
  const bold = data.template === "BOLD";
  const foreground = data.textColor;
  const muted = foreground.toLowerCase() === "#ffffff" ? "rgba(255,255,255,.68)" : "rgba(23,23,23,.62)";
  const surface = foreground.toLowerCase() === "#ffffff" ? "rgba(23,23,23,.80)" : "rgba(255,255,255,.82)";
  const solidSurface = foreground.toLowerCase() === "#ffffff" ? "#242128" : "#fffdf7";
  const accentText = readableTextColor(data.primaryColor);
  const shortUrl = new URL(data.bookingUrl).pathname.replace(/^\//, "");
  const serviceLabels = data.serviceNames.slice(0, 4);
  const headlineSize = data.showSchedule
    ? data.headline.length > 56 ? 72 : data.headline.length > 38 ? 82 : 96
    : data.headline.length > 56 ? 86 : data.headline.length > 38 ? 98 : 116;
  const cardRadius = editorial ? 44 : bold ? 12 : 30;
  const locationDetails = [
    data.showLocationName ? data.locationName : null,
    data.showAddress ? data.locationAddress : null,
  ].filter(Boolean).join(" · ");

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", padding: "82px 72px 70px", color: foreground, backgroundColor: data.backgroundColor, fontFamily: "Arial, sans-serif" }}>
      {data.backgroundMode === "ART" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.templateBackgroundUrl} width="1080" height="1920" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .38 }} />
      )}
      <div style={{ position: "absolute", right: -120, top: -110, width: 420, height: 420, display: "flex", borderRadius: 999, background: data.secondaryColor, opacity: .86 }} />
      <div style={{ position: "absolute", right: 56, top: 505, width: 230, height: 230, display: "flex", transform: "rotate(12deg)", border: `30px solid ${data.primaryColor}`, opacity: .72 }} />
      <div style={{ position: "absolute", left: -110, bottom: 260, width: 350, height: 350, display: "flex", borderRadius: 999, background: data.primaryColor, opacity: .30 }} />

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {data.showLogo && (
            <div style={{ width: 112, height: 112, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: editorial ? 999 : 28, background: "#ffffff", border: "3px solid rgba(23,23,23,.12)", boxShadow: "0 12px 30px rgba(23,23,23,.14)" }}>
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} width="94" height="94" alt="" style={{ width: 94, height: 94, objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: 46, fontWeight: 900, color: data.primaryColor }}>{data.businessName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ maxWidth: 520, fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>{data.businessName}</span>
            {locationDetails && <span style={{ maxWidth: 560, marginTop: 6, fontSize: 21, fontWeight: 700, color: muted }}>{locationDetails}</span>}
          </div>
        </div>
        {data.showProfessional && <div style={{ display: "flex", padding: "14px 22px", borderRadius: 999, color: foreground, background: surface, border: "2px solid rgba(23,23,23,.12)", fontSize: 20, fontWeight: 900 }}>{data.staffName}</div>}
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: editorial ? "center" : "flex-start", marginTop: data.showSchedule ? 72 : 175, textAlign: editorial ? "center" : "left" }}>
        <span style={{ display: "flex", padding: "11px 18px", borderRadius: 999, color: accentText, background: data.primaryColor, fontSize: 19, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>{data.showSchedule && data.days.length === 1 ? data.days[0]?.label : data.serviceName}</span>
        <span style={{ maxWidth: 900, marginTop: 30, fontSize: headlineSize, lineHeight: .91, fontWeight: 900, letterSpacing: -5 }}>{data.headline}</span>
        {serviceLabels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: editorial ? "center" : "flex-start", gap: 10, marginTop: 26 }}>
            {serviceLabels.map((service) => (
              <span key={service} style={{ display: "flex", padding: "10px 16px", borderRadius: editorial ? 999 : 12, color: foreground, background: surface, border: "2px solid rgba(23,23,23,.12)", fontSize: 19, fontWeight: 800 }}>{service}</span>
            ))}
            {data.serviceNames.length > serviceLabels.length && <span style={{ display: "flex", padding: "10px 16px", borderRadius: 999, color: foreground, background: surface, fontSize: 19, fontWeight: 900 }}>+{data.serviceNames.length - serviceLabels.length}</span>}
          </div>
        )}
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", gap: data.days.length > 3 ? 12 : 16, marginTop: data.showSchedule ? 46 : 0, flex: 1 }}>
        {data.showSchedule && data.days.map((day) => (
          <div key={day.date} style={{ minHeight: data.days.length === 1 ? 250 : data.days.length > 3 ? 112 : 138, display: "flex", flexDirection: data.days.length === 1 ? "column" : "row", alignItems: data.days.length === 1 ? "flex-start" : "center", justifyContent: "space-between", gap: 20, padding: data.days.length === 1 ? "32px 34px" : "20px 26px", borderRadius: cardRadius, color: foreground, background: bold ? solidSurface : surface, border: bold ? `3px solid ${foreground}` : "2px solid rgba(23,23,23,.12)", boxShadow: bold ? `8px 8px 0 ${data.primaryColor}` : "0 14px 36px rgba(23,23,23,.09)" }}>
            <span style={{ maxWidth: data.days.length === 1 ? 850 : 330, fontSize: data.days.length === 1 ? 32 : 23, lineHeight: 1.1, fontWeight: 900, letterSpacing: -.5 }}>{day.label}</span>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: data.days.length === 1 ? "flex-start" : "flex-end", gap: 10, marginTop: data.days.length === 1 ? 22 : 0 }}>
              {day.times.length ? day.times.map((time) => (
                <span key={time} style={{ display: "flex", minWidth: data.days.length === 1 ? 122 : 88, justifyContent: "center", padding: data.days.length === 1 ? "14px 18px" : "10px 13px", borderRadius: editorial ? 999 : 10, color: accentText, background: data.primaryColor, fontSize: data.days.length === 1 ? 30 : 21, fontWeight: 900 }}>{time}</span>
              )) : <span style={{ fontSize: 22, color: muted }}>{data.noAvailability}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30, marginTop: 38, paddingTop: 28, borderTop: `4px solid ${data.primaryColor}` }}>
        <div style={{ maxWidth: 470, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 700, color: muted }}>{data.disclaimer}</span>
          <span style={{ marginTop: 12, fontSize: 15, fontWeight: 800, color: muted }}>{data.poweredBy}</span>
        </div>
        {data.ctaMode === "LINK_STICKER" ? (
          <div style={{ width: 410, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ marginBottom: 12, fontSize: 29, fontWeight: 900 }}>{data.callToAction}</span>
            <div style={{ width: 370, height: 104, display: "flex", borderRadius: 999, border: `4px dashed ${data.primaryColor}`, background: surface }} />
          </div>
        ) : (
          <div style={{ maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "20px 24px", borderRadius: editorial ? 32 : 16, color: foreground, background: surface, border: "2px solid rgba(23,23,23,.12)" }}>
            <span style={{ fontSize: 28, fontWeight: 900 }}>{data.callToAction}</span>
            <span style={{ marginTop: 10, fontSize: 18, fontWeight: 800, color: muted }}>{shortUrl}</span>
          </div>
        )}
      </div>
    </div>
  );
}
