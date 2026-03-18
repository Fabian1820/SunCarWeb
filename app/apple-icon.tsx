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
          background: "linear-gradient(135deg, #7c3aed, #2563eb)",
          color: "white",
          fontSize: 64,
          fontWeight: 900,
          borderRadius: 36,
          letterSpacing: -2,
        }}
      >
        SC
      </div>
    ),
    size,
  );
}

