import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";
import { MaskedTextReveal } from "../primitives/AnimatedText";
import { KpiCounter } from "../primitives/KpiCounter";

// 5s loop @ 30fps = 150 frames.
const QUESTIONS = [
  { text: "What should we prioritize next?", finalVotes: 18, growStart: 60 },
  { text: "Can we see the timeline?", finalVotes: 7, growStart: 70 },
  { text: "How will this affect customers?", finalVotes: 11, growStart: 80 },
];

export function QAMotion({ theme = defaultTheme }: { theme?: RemotionTheme }) {
  const frame = useCurrentFrame();
  const cardOpacity = interpolate(frame, [0, 18, 132, 150], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // After frame 110, the third question (highest votes) bubbles to the top.
  // We render the same three rows but their `slot` (visual order) reorders.
  const reorder = frame >= 110;
  const order = reorder ? [0, 2, 1] : [0, 1, 2];

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
          gap: 16,
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
            Q&A · live
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              background: withAlpha(theme.accent, 0.08),
              color: theme.accent,
            }}
          >
            Top voted
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <MaskedTextReveal text="Audience questions" startFrame={4} durationFrames={16} />
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          {QUESTIONS.map((q, idx) => {
            const slot = order.indexOf(idx);
            return <QRow key={idx} question={q} slot={slot} idx={idx} theme={theme} answered={frame >= 130 && idx === 1} />;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function QRow({
  question,
  slot,
  idx,
  theme,
  answered,
}: {
  question: { text: string; finalVotes: number; growStart: number };
  slot: number;
  idx: number;
  theme: RemotionTheme;
  answered: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startEnter = 22 + idx * 8;
  const enter = spring({
    frame: Math.max(0, frame - startEnter),
    fps,
    config: { damping: 18, stiffness: 130 },
  });
  const top = slot * 86;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: `${top}px`,
        transition: "top 600ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 18}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          background: slot === 0 ? withAlpha(theme.accent, 0.06) : theme.bgSoft,
          border: `1px solid ${slot === 0 ? withAlpha(theme.accent, 0.3) : theme.line}`,
          borderRadius: 16,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: theme.ink,
            flex: 1,
            textDecoration: answered ? "line-through" : "none",
            opacity: answered ? 0.55 : 1,
          }}
        >
          {question.text}
        </div>
        {answered ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.14)",
              color: "#16a34a",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Answered
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: slot === 0 ? withAlpha(theme.accent, 0.16) : "rgba(0,0,0,0.04)",
              color: slot === 0 ? theme.accent : theme.ink,
              fontSize: 14,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              minWidth: 56,
              justifyContent: "center",
            }}
          >
            ▲ <KpiCounter target={question.finalVotes} startFrame={question.growStart} durationFrames={30} />
          </div>
        )}
      </div>
    </div>
  );
}
