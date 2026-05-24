import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)",
          borderRadius: 40,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            background: "#0f172a",
            borderRadius: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Horizon */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 68,
              background:
                "linear-gradient(180deg, rgba(96,165,250,0.5) 0%, rgba(192,132,252,0.2) 100%)",
            }}
          />
          {/* Label bar */}
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 22,
              display: "flex",
              gap: 6,
            }}
          >
            <div style={{ width: 54, height: 14, background: "white", borderRadius: 5 }} />
            <div
              style={{
                width: 26,
                height: 14,
                background: "rgba(255,255,255,0.35)",
                borderRadius: 5,
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              top: 50,
              left: 22,
              width: 72,
              height: 6,
              background: "rgba(255,255,255,0.25)",
              borderRadius: 3,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
