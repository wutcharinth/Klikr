import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

// Subtle sparkle particle — single cross + faint halo, fades in and drifts.
// Use sparingly. Confetti-volume is intentionally NOT a primitive here.
export function Sparkle({
  startFrame = 0,
  duration = 60,
  x,
  y,
  size = 14,
  color = "#ffffff",
  drift = 18,
}: {
  startFrame?: number;
  duration?: number;
  x: number; // px
  y: number; // px
  size?: number;
  color?: string;
  drift?: number;
}) {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const t = interpolate(local, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(t, [0, 0.2, 0.7, 1], [0, 1, 1, 0]);
  const scale = interpolate(t, [0, 0.4, 1], [0.4, 1, 0.7]);
  const dy = interpolate(t, [0, 1], [0, -drift]);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        transform: `translate(-50%, ${dy}px) scale(${scale})`,
        pointerEvents: "none",
      }}
    >
      {/* cross */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${color}, ${color}) center/100% 2px no-repeat, linear-gradient(${color}, ${color}) center/2px 100% no-repeat`,
        }}
      />
      {/* halo */}
      <div
        style={{
          position: "absolute",
          inset: -size,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${color}55, transparent 70%)`,
        }}
      />
    </div>
  );
}
