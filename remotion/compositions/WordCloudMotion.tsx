import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";
import { MaskedTextReveal } from "../primitives/AnimatedText";

// 5s @ 30fps = 150 frames.
const WORDS: { text: string; weight: number; angle: number }[] = [
  { text: "Focus", weight: 1.6, angle: -90 },
  { text: "Growth", weight: 1.2, angle: -150 },
  { text: "Speed", weight: 1.1, angle: 30 },
  { text: "Teamwork", weight: 1.3, angle: -30 },
  { text: "Clarity", weight: 1.0, angle: 60 },
  { text: "Customer", weight: 1.05, angle: 150 },
  { text: "Automation", weight: 0.95, angle: 90 },
  { text: "Fun", weight: 0.9, angle: 0 },
];

export function WordCloudMotion({ theme = defaultTheme }: { theme?: RemotionTheme }) {
  const frame = useCurrentFrame();
  const cardOpacity = interpolate(frame, [0, 18, 132, 150], [0, 1, 1, 0], {
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
          gap: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: withAlpha(theme.ink, 0.55),
          }}
        >
          Word cloud · live
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <MaskedTextReveal text="One word to describe today?" startFrame={4} durationFrames={18} />
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          {WORDS.map((w, i) => {
            const start = 18 + i * 6;
            const local = frame - start;
            return <Word key={w.text} word={w} index={i} theme={theme} local={local} />;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Word({
  word,
  index,
  theme,
  local,
}: {
  word: { text: string; weight: number; angle: number };
  index: number;
  theme: RemotionTheme;
  local: number;
}) {
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: Math.max(0, local),
    fps,
    config: { damping: 14, stiffness: 200 },
  });
  // Position on a hex-ish grid around centre
  const ring = index < 1 ? 0 : index < 4 ? 1 : 2;
  const ringPositions: Record<number, Array<[number, number]>> = {
    0: [[0, 0]],
    1: [
      [-160, -60],
      [160, -50],
      [-100, 80],
      [120, 80],
    ],
    2: [
      [-220, -120],
      [200, 100],
      [-50, 130],
      [220, -100],
    ],
  };
  const positions = ringPositions[ring];
  const idx = ring === 0 ? 0 : ring === 1 ? (index - 1) % 4 : (index - 4) % 4;
  const [x, y] = positions[idx];
  const startX = Math.cos((word.angle * Math.PI) / 180) * 220;
  const startY = Math.sin((word.angle * Math.PI) / 180) * 220;
  const cx = startX + (x - startX) * enter;
  const cy = startY + (y - startY) * enter;
  const baseFont = ring === 0 ? 56 : ring === 1 ? 38 : 30;
  const fontSize = baseFont * word.weight;
  const color =
    ring === 0
      ? theme.accent
      : ring === 1
        ? theme.ink
        : withAlpha(theme.ink, 0.55);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px)) scale(${0.6 + 0.4 * enter})`,
        opacity: enter,
        fontSize,
        fontWeight: ring === 0 ? 800 : 700,
        letterSpacing: "-0.02em",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {word.text}
    </div>
  );
}
