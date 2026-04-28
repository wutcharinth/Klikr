import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RemotionTheme } from "../theme/tokens";
import { defaultTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";

export type LogoMarkVariant = "idle" | "wake" | "react" | "outro";

export type LogoMarkProps = {
  theme?: RemotionTheme;
  variant?: LogoMarkVariant;
  wordmark?: string; // defaults to "Klikr"
};

// One composition, four variants — see plan section "Logo motion".
// idle: subtle 6s breathing loop, dot pulse
// wake: one-shot draw-on of the wordmark, dot ignites
// react: short squash-and-stretch on a moment trigger
// outro: cinematic close — settles centre, brand sweep, accent ring orbits once
export function LogoMark({
  theme = defaultTheme,
  variant = "idle",
  wordmark = "Klikr",
}: LogoMarkProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (variant === "idle") {
    // Breathing scale (period 6s) + dot pulse on the same period
    const cycle = (frame % (fps * 6)) / (fps * 6); // 0..1
    const breathe = 1 + Math.sin(cycle * Math.PI * 2) * 0.012;
    const dotPulse = 1 + Math.max(0, Math.sin(cycle * Math.PI * 2)) * 0.35;
    return (
      <AbsoluteFill
        style={{
          background: "transparent",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.fontFamily,
          color: theme.ink,
        }}
      >
        <Wordmark theme={theme} text={wordmark} scale={breathe} dotScale={dotPulse} />
      </AbsoluteFill>
    );
  }

  if (variant === "wake") {
    const drawT = spring({ frame, fps, config: { damping: 24, stiffness: 110, mass: 1 } });
    const reveal = drawT; // 0..1
    const dotScale = spring({
      frame: Math.max(0, frame - 14),
      fps,
      config: { damping: 12, stiffness: 220, mass: 0.6 },
    });
    return (
      <AbsoluteFill
        style={{
          background: "transparent",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.fontFamily,
          color: theme.ink,
        }}
      >
        <Wordmark
          theme={theme}
          text={wordmark}
          revealMask={reveal}
          dotScale={dotScale}
        />
      </AbsoluteFill>
    );
  }

  if (variant === "react") {
    // Short squash-and-stretch peaking around frame 8
    const t = interpolate(frame, [0, 6, 12, 18], [1, 1.12, 0.96, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill
        style={{
          background: "transparent",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.fontFamily,
          color: theme.ink,
        }}
      >
        <Wordmark theme={theme} text={wordmark} scale={t} dotScale={1.2} />
      </AbsoluteFill>
    );
  }

  // outro: settle in centre, brand sweep across, accent ring orbits once
  const settle = spring({ frame, fps, config: { damping: 24, stiffness: 110 } });
  const sweep = interpolate(frame, [16, durationInFrames - 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.fontFamily,
        color: theme.ink,
      }}
    >
      <div style={{ position: "relative", transform: `scale(${settle})` }}>
        <Wordmark theme={theme} text={wordmark} sweep={sweep} dotScale={1} />
      </div>
    </AbsoluteFill>
  );
}

function Wordmark({
  theme,
  text,
  scale = 1,
  revealMask,
  dotScale = 1,
  sweep,
}: {
  theme: RemotionTheme;
  text: string;
  scale?: number;
  revealMask?: number; // 0..1, undefined = fully revealed
  dotScale?: number;
  sweep?: number; // 0..1, undefined = no sweep
}) {
  const fontSize = 96;
  const showSweep = typeof sweep === "number" && sweep > 0 && sweep < 1;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 20,
        transform: `scale(${scale})`,
        position: "relative",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: theme.accent,
          transform: `scale(${dotScale})`,
          boxShadow: `0 0 0 8px ${withAlpha(theme.accent, 0.18)}`,
        }}
      />
      <div
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: theme.ink,
          position: "relative",
          clipPath:
            typeof revealMask === "number"
              ? `inset(0 ${(1 - revealMask) * 100}% 0 0)`
              : undefined,
        }}
      >
        {text}
        {showSweep ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(sweep ?? 0) * 100 - 30}%`,
              width: "30%",
              background: `linear-gradient(90deg, transparent, ${withAlpha(theme.accent, 0.55)}, transparent)`,
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
