import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered outside the page's CSS, so brand values are written out here.
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FBF1EC",
        color: "#1A1A1A",
      }}
    >
      <div style={{ fontSize: 96, letterSpacing: 8 }}>ATMH</div>
      <div style={{ fontSize: 32, letterSpacing: 16, color: "#6B5E59" }}>ESSENTIALS</div>
      <div style={{ width: 160, height: 2, margin: "40px 0", background: "#C8954A" }} />
      <div style={{ fontSize: 40 }}>Home. Beauty. Everyday Living.</div>
    </div>,
    size,
  );
}
