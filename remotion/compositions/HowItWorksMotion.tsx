import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";
import { MaskedTextReveal } from "../primitives/AnimatedText";

// 6s loop @ 30fps = 180 frames. Three side-by-side cards:
// Create → Share → Present.

export function HowItWorksMotion({ theme = defaultTheme }: { theme?: RemotionTheme }) {
  const frame = useCurrentFrame();
  const cardOpacity = interpolate(frame, [0, 18, 162, 180], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: theme.bgSoft,
        fontFamily: theme.fontFamily,
        padding: 40,
        color: theme.ink,
      }}
    >
      <div
        style={{
          background: theme.bg,
          border: `1px solid ${theme.line}`,
          borderRadius: 24,
          padding: 36,
          boxShadow: "0 30px 80px -40px rgba(0,0,0,0.20)",
          opacity: cardOpacity,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <MaskedTextReveal text="How it works" startFrame={4} durationFrames={16} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, flex: 1 }}>
          <Step theme={theme} index={0} title="Create" copy="Build a deck or pick a template." accent={theme.accent} startFrame={20} />
          <Step theme={theme} index={1} title="Share" copy="Show a code or QR. Audience joins instantly." accent="#a855f7" startFrame={48} />
          <Step theme={theme} index={2} title="Present" copy="Live answers stream in as you talk." accent="#22c55e" startFrame={84} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Step({
  theme,
  index,
  title,
  copy,
  accent,
  startFrame,
}: {
  theme: RemotionTheme;
  index: number;
  title: string;
  copy: string;
  accent: string;
  startFrame: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 18, stiffness: 130 },
  });
  return (
    <div
      style={{
        background: withAlpha(accent, 0.06),
        border: `1px solid ${withAlpha(accent, 0.35)}`,
        borderRadius: 18,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: t,
        transform: `translateY(${(1 - t) * 16}px)`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: accent,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        {index + 1}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: theme.ink }}>{title}</div>
      <div style={{ fontSize: 14, color: withAlpha(theme.ink, 0.65), lineHeight: 1.4 }}>{copy}</div>
    </div>
  );
}
