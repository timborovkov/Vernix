import { ImageResponse } from "next/og";

const SIZE = { width: 1200, height: 630 };

export function generateOgImage(title: string, subtitle: string) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            backgroundColor: "#7c3aed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          V
        </div>
        <span
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#a0a0a0",
          }}
        >
          Vernix
        </span>
      </div>
      <div
        style={{
          fontSize: "56px",
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: "24px",
          maxWidth: "900px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "24px",
          color: "#a0a0a0",
          lineHeight: 1.5,
          maxWidth: "800px",
        }}
      >
        {subtitle}
      </div>
    </div>,
    { ...SIZE }
  );
}

export const ogImageConfig = {
  size: SIZE,
  contentType: "image/png" as const,
};
