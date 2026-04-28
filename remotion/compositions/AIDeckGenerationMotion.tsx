import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";

// 6s loop @ 30fps = 180 frames.
const PROMPT = "Create a 5-minute team retro";

const SLIDES = [
  { type: "Poll", subtitle: "What worked well?", color: "#0071e3" },
  { type: "Word cloud", subtitle: "One word for the sprint", color: "#a855f7" },
  { type: "Q&A", subtitle: "Open the floor", color: "#fb923c" },
  { type: "Quiz", subtitle: "Trivia closer", color: "#22c55e" },
];

export function AIDeckGenerationMotion({ theme = defaultTheme }: { theme?: RemotionTheme }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardOpacity = interpolate(frame, [0, 18, 162, 180], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const charsShown = Math.max(0, Math.min(PROMPT.length, Math.floor((frame - 18) / 1.5)));
  const promptText = PROMPT.slice(0, charsShown);
  const showCaret = frame > 18 && frame < 84 && Math.floor(frame / 6) % 2 === 0;
  const shimmerProgress = interpolate(frame, [60, 84], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slidesShown = (start: number) =>
    spring({ frame: Math.max(0, frame - start), fps, config: { damping: 16, stiffness: 180 } });

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
            AI deck builder
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 12px",
              borderRadius: 999,
              background: withAlpha(theme.accent, 0.10),
              color: theme.accent,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              display: frame >= 150 ? "inline-flex" : "none",
            }}
          >
            ✓ Ready to present
          </div>
        </div>

        <div
          style={{
            position: "relative",
            padding: 20,
            borderRadius: 16,
            border: `1px solid ${theme.line}`,
            background: theme.bgSoft,
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: theme.ink }}>
            <span>{promptText}</span>
            {showCaret ? <span style={{ opacity: 0.6 }}>▍</span> : null}
          </div>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${shimmerProgress * 100 - 30}%`,
              width: "30%",
              background: `linear-gradient(90deg, transparent, ${withAlpha(theme.accent, 0.45)}, transparent)`,
              opacity: shimmerProgress > 0 && shimmerProgress < 1 ? 1 : 0,
              pointerEvents: "none",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>
          {SLIDES.map((s, i) => {
            const t = slidesShown(84 + i * 14);
            return (
              <div
                key={s.type}
                style={{
                  background: withAlpha(s.color, 0.08),
                  border: `1px solid ${withAlpha(s.color, 0.35)}`,
                  borderRadius: 14,
                  padding: 14,
                  opacity: t,
                  transform: `translateY(${(1 - t) * 16}px) scale(${0.94 + 0.06 * t})`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: s.color,
                  }}
                >
                  {s.type}
                </div>
                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: theme.ink, letterSpacing: "-0.01em" }}>
                  {s.subtitle}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((b) => (
                    <span
                      key={b}
                      style={{
                        height: 6,
                        flex: 1,
                        borderRadius: 4,
                        background: withAlpha(s.color, 0.25),
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
