import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RemotionTheme } from "../theme/tokens";
import { withAlpha } from "./BrandFrame";

// Horizontal poll bar with grow + spring settle. Numbers are rendered by the
// caller (use KpiCounter alongside).
export function VoteBar({
  theme,
  label,
  finalPct,
  startFrame = 0,
  growFrames = 30,
  highlight = false,
  height = 56,
}: {
  theme: RemotionTheme;
  label: string;
  finalPct: number; // 0..100
  startFrame?: number;
  growFrames?: number;
  highlight?: boolean;
  height?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 22, stiffness: 130, mass: 1 },
    durationInFrames: growFrames,
  });
  const width = Math.max(0, finalPct) * t;
  const labelOpacity = interpolate(frame, [startFrame, startFrame + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        height,
        borderRadius: 14,
        background: withAlpha(theme.ink, 0.05),
        border: `1px solid ${theme.line}`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${width}%`,
          background: highlight
            ? `linear-gradient(90deg, ${theme.accent}, ${withAlpha(theme.accent, 0.85)})`
            : withAlpha(theme.accent, 0.20),
          transition: "background 200ms ease",
        }}
      />
      <span
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 18px",
          fontSize: 22,
          fontWeight: 600,
          color: highlight && width > 30 ? "#ffffff" : theme.ink,
          opacity: labelOpacity,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
