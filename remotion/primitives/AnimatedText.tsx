import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { APPLE_OUT } from "../theme/easing";

// Reveal text by clipping a brand-tinted gradient mask from left to right.
// Subtle, calm, and projector-friendly — no per-character bounce.
export function MaskedTextReveal({
  text,
  startFrame = 0,
  durationFrames = 18,
  style,
}: {
  text: string;
  startFrame?: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - startFrame);
  const progress = interpolate(local, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: APPLE_OUT,
  });
  return (
    <span
      style={{
        display: "inline-block",
        clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
        ...style,
      }}
    >
      {text}
    </span>
  );
}

// Letter-by-letter draw-on for codes, scores, and hero titles. Each letter
// fades + lifts with a per-character delay.
export function LetterDraw({
  text,
  startFrame = 0,
  perLetter = 2,
  letterDuration = 12,
  style,
}: {
  text: string;
  startFrame?: number;
  perLetter?: number;
  letterDuration?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", ...style }}>
      {text.split("").map((ch, i) => {
        const localStart = startFrame + i * perLetter;
        const local = frame - localStart;
        const opacity = interpolate(local, [0, letterDuration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(local, [0, letterDuration], [10, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: APPLE_OUT,
        });
        return (
          <span
            key={i}
            style={{ opacity, transform: `translateY(${y}px)`, display: "inline-block", whiteSpace: "pre" }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
