import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";
import { MaskedTextReveal } from "../primitives/AnimatedText";
import { KpiCounter } from "../primitives/KpiCounter";
import { Sparkle } from "../primitives/Sparkle";

// 6s loop @ 30fps = 180 frames.
const TILE_COLORS = ["#E21B3C", "#1368CE", "#FFA602", "#26890C"];
const OPTIONS = ["20", "25", "30", "35"]; // 15% of 200
const CORRECT = 2;

export function QuizMotion({ theme = defaultTheme }: { theme?: RemotionTheme }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardOpacity = interpolate(frame, [0, 18, 162, 180], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const timer = interpolate(frame, [15, 75], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const expired = frame >= 75;

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
          gap: 18,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: withAlpha(theme.ink, 0.55),
            }}
          >
            Live quiz
          </div>
          <TimerRing remaining={timer} total={10} accent={theme.accent} expired={expired} />
        </div>

        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <MaskedTextReveal text="What's 15% of 200?" startFrame={4} durationFrames={18} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
          {OPTIONS.map((opt, i) => {
            const enter = spring({
              frame: Math.max(0, frame - (24 + i * 6)),
              fps,
              config: { damping: 18, stiffness: 150 },
            });
            const isCorrect = expired && i === CORRECT;
            const isWrong = expired && i !== CORRECT;
            const bg = isCorrect ? "#22c55e" : isWrong ? "#ef4444" : TILE_COLORS[i];
            const opacity = isWrong ? 0.5 : 1;
            return (
              <div
                key={i}
                style={{
                  background: bg,
                  borderRadius: 18,
                  color: "#fff",
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transform: `scale(${0.9 + 0.1 * enter}) ${isCorrect ? "scale(1.03)" : ""}`,
                  opacity: enter * opacity,
                  boxShadow: isCorrect ? "0 0 0 4px rgba(255,255,255,0.7)" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{opt}</span>
                {isCorrect ? (
                  <span
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 16,
                      background: "#fff",
                      color: "#16a34a",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    ✓ Correct
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {expired ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderRadius: 14,
              background: withAlpha(theme.accent, 0.06),
              border: `1px solid ${withAlpha(theme.accent, 0.25)}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.18)",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                ✓
              </span>
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  <KpiCounter target={12} startFrame={84} durationFrames={20} />
                  <span style={{ color: withAlpha(theme.ink, 0.55) }}> / 16</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: withAlpha(theme.ink, 0.55) }}>
                  got it right
                </div>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.accent, fontVariantNumeric: "tabular-nums" }}>
              <KpiCounter target={75} startFrame={84} durationFrames={20} suffix="%" />
            </div>
          </div>
        ) : null}

        {expired ? <Sparkle startFrame={78} duration={32} x={400} y={130} size={12} color={theme.accent} /> : null}
        {expired ? <Sparkle startFrame={84} duration={32} x={620} y={170} size={14} color={theme.accent} /> : null}
      </div>
    </AbsoluteFill>
  );
}

function TimerRing({ remaining, total, accent, expired }: { remaining: number; total: number; accent: string; expired: boolean }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const progress = expired ? 1 : 1 - remaining / total;
  return (
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={r} stroke="rgba(0,0,0,0.10)" strokeWidth={6} fill="none" />
      <circle
        cx={32}
        cy={32}
        r={r}
        stroke={accent}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform="rotate(-90 32 32)"
      />
      <text
        x={32}
        y={38}
        textAnchor="middle"
        fontSize={16}
        fontWeight={800}
        fill="currentColor"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {expired ? "✓" : Math.ceil(remaining)}
      </text>
    </svg>
  );
}
