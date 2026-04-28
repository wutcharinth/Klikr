import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { APPLE_OUT } from "../theme/easing";

// Spring-feel counter that ramps from 0 → target between [startFrame, startFrame + durationFrames].
export function KpiCounter({
  target,
  startFrame = 0,
  durationFrames = 30,
  suffix,
  prefix,
  style,
  format = (n) => Math.round(n).toLocaleString(),
}: {
  target: number;
  startFrame?: number;
  durationFrames?: number;
  suffix?: string;
  prefix?: string;
  style?: React.CSSProperties;
  format?: (n: number) => string;
}) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: APPLE_OUT,
  });
  const value = target * t;
  return (
    <span
      style={{ fontVariantNumeric: "tabular-nums", display: "inline-block", ...style }}
    >
      {prefix}
      {format(value)}
      {suffix}
    </span>
  );
}
