import React from "react";
import { AbsoluteFill } from "remotion";
import type { RemotionTheme } from "../theme/tokens";

// A full-bleed frame matching the app's `.panel` look. Gives every composition
// the same browser-style chrome (rounded, soft shadow, 1px line). Inner content
// fills the available area; padding controlled by props.
export function BrandFrame({
  theme,
  children,
  pad = 56,
  background,
}: {
  theme: RemotionTheme;
  children: React.ReactNode;
  pad?: number;
  background?: string;
}) {
  return (
    <AbsoluteFill style={{ background: theme.bgSoft, fontFamily: theme.fontFamily }}>
      {/* Soft brand orb behind the frame for depth */}
      <div
        style={{
          position: "absolute",
          width: "60%",
          height: "60%",
          top: "-20%",
          right: "-10%",
          background: `radial-gradient(closest-side, ${withAlpha(theme.accent, 0.22)}, transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 32,
          background: background ?? theme.bg,
          border: `1px solid ${theme.line}`,
          borderRadius: 24,
          boxShadow: "0 30px 80px -40px rgba(0,0,0,0.25)",
          padding: pad,
          display: "flex",
          flexDirection: "column",
          color: theme.ink,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

export function withAlpha(hexOrColor: string, alpha: number) {
  // If it's already a CSS color expression we can't safely re-color, fall back
  // to a translucent black layered over the original.
  if (hexOrColor.startsWith("#") && (hexOrColor.length === 7 || hexOrColor.length === 4)) {
    const hex = hexOrColor.length === 4
      ? `#${hexOrColor[1]}${hexOrColor[1]}${hexOrColor[2]}${hexOrColor[2]}${hexOrColor[3]}${hexOrColor[3]}`
      : hexOrColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hexOrColor;
}
