import React from "react";

// Mini iPhone-ish device frame. Width 220 by default; height auto from aspect.
export function PhoneFrame({
  width = 220,
  children,
  background = "#0e0e10",
}: {
  width?: number;
  children?: React.ReactNode;
  background?: string;
}) {
  const aspect = 12 / 25; // 220 * 25/12 ≈ 460 — roughly iPhone proportions
  const height = width / aspect;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.18,
        background,
        boxShadow:
          "0 30px 80px -30px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.06)",
        padding: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* notch */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: 14,
          transform: "translateX(-50%)",
          width: width * 0.34,
          height: 18,
          borderRadius: 999,
          background: "#000",
          zIndex: 2,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fff",
          borderRadius: width * 0.14,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}
