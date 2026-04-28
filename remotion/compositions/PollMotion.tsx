import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";
import { VoteBar } from "../primitives/VoteBar";
import { KpiCounter } from "../primitives/KpiCounter";
import { MaskedTextReveal } from "../primitives/AnimatedText";

// 5s loop @ 30fps = 150 frames.
export function PollMotion({ theme = defaultTheme }: { theme?: RemotionTheme }) {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [0, 18, 132, 150], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const options = [
    { label: "Ship faster", pct: 56 },
    { label: "Polish UX", pct: 28 },
    { label: "New market", pct: 16 },
  ];

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
          gap: 24,
        }}
      >
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: withAlpha(theme.accent, 0.08),
              color: theme.accent,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <PulseDot color={theme.accent} startFrame={4} />
            Live poll
          </div>
        </div>

        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          <MaskedTextReveal
            text="Which idea should we prioritize?"
            startFrame={6}
            durationFrames={20}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 14, alignItems: "center" }}>
              <VoteBar
                theme={theme}
                label={opt.label}
                finalPct={opt.pct}
                startFrame={36 + i * 8}
                growFrames={36}
                highlight={i === 0}
                height={56}
              />
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  textAlign: "right",
                  color: i === 0 ? theme.accent : theme.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <KpiCounter target={opt.pct} startFrame={36 + i * 8} durationFrames={36} suffix="%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function PulseDot({ color, startFrame }: { color: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const phase = ((frame - startFrame) % 30) / 30;
  const scale = 1 + Math.max(0, Math.sin(phase * Math.PI * 2)) * 0.6;
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        display: "inline-block",
        transform: `scale(${scale})`,
        boxShadow: `0 0 0 4px ${withAlpha(color, 0.18)}`,
      }}
    />
  );
}
