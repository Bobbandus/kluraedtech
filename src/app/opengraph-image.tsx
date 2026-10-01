import { ImageResponse } from "next/og";

export const alt = "Klura – quiz där kunskap vinner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a3d31", color: "#fff", padding: 72, position: "relative" }}>
        <div style={{ position: "absolute", right: -60, bottom: -40, width: 640, height: 420, display: "flex" }}>
          <svg width="640" height="420" viewBox="0 0 640 420">
            <path d="M0 420 L250 120 L330 220 L420 60 L640 420 Z" fill="#12735a" />
            <path d="M420 60 L470 140 L440 130 L410 160 L390 120 Z" fill="#f8f5ef" />
            <circle cx="540" cy="90" r="46" fill="#ffc93c" />
            <path d="M420 60 V10 L460 22 L420 34" fill="#ff9b21" stroke="#ff9b21" strokeWidth="4" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#12735a", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #c9e6d9" }}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <path d="M4 34 L18 12 L25 22 L29 16 L36 34 Z" fill="#fff" />
              </svg>
            </div>
            <span style={{ fontSize: 48, fontWeight: 800 }}>klura</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, display: "flex", flexWrap: "wrap" }}>
              Quiz där&nbsp;<span style={{ color: "#ffc93c" }}>kunskap</span>&nbsp;vinner.
            </div>
            <div style={{ marginTop: 24, fontSize: 32, color: "#c9e6d9", maxWidth: 720 }}>Biljakt, Fjällförsvar och Topptur – byggt för svensk skola.</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
